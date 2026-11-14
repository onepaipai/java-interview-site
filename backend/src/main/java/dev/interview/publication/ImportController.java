package dev.interview.publication;

import dev.interview.question.QuestionService;
import dev.interview.shared.MarkdownImporter;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/import")
public class ImportController {

  final MarkdownImporter parser;
  final QuestionService service;

  ImportController(MarkdownImporter parser, QuestionService service) {
    this.parser = parser;
    this.service = service;
  }

  @PostMapping("/preview")
  MarkdownImporter.Preview preview(@RequestParam("file") MultipartFile file) throws Exception {
    // 与导出体量对齐:全量导出已超 2MB,导入上限同步预留至 6MB(小于 multipart 的 10MB)
    if (file.isEmpty() || file.getSize() > 6_000_000) throw new IllegalArgumentException();
    var decoder = StandardCharsets.UTF_8.newDecoder();
    return parser.parse(decoder.decode(java.nio.ByteBuffer.wrap(file.getBytes())).toString());
  }

  record Commit(
    List<MarkdownImporter.Item> questions,
    List<MarkdownImporter.Document> documents,
    String mode
  ) {}

  @PostMapping("/commit")
  Map<String, Integer> commit(@RequestBody Commit c) {
    return service.importItems(c.questions(), c.documents(), c.mode());
  }
}
