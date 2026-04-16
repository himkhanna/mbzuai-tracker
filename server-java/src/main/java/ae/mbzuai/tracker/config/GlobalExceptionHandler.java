package ae.mbzuai.tracker.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        log.warn("RuntimeException: {}", ex.getMessage());
        int status = 400;
        if (ex.getMessage() != null && ex.getMessage().contains("not found")) status = 404;
        if (ex.getMessage() != null && ex.getMessage().contains("Access denied")) status = 403;
        return ResponseEntity.status(status).body(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Unknown error"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
    }
}
