package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.dto.ItemDto;
import ae.mbzuai.tracker.dto.OrderDto;
import ae.mbzuai.tracker.dto.OrderRequest;
import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final StatusCalculator statusCalculator;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Page<OrderDto> listOrders(String type, String status, String vendor,
                                      String search, LocalDate dateFrom, LocalDate dateTo,
                                      Pageable pageable) {
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("isDeleted"), false));
            if (type != null) predicates.add(cb.equal(root.get("type"), type));
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            if (vendor != null && !vendor.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("vendor")), "%" + vendor.toLowerCase() + "%"));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("reference")), pattern),
                    cb.like(cb.lower(root.get("vendor")), pattern),
                    cb.like(cb.lower(root.get("endUser")), pattern)
                ));
            }
            if (dateFrom != null) predicates.add(cb.greaterThanOrEqualTo(root.get("orderDate"), dateFrom));
            if (dateTo != null) predicates.add(cb.lessThanOrEqualTo(root.get("orderDate"), dateTo));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return orderRepository.findAll(spec, pageable).map(o -> OrderDto.from(o, true));
    }

    @Transactional
    public OrderDto createOrder(OrderRequest req, User actor) {
        // Check duplicate reference
        orderRepository.findByReferenceAndIsDeleted(req.getReference(), false).ifPresent(o -> {
            throw new RuntimeException("Order with reference " + req.getReference() + " already exists");
        });

        Order order = Order.builder()
                .type(req.getType())
                .reference(req.getReference())
                .vendor(req.getVendor())
                .supplier(req.getSupplier())
                .deliveryAddress(req.getDeliveryAddress())
                .endUser(req.getEndUser())
                .department(req.getDepartment())
                .orderDate(req.getOrderDate() != null ? req.getOrderDate() : LocalDate.now())
                .totalValue(req.getTotalValue())
                .currency(req.getCurrency() != null ? req.getCurrency() : "AED")
                .notes(req.getNotes())
                .status("PENDING")
                .build();

        order = orderRepository.save(order);

        if (req.getItems() != null) {
            List<Item> items = new ArrayList<>();
            for (var itemReq : req.getItems()) {
                Item item = buildItem(itemReq, order);
                item.setStatus(statusCalculator.calculateItemStatus(item));
                items.add(itemRepository.save(item));
            }
            order.setItems(items);
            order.setStatus(statusCalculator.calculateOrderStatus(items));
            orderRepository.save(order);
        }

        auditService.log(actor, "order", order.getId(), "CREATE");
        notificationService.onOrderCreated(order);
        return OrderDto.from(order);
    }

    @Transactional(readOnly = true)
    public OrderDto getOrder(String id) {
        Order order = orderRepository.findByIdAndIsDeleted(id, false)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        return OrderDto.from(order);
    }

    @Transactional
    public OrderDto updateOrder(String id, OrderRequest req, User actor) {
        Order order = orderRepository.findByIdAndIsDeleted(id, false)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (req.getVendor() != null) order.setVendor(req.getVendor());
        if (req.getSupplier() != null) order.setSupplier(req.getSupplier());
        if (req.getDeliveryAddress() != null) order.setDeliveryAddress(req.getDeliveryAddress());
        if (req.getEndUser() != null) order.setEndUser(req.getEndUser());
        if (req.getDepartment() != null) order.setDepartment(req.getDepartment());
        if (req.getNotes() != null) order.setNotes(req.getNotes());
        if (req.getTotalValue() != null) order.setTotalValue(req.getTotalValue());

        auditService.log(actor, "order", order.getId(), "UPDATE");
        return OrderDto.from(orderRepository.save(order));
    }

    @Transactional
    public void deleteOrder(String id, User actor) {
        Order order = orderRepository.findByIdAndIsDeleted(id, false)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setDeleted(true);
        orderRepository.save(order);
        auditService.log(actor, "order", order.getId(), "DELETE");
    }

    private Item buildItem(ae.mbzuai.tracker.dto.ItemRequest req, Order order) {
        return Item.builder()
                .order(order)
                .itemCategory(req.getItemCategory())
                .description(req.getDescription())
                .quantity(req.getQuantity() != null ? req.getQuantity() : 1)
                .quantityReceived(req.getQuantityReceived())
                .unitPrice(req.getUnitPrice())
                .totalPrice(req.getTotalPrice())
                .purchaseLink(req.getPurchaseLink())
                .lineNumber(req.getLineNumber())
                .goodType(req.getGoodType() != null ? req.getGoodType() : "GOODS")
                .requisitionNumber(req.getRequisitionNumber())
                .expectedDeliveryDate(req.getExpectedDeliveryDate())
                .receivedDate(req.getReceivedDate())
                .storedDate(req.getStoredDate())
                .assetTaggingDate(req.getAssetTaggingDate())
                .itConfigDate(req.getItConfigDate())
                .handoverDate(req.getHandoverDate())
                .customClearanceDate(req.getCustomClearanceDate())
                .requiresAssetTagging(Boolean.TRUE.equals(req.getRequiresAssetTagging()))
                .requiresITConfig(Boolean.TRUE.equals(req.getRequiresITConfig()))
                .financeRemarks(req.getFinanceRemarks())
                .finalRemarks(req.getFinalRemarks())
                .status("PENDING_DELIVERY")
                .build();
    }

    public void recalculateOrderStatus(Order order) {
        List<Item> items = itemRepository.findByOrderId(order.getId());
        order.setStatus(statusCalculator.calculateOrderStatus(items));
        orderRepository.save(order);
    }
}
