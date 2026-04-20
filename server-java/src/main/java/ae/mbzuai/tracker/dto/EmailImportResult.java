package ae.mbzuai.tracker.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class EmailImportResult {
    private int emailsProcessed;
    private int ordersCreated;
    private int itemsCreated;
    private int duplicatesSkipped;
    private int servicesSkipped;
    private int amazonUpdates;
    private int errors;
    private List<String> errorMessages;
    private List<String> amazonUpdateDetails;
}
