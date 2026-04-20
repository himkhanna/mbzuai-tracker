package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.dto.EmailImportResult;
import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import ae.mbzuai.tracker.repository.UserRepository;
import com.azure.identity.ClientSecretCredentialBuilder;
import com.microsoft.graph.models.FileAttachment;
import com.microsoft.graph.models.Message;
import com.microsoft.graph.serviceclient.GraphServiceClient;
import com.microsoft.graph.users.item.messages.MessagesRequestBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Polls an Office 365 mailbox via Microsoft Graph API for unread emails and:
 *  - PDF attachments   → PdfPoParser → order auto-created
 *  - Excel attachments → ImportService (existing logic)
 *  - Image attachments → AmazonScreenshotService (OCR for delivery dates)
 *  - Email body text   → checked for Amazon order IDs + delivery dates
 *
 * Auth: Azure AD app with Mail.Read + Mail.ReadWrite application permissions.
 * Triggered by DeliveryScheduler (every 10 min) or POST /api/email/check.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailIngestionService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final UserRepository userRepository;
    private final ImportService importService;
    private final PdfPoParser pdfPoParser;
    private final AmazonScreenshotService amazonScreenshotService;
    private final StatusCalculator statusCalculator;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final SettingsService settingsService;

    // Azure credentials stay in application.yml — they are infrastructure config, not user settings
    @Value("${app.email-ingestion.azure-tenant-id:}")
    private String tenantId;

    @Value("${app.email-ingestion.azure-client-id:}")
    private String clientId;

    @Value("${app.email-ingestion.azure-client-secret:}")
    private String clientSecret;

    // -------------------------------------------------------------------------

    public EmailImportResult checkInbox() {
        if (!settingsService.isEmailEnabled()) {
            log.info("Email ingestion disabled (configure via Settings page)");
            return EmailImportResult.builder()
                    .emailsProcessed(0).errors(0)
                    .errorMessages(List.of("Email ingestion disabled — enable it in Settings > Email Ingestion"))
                    .amazonUpdateDetails(List.of())
                    .build();
        }
        String mailbox = settingsService.getMailbox();
        if (tenantId.isBlank() || clientId.isBlank() || clientSecret.isBlank() || mailbox.isBlank()) {
            return EmailImportResult.builder()
                    .emailsProcessed(0).errors(1)
                    .errorMessages(List.of("Missing Azure config: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET must be set in application config; mailbox must be set in Settings"))
                    .amazonUpdateDetails(List.of())
                    .build();
        }

        User actor = resolveSystemUser();
        ResultAccumulator acc = new ResultAccumulator();

        try {
            GraphServiceClient graph = buildGraphClient();
            List<Message> messages = fetchUnreadMessages(graph, mailbox);
            log.info("Found {} unread messages in {}", messages.size(), mailbox);

            for (Message msg : messages) {
                String subject = msg.getSubject() != null ? msg.getSubject() : "";
                if (!isRelevantSubject(subject)) {
                    log.info("Skipping email — subject not recognised as PO/DP/Amazon: '{}'", subject);
                    markAsRead(graph, msg.getId()); // mark read so it won't be re-checked
                    continue;
                }
                try {
                    processMessage(graph, msg, actor, acc);
                    markAsRead(graph, msg.getId());
                    acc.emailsProcessed++;
                } catch (Exception e) {
                    log.error("Failed processing message '{}': {}", msg.getSubject(), e.getMessage(), e);
                    acc.addError("Email '" + msg.getSubject() + "': " + e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Graph API error: {}", e.getMessage(), e);
            acc.addError("Graph API error: " + e.getMessage());
        }

        return acc.toResult();
    }

    // -------------------------------------------------------------------------

    private void processMessage(GraphServiceClient graph, Message msg, User actor, ResultAccumulator acc) {
        // Scan body text for Amazon order info
        if (msg.getBody() != null && msg.getBody().getContent() != null) {
            String bodyText = stripHtml(msg.getBody().getContent());
            amazonScreenshotService.processEmailText(bodyText)
                    .ifPresent(u -> acc.addAmazonUpdate(u));
        }

        if (Boolean.TRUE.equals(msg.getHasAttachments())) {
            List<FileAttachment> attachments = fetchAttachments(graph, msg.getId());
            for (FileAttachment att : attachments) {
                processAttachment(att, actor, acc);
            }
        }
    }

    private void processAttachment(FileAttachment att, User actor, ResultAccumulator acc) {
        String name = att.getName() != null ? att.getName().toLowerCase() : "";
        byte[] bytes = att.getContentBytes();
        if (bytes == null || bytes.length == 0) return;
        String ct = att.getContentType() != null ? att.getContentType().toLowerCase() : "";

        if (ct.contains("pdf") || name.endsWith(".pdf")) {
            handlePdf(bytes, actor, acc);
        } else if (ct.contains("spreadsheetml") || ct.contains("excel") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
            handleExcel(bytes, att.getName(), actor, acc);
        } else if (ct.startsWith("image/") || isImageName(name)) {
            amazonScreenshotService.processImage(bytes, ct)
                    .ifPresent(u -> acc.addAmazonUpdate(u));
        }
    }

    // -------------------------------------------------------------------------

    private void handlePdf(byte[] bytes, User actor, ResultAccumulator acc) {
        try {
            PdfPoParser.ParsedOrder parsed = pdfPoParser.parse(bytes, "PO");
            if (parsed.reference == null || parsed.reference.isBlank()) {
                acc.addError("PDF has no Order Reference field");
                return;
            }
            createOrderFromParsed(parsed, actor, acc);
        } catch (Exception e) {
            log.warn("PDF parse failed: {}", e.getMessage());
            acc.addError("PDF parse error: " + e.getMessage());
        }
    }

    private void handleExcel(byte[] bytes, String fileName, User actor, ResultAccumulator acc) {
        try {
            boolean isDP = fileName != null && fileName.toLowerCase().contains("dp");
            MultipartFile mock = new ByteArrayMultipartFile(bytes, fileName != null ? fileName : "import.xlsx");
            var result = isDP ? importService.importDP(mock, actor) : importService.importPO(mock, actor);
            acc.ordersCreated     += (int) result.getOrDefault("ordersCreated", 0);
            acc.itemsCreated      += (int) result.getOrDefault("itemsCreated", 0);
            acc.duplicatesSkipped += (int) result.getOrDefault("duplicatesSkipped", 0);
            @SuppressWarnings("unchecked")
            List<String> errs = (List<String>) result.getOrDefault("errorMessages", List.of());
            errs.forEach(acc::addError);
        } catch (Exception e) {
            log.warn("Excel import failed: {}", e.getMessage());
            acc.addError("Excel import error: " + e.getMessage());
        }
    }

    @Transactional
    public void createOrderFromParsed(PdfPoParser.ParsedOrder parsed, User actor, ResultAccumulator acc) {
        if ("SERVICES".equalsIgnoreCase(parsed.orderCategory)) {
            acc.servicesSkipped++;
            log.info("Order '{}' is category SERVICES — skipped (only GOODS orders are tracked)", parsed.reference);
            return;
        }
        if (orderRepository.findByReferenceAndIsDeleted(parsed.reference, false).isPresent()) {
            acc.duplicatesSkipped++;
            log.info("Duplicate '{}' — skipped", parsed.reference);
            return;
        }

        Order order = Order.builder()
                .type(parsed.type != null ? parsed.type : "PO")
                .reference(parsed.reference)
                .vendor(parsed.vendor != null ? parsed.vendor : "Unknown")
                .supplier(parsed.supplier)
                .endUser(parsed.endUser != null ? parsed.endUser : "")
                .department(parsed.department)
                .deliveryAddress(parsed.deliveryAddress)
                .orderDate(parsed.orderDate != null ? parsed.orderDate : LocalDate.now())
                .totalValue(parsed.totalValue)
                .currency("AED")
                .notes(parsed.notes)
                .orderCategory(parsed.orderCategory != null ? parsed.orderCategory : "GOODS")
                .status("PENDING")
                .vendorOrderId(parsed.vendorOrderId)
                .vendorPlatform(parsed.vendorPlatform)
                .build();
        order = orderRepository.save(order);
        auditService.log(actor, "order", order.getId(), "EMAIL_IMPORT");

        int itemCount = 0;
        for (PdfPoParser.ParsedItem pi : parsed.items) {
            Item item = Item.builder()
                    .order(order)
                    .description(pi.description)
                    .quantity(pi.quantity)
                    .unitPrice(pi.unitPrice)
                    .totalPrice(pi.totalPrice)
                    .goodType(pi.goodType != null ? pi.goodType : "GOODS")
                    .expectedDeliveryDate(pi.expectedDeliveryDate)
                    .requiresAssetTagging(pi.requiresAssetTagging)
                    .requiresITConfig(pi.requiresITConfig)
                    .requisitionNumber(pi.requisitionNumber)
                    .lineNumber(pi.lineNumber)
                    .financeRemarks(pi.financeRemarks)
                    .status("PENDING_DELIVERY")
                    .build();
            item.setStatus(statusCalculator.calculateItemStatus(item));
            itemRepository.save(item);
            itemCount++;
        }
        acc.ordersCreated++;
        acc.itemsCreated += itemCount;
        notificationService.onOrderCreated(order);
        log.info("Created order '{}' with {} items from email", parsed.reference, itemCount);
    }

    // -------------------------------------------------------------------------

    private GraphServiceClient buildGraphClient() {
        var credential = new ClientSecretCredentialBuilder()
                .tenantId(tenantId)
                .clientId(clientId)
                .clientSecret(clientSecret)
                .build();
        return new GraphServiceClient(credential, "https://graph.microsoft.com/.default");
    }

    private List<Message> fetchUnreadMessages(GraphServiceClient graph, String mailboxAddr) {
        var response = graph.users().byUserId(mailboxAddr).messages().get(req -> {
            req.queryParameters.filter = "isRead eq false";
            req.queryParameters.top = 50;
            req.queryParameters.select = new String[]{"id", "subject", "body", "hasAttachments", "isRead"};
            req.queryParameters.orderby = new String[]{"receivedDateTime desc"};
        });
        return response != null && response.getValue() != null ? response.getValue() : List.of();
    }

    private List<FileAttachment> fetchAttachments(GraphServiceClient graph, String messageId) {
        String mailboxAddr = settingsService.getMailbox();
        try {
            var response = graph.users().byUserId(mailboxAddr)
                    .messages().byMessageId(messageId)
                    .attachments().get();
            if (response == null || response.getValue() == null) return List.of();
            return response.getValue().stream()
                    .filter(a -> a instanceof FileAttachment)
                    .map(a -> (FileAttachment) a)
                    .toList();
        } catch (Exception e) {
            log.warn("Failed to fetch attachments for message {}: {}", messageId, e.getMessage());
            return List.of();
        }
    }

    private void markAsRead(GraphServiceClient graph, String messageId) {
        String mailboxAddr = settingsService.getMailbox();
        try {
            Message update = new Message();
            update.setIsRead(true);
            graph.users().byUserId(mailboxAddr).messages().byMessageId(messageId).patch(update);
        } catch (Exception e) {
            log.warn("Failed to mark message {} as read: {}", messageId, e.getMessage());
        }
    }

    private User resolveSystemUser() {
        return userRepository.findAll().stream()
                .filter(u -> "ADMIN".equals(u.getRole()) && u.isActive())
                .findFirst().orElse(null);
    }

    /**
     * Only process emails whose subject contains a configured keyword.
     * Keywords are loaded from SettingsService (configurable via UI) and checked case-insensitively.
     */
    private boolean isRelevantSubject(String subject) {
        List<String> keywords = settingsService.getAllSubjectKeywords();
        if (keywords.isEmpty()) return false; // safety: if no keywords configured, skip all
        String lower = subject.toLowerCase();
        return keywords.stream().anyMatch(k -> lower.contains(k.toLowerCase()));
    }

    private String stripHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]+>", " ").replaceAll("&nbsp;", " ").replaceAll("\\s+", " ").trim();
    }

    private boolean isImageName(String name) {
        return name.endsWith(".jpg") || name.endsWith(".jpeg")
                || name.endsWith(".png") || name.endsWith(".gif") || name.endsWith(".webp");
    }

    // -------------------------------------------------------------------------

    public static class ResultAccumulator {
        public int emailsProcessed, ordersCreated, itemsCreated, duplicatesSkipped, servicesSkipped, amazonUpdates;
        private final List<String> errors = new ArrayList<>();
        private final List<String> amazonDetails = new ArrayList<>();

        void addError(String msg) { errors.add(msg); }

        void addAmazonUpdate(AmazonScreenshotService.AmazonUpdateResult u) {
            amazonUpdates++;
            amazonDetails.add("Amazon order " + u.amazonOrderId() + " → delivery " + u.deliveryDate()
                    + " — updated " + u.itemsUpdated() + " item(s)");
        }

        EmailImportResult toResult() {
            return EmailImportResult.builder()
                    .emailsProcessed(emailsProcessed)
                    .ordersCreated(ordersCreated)
                    .itemsCreated(itemsCreated)
                    .duplicatesSkipped(duplicatesSkipped)
                    .servicesSkipped(servicesSkipped)
                    .amazonUpdates(amazonUpdates)
                    .errors(errors.size())
                    .errorMessages(errors)
                    .amazonUpdateDetails(amazonDetails)
                    .build();
        }
    }

    private static class ByteArrayMultipartFile implements MultipartFile {
        private final byte[] bytes;
        private final String name;

        ByteArrayMultipartFile(byte[] bytes, String name) { this.bytes = bytes; this.name = name; }

        @Override public String getName()             { return name; }
        @Override public String getOriginalFilename() { return name; }
        @Override public String getContentType()      { return "application/octet-stream"; }
        @Override public boolean isEmpty()            { return bytes.length == 0; }
        @Override public long getSize()               { return bytes.length; }
        @Override public byte[] getBytes()            { return bytes; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
        @Override public void transferTo(java.io.File dest) throws IOException { throw new UnsupportedOperationException(); }
    }
}
