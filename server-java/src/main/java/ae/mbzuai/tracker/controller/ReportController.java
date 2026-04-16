package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;
import java.util.Arrays;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;

    @GetMapping("/tracker")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> trackerReport(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {

        LocalDate today = LocalDate.now();
        LocalDate from = dateFrom != null && !dateFrom.isBlank() ? LocalDate.parse(dateFrom) : null;
        LocalDate to = dateTo != null && !dateTo.isBlank() ? LocalDate.parse(dateTo) : null;
        Set<String> statusFilter = status != null && !status.isBlank()
                ? new HashSet<>(Arrays.asList(status.split(","))) : Collections.emptySet();

        List<Map<String, Object>> rows = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted())
                .filter(o -> type == null || type.isBlank() || type.equalsIgnoreCase(o.getType()))
                .filter(o -> {
                    if (search == null || search.isBlank()) return true;
                    String s = search.toLowerCase();
                    return (o.getReference() != null && o.getReference().toLowerCase().contains(s))
                            || (o.getVendor() != null && o.getVendor().toLowerCase().contains(s))
                            || (o.getEndUser() != null && o.getEndUser().toLowerCase().contains(s));
                })
                .filter(o -> {
                    if (from == null && to == null) return true;
                    LocalDate ord = o.getOrderDate();
                    if (ord == null) return true;
                    if (from != null && ord.isBefore(from)) return false;
                    if (to != null && ord.isAfter(to)) return false;
                    return true;
                })
                .flatMap(o -> {
                    if (o.getItems() == null) return java.util.stream.Stream.empty();
                    return o.getItems().stream()
                            .filter(i -> statusFilter.isEmpty() || statusFilter.contains(i.getStatus()))
                            .map(i -> {
                                Map<String, Object> row = new LinkedHashMap<>();
                                row.put("reference", o.getReference());
                                row.put("type", o.getType());
                                row.put("vendor", o.getVendor());
                                row.put("endUser", o.getEndUser());
                                row.put("department", o.getDepartment());
                                row.put("description", i.getDescription());
                                row.put("quantity", i.getQuantity());
                                row.put("currentStatus", i.getStatus());
                                row.put("plannedDelivery", i.getExpectedDeliveryDate() != null ? i.getExpectedDeliveryDate().toString() : null);
                                row.put("actualDelivery", i.getReceivedDate() != null ? i.getReceivedDate().toString() : null);
                                if ("DELAYED".equals(i.getStatus()) && i.getExpectedDeliveryDate() != null) {
                                    long days = today.toEpochDay() - i.getExpectedDeliveryDate().toEpochDay();
                                    row.put("daysDelayed", days > 0 ? days : null);
                                } else {
                                    row.put("daysDelayed", null);
                                }
                                return row;
                            });
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(rows);
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> summary() {
        List<Order> allOrders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted()).toList();
        List<Item> allItems = allOrders.stream()
                .flatMap(o -> o.getItems() != null ? o.getItems().stream() : java.util.stream.Stream.empty())
                .toList();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalOrders", allOrders.size());
        summary.put("totalPO", allOrders.stream().filter(o -> "PO".equals(o.getType())).count());
        summary.put("totalDP", allOrders.stream().filter(o -> "DP".equals(o.getType())).count());
        summary.put("pendingDelivery", allItems.stream().filter(i -> "PENDING_DELIVERY".equals(i.getStatus())).count());
        summary.put("overdueItems", allItems.stream().filter(i -> "DELAYED".equals(i.getStatus())).count());
        summary.put("pendingAssetTagging", allItems.stream().filter(i -> "PENDING_ASSET_TAGGING".equals(i.getStatus())).count());
        summary.put("pendingITConfig", allItems.stream().filter(i -> "PENDING_IT_CONFIG".equals(i.getStatus())).count());
        summary.put("handedOver", allItems.stream().filter(i -> "HANDED_OVER".equals(i.getStatus())).count());
        summary.put("partiallyDelivered", allItems.stream().filter(i -> "PARTIALLY_DELIVERED".equals(i.getStatus())).count());

        // Status distribution for chart
        Map<String, Long> ordersByStatus = allOrders.stream()
                .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));
        summary.put("ordersByStatus", ordersByStatus);

        // Upcoming deliveries (next 7 days)
        LocalDate today = LocalDate.now();
        LocalDate in7Days = today.plusDays(7);
        List<Map<String, Object>> upcoming = allItems.stream()
                .filter(i -> i.getExpectedDeliveryDate() != null
                        && !i.getExpectedDeliveryDate().isBefore(today)
                        && !i.getExpectedDeliveryDate().isAfter(in7Days)
                        && i.getReceivedDate() == null)
                .map(i -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("itemId", i.getId());
                    m.put("description", i.getDescription());
                    m.put("expectedDeliveryDate", i.getExpectedDeliveryDate());
                    m.put("orderId", i.getOrder().getId());
                    m.put("orderRef", i.getOrder().getReference());
                    return m;
                })
                .collect(Collectors.toList());
        summary.put("upcomingDeliveries", upcoming);

        // Overdue items detail
        List<Map<String, Object>> overdueDetails = allItems.stream()
                .filter(i -> "DELAYED".equals(i.getStatus()))
                .map(i -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("itemId", i.getId());
                    m.put("description", i.getDescription());
                    m.put("expectedDeliveryDate", i.getExpectedDeliveryDate());
                    m.put("orderId", i.getOrder().getId());
                    m.put("orderRef", i.getOrder().getReference());
                    m.put("vendor", i.getOrder().getVendor());
                    return m;
                })
                .collect(Collectors.toList());
        summary.put("overdueDetails", overdueDetails);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/export/excel")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportExcel(@AuthenticationPrincipal User actor) throws Exception {
        if (!List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT").contains(actor.getRole())) {
            return ResponseEntity.status(403).build();
        }

        List<Order> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted()).toList();

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Tracker Report");
            String[] headers = {"PO/DP Ref", "Type", "Vendor", "End User", "Department",
                    "Item Description", "Qty", "Qty Received", "Good Type",
                    "Planned Delivery", "Actual Delivery", "Stored Date",
                    "Asset Tagging", "IT Config", "Handover Date", "Status",
                    "Finance Remarks", "Final Remarks"};

            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Order order : orders) {
                if (order.getItems() == null) continue;
                for (Item item : order.getItems()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(order.getReference());
                    row.createCell(1).setCellValue(order.getType());
                    row.createCell(2).setCellValue(order.getVendor());
                    row.createCell(3).setCellValue(order.getEndUser());
                    row.createCell(4).setCellValue(order.getDepartment() != null ? order.getDepartment() : "");
                    row.createCell(5).setCellValue(item.getDescription());
                    row.createCell(6).setCellValue(item.getQuantity());
                    row.createCell(7).setCellValue(item.getQuantityReceived() != null ? item.getQuantityReceived() : 0);
                    row.createCell(8).setCellValue(item.getGoodType());
                    row.createCell(9).setCellValue(item.getExpectedDeliveryDate() != null ? item.getExpectedDeliveryDate().toString() : "");
                    row.createCell(10).setCellValue(item.getReceivedDate() != null ? item.getReceivedDate().toString() : "");
                    row.createCell(11).setCellValue(item.getStoredDate() != null ? item.getStoredDate().toString() : "");
                    row.createCell(12).setCellValue(item.getAssetTaggingDate() != null ? item.getAssetTaggingDate().toString() : "");
                    row.createCell(13).setCellValue(item.getItConfigDate() != null ? item.getItConfigDate().toString() : "");
                    row.createCell(14).setCellValue(item.getHandoverDate() != null ? item.getHandoverDate().toString() : "");
                    row.createCell(15).setCellValue(item.getStatus());
                    row.createCell(16).setCellValue(item.getFinanceRemarks() != null ? item.getFinanceRemarks() : "");
                    row.createCell(17).setCellValue(item.getFinalRemarks() != null ? item.getFinalRemarks() : "");
                }
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            wb.write(out);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=tracker-report.xlsx")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }
}
