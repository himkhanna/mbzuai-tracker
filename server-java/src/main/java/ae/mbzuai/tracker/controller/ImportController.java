package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.ImportService;
import ae.mbzuai.tracker.util.SamplePdfGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
public class ImportController {

    private final ImportService importService;
    private final SamplePdfGenerator samplePdfGenerator;

    @GetMapping("/template/po")
    public ResponseEntity<byte[]> poTemplate() throws Exception {
        byte[] data = importService.generatePOTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=po-import-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/template/dp")
    public ResponseEntity<byte[]> dpTemplate() throws Exception {
        byte[] data = importService.generateDPTemplate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=dp-import-template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @PostMapping("/po")
    public ResponseEntity<Map<String, Object>> importPO(@RequestParam("file") MultipartFile file,
                                                         @AuthenticationPrincipal User user) throws Exception {
        if (!List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT").contains(user.getRole())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(importService.importPO(file, user));
    }

    @PostMapping("/dp")
    public ResponseEntity<Map<String, Object>> importDP(@RequestParam("file") MultipartFile file,
                                                         @AuthenticationPrincipal User user) throws Exception {
        if (!List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT").contains(user.getRole())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(importService.importDP(file, user));
    }

    @GetMapping("/template/po-pdf")
    public ResponseEntity<byte[]> poSamplePdf() throws Exception {
        byte[] data = samplePdfGenerator.generateSamplePO();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mbzuai-po-template.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    @GetMapping("/template/dp-pdf")
    public ResponseEntity<byte[]> dpSamplePdf() throws Exception {
        byte[] data = samplePdfGenerator.generateSampleDP();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=mbzuai-dp-template.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
