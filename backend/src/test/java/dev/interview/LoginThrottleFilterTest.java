package dev.interview;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
  properties = {
    "spring.datasource.url=jdbc:h2:mem:login-throttle;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "app.admin-password=test-admin-password",
    "app.seed-path=../content/Java.md",
    "app.upload-dir=./target/test-uploads",
    "app.login.max-failures=3",
    "app.login.lockout-minutes=15",
  }
)
@AutoConfigureMockMvc
class LoginThrottleFilterTest {

  @Autowired
  MockMvc mvc;

  @Test
  void locksOutAfterRepeatedFailuresEvenWithCorrectPassword() throws Exception {
    for (int i = 0; i < 3; i++) {
      mvc
        .perform(formLogin("/api/login").user("admin").password("wrong-password"))
        .andExpect(status().isUnauthorized());
    }
    mvc
      .perform(formLogin("/api/login").user("admin").password("test-admin-password"))
      .andExpect(status().isTooManyRequests())
      .andExpect(header().string("Retry-After", notNullValue()));
    // A different source key is not affected by the lockout.
    mvc
      .perform(formLogin("/api/login").user("nobody").password("wrong-password"))
      .andExpect(status().isUnauthorized());
  }
}
