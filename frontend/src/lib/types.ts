export interface Category {
  id: number;
  name: string;
  sort_order: number;
  question_count: number;
}
export interface ArchivedCategory {
  id: number;
  archived_name: string;
  question_count: number;
}
export interface LearningSummary {
  total: number;
  mastered: number;
  weak: number;
  categories: { name: string; total: number; mastered: number }[];
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export interface QuestionSummary {
  id: number;
  title: string;
  category_id: number;
  category: string;
  difficulty: string;
  sort_order: number;
  version: number;
  answered: boolean;
  preview: string;
  tags: string[];
  mastery: string;
  favorite: boolean;
}
export interface IdResponse {
  id: number;
}
export interface Account {
  id: number;
  username: string;
  role: string;
  created_at: string;
}
export interface Question {
  id: number;
  title: string;
  category_id: number;
  category: string;
  difficulty: string;
  answer: string;
  sort_order: number;
  version: number;
  mastery: string;
  favorite: boolean;
  note: string;
  tags: string[];
}
export interface User {
  id: number;
  username: string;
  role: string;
  last_question: number | null;
}
export interface Item {
  sourceKey: string;
  title: string;
  category: string;
  difficulty: string;
  answer: string;
  sortOrder: number;
  tags: string[];
}
export interface Preview {
  questions: Item[];
  documents: { title: string; content: string }[];
  warnings: string[];
}
export interface KnowledgeStatus {
  enabled: boolean;
  model: string;
  embeddingConfigured: boolean;
  chunks: number;
  vectors: number;
  documents: number;
}
export interface KnowledgeDocument {
  id: number;
  title: string;
  characters: number;
  created_at: string;
}
export interface KnowledgeSource {
  id: number;
  key: string;
  title: string;
  questionId: number | null;
  chunk: number;
  content: string;
  score: number;
}
export interface KnowledgeLibrarySource {
  key: string;
  title: string;
  kind: 'question' | 'upload' | 'reference';
  questionId: number | null;
  chunks: number;
}
export interface KnowledgeLibrary {
  items: KnowledgeLibrarySource[];
  total: number;
  page: number;
  size: number;
  counts: Record<'question' | 'reference' | 'upload', number>;
}
export interface KnowledgeSourceDetail {
  key: string;
  title: string;
  questionId: number | null;
  content: string;
}
