package ae.mbzuai.tracker.dto;

import ae.mbzuai.tracker.entity.User;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class UserDto {
    private String id;
    private String name;
    private String email;
    private String role;
    private String department;
    @JsonProperty("isActive")
    private boolean isActive;
    private Instant createdAt;

    public static UserDto from(User u) {
        return UserDto.builder()
                .id(u.getId())
                .name(u.getName())
                .email(u.getEmail())
                .role(u.getRole())
                .department(u.getDepartment())
                .isActive(u.isActive())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
