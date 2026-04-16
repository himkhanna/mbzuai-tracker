package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
public class StatusCalculator {

    public String calculateItemStatus(Item item) {
        // Services are excluded from lifecycle
        if ("SERVICES".equals(item.getGoodType())) {
            return "SERVICES_ONLY";
        }

        int qty = item.getQuantity();
        Integer received = item.getQuantityReceived();

        // Not yet received
        if (received == null || received == 0) {
            LocalDate exp = item.getExpectedDeliveryDate();
            if (exp != null && exp.isBefore(LocalDate.now())) {
                return "DELAYED";
            }
            return "PENDING_DELIVERY";
        }

        // Partially received
        if (received < qty) {
            return "PARTIALLY_DELIVERED";
        }

        // Fully received — check downstream stages
        if (item.getHandoverDate() != null) return "HANDED_OVER";

        if (item.isRequiresITConfig()) {
            if (item.getItConfigDate() != null) return "IT_CONFIGURED";
            if (item.isRequiresAssetTagging()) {
                if (item.getAssetTaggingDate() != null) return "ASSET_TAGGED";
                return "PENDING_ASSET_TAGGING";
            }
            return "PENDING_IT_CONFIG";
        }

        if (item.isRequiresAssetTagging()) {
            if (item.getAssetTaggingDate() != null) {
                if (item.isRequiresITConfig()) {
                    return item.getItConfigDate() != null ? "IT_CONFIGURED" : "PENDING_IT_CONFIG";
                }
                return "ASSET_TAGGED";
            }
            return "PENDING_ASSET_TAGGING";
        }

        if (item.getStoredDate() != null) return "STORED";
        return "DELIVERED";
    }

    public String calculateOrderStatus(List<Item> items) {
        if (items == null || items.isEmpty()) return "PENDING";

        // Filter out SERVICES items from lifecycle consideration
        List<Item> lifecycleItems = items.stream()
                .filter(i -> !"SERVICES".equals(i.getGoodType()))
                .toList();

        if (lifecycleItems.isEmpty()) return "COMPLETED";

        long total = lifecycleItems.size();
        long handedOver = lifecycleItems.stream().filter(i -> "HANDED_OVER".equals(i.getStatus())).count();
        long delayed = lifecycleItems.stream().filter(i -> "DELAYED".equals(i.getStatus())).count();
        long delivered = lifecycleItems.stream()
                .filter(i -> !List.of("PENDING_DELIVERY", "DELAYED", "PARTIALLY_DELIVERED").contains(i.getStatus()))
                .count();

        if (handedOver == total) return "COMPLETED";
        if (delayed > 0) return "DELAYED";
        if (delivered == total) return "FULLY_DELIVERED";
        if (delivered > 0) return "PARTIALLY_DELIVERED";
        return "PENDING";
    }
}
