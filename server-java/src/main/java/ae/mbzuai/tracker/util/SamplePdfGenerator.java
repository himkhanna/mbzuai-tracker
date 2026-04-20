package ae.mbzuai.tracker.util;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Generates sample PO/DP PDFs in the exact structured format PdfPoParser expects.
 * Supports 3 variants per type (n=1,2,3) with different vendors and items.
 */
@Slf4j
@Service
public class SamplePdfGenerator {

    // ── PO Variants ──────────────────────────────────────────────────────────

    public byte[] generateSamplePO(int n) throws Exception {
        return switch (n) {
            case 2 -> generatePO2();
            case 3 -> generatePO3();
            default -> generateSamplePO();
        };
    }

    public byte[] generateSamplePO() throws Exception {
        return generate("PO", "PO-SAMPLE-001", "Amazon", "Amazon.com",
                "Prof. John Doe", "Computer Science",
                "MBZUAI Campus, Tower A, Abu Dhabi, UAE", "2026-04-18",
                "Standard MBZUAI procurement terms apply. Delivery to reception with packing list.",
                new String[][]{
                    {"1", "MacBook Pro 16-inch M4 Max 1TB",        "2", "14000.00", "28000.00", "GOODS",    "2026-05-15", "NO",  "YES", "REQ-2001", "L001", ""},
                    {"2", "Apple Magic Keyboard with Touch ID",     "2",   "450.00",    "900.00", "GOODS",    "2026-05-15", "NO",  "NO",  "REQ-2001", "L002", ""},
                    {"3", "Apple Magic Mouse",                      "2",   "350.00",    "700.00", "GOODS",    "2026-05-15", "NO",  "NO",  "REQ-2001", "L003", ""},
                    {"4", "USB-C Hub 10-in-1 Thunderbolt 4",       "4",   "150.00",    "600.00", "GOODS",    "2026-05-20", "NO",  "NO",  "REQ-2002", "L004", "Confirm colour"},
                    {"5", "AppleCare+ for MacBook Pro 3-Year",      "2",   "699.00",   "1398.00", "SERVICES", "",           "NO",  "NO",  "",         "L005", ""},
                    {"6", "Extended Warranty Service Agreement",     "1",   "500.00",    "500.00", "SERVICES", "",           "NO",  "NO",  "",         "L006", ""},
                });
    }

    private byte[] generatePO2() throws Exception {
        return generate("PO", "PO-SAMPLE-002", "Dell Technologies", "Dell MENA",
                "Dr. Sarah Ahmed", "AI Research",
                "MBZUAI Campus, Tower B, Server Room B2, Abu Dhabi", "2026-04-18",
                "Vendor to coordinate delivery slot with IT 48 hrs in advance.",
                new String[][]{
                    {"1", "Dell PowerEdge R760 2U Server 512GB",    "1", "45000.00", "45000.00", "GOODS",    "2026-06-01", "YES", "YES", "REQ-3001", "L001", ""},
                    {"2", "Dell EMC Unity XT Storage Array 10TB",   "1", "22000.00", "22000.00", "GOODS",    "2026-06-01", "YES", "YES", "REQ-3001", "L002", ""},
                    {"3", "Dell 10GbE Network Switch 48-Port",      "2",  "8500.00", "17000.00", "GOODS",    "2026-06-01", "YES", "YES", "REQ-3001", "L003", ""},
                    {"4", "Dell UPS 3000VA Rack Mount",             "1",  "4200.00",  "4200.00", "GOODS",    "2026-06-05", "NO",  "NO",  "REQ-3002", "L004", ""},
                    {"5", "Cat6A Patch Cables 1m x50",              "1",   "300.00",    "300.00", "GOODS",    "2026-06-05", "NO",  "NO",  "REQ-3002", "L005", ""},
                    {"6", "On-Site Installation and Configuration",  "1",  "3500.00",  "3500.00", "SERVICES", "",           "NO",  "NO",  "REQ-3003", "L006", ""},
                    {"7", "3-Year ProSupport Plus Contract",         "1",  "5500.00",  "5500.00", "SERVICES", "",           "NO",  "NO",  "REQ-3003", "L007", ""},
                });
    }

