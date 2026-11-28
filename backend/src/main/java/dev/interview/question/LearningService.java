package dev.interview.question;

import jakarta.validation.constraints.*;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LearningService {

  private final LearningRepository repository;
  private final QuestionService questions;

  LearningService(LearningRepository repository, QuestionService questions) {
    this.repository = repository;
    this.questions = questions;
  }

  public record Progress(
    @NotNull @Pattern(regexp = "NEW|NO|PARTIAL|YES") String mastery,
    boolean favorite,
    @NotNull @Size(max = 30000) String note,
    boolean reviewed
  ) {}

  @Transactional
  public void progress(long user, long id, Progress input) {
    questions.question(id, user, false);
    repository.progress(user, id, input, new Timestamp(System.currentTimeMillis()));
  }

  public Map<String, Object> stats(long user) {
    return repository.stats(user);
  }

  public List<Map<String, Object>> export(long user) {
    return repository.export(user);
  }
}
