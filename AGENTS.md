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

## Common commands

- `npm run dev`: Playtest with watch builds.
- `npm run dev:vite`: Local UI preview.
- `npm run build`: Build client and server.
- `npm run deploy`: Upload a new version.
- `npm run launch`: Publish for review.
- `npm run check`: Type-check, lint, and format.

## Change checklist

- Update README when behavior or setup changes.
- Verify that UI and server types still align.
- Call out any assumptions or incomplete areas in your response.
