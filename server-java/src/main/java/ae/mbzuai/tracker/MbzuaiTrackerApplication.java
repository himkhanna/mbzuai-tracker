package ae.mbzuai.tracker;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MbzuaiTrackerApplication {
    public static void main(String[] args) {
        SpringApplication.run(MbzuaiTrackerApplication.class, args);
    }
}
