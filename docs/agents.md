# Repository Guidelines

## Project Structure & Module Organization

- `frontend/src/`: Vue 3 components in `components/`, composables in `composables/`, shared TypeScript modules in `lib/`, styles in `styles/`; entry points `main.ts` and `App.vue` stay at the root. Static illustrations live in `frontend/public/explanations/`.
- `backend/src/main/java/dev/interview/`: Spring Boot modules `account`, `question`, `knowledge`, `publication`, and `shared`. Keep controllers, services, and repositories within their feature module.
- `backend/src/main/resources/`: application configuration and Flyway migrations under `db/migration/`.
- Tests live in `backend/src/test/java/`, `frontend/tests/unit/`, and browser scripts in `frontend/tests/`.
- `content/` holds question banks and explanation sources; `scripts/` contains validation and development tools (retired one-off tools removed, recoverable from git history); all explanatory documents live in `docs/` (guides, content standards, round reports and the OpenAPI contract); `deploy/` holds deployment scripts and config only.

## Build, Test, and Development Commands

Use Java 17, Maven 3.9+, and Node 24. Run PowerShell scripts from the repository root.

- `.\scripts\start-local.ps1`: build/start local services; open `http://127.0.0.1:5173/#/catalog`. Stop with `.\scripts\stop-local.ps1`.
- In `frontend/`, run `npm ci`, then `npm run dev` for Vite development, `npm test` for unit tests, or `npm run build` for type checking and production output.
- In `backend/`, run `mvn -B test` for tests or `mvn -B package` for the executable JAR.
- `.\scripts\verify.ps1`: complete verification, including formatting, contracts, content, MySQL, and browsers; requires Docker and local Chrome.

## Coding Style & Naming Conventions

Follow Prettier: two-space indentation, single quotes, semicolons, trailing commas, and 100-column width. Run `npm run format:check` or `npm run format` in `frontend/`. Java formatting uses the pinned `prettier-plugin-java` through `scripts/verify.ps1`.

Use PascalCase for Vue components and Java classes, camelCase for functions and variables, and `useX.ts` for composables. Name new migrations `V<number>__description.sql`.

## Testing Guidelines

Use JUnit 5/Spring Boot tests named `*Test.java` and Vitest tests named `*.test.ts`. Add focused regression coverage for behavior changes; no numeric coverage threshold is configured.

Run Playwright suites through `.\scripts\test-e2e.ps1` after building the JAR; it creates disposable data and credentials. Never target everyday application data. MySQL tests require explicit isolated configuration; skipped tests do not count as verified. See [testing guide](guide/testing.md).

## Commit & Pull Request Guidelines

No commits exist yet. Use concise imperative subjects, optionally scoped, such as `fix(question): preserve search pagination`. Keep commits focused. PRs should explain behavior changes, link relevant issues, record checks and skipped tests, and include screenshots for UI changes.

## Configuration & Content Safety

Use `.env.example` for configuration; keep credentials, databases, uploads, and backups untracked. Preserve `content/Java.md` and stable source keys. For content changes, run `node scripts/validate-content.mjs` and `node scripts/validate-explanations.mjs`.
