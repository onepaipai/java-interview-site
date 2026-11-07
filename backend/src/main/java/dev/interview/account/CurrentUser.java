package dev.interview.account;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Shared identity lookup; HTTP controllers never depend on another controller. */
@Component
public class CurrentUser {

  private final AccountRepository repository;

  CurrentUser(AccountRepository repository) {
    this.repository = repository;
  }

  public long id(Authentication authentication) {
    if (authentication == null) throw new ResponseStatusException(UNAUTHORIZED, "请先登录");
    return repository.id(authentication.getName());
  }
}
