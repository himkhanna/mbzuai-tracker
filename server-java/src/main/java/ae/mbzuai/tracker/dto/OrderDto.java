package ae.mbzuai.tracker.dto;

import ae.mbzuai.tracker.entity.Order;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Data @Builder
public class OrderDto {
    private String id;
    private String type;
    private String reference;
    private String vendor;
    private String supplier;
    private String deliveryAddress;
    private String endUser;
    private String department;
    private LocalDate orderDate;
    private Double totalValue;
    private String currency;
    private String status;
    private String notes;
    private String orderCategory;
    private String vendorPlatform;
    private String vendorOrderId;
    @JsonProperty("isDeleted")
    private boolean isDeleted;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ItemDto> items;

    public static OrderDto from(Order o) {
        return from(o, true);
    }

    public static OrderDto from(Order o, boolean includeItems) {
        var builder = OrderDto.builder()
                .id(o.getId())
                .type(o.getType())
                .reference(o.getReference())
                .vendor(o.getVendor())
                .supplier(o.getSupplier())
                .deliveryAddress(o.getDeliveryAddress())
                .endUser(o.getEndUser())
                .department(o.getDepartment())
                .orderDate(o.getOrderDate())
                .totalValue(o.getTotalValue())
                .currency(o.getCurrency())
                .status(o.getStatus())
                .notes(o.getNotes())
                .orderCategory(o.getOrderCategory())
                .vendorPlatform(o.getVendorPlatform())
                .vendorOrderId(o.getVendorOrderId())
                .isDeleted(o.isDeleted())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt());
        if (includeItems && o.getItems() != null) {
            builder.items(o.getItems().stream().map(ItemDto::from).collect(Collectors.toList()));
        }
        return builder.build();
    }
}
