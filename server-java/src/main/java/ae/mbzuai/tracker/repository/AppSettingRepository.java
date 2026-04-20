package ae.mbzuai.tracker.repository;

import ae.mbzuai.tracker.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting, String> {}
