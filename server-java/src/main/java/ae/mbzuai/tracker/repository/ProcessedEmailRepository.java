package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.ProcessedEmail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedEmailRepository extends JpaRepository<ProcessedEmail, String> {
    boolean existsByMessageId(String messageId);
}
