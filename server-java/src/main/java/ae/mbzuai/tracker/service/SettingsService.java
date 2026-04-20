package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.entity.AppSetting;
import ae.mbzuai.tracker.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final AppSettingRepository repo;

    // Seeded from application.yml / env vars on first use
    @Value("${app.email-ingestion.mailbox:himanshu@idctechnologies.com}")
    private String defaultMailbox;

    @Value("${app.email-ingestion.enabled:false}")
    private boolean defaultEnabled;

    // ── Key constants ─────────────────────────────────────────────────────────

    public static final String EMAIL_MAILBOX          = "email.mailbox";
    public static final String EMAIL_ENABLED          = "email.enabled";
    public static final String EMAIL_POLL_MINUTES     = "email.poll.interval.minutes";
    public static final String EMAIL_PO_SUBJECTS      = "email.po.subjects";
    public static final String EMAIL_DP_SUBJECTS      = "email.dp.subjects";
    public static final String EMAIL_AMAZON_SUBJECTS  = "email.amazon.subjects";

    // ── Defaults ──────────────────────────────────────────────────────────────

    private static final Map<String, String[]> DEFAULTS = new LinkedHashMap<>();
    static {
        DEFAULTS.put(EMAIL_MAILBOX,         new String[]{"",           "Mailbox email address to poll for orders"});
        DEFAULTS.put(EMAIL_ENABLED,         new String[]{"false",      "Enable automatic email polling (true/false)"});
        DEFAULTS.put(EMAIL_POLL_MINUTES,    new String[]{"10",         "How often to check for new emails (minutes)"});
        DEFAULTS.put(EMAIL_PO_SUBJECTS,     new String[]{"PO Order,Purchase Order,MBZUAI PO", "Subject keywords that identify a PO email (comma-separated)"});
        DEFAULTS.put(EMAIL_DP_SUBJECTS,     new String[]{"DP Order,Direct Payment,MBZUAI DP", "Subject keywords that identify a DP email (comma-separated)"});
        DEFAULTS.put(EMAIL_AMAZON_SUBJECTS, new String[]{"Amazon Delivery,Amazon Order,Delivery Confirmation,Order Confirmation", "Subject keywords for Amazon delivery screenshots (comma-separated)"});
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public String get(String key) {
        return repo.findById(key)
                .map(AppSetting::getValue)
                .orElseGet(() -> defaultValue(key));
    }

    public Map<String, Object> getAll() {
        // Start with all defaults, then overlay DB values
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, String[]> e : DEFAULTS.entrySet()) {
            String k = e.getKey();
            String desc = e.getValue()[1];
            String val = repo.findById(k)
                    .map(AppSetting::getValue)
                    .orElseGet(() -> defaultValue(k));
            result.put(k, Map.of("value", val, "description", desc));
        }
        return result;
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    @Transactional
    public void set(String key, String value) {
        String desc = DEFAULTS.containsKey(key) ? DEFAULTS.get(key)[1] : "";
        repo.save(AppSetting.builder().key(key).value(value).description(desc).build());
    }

    @Transactional
    public void setAll(Map<String, String> values) {
        for (Map.Entry<String, String> e : values.entrySet()) {
            if (DEFAULTS.containsKey(e.getKey())) {
                set(e.getKey(), e.getValue());
            }
        }
    }

    // ── Typed helpers ─────────────────────────────────────────────────────────

    public String getMailbox() {
        String v = get(EMAIL_MAILBOX);
        return (v == null || v.isBlank()) ? defaultMailbox : v;
    }

    public boolean isEmailEnabled() {
        String v = get(EMAIL_ENABLED);
        return "true".equalsIgnoreCase(v) || (v == null && defaultEnabled);
    }

    public long getPollIntervalMs() {
        try {
            long minutes = Long.parseLong(get(EMAIL_POLL_MINUTES).trim());
            return Math.max(1, minutes) * 60_000L;
        } catch (Exception e) {
            return 600_000L; // 10 min default
        }
    }

    /** All subjects that should be processed (PO + DP + Amazon combined). */
    public List<String> getAllSubjectKeywords() {
        return Stream.of(EMAIL_PO_SUBJECTS, EMAIL_DP_SUBJECTS, EMAIL_AMAZON_SUBJECTS)
                .flatMap(k -> parseKeywords(get(k)).stream())
                .toList();
    }

    public List<String> parseKeywords(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private String defaultValue(String key) {
        if (EMAIL_MAILBOX.equals(key)) return defaultMailbox;
        if (EMAIL_ENABLED.equals(key)) return String.valueOf(defaultEnabled);
        String[] def = DEFAULTS.get(key);
        return def != null ? def[0] : "";
    }
}
