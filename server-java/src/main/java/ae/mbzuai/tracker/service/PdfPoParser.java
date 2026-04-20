package ae.mbzuai.tracker.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses structured MBZUAI PO/DP PDF documents into order data.
 *
 * Expected PDF format (produced by SamplePdfGenerator):
 *   Order Reference: PO-XXXX
 *   Order Type: PO|DP
 *   Order Date: YYYY-MM-DD
 *   Vendor: ...
 *   Supplier: ...
 *   End User: ...
 *   Department: ...
 *   Delivery Address: ...
 *   Notes: ...
 *
 *   LINE ITEMS:
 *   No.|Description|Qty|Unit Price (AED)|Total Price (AED)|Good Type|Expected Delivery|Asset Tag|IT Config|Requisition No.|Line No.|Finance Remarks
 *   1|Description text|2|100.00|200.00|GOODS|2026-05-01|NO|NO|REQ-001|L001|remark
 *   ...
 *   Total Value: AED X,XXX.XX
 */
@Slf4j
@Service
public class PdfPoParser {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public static class ParsedOrder {
        public String reference;
        public String type;
        public String vendor;
        public String supplier;
        public String endUser;
        public String department;
        public LocalDate orderDate;
        public String deliveryAddress;
        public String notes;
        public Double totalValue;
        public String orderCategory;   // GOODS | SERVICES — from "Order Category:" header
        public String vendorOrderId;   // e.g. Amazon order ID parsed from "Amazon Order ID:" header
        public String vendorPlatform;  // e.g. "AMAZON"
        public final List<ParsedItem> items = new ArrayList<>();
    }

    public static class ParsedItem {
        public String description;
        public int quantity = 1;
        public Double unitPrice;
        public Double totalPrice;
        public String goodType = "GOODS";
        public LocalDate expectedDeliveryDate;
        public boolean requiresAssetTagging;
        public boolean requiresITConfig;
        public String requisitionNumber;
        public String lineNumber;
        public String financeRemarks;
    }

    public ParsedOrder parse(byte[] pdfBytes, String defaultType) throws Exception {
        String text;
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            text = stripper.getText(doc);
        }
        log.debug("Extracted {} chars from PDF", text.length());
        return parseText(text, defaultType);
    }

    private ParsedOrder parseText(String text, String defaultType) {
        ParsedOrder order = new ParsedOrder();

        // Determine type from title line
        if (text.contains("DIRECT PAYMENT ORDER")) {
            order.type = "DP";
        } else if (text.contains("PURCHASE ORDER")) {
            order.type = "PO";
        } else {
            order.type = defaultType != null ? defaultType : "PO";
        }

        order.reference       = extract(text, "Order Reference:\\s*(.+)");
        String typeOverride   = extract(text, "Order Type:\\s*(PO|DP)");
        if (typeOverride != null) order.type = typeOverride;
        String categoryStr    = extract(text, "Order Category:\\s*(GOODS|SERVICES)");
        order.orderCategory   = categoryStr != null ? categoryStr : "GOODS";
        order.vendor          = extract(text, "Vendor:\\s*(.+)");
        order.supplier        = extract(text, "Supplier:\\s*(.+)");
        order.endUser         = extract(text, "End User:\\s*(.+)");
        order.department      = extract(text, "Department:\\s*(.+)");
        order.deliveryAddress = extract(text, "Delivery Address:\\s*(.+)");
        order.notes           = extract(text, "Notes:\\s*(.+)");
        order.vendorOrderId   = extract(text, "Amazon Order ID:\\s*(\\d{3}-\\d{7}-\\d{7})");
        if (order.vendorOrderId != null) order.vendorPlatform = "AMAZON";

        String dateStr = extract(text, "Order Date:\\s*(\\d{4}-\\d{2}-\\d{2})");
        if (dateStr != null) {
            try { order.orderDate = LocalDate.parse(dateStr, DATE_FMT); } catch (Exception ignored) {}
        }

        String totalStr = extract(text, "Total Value:\\s*AED\\s*([\\d,\\.]+)");
        if (totalStr != null) {
            try { order.totalValue = Double.parseDouble(totalStr.replace(",", "")); } catch (Exception ignored) {}
        }

        // Parse the pipe-delimited items table
        int tableStart = text.indexOf("LINE ITEMS:");
        if (tableStart >= 0) {
            String tableSection = text.substring(tableStart);
            boolean pastHeader = false;
            for (String line : tableSection.split("\\r?\\n")) {
                line = line.trim();
                if (line.startsWith("No.|") || line.startsWith("No. |")) {
                    pastHeader = true;
                    continue;
                }
                if (!pastHeader || line.isBlank() || line.startsWith("Total Value:")) continue;
                ParsedItem item = parseItemLine(line);
                if (item != null) order.items.add(item);
            }
        }

        return order;
    }

    private ParsedItem parseItemLine(String line) {
        String[] cols = line.split("\\|", -1);
        if (cols.length < 3) return null;
        // Column 0 is the row number — must be numeric
        try {
            Integer.parseInt(cols[0].trim());
        } catch (NumberFormatException e) {
            return null;
        }

        String description = col(cols, 1);
        if (description == null || description.isBlank()) return null;

        ParsedItem item = new ParsedItem();
        item.description           = description;
        item.quantity              = parseInt(col(cols, 2), 1);
        item.unitPrice             = parseDouble(col(cols, 3));
        item.totalPrice            = parseDouble(col(cols, 4));
        String gt = col(cols, 5);
        item.goodType              = "SERVICES".equalsIgnoreCase(gt) ? "SERVICES" : "GOODS";
        String ed = col(cols, 6);
        if (ed != null) {
            try { item.expectedDeliveryDate = LocalDate.parse(ed.trim(), DATE_FMT); } catch (Exception ignored) {}
        }
        item.requiresAssetTagging  = "YES".equalsIgnoreCase(col(cols, 7));
        item.requiresITConfig      = "YES".equalsIgnoreCase(col(cols, 8));
        item.requisitionNumber     = col(cols, 9);
        item.lineNumber            = col(cols, 10);
        item.financeRemarks        = col(cols, 11);
        return item;
    }

    private String extract(String text, String pattern) {
        Matcher m = Pattern.compile(pattern, Pattern.MULTILINE).matcher(text);
        return m.find() ? m.group(1).trim() : null;
    }

    private String col(String[] cols, int i) {
        if (i >= cols.length) return null;
        String v = cols[i].trim();
        return v.isEmpty() ? null : v;
    }

    private int parseInt(String s, int def) {
        if (s == null) return def;
        try { return Integer.parseInt(s.replace(",", "").trim()); } catch (Exception e) { return def; }
    }

    private Double parseDouble(String s) {
        if (s == null) return null;
        try { return Double.parseDouble(s.replace(",", "").trim()); } catch (Exception e) { return null; }
    }
}
