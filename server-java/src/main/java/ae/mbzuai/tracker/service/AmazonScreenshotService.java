package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.Month;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.SequencedSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts Amazon order IDs and delivery dates from screenshots or email text,
 * then updates the expectedDeliveryDate on matching orders (matched via Order.vendorOrderId).
 *
 * Amazon order ID format: 3-7-7 digits  e.g. 113-1234567-1234567
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AmazonScreenshotService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final StatusCalculator statusCalculator;

    @Value("${app.ocr.tesseract-data-path:C:/Program Files/Tesseract-OCR/tessdata}")
    private String tessDataPath;

    @Value("${app.ocr.enabled:true}")
    private boolean ocrEnabled;

    private static final Pattern AMAZON_ORDER_ID =
            Pattern.compile("\\b(\\d{3}-\\d{7}-\\d{7})\\b");

    // Patterns for delivery date extraction from Amazon emails/screenshots
    private static final Pattern[] DATE_PATTERNS = {
        Pattern.compile("(?:Arriving by|Arriving|Delivered|Estimated delivery|Expected delivery|Delivery date)[:\\s]+([A-Za-z]+ \\d{1,2},?\\s*\\d{4})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:Arriving by|Arriving|Delivered|Estimated delivery|Expected delivery)[:\\s]+([A-Za-z]+ \\d{1,2})", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?:Get it by|Arrives)[:\\s]+([A-Za-z]+,?\\s+[A-Za-z]+ \\d{1,2})", Pattern.CASE_INSENSITIVE),
    };

    // Patterns used when parsing OCR text into per-shipment blocks
    private static final Pattern ARRIVING_BY_LINE =
            Pattern.compile("Arriving by\\s+([A-Za-z]+ \\d{1,2},?\\s*\\d{4}|[A-Za-z]+ \\d{1,2})", Pattern.CASE_INSENSITIVE);
    private static final Pattern ITEM_BULLET_LINE =
            Pattern.compile("[•\\-*]\\s*(.+?)\\s*\\(Qty:\\s*\\d+\\)", Pattern.CASE_INSENSITIVE);

    private record ShipmentBlock(LocalDate date, List<String> itemDescriptions) {}

    public record AmazonUpdateResult(String amazonOrderId, List<LocalDate> datesApplied, int itemsUpdated) {
        /** Convenience: first date, for single-date callers. */
        public LocalDate deliveryDate() { return datesApplied.isEmpty() ? null : datesApplied.get(0); }
    }

    /** Process a raw image attachment (PNG/JPG/GIF) using Tesseract OCR. */
    public Optional<AmazonUpdateResult> processImage(byte[] imageBytes, String mimeType) {
        if (!ocrEnabled) {
            log.debug("OCR disabled — skipping image");
            return Optional.empty();
        }
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (image == null) {
                log.warn("Could not decode image bytes (mime={})", mimeType);
                return Optional.empty();
            }
            Tesseract tesseract = new Tesseract();
            tesseract.setDatapath(tessDataPath);
            tesseract.setLanguage("eng");
            String text = tesseract.doOCR(image);
            log.debug("OCR extracted {} chars from image", text.length());
            return processText(text);
        } catch (TesseractException e) {
            log.warn("Tesseract OCR failed (is Tesseract installed at '{}'?): {}", tessDataPath, e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Image processing failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** Process plain text or HTML body from an Amazon email. */
    public Optional<AmazonUpdateResult> processEmailText(String emailText) {
        if (emailText == null || emailText.isBlank()) return Optional.empty();
        // Quick guard — skip if no Amazon order ID pattern present
        if (!AMAZON_ORDER_ID.matcher(emailText).find()) return Optional.empty();
        return processText(emailText);
    }

    @Transactional
    public Optional<AmazonUpdateResult> processText(String text) {
        Matcher orderMatcher = AMAZON_ORDER_ID.matcher(text);
        if (!orderMatcher.find()) return Optional.empty();

        String amazonOrderId = orderMatcher.group(1);
        log.info("Found Amazon order ID: {}", amazonOrderId);

        // Try to parse structured shipment blocks (date → items per block) from OCR text
        List<ShipmentBlock> blocks = parseShipmentBlocks(text);

        // Fall back to flat date list only if no blocks were detected
        List<LocalDate> flatDates = blocks.isEmpty() ? extractAllDates(text) : List.of();

        if (blocks.isEmpty() && flatDates.isEmpty()) {
            log.info("No delivery dates found for Amazon order {}", amazonOrderId);
            return Optional.empty();
        }
        log.info("Amazon order {} → {} shipment block(s), {} flat date(s)", amazonOrderId, blocks.size(), flatDates.size());

        Optional<Order> orderOpt = orderRepository.findByVendorOrderId(amazonOrderId);
        if (orderOpt.isEmpty()) {
            log.info("No order with vendorOrderId='{}' — screenshot logged but not matched", amazonOrderId);
            return Optional.empty();
        }

        Order order = orderOpt.get();
        List<Item> pending = itemRepository.findByOrderId(order.getId()).stream()
                .filter(i -> i.getReceivedDate() == null && !"SERVICES".equals(i.getGoodType()))
                .toList();

        int updated = 0;
        List<LocalDate> applied = new ArrayList<>();
        for (int i = 0; i < pending.size(); i++) {
            Item item = pending.get(i);
            LocalDate date;

            if (!blocks.isEmpty()) {
                // Primary: match this item's description to a shipment block
                date = findByDescription(item.getDescription(), blocks);
                if (date == null) {
                    // Secondary: assign by index (last block date for overflow)
                    date = blocks.get(Math.min(i, blocks.size() - 1)).date();
                    log.debug("Item '{}' — no description match, using block {} date {}", item.getDescription(), Math.min(i, blocks.size()-1), date);
                } else {
                    log.debug("Item '{}' → matched date {}", item.getDescription(), date);
                }
            } else {
                date = flatDates.get(Math.min(i, flatDates.size() - 1));
            }

            item.setExpectedDeliveryDate(date);
            item.setStatus(statusCalculator.calculateItemStatus(item));
            itemRepository.save(item);
            applied.add(date);
            updated++;
        }
        log.info("Updated {} items on order '{}' — dates applied: {}", updated, order.getReference(), applied);
        return Optional.of(new AmazonUpdateResult(amazonOrderId, applied, updated));
    }

    /**
     * Parse OCR text into shipment blocks. Each "Arriving by DATE" line starts a new block;
     * subsequent bullet lines (• Item (Qty: N)) are the items in that block.
     */
    private List<ShipmentBlock> parseShipmentBlocks(String text) {
        List<ShipmentBlock> blocks = new ArrayList<>();
        LocalDate currentDate = null;
        List<String> currentItems = new ArrayList<>();

        for (String line : text.split("\\r?\\n")) {
            Matcher m = ARRIVING_BY_LINE.matcher(line);
            if (m.find()) {
                if (currentDate != null && !currentItems.isEmpty()) {
                    blocks.add(new ShipmentBlock(currentDate, List.copyOf(currentItems)));
                }
                currentDate = parseAmazonDate(m.group(1).trim());
                currentItems = new ArrayList<>();
                continue;
            }
            if (currentDate != null) {
                Matcher bm = ITEM_BULLET_LINE.matcher(line);
                if (bm.find()) currentItems.add(bm.group(1).trim());
            }
        }
        if (currentDate != null && !currentItems.isEmpty()) {
            blocks.add(new ShipmentBlock(currentDate, List.copyOf(currentItems)));
        }
        return blocks;
    }

    /**
     * Find the delivery date for an order item by matching its description to a shipment block's item list.
     * Tries: exact substring, then significant-word overlap (words > 3 chars).
     */
    private LocalDate findByDescription(String orderDesc, List<ShipmentBlock> blocks) {
        if (orderDesc == null || orderDesc.isBlank()) return null;
        String descLower = orderDesc.toLowerCase().trim();
        for (ShipmentBlock block : blocks) {
            for (String shipItem : block.itemDescriptions()) {
                String sl = shipItem.toLowerCase().trim();
                if (sl.contains(descLower) || descLower.contains(sl) || hasWordOverlap(descLower, sl)) {
                    return block.date();
                }
            }
        }
        return null;
    }

    private boolean hasWordOverlap(String a, String b) {
        Set<String> bWords = Set.of(b.split("\\s+"));
        for (String word : a.split("\\s+")) {
            if (word.length() > 3 && bWords.contains(word)) return true;
        }
        return false;
    }

    /** Extract all unique delivery dates in order of appearance. */
    private List<LocalDate> extractAllDates(String text) {
        // Use LinkedHashSet to deduplicate while preserving order
        SequencedSet<LocalDate> seen = new LinkedHashSet<>();
        for (Pattern p : DATE_PATTERNS) {
            Matcher m = p.matcher(text);
            while (m.find()) {
                LocalDate date = parseAmazonDate(m.group(1).trim());
                if (date != null) seen.add(date);
            }
        }
        return new ArrayList<>(seen);
    }

    private LocalDate parseAmazonDate(String raw) {
        // Normalise: remove commas, extra whitespace, day-of-week prefix (e.g. "Tuesday, May 6")
        String cleaned = raw.replaceAll(",", "").replaceAll("\\s+", " ").trim();
        String[] parts = cleaned.split(" ");

        // Skip leading day-of-week token
        int start = 0;
        if (parts.length > 2 && isDayOfWeek(parts[0])) start = 1;

        try {
            if (parts.length - start >= 3) {
                Month month = parseMonth(parts[start]);
                int day = Integer.parseInt(parts[start + 1]);
                int year = Integer.parseInt(parts[start + 2]);
                if (month != null) return LocalDate.of(year, month, day);
            }
            if (parts.length - start == 2) {
                Month month = parseMonth(parts[start]);
                int day = Integer.parseInt(parts[start + 1]);
                if (month != null) return LocalDate.of(LocalDate.now().getYear(), month, day);
            }
        } catch (Exception e) {
            log.debug("Failed to parse Amazon date '{}': {}", raw, e.getMessage());
        }
        return null;
    }

    private boolean isDayOfWeek(String s) {
        return switch (s.toLowerCase()) {
            case "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
                 "mon", "tue", "wed", "thu", "fri", "sat", "sun" -> true;
            default -> false;
        };
    }

    private Month parseMonth(String name) {
        return switch (name.toLowerCase()) {
            case "january",   "jan" -> Month.JANUARY;
            case "february",  "feb" -> Month.FEBRUARY;
            case "march",     "mar" -> Month.MARCH;
            case "april",     "apr" -> Month.APRIL;
            case "may"              -> Month.MAY;
            case "june",      "jun" -> Month.JUNE;
            case "july",      "jul" -> Month.JULY;
            case "august",    "aug" -> Month.AUGUST;
            case "september", "sep" -> Month.SEPTEMBER;
            case "october",   "oct" -> Month.OCTOBER;
            case "november",  "nov" -> Month.NOVEMBER;
            case "december",  "dec" -> Month.DECEMBER;
            default -> null;
        };
    }
}
