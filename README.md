# culs-retriever

Devvit web app that surfaces Reddit posts from /r/all listings and displays them inside a custom post UI.

## What it does

- Accepts a query string plus a result limit (1-50).
- Server searches via the Devvit Reddit plugin only (aggregating/ranking `/r/all` `new`, `hot`, `rising`, and `top` listings).
- Client renders results in a table with title, score, comments, subreddit, age, thumbnail, and a selftext preview with expand/collapse.
- Links open the original post on reddit.com.

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
- `npm run launch`: Build + deploy + publish for review.
- `npm run login`: Authenticate the Devvit CLI.
- `npm run check`: Type-check, lint, and format.

## API

- `GET /api/search-posts?query=<text>&limit=<1-50>`
  - Returns `{ type: "searchPosts", query, limit, posts[], debug? }`.
  - Collects a large candidate set from `/r/all` listings and filters/ranks results against parsed query terms.

## Notes

- `devvit.json` defines two post entrypoints: `splash` (default) and `game` (search UI).
- Counter endpoints (`/api/init`, `/api/increment`, `/api/decrement`) are template remnants and are not used by the current UI.
