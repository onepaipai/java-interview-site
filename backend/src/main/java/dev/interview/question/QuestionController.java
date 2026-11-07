package dev.interview.question;

import static org.springframework.http.HttpStatus.*;

import dev.interview.account.CurrentUser;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class QuestionController {

  @GetMapping("/admin/snapshot/questions")
  Object snapshot(
    Authentication auth,
    @RequestParam(defaultValue = "false") boolean trash,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "100") int size
  ) {
    return service.snapshot(this.auth.id(auth), trash, page, size);
  }

  final QuestionService service;
  final CatalogService catalog;
  final CurrentUser auth;

  QuestionController(QuestionService service, CatalogService catalog, CurrentUser auth) {
    this.service = service;
    this.catalog = catalog;
    this.auth = auth;
  }

  @GetMapping("/questions")
  QuestionDtos.Page<QuestionDtos.Summary> list(
    Authentication a,
    @RequestParam(defaultValue = "") String search,
    @RequestParam(required = false) Long category,
    @RequestParam(defaultValue = "") String difficulty,
    @RequestParam(defaultValue = "") String mastery,
    @RequestParam(defaultValue = "") String tag,
    @RequestParam(defaultValue = "false") boolean favorite,
    @RequestParam(defaultValue = "false") boolean weak,
    @RequestParam(defaultValue = "false") boolean trash,
    @RequestParam(defaultValue = "1") int page,
    @RequestParam(defaultValue = "30") int size
  ) {
    if (
      trash &&
      a
        .getAuthorities()
        .stream()
        .noneMatch(r -> r.getAuthority().equals("ROLE_ADMIN"))
    ) throw new ResponseStatusException(FORBIDDEN, "权限不足");
    return QuestionDtos.page(
      service.list(
        auth.id(a),
        search,
        category,
        difficulty,
        mastery,
        tag,
        favorite,
        weak,
        trash,
        page,
        size
      )
    );
  }

  @GetMapping("/questions/{id}/location")
  Map<String, Integer> location(
    @PathVariable long id,
    @RequestParam(defaultValue = "30") int size,
    @RequestParam(required = false) Long category,
    @RequestParam(defaultValue = "") String search,
    @RequestParam(defaultValue = "false") boolean global,
    @RequestParam(defaultValue = "false") boolean weak,
    Authentication a
  ) {
    return service.location(id, category, search, global, weak, auth.id(a), size);
  }

  @GetMapping("/questions/{id}")
  QuestionDtos.Detail detail(Authentication a, @PathVariable long id) {
    return QuestionDtos.Detail.from(service.question(id, auth.id(a), false));
  }

  @PostMapping("/admin/questions")
  Map<String, Long> create(@RequestBody QuestionService.Edit e) {
    return Map.of("id", service.save(null, e));
  }

  @PutMapping("/admin/questions/{id}")
  Map<String, Long> update(@PathVariable long id, @RequestBody QuestionService.Edit e) {
    return Map.of("id", service.save(id, e));
  }

  @DeleteMapping("/admin/questions/{id}")
  void delete(@PathVariable long id) {
    service.delete(id);
  }

  @PostMapping("/admin/questions/{id}/restore")
  void restore(@PathVariable long id) {
    service.restore(id);
  }

  @GetMapping("/categories")
  Object categories() {
    return catalog.categories();
  }

  @GetMapping("/tags")
  Object tags() {
    return catalog.tags();
  }

  record Name(String name, Integer sortOrder) {}

  @PostMapping("/admin/categories")
  Map<String, Long> category(@RequestBody Name n) {
    return Map.of("id", catalog.category(n.name(), n.sortOrder()));
  }

  @PutMapping("/admin/categories/{id}")
  void category(@PathVariable long id, @RequestBody Name n) {
    catalog.category(id, n.name(), n.sortOrder());
  }

  @DeleteMapping("/admin/categories/{id}")
  void category(@PathVariable long id) {
    catalog.archive(id);
  }

  @PostMapping("/admin/tags")
  void tag(@RequestBody Name n) {
    catalog.tag(n.name());
  }

  @PutMapping("/admin/tags/{id}")
  void tag(@PathVariable long id, @RequestBody Name n) {
    catalog.tag(id, n.name());
  }

  @DeleteMapping("/admin/tags/{id}")
  void tag(@PathVariable long id) {
    catalog.deleteTag(id);
  }

  @GetMapping("/documents")
  Object documents() {
    return catalog.documents();
  }

  @GetMapping("/documents/{id}")
  Object document(@PathVariable long id) {
    return catalog.document(id);
  }

  record Doc(String title, String content) {}

  @PostMapping("/admin/documents")
  Map<String, Long> doc(@RequestBody Doc d) {
    return Map.of("id", catalog.createDocument(d.title(), d.content()));
  }

  @PutMapping("/admin/documents/{id}")
  void doc(@PathVariable long id, @RequestBody Doc d) {
    catalog.updateDocument(id, d.title(), d.content());
  }

  @DeleteMapping("/admin/documents/{id}")
  void deleteDoc(@PathVariable long id) {
    catalog.deleteDocument(id);
  }

  @GetMapping("/admin/export/documents")
  Object exportDocuments() {
    return catalog.exportDocuments();
  }

  @GetMapping(value = "/admin/export", produces = "text/markdown;charset=UTF-8")
  ResponseEntity<String> export() {
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=java-interview.md")
      .body(catalog.export());
  }
}
