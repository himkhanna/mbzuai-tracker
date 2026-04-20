package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.EmailImportResult;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.EmailIngestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/email")
@RequiredArgsConstructor
public class EmailController {

    private final EmailIngestionService emailIngestionService;

    @PostMapping("/check")
    public ResponseEntity<EmailImportResult> checkEmail(@AuthenticationPrincipal User user) {
        if (!List.of("ADMIN", "VENDOR_MANAGEMENT", "PROCUREMENT").contains(user.getRole())) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(emailIngestionService.checkInbox());
    }
}
