package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.AuditLogDto;
import ae.mbzuai.tracker.entity.AuditLog;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> list(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @AuthenticationPrincipal User actor) {

        if (!List.of("ADMIN", "VENDOR_MANAGEMENT").contains(actor.getRole())) {
            return ResponseEntity.status(403).build();
        }

        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (userId != null) predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (entityType != null) predicates.add(cb.equal(root.get("entityType"), entityType));
            if (entityId != null) predicates.add(cb.equal(root.get("entityId"), entityId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditLog> result = auditLogRepository.findAll(spec, pageable);
        List<AuditLogDto> dtos = result.getContent().stream().map(AuditLogDto::from).toList();
        Map<String, Object> response = new HashMap<>();
        response.put("data", dtos);
        response.put("total", result.getTotalElements());
        return ResponseEntity.ok(response);
    }
}
