package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.EmailImportResult;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.EmailIngestionService;
import ae.mbzuai.tracker.service.SampleImageService;
import ae.mbzuai.tracker.util.SamplePdfGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/samples")
@RequiredArgsConstructor
public class AdminSampleController {

    private final SamplePdfGenerator samplePdfGenerator;
    private final SampleImageService sampleImageService;
    private final EmailIngestionService emailIngestionService;

    // ── Sample PDFs ───────────────────────────────────────────────────────────

    @GetMapping("/po-pdf/{n}")
    public ResponseEntity<byte[]> poPdf(@PathVariable int n,
                                        @AuthenticationPrincipal User user) throws Exception {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();
        byte[] data = samplePdfGenerator.generateSamplePO(n);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sample-po-" + n + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @GetMapping("/dp-pdf/{n}")
    public ResponseEntity<byte[]> dpPdf(@PathVariable int n,
                                        @AuthenticationPrincipal User user) throws Exception {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();
        byte[] data = samplePdfGenerator.generateSampleDP(n);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sample-dp-" + n + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    // ── Amazon Screenshot ─────────────────────────────────────────────────────

    public record ShipItemReq(String description, int quantity) {}
    public record ShipmentReq(String deliveryDate, List<ShipItemReq> items) {}
    public record AmazonImageReq(String orderId, List<ShipmentReq> shipments) {}

    @PostMapping("/amazon-image")
    public ResponseEntity<byte[]> amazonImage(@RequestBody AmazonImageReq req,
                                              @AuthenticationPrincipal User user) throws Exception {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();

        List<SampleImageService.Shipment> shipments = req.shipments().stream()
                .map(s -> new SampleImageService.Shipment(
                        s.deliveryDate(),
                        s.items().stream()
                                .map(i -> new SampleImageService.ShipItem(i.description(), i.quantity()))
                                .toList()))
                .toList();

        byte[] png = sampleImageService.generateAmazonScreenshot(req.orderId(), shipments);
        String name = "amazon-" + req.orderId().replace("-", "") + ".png";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + name)
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    // ── Email check ───────────────────────────────────────────────────────────

    @PostMapping("/check-email")
    public ResponseEntity<EmailImportResult> checkEmail(@AuthenticationPrincipal User user) {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(emailIngestionService.checkInbox());
    }
}