    private byte[] generatePO3() throws Exception {
        return generate("PO", "PO-SAMPLE-003", "B&H Photo Video", "B&H Photo",
                "Vaishnav Kamesvaran", "Media & Communications",
                "MBZUAI Campus, Reception Desk, Abu Dhabi", "2026-04-18",
                "Fragile equipment - handle with care. Include all accessories and manuals.",
                new String[][]{
                    {"1", "Sony FX3 Full-Frame Cinema Camera",      "2", "12000.00", "24000.00", "GOODS",    "2026-05-10", "YES", "NO",  "REQ-4001", "L001", ""},
                    {"2", "Sony FE 24-70mm f/2.8 GM II Lens",      "2",  "8000.00", "16000.00", "GOODS",    "2026-05-10", "YES", "NO",  "REQ-4001", "L002", ""},
                    {"3", "Sony FE 70-200mm f/2.8 GM OSS II",      "1",  "9500.00",  "9500.00", "GOODS",    "2026-05-10", "YES", "NO",  "REQ-4001", "L003", ""},
                    {"4", "Manfrotto MT055CXPRO4 Carbon Tripod",   "2",  "1800.00",  "3600.00", "GOODS",    "2026-05-15", "NO",  "NO",  "REQ-4002", "L004", ""},
                    {"5", "SanDisk 512GB CFexpress Card x4",       "1",  "1200.00",  "1200.00", "GOODS",    "2026-05-15", "NO",  "NO",  "REQ-4002", "L005", ""},
                    {"6", "Video Production Training (2 days)",    "1",  "3000.00",  "3000.00", "SERVICES", "",           "NO",  "NO",  "REQ-4003", "L006", ""},
                });
    }

    // ── DP Variants ──────────────────────────────────────────────────────────

    public byte[] generateSampleDP(int n) throws Exception {
        return switch (n) {
            case 2 -> generateDP2();
            case 3 -> generateDP3();
            default -> generateSampleDP();
        };
    }

    public byte[] generateSampleDP() throws Exception {
        return generateWithAmazon("DP", "DP-SAMPLE-001", "Amazon", "Amazon.com",
                "Prof. Chaoyang", "Machine Learning",
                "MBZUAI Campus, Tower A, Abu Dhabi", "2026-04-18",
                "Direct payment via Amazon. Items ship in multiple packages with different delivery dates.",
                "114-3751791-7314618",   // Amazon Order ID — links screenshots to this order
                new String[][]{
                    {"1", "Dell Latitude 5540 Laptop 16GB 512GB",    "3", "5500.00", "16500.00", "GOODS",    "2026-05-20", "YES", "YES", "REQ-5001", "L001", ""},
                    {"2", "Logitech MX Master 3S Mouse",             "3",  "350.00",  "1050.00", "GOODS",    "2026-05-22", "NO",  "NO",  "REQ-5001", "L002", ""},
                    {"3", "Dell UltraSharp 27 4K USB-C Monitor",     "3", "3200.00",  "9600.00", "GOODS",    "2026-05-25", "YES", "NO",  "REQ-5002", "L003", ""},
                    {"4", "Logitech MX Keys S Keyboard",             "3",  "450.00",  "1350.00", "GOODS",    "2026-05-22", "NO",  "NO",  "REQ-5002", "L004", ""},
                    {"5", "Logitech C920 Pro HD Webcam",             "3",  "280.00",   "840.00", "GOODS",    "2026-05-25", "NO",  "NO",  "REQ-5002", "L005", ""},
                    {"6", "Extended Hardware Support 3-Year",        "3",  "500.00",  "1500.00", "SERVICES", "",           "NO",  "NO",  "",         "L006", ""},
                });
    }

