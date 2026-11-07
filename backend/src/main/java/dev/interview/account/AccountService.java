package dev.interview.account;

import static org.springframework.http.HttpStatus.*;

import java.util.*;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {

  private final AccountRepository repository;
  private final PasswordEncoder encoder;
  private final SessionRegistry sessions;

  AccountService(AccountRepository repository, PasswordEncoder encoder, SessionRegistry sessions) {
    this.repository = repository;
    this.encoder = encoder;
    this.sessions = sessions;
  }

  public Map<String, Object> me(String username) {
    return repository.me(username);
  }

  public void health() {
    repository.health();
  }

  @Transactional
  public void position(String username, long question) {
    if (!repository.questionExists(question)) throw new ResponseStatusException(
      NOT_FOUND,
      "题目不存在"
    );
    repository.position(repository.id(username), question);
  }

  @Transactional
  public void password(
    String username,
    String oldPassword,
    String newPassword,
    String keepSession
  ) {
    PasswordPolicy.validate(newPassword);
    long id = repository.id(username);
    if (!encoder.matches(oldPassword, repository.password(id))) throw new ResponseStatusException(
      BAD_REQUEST,
      "原密码错误"
    );
    repository.password(id, encoder.encode(newPassword));
    expire(username, keepSession);
  }

  public List<Map<String, Object>> accounts() {
    return repository.accounts();
  }

  @Transactional
  public void create(String username, String password) {
    PasswordPolicy.validate(password);
    repository.create(username, encoder.encode(password));
  }

  private String ordinary(long id) {
    var account = repository.account(id);
    if ("ADMIN".equals(account.get("role"))) throw new ResponseStatusException(
      BAD_REQUEST,
      "管理员请使用个人密码设置"
    );
    return account.get("username").toString();
  }

  @Transactional
  public void rename(long id, String name) {
    String old = ordinary(id);
    repository.rename(id, name);
    if (!old.equals(name)) expire(old, null);
  }

  @Transactional
  public void reset(long id, String password) {
    PasswordPolicy.validate(password);
    String name = ordinary(id);
    repository.password(id, encoder.encode(password));
    expire(name, null);
  }

  @Transactional
  public void remove(long id) {
    String name = ordinary(id);
    repository.delete(id);
    expire(name, null);
  }

  private void expire(String name, String keepSession) {
    for (Object principal : sessions.getAllPrincipals())
      if (
        principal instanceof org.springframework.security.core.userdetails.UserDetails user &&
        name.equals(user.getUsername())
      ) sessions
        .getAllSessions(principal, false)
        .stream()
        .filter(session -> !session.getSessionId().equals(keepSession))
        .forEach(org.springframework.security.core.session.SessionInformation::expireNow);
  }
}
