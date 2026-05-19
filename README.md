# culs-retriever

Devvit web app that surfaces Reddit posts from /r/all listings and displays them inside a custom post UI.

## What it does

- Accepts a query string plus a result limit (1-50, default 1).
- Server uses Reddit search as the primary upstream and falls back to aggregating/ranking `/r/all` `new`, `hot`, `rising`, and `top` listings when upstream search is empty or errors.
- The listing fallback only returns posts that match the parsed query terms in the current candidate window.
- Client renders results in a table with title, score, comments, subreddit, age, thumbnail, and a selftext preview with expand/collapse.
- Query form includes an expandable Lucene-style query manual with examples (replacing the old reset button).
- Splash and game views support light/dark mode with persisted user toggle and system preference fallback.
- Splash and game views support EN/CS language switching with persisted preference and centralized translation dictionaries.
- Debug panel includes a database connection test button for the optional Supabase archive and shows the latest connection status.
- Links open the original post on reddit.com.
- Optional Supabase archive mode persists scanned posts and can supplement live results when live matches are fewer than requested.

## Architecture

- `src/client`: React UI (game view) + splash entrypoint.
- `src/client/i18n/translations.ts`: Centralized EN/CS UI copy.
- `src/server`: Express API hosted by Devvit (`/api/search-posts` plus template counter endpoints).
- `src/shared`: Shared request/response types.
- `dist`: Build output (generated, do not edit).

## Local development

Prerequisites: Node 22 and the Devvit CLI.

1. Install dependencies: `npm install`
2. Start playtest + watch builds: `npm run dev`
3. Optional local UI preview: `npm run dev:vite`

## Build & deploy

- `npm run build`: Build client and server.
- `npm run deploy`: Build + upload a new version.
- `npm run sync:settings`: Sync archive settings from local `.env` into Devvit app settings.
  - Requires a current build first because the Devvit CLI validates `devvit.json` output paths.
- `npm run launch`: Build + sync settings + upload + publish for review.
  - If the current Devvit environment does not support app settings read/write RPCs, sync falls back to a warning and launch continues without changing remote settings.
- `npm run login`: Authenticate the Devvit CLI.
- `npm run check`: Type-check, lint, and format.

## API

- `GET /api/search-posts?query=<text>&limit=<1-50>`
  - Returns `{ type: "searchPosts", query, limit, posts[], debug? }`.
  - Queries Reddit search first and falls back to filtering/ranking a large candidate set from `/r/all` listings when needed.
- `GET /api/archive-health`
  - Returns `{ type: "archiveHealth", status, message, checkedAt, durationMs, archiveEnabled, archiveConfigSource, table }`.
  - Performs a lightweight Supabase REST check against the configured archive table and is used by the UI Debug panel.

## Optional archive setup (Supabase)

1. Create a Supabase project.
2. Create table `reddit_posts` (or your custom `SUPABASE_TABLE`) with:

```sql
create table if not exists public.reddit_posts (
  id text primary key,
  title text not null,
  author text not null,
  score integer not null default 0,
  comments integer not null default 0,
  permalink text not null,
  subreddit text not null,
  created_at timestamptz not null,
  thumbnail text null,
  selftext text not null default ''
);
```

3. For local development, in `.env`, set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional: `SUPABASE_TABLE`
   - Optional: `ARCHIVE_FETCH_LIMIT`
4. Add your Supabase host to `devvit.json` HTTP domains:
   - Keep `api.reddit.com`
   - Add `<project-ref>.supabase.co`
5. For deployed environments:
   - `npm run launch` now pushes these from `.env` into Devvit app global settings automatically:
     - `supabase_url`
     - `supabase_service_role_key` (secret)
     - Optional: `supabase_table`
     - Optional: `archive_fetch_limit`
   - If a local value is missing, launch keeps the existing remote setting (if already set).
   - Required keys must exist either locally or remotely, otherwise launch fails fast.
6. If needed, skip sync once with `SKIP_DEVVIT_SETTINGS_SYNC=1 npm run launch`.
7. If you run `npm run sync:settings` directly, run `npm run build` first.

## Notes

- `devvit.json` defines two post entrypoints: `splash` (default) and `game` (search UI).
- `devvit.json` explicitly enables `reddit`, `redis`, and HTTP access to `api.reddit.com` for runtime Reddit search and listing fallback calls.
- Search API debug payload includes app version and archive diagnostics (`matchedCount`, archive counts, archive source, archive logs, and archive errors) shown in the UI Debug panel.
- Archive config resolution order is `Devvit app settings` first, then `.env` fallback (local/dev only).
- Counter endpoints (`/api/init`, `/api/increment`, `/api/decrement`) are template remnants and are not used by the current UI.
