package dev.interview.question;

import dev.interview.account.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LearningController {

  private final LearningService service;
  private final CurrentUser current;

  LearningController(LearningService service, CurrentUser current) {
    this.service = service;
    this.current = current;
  }

  @PutMapping("/questions/{id}/progress")
  void progress(
    Authentication auth,
    @PathVariable long id,
    @Valid @RequestBody LearningService.Progress input
  ) {
    service.progress(current.id(auth), id, input);
  }

  @GetMapping("/stats")
  Object stats(Authentication auth) {
    return service.stats(current.id(auth));
  }

  @GetMapping("/me/export")
  Object export(Authentication auth) {
    return service.export(current.id(auth));
  }
}
