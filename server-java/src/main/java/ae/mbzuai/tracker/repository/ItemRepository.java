package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, String> {
    List<Item> findByOrderId(String orderId);

    @Query("SELECT i FROM Item i WHERE i.expectedDeliveryDate = :date AND i.receivedDate IS NULL AND i.status NOT IN ('DELAYED','HANDED_OVER','SERVICES_ONLY')")
    List<Item> findDueToday(@Param("date") LocalDate date);

    @Query("SELECT i FROM Item i WHERE i.expectedDeliveryDate < :today AND i.receivedDate IS NULL AND i.status NOT IN ('HANDED_OVER','DELIVERED','STORED','SERVICES_ONLY')")
    List<Item> findOverdue(@Param("today") LocalDate today);
}
