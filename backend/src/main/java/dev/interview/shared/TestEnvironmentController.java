package dev.interview.shared;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;

/** Enabled only by the disposable E2E launcher, never by the deployment template. */
@RestController
@ConditionalOnProperty(name = "app.test-environment-enabled", havingValue = "true")
public class TestEnvironmentController {

  private final String id;

  TestEnvironmentController(@Value("${app.test-environment-id}") String id) {
    if (id.isBlank()) throw new IllegalArgumentException("测试环境须设置独立标识");
    this.id = id;
  }

  @GetMapping("/api/test-environment")
  Map<String, String> environment() {
    return Map.of("id", id);
  }
}
