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
    private List<ItemRequest> items;
}
