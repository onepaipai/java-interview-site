import { readFile } from 'node:fs/promises';
import deepAnswers from '../content/explanations/answers/deep-answers.mjs';
import reviewAnswers from '../content/explanations/answers/review-answers-20261023.mjs';
import springCoreAnswers from '../content/explanations/answers/spring-core-answers.mjs';
import springAdvancedAnswers from '../content/explanations/answers/spring-advanced-answers.mjs';
import databaseBasicsAnswers from '../content/explanations/answers/database-basics-answers.mjs';
import concurrencyBasicsAnswers from '../content/explanations/answers/concurrency-basics-answers.mjs';
import jvmBasicsAnswers from '../content/explanations/answers/jvm-basics-answers.mjs';
import concurrencyAdvancedAnswers from '../content/explanations/answers/concurrency-advanced-answers.mjs';
import databaseAdvancedAnswers from '../content/explanations/answers/database-advanced-answers.mjs';
import cacheMessagingAnswers from '../content/explanations/answers/cache-messaging-answers.mjs';

/** Both formats own a complete question; rich content never inherits a shared case. */
export async function loadQuestionContents() {
  const source = JSON.parse(await readFile(new URL('../content/explanations/question-overrides.json', import.meta.url), 'utf8'));
  return { ...source, questions: { ...source.questions, ...deepAnswers, ...reviewAnswers, ...springCoreAnswers, ...springAdvancedAnswers, ...databaseBasicsAnswers, ...concurrencyBasicsAnswers, ...jvmBasicsAnswers, ...concurrencyAdvancedAnswers, ...databaseAdvancedAnswers, ...cacheMessagingAnswers } };
}