    private byte[] generateDP2() throws Exception {
        return generate("DP", "DP-SAMPLE-002", "Microsoft", "Microsoft Gulf",
                "Jason Xue", "Operations",
                "MBZUAI Campus, IT Department, Tower C, Abu Dhabi", "2026-04-18",
                "Enterprise licensing agreement. No physical delivery. PO reference: EA-2026-MBZUAI.",
                "SERVICES", null,  // orderCategory=SERVICES — email ingestion will skip this order
                new String[][]{
                    {"1", "Microsoft 365 E5 License x50",          "1", "85000.00", "85000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6001", "L001", "Annual subscription"},
                    {"2", "Azure Cloud Credits AED 50000",         "1", "50000.00", "50000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6001", "L002", "Pre-paid credits"},
                    {"3", "GitHub Enterprise x50 seats",           "1", "18000.00", "18000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6002", "L003", ""},
                    {"4", "Microsoft 365 Setup & Migration",       "1", "12000.00", "12000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6003", "L004", ""},
                    {"5", "Power BI Premium Per User x50",         "1", "22000.00", "22000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6003", "L005", "Annual"},
                    {"6", "Azure DevOps x50 users",                "1",  "9000.00",  "9000.00", "SERVICES", "",           "NO",  "NO",  "REQ-6004", "L006", ""},
                });
    }

    private byte[] generateDP3() throws Exception {
        return generate("DP", "DP-SAMPLE-003", "Cisco Systems", "Cisco UAE",
                "Dr. Salman Khan", "Network Infrastructure",
                "MBZUAI Data Centre, Abu Dhabi", "2026-04-18",
                "Network upgrade project Phase 2. Coordinate with facilities for installation window.",
                new String[][]{
                    {"1", "Cisco Catalyst 9300 48-Port Switch",    "4", "22000.00", "88000.00", "GOODS",    "2026-06-10", "YES", "YES", "REQ-7001", "L001", ""},
                    {"2", "Cisco ASA 5555-X Firewall",             "2", "35000.00", "70000.00", "GOODS",    "2026-06-10", "YES", "YES", "REQ-7001", "L002", ""},
                    {"3", "Cisco Meraki MR57 WiFi 6E AP",         "20",  "3500.00", "70000.00", "GOODS",    "2026-06-15", "NO",  "YES", "REQ-7002", "L003", ""},
                    {"4", "Cisco AnyConnect Licenses x200",        "1", "15000.00", "15000.00", "SERVICES", "",           "NO",  "NO",  "REQ-7003", "L004", ""},
                    {"5", "Cisco SmartNet 3-Year - Switches",      "4",  "4500.00", "18000.00", "SERVICES", "",           "NO",  "NO",  "REQ-7003", "L005", ""},
                    {"6", "Network Installation and Commissioning", "1", "25000.00", "25000.00", "SERVICES", "",           "NO",  "NO",  "REQ-7004", "L006", ""},
                    {"7", "Post-Installation Testing & Handover",  "1",  "5000.00",  "5000.00", "SERVICES", "",           "NO",  "NO",  "REQ-7004", "L007", ""},
                });
    }

    // ── Core PDF generator ───────────────────────────────────────────────────

    /** Convenience overload for PDFs that include an Amazon Order ID in the header. */
    private byte[] generateWithAmazon(String type, String reference, String vendor, String supplier,
                                       String endUser, String department, String deliveryAddress,
                                       String orderDate, String notes, String amazonOrderId,
                                       String[][] items) throws Exception {
        return generate(type, reference, vendor, supplier, endUser, department, deliveryAddress,
                orderDate, notes, "GOODS", amazonOrderId, items);
    }

    private byte[] generate(String type, String reference, String vendor, String supplier,
                             String endUser, String department, String deliveryAddress,
                             String orderDate, String notes, String[][] items) throws Exception {
        return generate(type, reference, vendor, supplier, endUser, department, deliveryAddress,
                orderDate, notes, "GOODS", null, items);
    }

