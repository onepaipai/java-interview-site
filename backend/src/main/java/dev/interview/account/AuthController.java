package dev.interview.account;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthController {

  private final AccountService accounts;

  AuthController(AccountService accounts) {
    this.accounts = accounts;
  }

  @GetMapping("/api/health")
  Map<String, String> health() {
    accounts.health();
    return Map.of("status", "UP");
  }

  @GetMapping("/api/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @GetMapping("/api/me")
  Object me(Authentication auth) {
    return accounts.me(auth.getName());
  }

  record Position(@NotNull Long questionId) {}

  @PutMapping("/api/me/position")
  void position(Authentication auth, @Valid @RequestBody Position input) {
    accounts.position(auth.getName(), input.questionId());
  }

  record Password(
    @NotBlank String oldPassword,
    @NotNull @Size(min = 12, max = 64) String newPassword
  ) {}

  @PutMapping("/api/me/password")
  void password(
    Authentication auth,
    @Valid @RequestBody Password input,
    jakarta.servlet.http.HttpServletRequest request
  ) {
    var session = request.getSession(false);
    accounts.password(
      auth.getName(),
      input.oldPassword(),
      input.newPassword(),
      session == null ? null : session.getId()
    );
  }

  record Account(
    @NotNull @Pattern(regexp = "[a-zA-Z0-9_-]{3,40}") String username,
    @NotNull @Size(min = 12, max = 64) String password
  ) {}

  @GetMapping("/api/admin/accounts")
  Object accounts() {
    return accounts.accounts();
  }

  @PostMapping("/api/admin/accounts")
  void create(@Valid @RequestBody Account input) {
    accounts.create(input.username(), input.password());
  }

  record Rename(@NotNull @Pattern(regexp = "[a-zA-Z0-9_-]{3,40}") String username) {}

  @PutMapping("/api/admin/accounts/{id}")
  void rename(@PathVariable long id, @Valid @RequestBody Rename input) {
    accounts.rename(id, input.username());
  }

  record ResetPassword(@NotNull @Size(min = 12, max = 64) String password) {}

  @PutMapping("/api/admin/accounts/{id}/password")
  void reset(@PathVariable long id, @Valid @RequestBody ResetPassword input) {
    accounts.reset(id, input.password());
  }

  @DeleteMapping("/api/admin/accounts/{id}")
  void remove(@PathVariable long id) {
    accounts.remove(id);
  }
}
