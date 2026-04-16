package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.entity.Notification;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> list(@AuthenticationPrincipal User user) {
        List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        long unreadCount = notificationRepository.countByUserIdAndIsRead(user.getId(), false);
        return ResponseEntity.ok(Map.of(
                "notifications", notifications,
                "unreadCount", unreadCount
        ));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markRead(@PathVariable String id,
                                                         @AuthenticationPrincipal User user) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(Map.of("message", "Marked as read"));
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, String>> markAllRead(@AuthenticationPrincipal User user) {
        notificationRepository.markAllReadByUserId(user.getId());
        return ResponseEntity.ok(Map.of("message", "All marked as read"));
    }
}
