package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.UserDto;
import ae.mbzuai.tracker.dto.UserRequest;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDto>> list(@AuthenticationPrincipal User actor) {
        if (!"ADMIN".equals(actor.getRole())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(userService.listAll());
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@RequestBody UserRequest req,
                                           @AuthenticationPrincipal User actor) {
        if (!"ADMIN".equals(actor.getRole())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(userService.createUser(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDto> update(@PathVariable String id,
                                           @RequestBody UserRequest req,
                                           @AuthenticationPrincipal User actor) {
        if (!"ADMIN".equals(actor.getRole())) return ResponseEntity.status(403).build();
        return ResponseEntity.ok(userService.updateUser(id, req));
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable String id,
                                                           @AuthenticationPrincipal User actor) {
        if (!"ADMIN".equals(actor.getRole())) return ResponseEntity.status(403).build();
        userService.deactivateUser(id);
        return ResponseEntity.ok(Map.of("message", "User deactivated"));
    }

    @PutMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable String id,
                                                              @AuthenticationPrincipal User actor) {
        if (!"ADMIN".equals(actor.getRole())) return ResponseEntity.status(403).build();
        String tempPassword = userService.resetPassword(id);
        return ResponseEntity.ok(Map.of("message", "Password reset", "tempPassword", tempPassword));
    }
}
