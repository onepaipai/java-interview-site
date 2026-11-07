package dev.interview.account;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

import java.nio.charset.StandardCharsets;
import org.springframework.web.server.ResponseStatusException;

public final class PasswordPolicy {

  private PasswordPolicy() {}

  public static void validate(String password) {
    if (
      password == null || password.length() < 12 || password.length() > 64
    ) throw new ResponseStatusException(BAD_REQUEST, "密码需要 12–64 个字符");
    if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(
      BAD_REQUEST,
      "密码的 UTF-8 编码不能超过 72 字节，请缩短中文或表情密码"
    );
  }
}
