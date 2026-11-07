package dev.interview.shared;

/** A committed content change. A null source requests a complete reconciliation. */
public record KnowledgeChanged(String source) {}