    private byte[] generate(String type, String reference, String vendor, String supplier,
                             String endUser, String department, String deliveryAddress,
                             String orderDate, String notes, String orderCategory, String amazonOrderId,
                             String[][] items) throws Exception {

        String title = "PO".equals(type) ? "MBZUAI PURCHASE ORDER" : "MBZUAI DIRECT PAYMENT ORDER";

        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font bold    = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            float margin = 42f;
            float y      = page.getMediaBox().getHeight() - margin;
            float lineH  = 14f;

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {

                // Title
                y = writeLine(cs, bold, 15, margin, y, title);
                y -= 4f;
                y = writeLine(cs, regular, 8, margin, y, "────────────────────────────────────────────────────────────────────────────────────────");
                y -= 4f;

                // Header fields
                String[][] fields = {
                        {"Order Reference:", reference},
                        {"Order Type:",      type},
                        {"Order Category:",  orderCategory != null ? orderCategory : "GOODS"},
                        {"Order Date:",      orderDate},
                        {"Vendor:",          vendor},
                        {"Supplier:",        supplier != null ? supplier : ""},
                        {"End User:",        endUser},
                        {"Department:",      department},
                        {"Delivery Address:", deliveryAddress},
                };
                for (String[] f : fields) y = writeField(cs, bold, regular, margin, y, lineH, f[0], f[1]);
                if (amazonOrderId != null && !amazonOrderId.isBlank()) {
                    y = writeField(cs, bold, regular, margin, y, lineH, "Amazon Order ID:", amazonOrderId);
                }

                y -= 4f;
                y = writeField(cs, bold, regular, margin, y, lineH, "Notes:", notes);
                y -= lineH;

                // LINE ITEMS section header
                y = writeLine(cs, bold, 10, margin, y, "LINE ITEMS:");
                y -= 4f;

                // Column headers — pipe-delimited (PdfPoParser uses this line to detect table start)
                y = writeLine(cs, bold, 6, margin, y,
                        "No.|Description|Qty|Unit Price (AED)|Total Price (AED)|Good Type|Expected Delivery|Asset Tag|IT Config|Requisition No.|Line No.|Finance Remarks");

                // Item rows
                double grandTotal = 0;
                for (String[] item : items) {
                    y = writeLine(cs, regular, 7, margin, y, String.join("|", item));
                    try { grandTotal += Double.parseDouble(item[4].replace(",", "")); } catch (Exception ignored) {}
                }

                y -= 6f;
                y = writeLine(cs, regular, 8, margin, y, "────────────────────────────────────────────────────────────────────────────────────────");
                y = writeLine(cs, bold, 11, margin, y, String.format("Total Value: AED %,.2f", grandTotal));
                y -= lineH * 2;
                y = writeLine(cs, regular, 8, margin, y, "This document was generated by MBZUAI Delivery & Store Tracking System.");
                writeLine(cs, regular, 8, margin, y, "Queries: procurement@mbzuai.ac.ae");
            }

            doc.save(out);
            return out.toByteArray();
        }
    }

    private float writeLine(PDPageContentStream cs, PDType1Font font, float size,
                             float x, float y, String text) throws Exception {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitise(text));
        cs.endText();
        return y - (size + 3.5f);
    }

    private float writeField(PDPageContentStream cs, PDType1Font bold, PDType1Font regular,
                              float margin, float y, float lineH, String label, String value) throws Exception {
        cs.beginText(); cs.setFont(bold, 9); cs.newLineAtOffset(margin, y); cs.showText(label); cs.endText();
        cs.beginText(); cs.setFont(regular, 9); cs.newLineAtOffset(margin + 140f, y); cs.showText(sanitise(value)); cs.endText();
        return y - lineH;
    }

    private String sanitise(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) sb.append(c < 32 || c > 255 ? '?' : c);
        return sb.toString();
    }

    // ── Standalone generator ─────────────────────────────────────────────────

    public static void main(String[] args) throws Exception {
        SamplePdfGenerator gen = new SamplePdfGenerator();
        Files.createDirectories(Paths.get("samples"));
        for (int i = 1; i <= 3; i++) {
            byte[] po = gen.generateSamplePO(i);
            try (FileOutputStream f = new FileOutputStream("samples/sample_po_" + i + ".pdf")) { f.write(po); }
            System.out.println("Generated samples/sample_po_" + i + ".pdf");
            byte[] dp = gen.generateSampleDP(i);
            try (FileOutputStream f = new FileOutputStream("samples/sample_dp_" + i + ".pdf")) { f.write(dp); }
            System.out.println("Generated samples/sample_dp_" + i + ".pdf");
        }
    }
}
