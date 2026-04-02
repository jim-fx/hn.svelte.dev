# Hacker News SvelteKit Client

A SvelteKit app that fetches from the Hacker News Firebase API and caches everything in local SQLite databases for fast, offline-capable browsing.

## Architecture

### API Layer (`src/lib/hn/`)

| File               | Purpose                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `types.ts`         | TypeScript types: `Item`, `ItemWithComments`, `User`, `StoryType`                               |
| `request.ts`       | Wraps worker fetch, records request statistics                                                  |
| `queue.ts`         | Main thread: manages pending requests, tracks queue state for monitoring                        |
| `queue_backend.ts` | Worker thread: fetches from HN API with concurrency limit = 5, two priority queues (high/low)   |
| `item.ts`          | Fetch items, background refresh when stale, prefetch author                                     |
| `comments.ts`      | Fetch items with nested comments, prefetch missing comment IDs in background                    |
| `list.ts`          | Fetch story lists with pagination, update `top_position`, background refresh                    |
| `user.ts`          | Fetch user profiles with background refresh                                                     |
| `utils.ts`         | Staleness detection — different TTLs for items (10 min), users (1 hour), comments (edit window) |

### Database Layer (`src/lib/db/`)

| File            | Purpose                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `db.ts`         | Opens `hn.sqlite` + `statistics.sqlite`, runs migrations, attaches stats DB                         |
| `utils.ts`      | Extended SQLite wrapper: prepared statements, migration runner, query callback for stats            |
| `item.ts`       | Serialize/deserialize items, `upsertItem`, `getItem`, `getItemWithComments`, `getItemsWithComments` |
| `user.ts`       | Serialize/deserialize users, `storeUser`, `getUser`                                                 |
| `raw.ts`        | Raw API list caching (e.g., topstories.json)                                                        |
| `statistics.ts` | Store request duration, query stats, search stats; provides `/statistics` endpoint                  |
| `search.ts`     | Full-text search on items                                                                           |
| `statements/`   | SQL definitions for all queries                                                                     |

## Key Design Patterns

1. **Worker thread** — All HTTP requests to HN API are handled by a worker thread with concurrent request limiting
2. **Two priority queues** — High (user-initiated) vs low (background prefetch)
3. **Staleness detection** — Background refresh triggers while serving cached data immediately
4. **Query callbacks** — Track every DB operation for performance statistics
5. **Compression support** — Optional ZSTD compression via config

## Developing

```sh
npm run dev
```

## Building

```sh
npm run build
```

## Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production (includes worker bundle)
- `npm run preview` — Preview production build
- `npm run check` — Type check with svelte-check
- `npm run lint` — Run Prettier and ESLint
