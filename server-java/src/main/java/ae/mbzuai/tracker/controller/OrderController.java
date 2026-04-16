package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.OrderDto;
import ae.mbzuai.tracker.dto.OrderRequest;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String vendor,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<OrderDto> result = orderService.listOrders(type, status, vendor, search, dateFrom, dateTo, pageable);
        Map<String, Object> response = new HashMap<>();
        response.put("data", result.getContent());
        response.put("meta", Map.of(
            "total", result.getTotalElements(),
            "page", result.getNumber(),
            "size", result.getSize(),
            "totalPages", result.getTotalPages()
        ));
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<OrderDto> create(@RequestBody OrderRequest req,
                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.createOrder(req, user));
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderDto> get(@PathVariable String id) {
        return ResponseEntity.ok(orderService.getOrder(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrderDto> update(@PathVariable String id,
                                            @RequestBody OrderRequest req,
                                            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(orderService.updateOrder(id, req, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id,
                                                       @AuthenticationPrincipal User user) {
        if (!"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin only"));
        }
        orderService.deleteOrder(id, user);
        return ResponseEntity.ok(Map.of("message", "Order deleted"));
    }
}
