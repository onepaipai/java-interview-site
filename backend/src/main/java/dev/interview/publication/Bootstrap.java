package dev.interview.publication;

import dev.interview.account.PasswordPolicy;
import dev.interview.question.QuestionService;
import dev.interview.shared.MarkdownImporter;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class Bootstrap {

  @Bean
  ApplicationRunner initialize(
    JdbcTemplate db,
    PasswordEncoder encoder,
    QuestionService service,
    MarkdownImporter importer,
    SeniorQuestionImporter senior,
    ExplanationImporter explanations,
    @Value("${app.admin-username}") String username,
    @Value("${app.admin-password}") String password,
    @Value("${app.seed-path}") String seed
  ) {
    return args -> {
      if (db.queryForObject("SELECT COUNT(*) FROM accounts", Integer.class) == 0) {
        if (
          !username.matches("[a-zA-Z0-9_-]{3,40}") ||
          password.length() < 12 ||
          password.length() > 64
        ) throw new IllegalStateException(
          "首次启动须设置 ADMIN_PASSWORD（12至64字符）和有效 ADMIN_USERNAME"
        );
        PasswordPolicy.validate(password);
        db.update(
          "INSERT INTO accounts(username,password,role) VALUES(?,?,'ADMIN')",
          username,
          encoder.encode(password)
        );
      }
      if (Files.isRegularFile(Path.of(seed))) {
        var p = importer.parse(Files.readString(Path.of(seed), StandardCharsets.UTF_8));
        if (
          db.queryForObject("SELECT COUNT(*) FROM questions", Integer.class) == 0
        ) service.importItems(p.questions(), p.documents(), "skip");
        service.markImportedDocuments(p.documents());
        senior.importAll(
          Path.of(seed).toAbsolutePath().getParent().resolve("senior/manifest.json")
        );
        explanations.importAll(
          Path.of(seed).toAbsolutePath().getParent().resolve("explanations/manifest.json")
        );
      }
    };
  }
}
