package ae.mbzuai.tracker.controller;

import ae.mbzuai.tracker.dto.ItemDto;
import ae.mbzuai.tracker.dto.ItemRequest;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping("/{id}")
    public ResponseEntity<ItemDto> get(@PathVariable String id) {
        return ResponseEntity.ok(itemService.getItem(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ItemDto> update(@PathVariable String id,
                                           @RequestBody ItemRequest req,
                                           @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(itemService.updateItem(id, req, user, user.getRole()));
    }

    @PutMapping("/{id}/receive")
    public ResponseEntity<ItemDto> receive(@PathVariable String id,
                                            @RequestBody(required = false) Map<String, Object> body,
                                            @AuthenticationPrincipal User user) {
        Integer qty = null;
        if (body != null && body.containsKey("quantityReceived")) {
            qty = ((Number) body.get("quantityReceived")).intValue();
        }
        return ResponseEntity.ok(itemService.markReceived(id, qty, user, user.getRole()));
    }

    @PutMapping("/{id}/asset-tag")
    public ResponseEntity<ItemDto> assetTag(@PathVariable String id,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(itemService.markAssetTagged(id, user, user.getRole()));
    }

    @PutMapping("/{id}/it-config")
    public ResponseEntity<ItemDto> itConfig(@PathVariable String id,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(itemService.markItConfigured(id, user, user.getRole()));
    }

    @PutMapping("/{id}/handover")
    public ResponseEntity<ItemDto> handover(@PathVariable String id,
                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(itemService.markHandedOver(id, user, user.getRole()));
    }

    @PutMapping("/{id}/clear-date")
    public ResponseEntity<ItemDto> clearDate(@PathVariable String id,
                                              @RequestBody Map<String, String> body,
                                              @AuthenticationPrincipal User user) {
        String fieldName = body.get("fieldName");
        return ResponseEntity.ok(itemService.clearDate(id, fieldName, user, user.getRole()));
    }
}
