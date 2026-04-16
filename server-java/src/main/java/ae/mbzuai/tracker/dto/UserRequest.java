package ae.mbzuai.tracker.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UserRequest {
    private String name;
    private String email;
    private String password;
    private String role;
    private String department;
    @JsonProperty("isActive")
    private Boolean isActive;
}
