package ae.mbzuai.tracker.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.List;

/**
 * Generates Amazon delivery confirmation screenshot PNGs.
 * Supports multiple shipments — each shipment has its own delivery date and item list.
 * Images use large fonts + no antialiasing so Tesseract OCR reads them accurately.
 */
@Service
public class SampleImageService {

    public record ShipItem(String description, int quantity) {}
    public record Shipment(String deliveryDate, List<ShipItem> items) {}

    private static final Color NAVY    = new Color(35, 47, 62);
    private static final Color ORANGE  = new Color(255, 168, 0);
    private static final Color GREEN   = new Color(0, 128, 0);
    private static final Color DKGREEN = new Color(0, 100, 0);
    private static final Color LGREY   = new Color(210, 210, 210);
    private static final Color DGREY   = new Color(60, 60, 60);
    private static final Color MGREY   = new Color(130, 130, 130);
    private static final Color BGSHIP  = new Color(240, 248, 240);  // pale green for each shipment block

    public byte[] generateAmazonScreenshot(String orderId, List<Shipment> shipments) throws Exception {
        int W = 920;
        int itemRows = shipments.stream().mapToInt(s -> s.items().size()).sum();
        // Height: header(130) + per-shipment header(55) + per-item row(30) + footer(70)
        int H = 130 + shipments.size() * 65 + itemRows * 32 + 70;
        H = Math.max(H, 450);

        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();

        // Crisp text for OCR
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_OFF);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);

        // ── White background ─────────────────────────────────────────────────
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, W, H);

        // ── Amazon header bar ────────────────────────────────────────────────
        g.setColor(NAVY);
        g.fillRect(0, 0, W, 60);
        g.setColor(ORANGE);
        g.setFont(new Font("SansSerif", Font.BOLD, 32));
        g.drawString("amazon", 18, 44);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        g.drawString("Order Confirmation & Delivery Tracking", 195, 38);

        // ── Green banner ─────────────────────────────────────────────────────
        g.setColor(GREEN);
        g.fillRect(0, 60, W, 44);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 17));
        g.drawString("  Your order is confirmed. Items may ship in multiple packages.", 8, 87);

        // ── Order ID ─────────────────────────────────────────────────────────
        int y = 122, left = 28;
        g.setColor(Color.BLACK);
        g.setFont(new Font("Monospaced", Font.BOLD, 22));
        g.drawString("Order #" + orderId, left, y);
        y += 18;
        g.setColor(LGREY);
        g.fillRect(left, y, W - 56, 1);
        y += 16;

        // ── Shipments ────────────────────────────────────────────────────────
        int total = shipments.size();
        for (int si = 0; si < total; si++) {
            Shipment ship = shipments.get(si);

            // Shipment header background
            g.setColor(BGSHIP);
            int blockH = 48 + ship.items().size() * 32;
            g.fillRect(left - 6, y - 4, W - 44, blockH);
            g.setColor(LGREY);
            g.drawRect(left - 6, y - 4, W - 44, blockH);

            // Shipment label + delivery date — written twice for OCR reliability
            g.setColor(DKGREEN);
            g.setFont(new Font("SansSerif", Font.BOLD, 19));
            String shipLabel = String.format("Shipment %d of %d  —  Arriving by %s", si + 1, total, ship.deliveryDate());
            g.drawString(shipLabel, left + 4, y + 18);
            y += 26;

            // Repeat date in plain text so regex has another match opportunity
            g.setColor(DGREY);
            g.setFont(new Font("SansSerif", Font.PLAIN, 14));
            g.drawString("Estimated delivery: " + ship.deliveryDate() +
                         "    Expected delivery: " + ship.deliveryDate(), left + 4, y + 8);
            y += 20;

            // Items in this shipment
            for (ShipItem item : ship.items()) {
                g.setColor(DGREY);
                g.setFont(new Font("SansSerif", Font.PLAIN, 15));
                String line = "    \u2022  " + item.description() + "  (Qty: " + item.quantity() + ")";
                g.drawString(line, left + 4, y + 14);
                y += 30;
            }

            y += 12; // gap between shipments
        }

        // ── Footer ───────────────────────────────────────────────────────────
        y += 4;
        g.setColor(LGREY);
        g.fillRect(left, y, W - 56, 1);
        y += 16;
        g.setColor(MGREY);
        g.setFont(new Font("SansSerif", Font.PLAIN, 12));
        g.drawString("Delivery Address: MBZUAI Campus, Abu Dhabi, UAE", left, y);
        y += 18;
        g.drawString("Questions? Visit amazon.com/orders or contact customer service.", left, y);

        g.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", out);
        return out.toByteArray();
    }
}
