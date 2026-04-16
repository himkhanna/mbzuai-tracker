package ae.mbzuai.tracker.dto;

import ae.mbzuai.tracker.entity.Item;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data @Builder
public class ItemDto {
    private String id;
    private String orderId;
    private String itemCategory;
    private String description;
    private int quantity;
    private Integer quantityReceived;
    private Double unitPrice;
    private Double totalPrice;
    private String purchaseLink;
    private String lineNumber;
    private String goodType;
    private String requisitionNumber;
    private LocalDate expectedDeliveryDate;
    private LocalDate receivedDate;
    private LocalDate storedDate;
    private LocalDate assetTaggingDate;
    private LocalDate itConfigDate;
    private LocalDate handoverDate;
    private LocalDate customClearanceDate;
    @JsonProperty("requiresAssetTagging")
    private boolean requiresAssetTagging;
    @JsonProperty("requiresITConfig")
    private boolean requiresITConfig;
    private String status;
    private String financeRemarks;
    private String finalRemarks;
    private Instant createdAt;
    private Instant updatedAt;

    public static ItemDto from(Item i) {
        return ItemDto.builder()
                .id(i.getId())
                .orderId(i.getOrder() != null ? i.getOrder().getId() : null)
                .itemCategory(i.getItemCategory())
                .description(i.getDescription())
                .quantity(i.getQuantity())
                .quantityReceived(i.getQuantityReceived())
                .unitPrice(i.getUnitPrice())
                .totalPrice(i.getTotalPrice())
                .purchaseLink(i.getPurchaseLink())
                .lineNumber(i.getLineNumber())
                .goodType(i.getGoodType())
                .requisitionNumber(i.getRequisitionNumber())
                .expectedDeliveryDate(i.getExpectedDeliveryDate())
                .receivedDate(i.getReceivedDate())
                .storedDate(i.getStoredDate())
                .assetTaggingDate(i.getAssetTaggingDate())
                .itConfigDate(i.getItConfigDate())
                .handoverDate(i.getHandoverDate())
                .customClearanceDate(i.getCustomClearanceDate())
                .requiresAssetTagging(i.isRequiresAssetTagging())
                .requiresITConfig(i.isRequiresITConfig())
                .status(i.getStatus())
                .financeRemarks(i.getFinanceRemarks())
                .finalRemarks(i.getFinalRemarks())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }
}
