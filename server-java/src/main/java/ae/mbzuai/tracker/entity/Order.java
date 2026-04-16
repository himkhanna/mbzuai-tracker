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
@Table(name = "orders")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String type; // PO | DP

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(nullable = false)
    private String vendor;

    private String supplier;
    private String deliveryAddress;

    @Column(nullable = false)
    private String endUser;

    private String department;

    @Column(nullable = false)
    private LocalDate orderDate;

    private Double totalValue;

    @Column(nullable = false)
    @Builder.Default
    private String currency = "AED";

    @Column(nullable = false)
    @Builder.Default
    private String status = "PENDING";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Vendor sync fields
    private String vendorPlatform;
    private String vendorOrderId;

    @Column(columnDefinition = "TEXT")
    private String vendorSyncData;
    private Instant vendorLastSynced;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Item> items;

    @JsonIgnore
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<AuditLog> auditLogs;
}
