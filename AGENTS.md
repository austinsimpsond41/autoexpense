**Build & Run**

- **Dev:** `pnpm dev` — runs `next dev --turbo` for local development.
- **Build:** `pnpm build` — runs `next build`.
- **Preview / Start:** `pnpm preview` (build + start) or `pnpm start`.
- **Database:** `pnpm db:generate` (`prisma migrate dev`), `pnpm db:migrate` (`prisma migrate deploy`), `pnpm db:studio`.

**Lint / Typecheck**

- **Check:** `pnpm check` — runs `biome check .` for lint/format checks.
- **Auto-fix:** `pnpm check:write` or `pnpm check:unsafe` to apply fixes.
- **Typecheck:** `pnpm typecheck` — runs `tsc --noEmit`.

**Tests**

- **Note:** no test runner is configured in this repo currently.
- **Run a single test (examples):**
  - **Jest:** `npx jest -t <name-or-pattern>` (or `pnpm jest -- -t <pattern>`).
  - **Vitest:** `npx vitest -t <name-or-pattern>` (or `pnpm vitest -t <pattern>`).
- **Run all tests:** add a `test` script to `package.json` and run `pnpm test`.

**Code Style & Conventions**

- **Imports:** group: external → aliased (`@/...`) → parent → sibling → index; prefer double-quote import strings; omit `.ts/.tsx` extensions.
- **Formatting:** follow Biome rules (`@biomejs/biome`); run `pnpm check` and `pnpm check:write` to enforce/auto-fix.
- **Types:** prefer explicit `type` or `interface` for props; use `import type {}` when importing only types.
- **Naming:** React components `kebab-case`; hooks `useX`; variables `camelCase`; constants `UPPER_SNAKE` only for true global constants.
- **Error handling:** validate inputs (e.g., `zod`), do not swallow errors; on server use `TRPCError` or rethrow with context; keep errors informative.
- **Exports:** prefer named exports; avoid default exports for components and utilities.
- **Files:** prefer small focused modules; keep components and hooks in their own files where appropriate.
- **Environment:** all environment variables are set up in `src/env.js`. It uses a zod schema to validate the environment variables. Use the exported `env` object instead of `process.env`
