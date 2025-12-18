# Repository Agent Guidelines

## Build, Test & Lint Commands
- **Node/TS:** `npm run build/watch/lint`. Ad-hoc tests: `ts-node src/test/x.ts` or `node test/x.js`.
- **Python/Azure:** `python x.py`, `func start`. **Bun:** `bun src/index.ts`. **CDK:** `npm run cdk`.
- **Infrastructure:** `terraform init/plan/apply`. **Docker:** `docker build -t x .`.
- **Project Specifics:** CSGO: `npm start/search/bulk`. Playwright: `npx playwright test`.
- **Verification:** Run project-specific build/lint (e.g., `tsc`, `npm run compile`) before finishing.

## Code Style & Patterns
- **Formatting:** 4-space indent, single quotes, semicolons. ES6 modules (`import/export`).
- **TypeScript:** Strict mode preferred. Group imports: external libraries, then internal modules.
- **Naming:** `camelCase` (vars/funcs), `PascalCase` (types/classes), `SCREAMING_SNAKE` (consts).
- **Errors:** Use `try-catch` for async; log via `console.error`; return descriptive messages.
- **Config:** Store secrets in local config files (never commit). Use env vars for environment settings.
- **Conventions:** Mimic existing directory structure and `package.json` task patterns.
- **Context:** Check `.github/workflows` for CI/CD (e.g., Docker) and `README.md` for local setup.
