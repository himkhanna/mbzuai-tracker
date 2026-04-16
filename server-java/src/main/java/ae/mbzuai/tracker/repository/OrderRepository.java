package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByReferenceAndIsDeleted(String reference, boolean isDeleted);
    Optional<Order> findByIdAndIsDeleted(String id, boolean isDeleted);
    Page<Order> findAllByIsDeleted(boolean isDeleted, Pageable pageable);
}
