package ae.mbzuai.tracker.util;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

/**
 * Standalone generator — run main() to produce sample Amazon delivery
 * confirmation PNG images under samples/.
 *
 * These images are designed to be OCR-readable by Tesseract (large fonts,
 * high contrast, clear layout) so the AmazonScreenshotService can extract
 * the order ID and delivery date from them.
 *
 * Run via Maven:
 *   mvn exec:java -Dexec.mainClass="ae.mbzuai.tracker.util.GenerateSampleAmazonImages"
 */
public class GenerateSampleAmazonImages {

    public static void main(String[] args) throws Exception {
        Files.createDirectories(Paths.get("samples"));

        // Screenshot 1 — matches the test order you create via API (order ID 114-3751791-7314618)
        generate("samples/amazon_screenshot_1.png",
                "114-3751791-7314618",
                "May 20, 2026",
                "MacBook Pro 16-inch M4 Max x2");

        // Screenshot 2 — second Amazon order
        generate("samples/amazon_screenshot_2.png",
                "114-8842691-5523401",
                "June 1, 2026",
                "Dell PowerEdge R760 Server x1");

        System.out.println("Generated:");
        System.out.println("  samples/amazon_screenshot_1.png  (order 114-3751791-7314618 → May 20, 2026)");
        System.out.println("  samples/amazon_screenshot_2.png  (order 114-8842691-5523401 → June 1, 2026)");
        System.out.println();
        System.out.println("Next steps:");
        System.out.println("  1. Create orders in the tracker with vendorOrderId matching the above");
        System.out.println("  2. Email these PNG files to himanshu@idctechnologies.com as attachments");
        System.out.println("  3. Click 'Check Email' in the Tracker or wait 10 min for auto-poll");
    }

    private static void generate(String outputPath, String amazonOrderId,
                                  String deliveryDate, String itemDesc) throws Exception {
        int W = 900, H = 520;
        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();

        // Rendering hints for clean text (helps Tesseract)
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_OFF);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);

        // ── Background ───────────────────────────────────────────────────
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, W, H);

        // ── Amazon header bar ────────────────────────────────────────────
        g.setColor(new Color(35, 47, 62));   // Amazon dark navy
        g.fillRect(0, 0, W, 65);

        g.setColor(new Color(255, 168, 0));  // Amazon orange
        g.setFont(new Font("SansSerif", Font.BOLD, 34));
        g.drawString("amazon", 20, 48);

        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.PLAIN, 16));
        g.drawString("Order Confirmation & Delivery Update", 200, 42);

        // ── Green confirmation banner ────────────────────────────────────
        g.setColor(new Color(0, 128, 0));
        g.fillRect(0, 65, W, 50);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 20));
        g.drawString("  Your order has been confirmed and is on its way!", 10, 97);

        // ── Body ─────────────────────────────────────────────────────────
        int y = 155;
        int leftCol = 30;

        g.setColor(new Color(50, 50, 50));
        g.setFont(new Font("SansSerif", Font.BOLD, 18));
        g.drawString("Order Details", leftCol, y);
        y += 35;

        // Order ID — must be large and clear for OCR
        g.setColor(Color.BLACK);
        g.setFont(new Font("Monospaced", Font.BOLD, 22));
        g.drawString("Order #" + amazonOrderId, leftCol, y);
        y += 40;

        g.setFont(new Font("SansSerif", Font.PLAIN, 18));
        g.drawString("Item:  " + itemDesc, leftCol, y);
        y += 40;

        // Separator
        g.setColor(new Color(220, 220, 220));
        g.fillRect(leftCol, y, W - 60, 2);
        y += 25;

        // Delivery date — must match our regex patterns
        g.setColor(new Color(0, 100, 0));
        g.setFont(new Font("SansSerif", Font.BOLD, 24));
        g.drawString("Arriving by " + deliveryDate, leftCol, y);
        y += 38;

        g.setColor(new Color(50, 50, 50));
        g.setFont(new Font("SansSerif", Font.PLAIN, 18));
        g.drawString("Estimated delivery: " + deliveryDate, leftCol, y);
        y += 38;

        g.drawString("Expected delivery: " + deliveryDate, leftCol, y);
        y += 50;

        // Separator
        g.setColor(new Color(220, 220, 220));
        g.fillRect(leftCol, y, W - 60, 2);
        y += 25;

        // Footer
        g.setColor(new Color(120, 120, 120));
        g.setFont(new Font("SansSerif", Font.PLAIN, 14));
        g.drawString("Delivery Address: MBZUAI Campus, Abu Dhabi, UAE", leftCol, y);
        y += 22;
        g.drawString("Questions? Visit amazon.com/orders or contact customer service.", leftCol, y);

        g.dispose();
        ImageIO.write(img, "PNG", new File(outputPath));
        System.out.println("  Written: " + outputPath);
    }
}
