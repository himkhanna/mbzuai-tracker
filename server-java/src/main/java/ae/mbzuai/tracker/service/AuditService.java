package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.AuditLog;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(User actor, String entityType, String entityId,
                    String action, String fieldName, String oldValue, String newValue) {
        AuditLog log = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .user(actor)
                .action(action)
                .fieldName(fieldName)
                .oldValue(oldValue)
                .newValue(newValue)
                .build();
        // Set orderId / itemId based on entityType
        if ("order".equals(entityType)) log.setOrderId(entityId);
        if ("item".equals(entityType)) log.setItemId(entityId);
        auditLogRepository.save(log);
    }

    public void log(User actor, String entityType, String entityId, String action) {
        log(actor, entityType, entityId, action, null, null, null);
    }
}
