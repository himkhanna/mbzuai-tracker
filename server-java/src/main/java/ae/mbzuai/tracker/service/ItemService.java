package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.dto.ItemDto;
import ae.mbzuai.tracker.dto.ItemRequest;
import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final StatusCalculator statusCalculator;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public ItemDto getItem(String id) {
        return ItemDto.from(findItem(id));
    }

    @Transactional
    public ItemDto updateItem(String id, ItemRequest req, User actor, String userRole) {
        Item item = findItem(id);
        boolean isPrivileged = List.of("ADMIN", "PROCUREMENT", "VENDOR_MANAGEMENT").contains(userRole);

        // Fields editable by any role (non-date)
        if (req.getItemCategory() != null) item.setItemCategory(req.getItemCategory());
        if (req.getDescription() != null) item.setDescription(req.getDescription());
        if (req.getQuantity() != null) item.setQuantity(req.getQuantity());
        if (req.getUnitPrice() != null) item.setUnitPrice(req.getUnitPrice());
        if (req.getTotalPrice() != null) item.setTotalPrice(req.getTotalPrice());
        if (req.getPurchaseLink() != null) item.setPurchaseLink(req.getPurchaseLink());
        if (req.getGoodType() != null) item.setGoodType(req.getGoodType());
        if (req.getRequisitionNumber() != null) item.setRequisitionNumber(req.getRequisitionNumber());
        if (req.getExpectedDeliveryDate() != null) item.setExpectedDeliveryDate(req.getExpectedDeliveryDate());
        if (req.getRequiresAssetTagging() != null) item.setRequiresAssetTagging(req.getRequiresAssetTagging());
        if (req.getRequiresITConfig() != null) item.setRequiresITConfig(req.getRequiresITConfig());
        if (req.getFinanceRemarks() != null) item.setFinanceRemarks(req.getFinanceRemarks());
        if (req.getFinalRemarks() != null) item.setFinalRemarks(req.getFinalRemarks());
        if (req.getLineNumber() != null) item.setLineNumber(req.getLineNumber());
        if (req.getCustomClearanceDate() != null) item.setCustomClearanceDate(req.getCustomClearanceDate());

        // Lifecycle dates — privileged only
        if (isPrivileged) {
            if (req.getReceivedDate() != null) {
                item.setReceivedDate(req.getReceivedDate());
                if (item.getStoredDate() == null) item.setStoredDate(req.getReceivedDate());
            } else if (req.getReceivedDate() == null && req.getStoredDate() == null
                    && "receivedDate".equals(req.getFinanceRemarks())) {
                // clear signal handled separately
            }
            if (req.getStoredDate() != null) item.setStoredDate(req.getStoredDate());
            if (req.getAssetTaggingDate() != null) item.setAssetTaggingDate(req.getAssetTaggingDate());
            if (req.getItConfigDate() != null) item.setItConfigDate(req.getItConfigDate());
            if (req.getHandoverDate() != null) item.setHandoverDate(req.getHandoverDate());
        }

        recalcAndSave(item, actor);
        return ItemDto.from(item);
    }

    @Transactional
    public ItemDto markReceived(String id, Integer quantityReceived, User actor, String userRole) {
        checkRole(userRole, List.of("ADMIN", "VENDOR_MANAGEMENT", "STORE", "PROCUREMENT"));
        Item item = findItem(id);

        int qtyRec = quantityReceived != null ? quantityReceived : item.getQuantity();
        item.setQuantityReceived(qtyRec);
        item.setReceivedDate(LocalDate.now());
        item.setStoredDate(LocalDate.now());

        auditService.log(actor, "item", item.getId(), "RECEIVE",
                "quantityReceived", null, String.valueOf(qtyRec));

        recalcAndSave(item, actor);
        notificationService.onItemReceived(item);
        return ItemDto.from(item);
    }

    @Transactional
    public ItemDto markAssetTagged(String id, User actor, String userRole) {
        checkRole(userRole, List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT", "ASSET"));
        Item item = findItem(id);
        if (!"PENDING_ASSET_TAGGING".equals(item.getStatus())) {
            throw new RuntimeException("Item is not in PENDING_ASSET_TAGGING status");
        }
        item.setAssetTaggingDate(LocalDate.now());
        auditService.log(actor, "item", item.getId(), "ASSET_TAGGED", "assetTaggingDate", null, LocalDate.now().toString());
        recalcAndSave(item, actor);
        return ItemDto.from(item);
    }

    @Transactional
    public ItemDto markItConfigured(String id, User actor, String userRole) {
        checkRole(userRole, List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT", "IT"));
        Item item = findItem(id);
        if (!"PENDING_IT_CONFIG".equals(item.getStatus()) && !"ASSET_TAGGED".equals(item.getStatus())) {
            throw new RuntimeException("Item is not ready for IT configuration");
        }
        item.setItConfigDate(LocalDate.now());
        auditService.log(actor, "item", item.getId(), "IT_CONFIGURED", "itConfigDate", null, LocalDate.now().toString());
        recalcAndSave(item, actor);
        return ItemDto.from(item);
    }

    @Transactional
    public ItemDto markHandedOver(String id, User actor, String userRole) {
        checkRole(userRole, List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT", "STORE"));
        Item item = findItem(id);
        item.setHandoverDate(LocalDate.now());
        auditService.log(actor, "item", item.getId(), "HANDOVER", "handoverDate", null, LocalDate.now().toString());
        recalcAndSave(item, actor);
        notificationService.onHandoverComplete(item);
        return ItemDto.from(item);
    }

    @Transactional
    public ItemDto clearDate(String id, String fieldName, User actor, String userRole) {
        checkRole(userRole, List.of("ADMIN", "PROCUREMENT", "VENDOR_MANAGEMENT"));
        Item item = findItem(id);
        switch (fieldName) {
            case "receivedDate" -> {
                item.setReceivedDate(null);
                item.setStoredDate(null);
                item.setQuantityReceived(null);
            }
            case "storedDate" -> item.setStoredDate(null);
            case "assetTaggingDate" -> item.setAssetTaggingDate(null);
            case "itConfigDate" -> item.setItConfigDate(null);
            case "handoverDate" -> item.setHandoverDate(null);
            case "customClearanceDate" -> item.setCustomClearanceDate(null);
            default -> throw new RuntimeException("Unknown date field: " + fieldName);
        }
        auditService.log(actor, "item", item.getId(), "CLEAR_DATE", fieldName, "set", "null");
        recalcAndSave(item, actor);
        return ItemDto.from(item);
    }

    private void recalcAndSave(Item item, User actor) {
        String oldStatus = item.getStatus();
        String newStatus = statusCalculator.calculateItemStatus(item);
        item.setStatus(newStatus);
        itemRepository.save(item);

        if (!oldStatus.equals(newStatus)) {
            auditService.log(actor, "item", item.getId(), "STATUS_CHANGE", "status", oldStatus, newStatus);
        }

        // Recalculate order status
        Order order = item.getOrder();
        if (order != null) {
            List<Item> allItems = itemRepository.findByOrderId(order.getId());
            order.setStatus(statusCalculator.calculateOrderStatus(allItems));
            orderRepository.save(order);
        }
    }

    private Item findItem(String id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item not found"));
    }

    private void checkRole(String userRole, List<String> allowed) {
        if (!allowed.contains(userRole)) {
            throw new RuntimeException("Access denied for role: " + userRole);
        }
    }
}
