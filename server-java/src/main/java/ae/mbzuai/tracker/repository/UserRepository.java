package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    List<User> findByRoleInAndIsActive(List<String> roles, boolean isActive);
    Optional<User> findFirstByRoleAndIsActive(String role, boolean isActive);
}
