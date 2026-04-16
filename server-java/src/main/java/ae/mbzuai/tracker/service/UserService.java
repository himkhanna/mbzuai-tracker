package ae.mbzuai.tracker.service;

import ae.mbzuai.tracker.dto.UserDto;
import ae.mbzuai.tracker.dto.UserRequest;
import ae.mbzuai.tracker.entity.User;
import ae.mbzuai.tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDto> listAll() {
        return userRepository.findAll().stream().map(UserDto::from).collect(Collectors.toList());
    }

    public UserDto createUser(UserRequest req) {
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }
        String rawPassword = req.getPassword() != null ? req.getPassword() : generateTempPassword();
        User user = User.builder()
                .name(req.getName())
                .email(req.getEmail())
                .password(passwordEncoder.encode(rawPassword))
                .role(req.getRole())
                .department(req.getDepartment())
                .isActive(true)
                .build();
        return UserDto.from(userRepository.save(user));
    }

    public UserDto updateUser(String id, UserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (req.getName() != null) user.setName(req.getName());
        if (req.getRole() != null) user.setRole(req.getRole());
        if (req.getDepartment() != null) user.setDepartment(req.getDepartment());
        if (req.getIsActive() != null) user.setActive(req.getIsActive());
        return UserDto.from(userRepository.save(user));
    }

    public void deactivateUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(false);
        userRepository.save(user);
    }

    public String resetPassword(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        String tempPassword = generateTempPassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);
        return tempPassword;
    }

    private String generateTempPassword() {
        return "Temp" + UUID.randomUUID().toString().substring(0, 6) + "!";
    }
}
