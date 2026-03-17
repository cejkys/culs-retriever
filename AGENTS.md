# AGENTS.md

Best practices for AI agents working in this repository.

## Project orientation

- Devvit web app with a React client in `src/client`, an Express server in `src/server`, and shared types in `src/shared`.
- Build output lives in `dist/` (generated, do not edit).
- App configuration and entrypoints live in `devvit.json`.

## Working rules

- Prefer `rg` for searching files or text.
- Do not edit `dist/` or `node_modules/`.
- Keep API contracts in sync with `src/shared/types/api.ts`.
- If you change server endpoints or query params, update the client hook and README.
- Avoid adding dependencies unless required; update both `package.json` and `package-lock.json` when you do.
- Preserve existing formatting and TypeScript conventions.
- Favor secure defaults and explicit validation for external inputs, API params, and persistence layers.
- Use test-driven changes when it is practical for the affected area (unit/integration/e2e as appropriate).

## Common commands

- `npm run dev`: Playtest with watch builds.
- `npm run dev:vite`: Local UI preview.
- `npm run build`: Build client and server.
- `npm run deploy`: Upload a new version.
- `npm run launch`: Publish for review.
- `npm run check`: Type-check, lint, and format.
- `npm run type-check`: TypeScript build validation.

## Change checklist

- Update README when behavior or setup changes.
- Verify that UI and server types still align.
- Call out any assumptions or incomplete areas in your response.
- Validate production build (`npm run build`) before handing off substantial code changes.

## Assignment authoring protocol

Use this protocol whenever the user asks to create `assignment/<FILENAME>.md` (or equivalent wording).

- Treat the request as: produce a high-quality task specification for a separate AI agent, not a direct implementation.
- The assignment must reflect and align with:
  - this `AGENTS.md`,
  - `README.md`,
  - the user prompt/use case.
- If the use case implies missing or outdated project guidance, include explicit instructions in the assignment to update `README.md` and/or `AGENTS.md` as part of the task.
- Require a secure, robust implementation approach with clear constraints, risks, and mitigations.
- Require test-driven delivery when sensible for the scope; specify concrete test expectations and verification commands.
- Require clean git hygiene:
  - commit task-relevant changes with clear commit messages,
  - if needed, create prior cleanup/feature commits so final history is logically separated and clean,
  - never bundle unrelated changes in the same commit.
- Include explicit acceptance criteria and a Definition of Done.

### Required assignment structure

Each assignment file should include at least:

- Objective and context.
- Scope (in-scope/out-of-scope).
- Technical constraints and architecture touchpoints (`src/client`, `src/server`, `src/shared`, `devvit.json`).
- Implementation plan (ordered steps).
- Security and reliability requirements.
- Testing strategy and required commands.
- Documentation updates required (`README.md`, and `AGENTS.md` if relevant).
- Commit plan (recommended commit boundaries and messages).
- Final verification checklist.

### Large task splitting

- If the assignment is too large for one agent pass, split it into sequential files:
  - `assignment/<FILENAME>_1.md` ... `assignment/<FILENAME>_n.md`
- Each part must have its own acceptance criteria and handoff notes to the next part.
- Keep each part independently executable while preserving end-to-end continuity.
