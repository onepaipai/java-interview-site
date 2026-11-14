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
import jvmAdvancedAnswers from '../content/explanations/answers/jvm-advanced-answers.mjs';
import distributedAnswers from '../content/explanations/answers/distributed-answers.mjs';
import bankingAnswers from '../content/explanations/answers/banking-answers.mjs';
import architectureAnswers from '../content/explanations/answers/architecture-answers.mjs';
import collectionsAnswers from '../content/explanations/answers/collections-answers.mjs';
import javaLanguageAnswers from '../content/explanations/answers/java-language-answers.mjs';
import springBasicsAnswers from '../content/explanations/answers/spring-basics-answers.mjs';
import networkAnswers from '../content/explanations/answers/network-answers.mjs';
import systemDesignAnswers from '../content/explanations/answers/system-design-answers.mjs';
import reliabilityAnswers from '../content/explanations/answers/reliability-answers.mjs';
import aiBasicsAnswers from '../content/explanations/answers/ai-basics-answers.mjs';
import aiAdvancedAnswers from '../content/explanations/answers/ai-advanced-answers.mjs';
import aiProductionAnswers from '../content/explanations/answers/ai-production-answers.mjs';
import legacyAnswers from '../content/explanations/answers/legacy-answers.mjs';
import algorithmsAnswers from '../content/explanations/answers/algorithms-answers.mjs';

/** Both formats own a complete question; rich content never inherits a shared case. */
export async function loadQuestionContents() {
  const source = JSON.parse(await readFile(new URL('../content/explanations/question-overrides.json', import.meta.url), 'utf8'));
  return { ...source, questions: { ...source.questions, ...deepAnswers, ...reviewAnswers, ...springCoreAnswers, ...springAdvancedAnswers, ...databaseBasicsAnswers, ...concurrencyBasicsAnswers, ...jvmBasicsAnswers, ...concurrencyAdvancedAnswers, ...databaseAdvancedAnswers, ...cacheMessagingAnswers, ...jvmAdvancedAnswers, ...distributedAnswers, ...bankingAnswers, ...architectureAnswers, ...collectionsAnswers, ...javaLanguageAnswers, ...springBasicsAnswers, ...networkAnswers, ...systemDesignAnswers, ...reliabilityAnswers, ...aiBasicsAnswers, ...aiAdvancedAnswers, ...aiProductionAnswers, ...legacyAnswers, ...algorithmsAnswers } };
}
