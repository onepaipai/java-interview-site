package dev.interview.question;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;

class QuestionSearchTest {

  @Test
  void excludesReferencesAndHiddenMarkupButKeepsLinkedLearningText() {
    String content =
      "<details class=\"explanation-references\"><summary>资料</summary>[Raft](https://raft.test)</details>\n## 参考回答\n[事务](https://example.test)保持原子性。<script>hidden</script>";
    assertEquals("参考回答 事务保持原子性。", QuestionSearch.text(content));
    assertEquals(
      -1,
      QuestionSearch.rank("TCP", "<details class='explanation-references'>Raft</details>", "Raft")
    );
  }

  @Test
  void titleRankingIsStableAndQueriesTreatWildcardCharactersLiterally() {
    var rows = List.<Map<String, Object>>of(
      Map.of("id", 1L, "title", "其他", "answer", "Raft 规则"),
      Map.of("id", 2L, "title", "解释 Raft", "answer", "说明"),
      Map.of("id", 3L, "title", "Raft 多数派", "answer", "说明"),
      Map.of("id", 4L, "title", "Raft", "answer", "说明"),
      Map.of("id", 5L, "title", "Raft 选举", "answer", "说明")
    );
    assertEquals(List.of(4L, 3L, 5L, 2L, 1L), QuestionSearch.order(rows, "Raft"));
    assertEquals(-1, QuestionSearch.rank("任意题", "任意回答", "%"));
    assertEquals(2, QuestionSearch.rank("name_% test", "", "_%"));
    assertEquals(
      3,
      QuestionSearch.rank("CompletableFuture.allOf 失败", "", "CompletableFuture allOf")
    );
  }
}
