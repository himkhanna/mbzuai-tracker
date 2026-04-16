package ae.mbzuai.tracker.config;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import ae.mbzuai.tracker.repository.UserRepository;
import ae.mbzuai.tracker.service.StatusCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;
    private final StatusCalculator statusCalculator;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding database...");
        seedUsers();
        seedOrders();
        log.info("Database seeding complete.");
    }

    private void seedUsers() {
        createUser("Admin User", "admin@mbzuai.ac.ae", "Admin123!", "ADMIN", "IT");
        createUser("Vendor Manager", "vendor.mgmt@mbzuai.ac.ae", "Pass123!", "VENDOR_MANAGEMENT", "Procurement");
        createUser("Procurement Officer", "procurement@mbzuai.ac.ae", "Pass123!", "PROCUREMENT", "Finance");
        createUser("Store Keeper", "store@mbzuai.ac.ae", "Pass123!", "STORE", "Logistics");
        createUser("Finance Officer", "finance@mbzuai.ac.ae", "Pass123!", "FINANCE", "Finance");
        createUser("IT Engineer", "it@mbzuai.ac.ae", "Pass123!", "IT", "IT");
        createUser("Asset Manager", "asset@mbzuai.ac.ae", "Pass123!", "ASSET", "Asset Management");
    }

    private void createUser(String name, String email, String password, String role, String department) {
        User user = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .department(department)
                .isActive(true)
                .build();
        userRepository.save(user);
        log.info("Created user: {} ({})", email, role);
    }

    private void seedOrders() {
        // PO 2242 — Prof. Chaoyang — Amazon
        Order po2242 = createOrder("PO", "PO-2242", "Amazon", null, "Prof. Chaoyang", "Research", LocalDate.of(2026, 1, 10));
        createItem(po2242, "Laptop Stand", 1, 250.0, 250.0, LocalDate.of(2026, 2, 1), false, false);
        createItem(po2242, "USB-C Hub", 1, 324.9, 324.9, LocalDate.of(2026, 2, 1), false, false);

        // DP 2225 — Prof. Chaoyang — Amazon (overdue)
        Order dp2225 = createOrder("DP", "DP-2225", "Amazon", null, "Prof. Chaoyang", "Research", LocalDate.of(2026, 1, 5));
        createItem(dp2225, "Mechanical Keyboard", 1, 450.0, 450.0, LocalDate.of(2026, 1, 20), false, false);
        createItem(dp2225, "Monitor 27\"", 1, 600.0, 600.0, LocalDate.of(2026, 1, 20), false, true);
        createItem(dp2225, "Desk Lamp", 1, 80.0, 80.0, LocalDate.of(2026, 1, 25), false, false);
        createItem(dp2225, "Cable Management Kit", 1, 45.0, 45.0, LocalDate.of(2026, 1, 25), false, false);
        createItem(dp2225, "Chair Cushion", 1, 401.0, 401.0, LocalDate.of(2026, 1, 30), false, false);

        // PO 2204 — Jason Xue — Robot Dog
        Order po2204 = createOrder("PO", "PO-2204", "Boston Dynamics", null, "Jason Xue", "Robotics", LocalDate.of(2026, 1, 15));
        createItem(po2204, "Spot Robot Dog", 1, 14385.0, 14385.0, LocalDate.of(2026, 3, 1), true, true);

        // PO 2116 — Dr. Salman Khan — MacStudio
        Order po2116 = createOrder("PO", "PO-2116", "Apple", null, "Dr. Salman Khan", "AI Research", LocalDate.of(2025, 12, 10));
        Item macStudio = createItem(po2116, "Mac Studio M3 Ultra", 1, 48839.0, 48839.0, LocalDate.of(2026, 1, 5), true, true);
        // This one is fully delivered
        macStudio.setQuantityReceived(1);
        macStudio.setReceivedDate(LocalDate.of(2026, 1, 6));
        macStudio.setStoredDate(LocalDate.of(2026, 1, 6));
        macStudio.setAssetTaggingDate(LocalDate.of(2026, 1, 8));
        macStudio.setStatus(statusCalculator.calculateItemStatus(macStudio));
        itemRepository.save(macStudio);

        // DP 2195 — Vaishnav Kamesvaran — Camera Gear
        Order dp2195 = createOrder("DP", "DP-2195", "B&H Photo", null, "Vaishnav Kamesvaran", "Media", LocalDate.of(2026, 2, 1));
        createItem(dp2195, "SD Card SanDisk 512GB", 2, 180.0, 360.0, LocalDate.of(2026, 2, 20), false, false);
        createItem(dp2195, "K&F Tripod", 1, 450.0, 450.0, LocalDate.of(2026, 2, 20), false, false);
        createItem(dp2195, "HDMI Cable 4K", 3, 55.0, 165.0, LocalDate.of(2026, 2, 20), false, false);
        createItem(dp2195, "Sigma 85mm Lens", 1, 2250.0, 2250.0, LocalDate.of(2026, 3, 1), true, false);
        createItem(dp2195, "DJI Carry Case", 1, 391.51, 391.51, LocalDate.of(2026, 3, 1), false, false);

        // Recalculate order statuses
        recalcOrderStatus(po2242);
        recalcOrderStatus(dp2225);
        recalcOrderStatus(po2204);
        recalcOrderStatus(po2116);
        recalcOrderStatus(dp2195);
    }

    private Order createOrder(String type, String reference, String vendor, String supplier,
                               String endUser, String department, LocalDate orderDate) {
        Order order = Order.builder()
                .type(type)
                .reference(reference)
                .vendor(vendor)
                .supplier(supplier)
                .endUser(endUser)
                .department(department)
                .orderDate(orderDate)
                .currency("AED")
                .status("PENDING")
                .build();
        return orderRepository.save(order);
    }

    private Item createItem(Order order, String description, int quantity, Double unitPrice, Double totalPrice,
                             LocalDate expectedDelivery, boolean requiresAssetTagging, boolean requiresITConfig) {
        Item item = Item.builder()
                .order(order)
                .description(description)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .totalPrice(totalPrice)
                .goodType("GOODS")
                .expectedDeliveryDate(expectedDelivery)
                .requiresAssetTagging(requiresAssetTagging)
                .requiresITConfig(requiresITConfig)
                .status("PENDING_DELIVERY")
                .build();
        item.setStatus(statusCalculator.calculateItemStatus(item));
        return itemRepository.save(item);
    }

    private void recalcOrderStatus(Order order) {
        List<Item> items = itemRepository.findByOrderId(order.getId());
        // Reload items with fresh data
        String newStatus = statusCalculator.calculateOrderStatus(items);
        order.setStatus(newStatus);
        orderRepository.save(order);
    }
}
