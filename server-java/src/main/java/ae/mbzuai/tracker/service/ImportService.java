package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.Item;
import ae.mbzuai.tracker.entity.Order;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.ItemRepository;
import ae.mbzuai.tracker.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportService {

    private final OrderRepository orderRepository;
    private final ItemRepository itemRepository;
    private final StatusCalculator statusCalculator;
    private final AuditService auditService;

    @Transactional
    public Map<String, Object> importPO(MultipartFile file, User actor) throws Exception {
        return importFromExcel(file, "PO", actor);
    }

    @Transactional
    public Map<String, Object> importDP(MultipartFile file, User actor) throws Exception {
        return importFromExcel(file, "DP", actor);
    }

    private Map<String, Object> importFromExcel(MultipartFile file, String type, User actor) throws Exception {
        int created = 0, errors = 0, duplicatesSkipped = 0;
        int totalItemsCreated = 0;
        List<String> errorMessages = new ArrayList<>();

        try (InputStream is = file.getInputStream(); Workbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) throw new RuntimeException("No sheet found in workbook");

            // Skip header row (row 0)
            // Group rows by PO/DP reference (column A)
            Map<String, List<Row>> grouped = new LinkedHashMap<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                String ref = getCellString(row, 0);
                if (ref == null || ref.isBlank()) continue;
                grouped.computeIfAbsent(ref, k -> new ArrayList<>()).add(row);
            }

            for (Map.Entry<String, List<Row>> entry : grouped.entrySet()) {
                String reference = entry.getKey();
                List<Row> rows = entry.getValue();
                try {
                    int itemCount = processOrderRows(reference, type, rows, actor);
                    created++;
                    totalItemsCreated += itemCount;
                } catch (Exception e) {
                    if (e.getMessage() != null && e.getMessage().contains("already exists")) {
                        duplicatesSkipped++;
                    } else {
                        errors++;
                        errorMessages.add(reference + ": " + e.getMessage());
                        log.warn("Import error for {}: {}", reference, e.getMessage());
                    }
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("ordersCreated", created);
        result.put("itemsCreated", totalItemsCreated);
        result.put("duplicatesSkipped", duplicatesSkipped);
        result.put("errors", errors);
        result.put("errorMessages", errorMessages);
        return result;
    }

    private int processOrderRows(String reference, String type, List<Row> rows, User actor) {
        Row firstRow = rows.get(0);

        // Check if order exists
        Optional<Order> existing = orderRepository.findByReferenceAndIsDeleted(reference, false);
        Order order;
        if (existing.isPresent()) {
            order = existing.get();
        } else {
            order = Order.builder()
                    .type(type)
                    .reference(reference)
                    .vendor(getCellString(firstRow, 1) != null ? getCellString(firstRow, 1) : "")
                    .supplier(getCellString(firstRow, 2))
                    .endUser(getCellString(firstRow, 3) != null ? getCellString(firstRow, 3) : "")
                    .department(getCellString(firstRow, 4))
                    .orderDate(getCellDate(firstRow, 5) != null ? getCellDate(firstRow, 5) : LocalDate.now())
                    .currency("AED")
                    .status("PENDING")
                    .build();
            order = orderRepository.save(order);
            auditService.log(actor, "order", order.getId(), "IMPORT_CREATE");
        }

        int itemCount = 0;
        for (Row row : rows) {
            String description = getCellString(row, 6);
            if (description == null || description.isBlank()) continue;

            String lineNumber = getCellString(row, 7);
            Integer quantity = getCellInt(row, 8);
            Double unitPrice = getCellDouble(row, 9);
            Double totalPrice = getCellDouble(row, 10);
            String goodTypeStr = getCellString(row, 11);
            String goodType = "SERVICES".equalsIgnoreCase(goodTypeStr) ? "SERVICES" : "GOODS";
            LocalDate expectedDelivery = getCellDate(row, 12);
            String requisitionNumber = getCellString(row, 13);
            String purchaseLink = getCellString(row, 14);
            Boolean requiresAssetTagging = "YES".equalsIgnoreCase(getCellString(row, 15)) || "TRUE".equalsIgnoreCase(getCellString(row, 15));
            Boolean requiresITConfig = "YES".equalsIgnoreCase(getCellString(row, 16)) || "TRUE".equalsIgnoreCase(getCellString(row, 16));
            String financeRemarks = getCellString(row, 17);

            Item item = Item.builder()
                    .order(order)
                    .description(description)
                    .lineNumber(lineNumber)
                    .quantity(quantity != null ? quantity : 1)
                    .unitPrice(unitPrice)
                    .totalPrice(totalPrice)
                    .goodType(goodType)
                    .expectedDeliveryDate(expectedDelivery)
                    .requisitionNumber(requisitionNumber)
                    .purchaseLink(purchaseLink)
                    .requiresAssetTagging(requiresAssetTagging)
                    .requiresITConfig(requiresITConfig)
                    .financeRemarks(financeRemarks)
                    .status("PENDING_DELIVERY")
                    .build();

            item.setStatus(statusCalculator.calculateItemStatus(item));
            itemRepository.save(item);
            itemCount++;
        }
        return itemCount;
    }

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    private Double getCellDouble(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Double.parseDouble(cell.getStringCellValue().replace(",", "").trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private Integer getCellInt(Row row, int col) {
        Double d = getCellDouble(row, col);
        return d != null ? d.intValue() : null;
    }

    private LocalDate getCellDate(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        if (cell.getCellType() == CellType.STRING) {
            String s = cell.getStringCellValue().trim();
            if (s.isBlank()) return null;
            try {
                return LocalDate.parse(s);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }

    public byte[] generatePOTemplate() throws Exception {
        return generateTemplate("PO");
    }

    public byte[] generateDPTemplate() throws Exception {
        return generateTemplate("DP");
    }

    private byte[] generateTemplate(String type) throws Exception {
        try (Workbook wb = new XSSFWorkbook();
             java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(type + " Import Template");
            String[] headers = {
                    type + " Reference", "Vendor", "Supplier", "End User", "Department",
                    "Order Date", "Item Description", "Line Number", "Quantity",
                    "Unit Price", "Total Price", "Good Type (GOODS/SERVICES)",
                    "Expected Delivery Date", "Requisition Number", "Purchase Link",
                    "Requires Asset Tagging (YES/NO)", "Requires IT Config (YES/NO)", "Finance Remarks"
            };
            Row headerRow = sheet.createRow(0);
            CellStyle style = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            style.setFont(font);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(style);
                sheet.setColumnWidth(i, 6000);
            }
            // Sample row
            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue(type + "-001");
            sample.createCell(1).setCellValue("Sample Vendor");
            sample.createCell(3).setCellValue("Prof. Sample User");
            sample.createCell(4).setCellValue("IT");
            sample.createCell(5).setCellValue("2026-04-13");
            sample.createCell(6).setCellValue("Sample Item Description");
            sample.createCell(7).setCellValue("1");
            sample.createCell(8).setCellValue(1);
            sample.createCell(9).setCellValue(100.00);
            sample.createCell(10).setCellValue(100.00);
            sample.createCell(11).setCellValue("GOODS");
            sample.createCell(12).setCellValue("2026-05-01");
            sample.createCell(15).setCellValue("NO");
            sample.createCell(16).setCellValue("NO");

            wb.write(out);
            return out.toByteArray();
        }
    }
}
