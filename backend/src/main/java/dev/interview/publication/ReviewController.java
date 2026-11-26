package dev.interview.publication;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class ReviewController {

  private static final List<String> STATUSES = List.of("pending", "verified", "rejected", "stale");

  private final ReviewRepository repository;
  private final ObjectMapper json;

  public ReviewController(ReviewRepository repository, ObjectMapper json) {
    this.repository = repository;
    this.json = json;
  }

  public record ReviewInput(
    String status,
    String applicableVersion,
    List<String> evidence,
    String reviewer
  ) {}

  @GetMapping("/reviews")
  Map<String, Object> list() {
    List<ReviewRepository.Row> rows = repository.list();
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (String status : STATUSES) counts.put(status, 0);
    List<Map<String, Object>> items = new ArrayList<>();
    for (ReviewRepository.Row row : rows) {
      counts.merge(row.status(), 1, Integer::sum);
      items.add(
        Map.of(
          "questionId",
          row.questionId(),
          "sourceKey",
          row.sourceKey(),
          "title",
          row.title(),
          "answerSha256",
          row.answerSha256(),
          "status",
          row.status(),
          "applicableVersion",
          row.applicableVersion(),
          "evidence",
          parseEvidence(row.evidence()),
          "reviewer",
          row.reviewer(),
          "updatedAt",
          row.updatedAt() == null ? "" : row.updatedAt()
        )
      );
    }
    return Map.of("counts", counts, "items", items);
  }

  @PutMapping("/reviews/{sourceKey}")
  Map<String, Object> save(@PathVariable String sourceKey, @RequestBody ReviewInput input) {
    String status = input.status();
    String version = input.applicableVersion() == null ? "" : input.applicableVersion().strip();
    String reviewer = input.reviewer() == null ? "" : input.reviewer().strip();
    List<String> evidence = input.evidence() == null ? List.of() : input.evidence();
    if (status == null || !STATUSES.contains(status)) throw badRequest("审核状态无效");
    if (status.equals("verified")) {
      if (version.isBlank() || reviewer.isBlank() || evidence.isEmpty()) throw badRequest(
        "已核验需填写适用版本、审核人与证据"
      );
    }
    if (evidence.stream().anyMatch(e -> e == null || e.isBlank())) throw badRequest(
      "证据链接不能为空"
    );
    String answerHash = repository
      .list()
      .stream()
      .filter(row -> row.sourceKey().equals(sourceKey))
      .findFirst()
      .map(ReviewRepository.Row::answerSha256)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "题目未发布解析包"));
    String encoded;
    try {
      encoded = json.writeValueAsString(evidence);
    } catch (Exception e) {
      throw badRequest("证据格式无效");
    }
    repository.upsert(sourceKey, answerHash, status, version, encoded, reviewer);
    return Map.of(
      "sourceKey",
      sourceKey,
      "status",
      status,
      "applicableVersion",
      version,
      "evidence",
      evidence,
      "reviewer",
      reviewer
    );
  }

  private List<String> parseEvidence(String raw) {
    try {
      return json.readValue(raw, new com.fasterxml.jackson.core.type.TypeReference<>() {});
    } catch (Exception e) {
      return List.of();
    }
  }

  private static ResponseStatusException badRequest(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
