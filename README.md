# culs-retriever

Devvit web app that surfaces Reddit posts from /r/all listings and displays them inside a custom post UI.

## What it does

- Accepts a query string plus a result limit (1-50, default 1).
- Server searches via the Devvit Reddit plugin only (aggregating/ranking `/r/all` `new`, `hot`, `rising`, and `top` listings).
- The live scan only returns posts that match the parsed query terms in the current candidate window.
- Client renders results in a table with title, score, comments, subreddit, age, thumbnail, and a selftext preview with expand/collapse.
- Query form includes an expandable Lucene-style query manual with examples (replacing the old reset button).
- Splash and game views support light/dark mode with persisted user toggle and system preference fallback.
- Links open the original post on reddit.com.
- Optional Supabase archive mode persists scanned posts and can supplement live results when live matches are fewer than requested.

## Architecture

- `src/client`: React UI (game view) + splash entrypoint.
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
- `npm run launch`: Sync settings + build + upload + publish for review.
- `npm run login`: Authenticate the Devvit CLI.
- `npm run check`: Type-check, lint, and format.

## API

- `GET /api/search-posts?query=<text>&limit=<1-50>`
  - Returns `{ type: "searchPosts", query, limit, posts[], debug? }`.
  - Collects a large candidate set from `/r/all` listings and filters/ranks results against parsed query terms.

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

## Notes

- `devvit.json` defines two post entrypoints: `splash` (default) and `game` (search UI).
- `devvit.json` explicitly enables `reddit`, `redis`, and HTTP access to `api.reddit.com` for runtime listing calls.
- Search API debug payload includes app version and archive diagnostics (`matchedCount`, archive counts, archive source, archive logs, and archive errors) shown in the UI Debug panel.
- Archive config resolution order is `Devvit app settings` first, then `.env` fallback (local/dev only).
- Counter endpoints (`/api/init`, `/api/increment`, `/api/decrement`) are template remnants and are not used by the current UI.
