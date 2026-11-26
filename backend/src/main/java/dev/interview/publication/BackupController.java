package dev.interview.publication;

import dev.interview.account.CurrentUser;
import dev.interview.question.CatalogService;
import dev.interview.question.QuestionService;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class BackupController {

  final QuestionService service;
  final CatalogService catalog;
  final PublicationStatusService publications;
  final CurrentUser auth;

  BackupController(
    QuestionService service,
    CatalogService catalog,
    PublicationStatusService publications,
    CurrentUser auth
  ) {
    this.service = service;
    this.catalog = catalog;
    this.publications = publications;
    this.auth = auth;
  }

  @GetMapping("/backup")
  Object backup(Authentication authentication) {
    long user = auth.id(authentication);
    return Map.of(
      "version",
      1,
      "exportedAt",
      java.time.Instant.now().toString(),
      "scope",
      "结构含活动/归档模块、全部题目（含回收站）、标签、参考资料与发布对账；学习进度仅限当前管理员，不含账号密码、上传图片与 AI 向量。",
      "categories",
      catalog.categories(),
      "archivedCategories",
      catalog.archived(),
      "tags",
      catalog.tags(),
      "documents",
      catalog.exportDocuments(),
      "questions",
      allQuestions(user, false),
      "trash",
      allQuestions(user, true),
      "publications",
      publications.status()
    );
  }

  private List<Map<String, Object>> allQuestions(long user, boolean trash) {
    List<Map<String, Object>> all = new ArrayList<>();
    int page = 1;
    while (true) {
      Map<String, Object> batch = service.snapshot(user, trash, page, 100);
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> items = (List<Map<String, Object>>) batch.get("items");
      all.addAll(items);
      long total = ((Number) batch.get("total")).longValue();
      if (all.size() >= total || items.isEmpty()) break;
      page++;
    }
    return all;
  }
}
