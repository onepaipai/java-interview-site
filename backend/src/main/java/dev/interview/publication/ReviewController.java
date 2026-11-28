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
  Map<String, Object> list(
    @RequestParam(defaultValue = "all") String status,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    if (page < 1 || page > 100000 || size < 1 || size > 100) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "分页参数无效"
    );
    String filter = "all".equals(status) ? null : status;
    if (
      status.isBlank() || (!"all".equals(status) && !STATUSES.contains(status))
    ) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "审核状态筛选无效");
    var aggregated = repository.counts();
    Map<String, Integer> counts = new LinkedHashMap<>();
    for (String value : STATUSES) counts.put(value, aggregated.getOrDefault(value, 0));
    long total = repository.count(filter);
    var items = new ArrayList<Map<String, Object>>();
    for (ReviewRepository.Row row : repository.list(filter, size, (long) (page - 1) * size)) {
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
    return Map.of("counts", counts, "items", items, "total", total, "page", page, "size", size);
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
    ReviewRepository.Row row = repository.findBySourceKey(sourceKey);
    if (row == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "题目未发布解析包");
    String encoded;
    try {
      encoded = json.writeValueAsString(evidence);
    } catch (Exception e) {
      throw badRequest("证据格式无效");
    }
    repository.upsert(sourceKey, row.answerSha256(), status, version, encoded, reviewer);
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
