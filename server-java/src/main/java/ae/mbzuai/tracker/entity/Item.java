package ae.mbzuai.tracker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    private String itemCategory;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private int quantity;

    private Integer quantityReceived;

    private Double unitPrice;
    private Double totalPrice;
    private String purchaseLink;
    private String lineNumber;

    @Column(nullable = false)
    @Builder.Default
    private String goodType = "GOODS"; // GOODS | SERVICES

    private String requisitionNumber;

    private LocalDate expectedDeliveryDate;
    private LocalDate receivedDate;
    private LocalDate storedDate;
    private LocalDate assetTaggingDate;
    private LocalDate itConfigDate;
    private LocalDate handoverDate;
    private LocalDate customClearanceDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean requiresAssetTagging = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean requiresITConfig = false;

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING_DELIVERY";

    @Column(columnDefinition = "TEXT")
    private String financeRemarks;

    @Column(columnDefinition = "TEXT")
    private String finalRemarks;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @JsonIgnore
    @OneToMany(mappedBy = "item", fetch = FetchType.LAZY)
    private List<AuditLog> auditLogs;
}
