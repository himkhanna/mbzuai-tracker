package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Notification;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.NotificationRepository;
import ae.mbzuai.tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    // In-app notification
    public void createNotification(User user, String title, String message, String type, String relatedId) {
        Notification n = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .relatedId(relatedId)
                .build();
        notificationRepository.save(n);
    }

    public void notifyRoles(List<String> roles, String title, String message, String type, String relatedId) {
        List<User> users = userRepository.findByRoleInAndIsActive(roles, true);
        for (User u : users) {
            createNotification(u, title, message, type, relatedId);
        }
        // Send email async
        sendEmailToUsers(users, title, message);
    }

    private void sendEmailToUsers(List<User> users, String subject, String body) {
        for (User u : users) {
            try {
                var msg = mailSender.createMimeMessage();
                var helper = new MimeMessageHelper(msg, false, "UTF-8");
                helper.setTo(u.getEmail());
                helper.setSubject(subject);
                helper.setText(body, false);
                mailSender.send(msg);
            } catch (Exception e) {
                log.warn("Failed to send email to {}: {}", u.getEmail(), e.getMessage());
            }
        }
    }

    public void onOrderCreated(Order order) {
        String title = "New " + order.getType() + " Created — " + order.getReference();
        String message = "Order " + order.getReference() + " for " + order.getVendor() +
                " has been created. End User: " + order.getEndUser();
        notifyRoles(List.of("VENDOR_MANAGEMENT", "PROCUREMENT"), title, message, "ORDER_CREATED", order.getId());
    }

    public void onItemReceived(Item item) {
        String title = "Item Received — " + item.getOrder().getReference();
        String message = "\"" + item.getDescription() + "\" has been received and stored.";
        notifyRoles(List.of("VENDOR_MANAGEMENT", "PROCUREMENT", "STORE"), title, message, "ITEM_RECEIVED", item.getId());

        if (item.isRequiresAssetTagging() && item.getAssetTaggingDate() == null) {
            notifyRoles(List.of("ASSET", "PROCUREMENT"),
                    "Asset Tagging Required — " + item.getOrder().getReference(),
                    "\"" + item.getDescription() + "\" requires asset tagging.",
                    "ASSET_TAGGING_REQUIRED", item.getId());
        }
        if (item.isRequiresITConfig() && item.getItConfigDate() == null) {
            notifyRoles(List.of("IT", "PROCUREMENT"),
                    "IT Config Required — " + item.getOrder().getReference(),
                    "\"" + item.getDescription() + "\" requires IT configuration.",
                    "IT_CONFIG_REQUIRED", item.getId());
        }
    }

    public void onDeliveryDue(Item item) {
        String title = "Delivery Due Today — " + item.getOrder().getReference();
        String message = "\"" + item.getDescription() + "\" is expected for delivery today.";
        notifyRoles(List.of("STORE", "VENDOR_MANAGEMENT"), title, message, "DELIVERY_DUE", item.getId());
    }

    public void onDeliveryOverdue(Item item) {
        String title = "OVERDUE — " + item.getOrder().getReference();
        String message = "\"" + item.getDescription() + "\" is overdue and has not been received.";
        notifyRoles(List.of("VENDOR_MANAGEMENT", "ADMIN"), title, message, "DELIVERY_OVERDUE", item.getId());
    }

    public void onHandoverComplete(Item item) {
        String title = "Item Handed Over — " + item.getOrder().getReference();
        String message = "\"" + item.getDescription() + "\" has been handed over to " + item.getOrder().getEndUser() + ".";
        notifyRoles(List.of("VENDOR_MANAGEMENT", "PROCUREMENT"), title, message, "STATUS_CHANGED", item.getId());
    }
}
