package ae.mbzuai.tracker.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "processed_emails", indexes = @Index(columnList = "message_id", unique = true))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProcessedEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "message_id", nullable = false, unique = true, length = 512)
    private String messageId;

    private String subject;

    @CreationTimestamp
    private Instant processedAt;
}
