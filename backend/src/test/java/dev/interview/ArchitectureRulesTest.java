package dev.interview;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

/**
 * Guards the module dependency direction: feature modules may depend on shared, and publication
 * may sit on top of question, but no module cycles are allowed (the former
 * question-publication cycle through MarkdownImporter is fixed by moving it to shared).
 */
@AnalyzeClasses(packages = "dev.interview", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureRulesTest {

  @ArchTest
  static final ArchRule modulesAreFreeOfCycles = SlicesRuleDefinition.slices()
    .matching("dev.interview.(*)..")
    .should()
    .beFreeOfCycles();
}
