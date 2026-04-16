package ae.mbzuai.tracker.dto;

import ae.mbzuai.tracker.entity.AuditLog;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class AuditLogDto {
    private String id;
    private String entityType;
    private String entityId;
    private String action;
    private String fieldName;
    private String oldValue;
    private String newValue;
    private Instant timestamp;
    private String orderId;
    private String itemId;
    // Flattened user info (avoids lazy loading issues)
    private String userId;
    private String userName;
    private String userEmail;
    private String userRole;

    public static AuditLogDto from(AuditLog log) {
        var builder = AuditLogDto.builder()
                .id(log.getId())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .action(log.getAction())
                .fieldName(log.getFieldName())
                .oldValue(log.getOldValue())
                .newValue(log.getNewValue())
                .timestamp(log.getTimestamp())
                .orderId(log.getOrderId())
                .itemId(log.getItemId());
        if (log.getUser() != null) {
            builder.userId(log.getUser().getId())
                   .userName(log.getUser().getName())
                   .userEmail(log.getUser().getEmail())
                   .userRole(log.getUser().getRole());
        }
        return builder.build();
    }
}
