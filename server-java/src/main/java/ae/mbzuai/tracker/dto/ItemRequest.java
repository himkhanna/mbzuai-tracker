package ae.mbzuai.tracker.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ItemRequest {
    private String itemCategory;
    private String description;
    private Integer quantity;
    private Integer quantityReceived;
    private Double unitPrice;
    private Double totalPrice;
    private String purchaseLink;
    private String lineNumber;
    private String goodType;        // GOODS | SERVICES
    private String requisitionNumber;
    private LocalDate expectedDeliveryDate;
    private LocalDate receivedDate;
    private LocalDate storedDate;
    private LocalDate assetTaggingDate;
    private LocalDate itConfigDate;
    private LocalDate handoverDate;
    private LocalDate customClearanceDate;
    private Boolean requiresAssetTagging;
    private Boolean requiresITConfig;
    private String status;
    private String financeRemarks;
    private String finalRemarks;
}
