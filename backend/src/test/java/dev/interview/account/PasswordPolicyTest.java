package dev.interview.account;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class PasswordPolicyTest {

  @Test
  void acceptedUnicodePasswordCanBeEncodedAndMatched() {
    String value = "汉".repeat(24);
    PasswordPolicy.validate(value);
    var encoder = new BCryptPasswordEncoder();
    assertTrue(encoder.matches(value, encoder.encode(value)));
  }

  @Test
  void rejectsUtf8OverflowBeforeEncoding() {
    for (String value : new String[] { "汉".repeat(25), "😀".repeat(19) }) {
      var error = assertThrows(ResponseStatusException.class, () -> PasswordPolicy.validate(value));
      assertEquals(400, error.getStatusCode().value());
      assertTrue(error.getReason().contains("72 字节"));
    }
    assertDoesNotThrow(() -> PasswordPolicy.validate("a".repeat(64)));
    assertThrows(ResponseStatusException.class, () -> PasswordPolicy.validate("a".repeat(65)));
  }
}
