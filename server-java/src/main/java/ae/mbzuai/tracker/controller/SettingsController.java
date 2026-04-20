package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll(@AuthenticationPrincipal User user) {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(settingsService.getAll());
    }

    @PutMapping
    public ResponseEntity<Void> saveAll(@RequestBody Map<String, String> values,
                                        @AuthenticationPrincipal User user) {
        if (!"ADMIN".equals(user.getRole())) return ResponseEntity.status(403).build();
        settingsService.setAll(values);
        return ResponseEntity.ok().build();
    }
}
