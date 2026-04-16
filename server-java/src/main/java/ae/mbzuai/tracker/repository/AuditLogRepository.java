package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditLogRepository extends JpaRepository<AuditLog, String>, JpaSpecificationExecutor<AuditLog> {
    Page<AuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
