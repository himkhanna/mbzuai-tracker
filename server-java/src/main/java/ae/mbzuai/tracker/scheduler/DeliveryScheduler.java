package ae.mbzuai.tracker.scheduler;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import ae.mbzuai.tracker.service.NotificationService;
import ae.mbzuai.tracker.service.StatusCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DeliveryScheduler {

    private final ItemRepository itemRepository;
    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
    private final StatusCalculator statusCalculator;

    // Daily at 07:00 AM Asia/Dubai — delivery due today
    @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Dubai")
    public void checkDeliveryDueToday() {
        LocalDate today = LocalDate.now();
        List<Item> dueItems = itemRepository.findDueToday(today);
        log.info("Delivery due today: {} items", dueItems.size());
        for (Item item : dueItems) {
            notificationService.onDeliveryDue(item);
        }
    }

    // Daily at 08:00 AM Asia/Dubai — overdue items
    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Dubai")
    @Transactional
    public void checkOverdueItems() {
        LocalDate today = LocalDate.now();
        List<Item> overdueItems = itemRepository.findOverdue(today);
        log.info("Overdue items: {}", overdueItems.size());
        for (Item item : overdueItems) {
            if (!"DELAYED".equals(item.getStatus())) {
                item.setStatus("DELAYED");
                itemRepository.save(item);
            }
            notificationService.onDeliveryOverdue(item);
        }
    }
}
