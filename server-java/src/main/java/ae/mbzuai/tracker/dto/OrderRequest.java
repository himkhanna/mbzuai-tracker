package ae.mbzuai.tracker.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class OrderRequest {
    private String type;          // PO | DP
    private String reference;
    private String vendor;
    private String supplier;
    private String deliveryAddress;
    private String endUser;
    private String department;
    private LocalDate orderDate;
    private Double totalValue;
    private String currency;
    private String notes;
    private String orderCategory;  // GOODS | SERVICES — defaults to GOODS
    private List<ItemRequest> items;
    private String vendorPlatform;   // e.g. AMAZON
    private String vendorOrderId;    // e.g. 114-3751791-7314618
}
