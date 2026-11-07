package dev.interview.publication;

import dev.interview.shared.MarkdownImporter;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicationStatusService {

  private final PublicationRepository repository;

  public PublicationStatusService(PublicationRepository repository) {
    this.repository = repository;
  }

  public record Item(
    long questionId,
    String title,
    int version,
    String publication,
    String status
  ) {}

  @Transactional(readOnly = true)
  public Map<String, Object> status() {
    var changed = new ArrayList<Item>();
    long published = 0,
      archived = 0;
    for (var baseline : repository.baselines()) {
      published++;
      if (baseline.deleted()) {
        archived++;
        continue;
      }
      if (!MarkdownImporter.key(baseline.answer()).equals(baseline.hash())) changed.add(
        new Item(
          baseline.id(),
          baseline.title(),
          baseline.version(),
          baseline.packVersion(),
          "manual-review-required"
        )
      );
    }
    return Map.of(
      "packVersion",
      repository.version(),
      "published",
      published,
      "archived",
      archived,
      "manualChanges",
      changed.size(),
      "items",
      changed
    );
  }
}
