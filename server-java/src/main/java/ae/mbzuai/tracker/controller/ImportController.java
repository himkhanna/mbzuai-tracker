package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.ImportService;
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
}
