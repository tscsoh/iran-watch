# Iran Watch — Project Bible

A single-page PWA that aggregates world news from 13 major outlets, filters to the last 3 days, and delivers a clean dark reading experience. Zero-dependency frontend — no framework, no build step. Runs in Docker via nginx.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JS (ES modules), no framework |
| Styling | Plain CSS (custom properties) |
| Fonts | IBM Plex Sans + IBM Plex Mono |
| Build | None — zero build step |
| Testing | Vitest + jsdom |
| Serving (dev) | `npx serve . -p 8080` |
| Serving (prod) | nginx 1.27-alpine (Docker) |

---

## Project Structure

```
iran-watch/
├── src/
│   ├── js/
│   │   ├── app.js          # Entry point — state, event wiring, refresh orchestration
│   │   ├── feeds.js        # Feed definitions (pure data, no side effects)
│   │   ├── fetcher.js      # RSS fetch + proxy chain + XML parsing
│   │   ├── renderer.js     # Pure DOM rendering functions
│   │   ├── settings.js     # Settings panel open/close
│   │   ├── storage.js      # All localStorage access
│   │   └── __tests__/      # Vitest unit tests (colocated by module)
│   └── css/
│       └── styles.css      # All styles — CSS custom properties only
├── .claude/
│   ├── settings.json       # Hooks: prettier, eslint, protect-env, startup check
│   ├── agents/             # test-runner, code-reviewer, feed-debugger
│   ├── commands/           # /test, /check, /review, /debug-feeds
│   ├── hooks/              # Shell scripts for PostToolUse / PreToolUse hooks
│   └── rules/              # Scoped rules for testing.md, feeds.md
├── index.html              # App shell — no inline JS or CSS
├── sw.js                   # Service worker (must stay at root)
├── manifest.json           # PWA manifest
├── Dockerfile              # nginx:alpine, copies src + static files
├── docker-compose.yml      # Single service, port 8080
├── nginx.conf              # SPA routing, cache headers, gzip
├── package.json            # Dev deps: vitest, jsdom
├── vitest.config.js        # jsdom environment, coverage via v8
└── CLAUDE.md               # This file
```

---

## Development Commands

```bash
# Local dev server
npm run dev                 # serves on http://localhost:8080

# Tests
npm test                    # run all tests once
npm run test:watch          # watch mode
npm run test:coverage       # coverage report

# Docker
npm run docker:up           # build + start container on :8080
npm run docker:down         # stop container
npm run docker:logs         # tail container logs
npm run docker:restart      # rebuild + restart
```

---

## Architecture

### State
All mutable state lives as plain `let` variables in `app.js`:
- `allArticles` — current working set (merged from fresh + cache)
- `activeSource` — selected source filter chip (`'all'` or a feed id)
- `searchQuery` — current search string
- `feedConfig` — feed list with per-feed enabled flag

**No module-level mutable state outside `app.js`.**

### Data flow
```
localStorage cache ──► render() immediately (instant load)
        ↓
  background fetchAll()
        ↓
  per-feed: fetchFeed() ──► progressive render as each feed arrives
        ↓
  final deduplicated merge ──► saveCachedArticles() + final render
```

### Proxy chain (fetcher.js)
Tried in order until one succeeds:
1. `corsproxy.io` — returns raw XML
2. `allorigins.win/get` — returns `{ contents: "<xml>..." }` JSON
3. Direct request (only for feeds with `direct: true`)

### Caching
Articles stored in `localStorage` as JSON (max 1500). On page load, cached articles render instantly. Date objects are re-hydrated from ISO strings on load. Articles older than 3 days are filtered out both on fetch and on cache read.

### Service Worker
`sw.js` at root. Cache version must be bumped (`iranwatch-vN`) whenever static assets change — this forces the browser to re-install the SW and evict stale shell files.

---

## Feeds

Configured in `src/js/feeds.js`. Each entry:
```js
{
  id: 'bbc',           // unique slug — used as localStorage config key
  name: 'BBC World',   // display name
  url: 'https://...',  // RSS/Atom feed URL
  color: '#cc785c',    // hex — shown as source dot in UI
  enabled: true,       // default state
  direct: true,        // optional — skip proxy, try direct first
}
```

### Currently active feeds (13)
BBC World · CBS News · NBC News · Fox News · NY Times · Al Jazeera · Bloomberg · Financial Times · Axios · Euronews · Times of Israel · NPR · PBS NewsHour

### Known broken (do not re-add without a working URL)
| Feed | Reason |
|---|---|
| AP News | No public RSS; rsshub blocks all proxies |
| Reuters | `feeds.reuters.com` dead; rsshub also blocked |
| CNN | `rss.cnn.com` persistent SSL failures |

---

## Design System

Colors are CSS custom properties in `src/css/styles.css`. **Never hardcode color values in JS or HTML.**

| Property | Value | Use |
|---|---|---|
| `--bg-base` | `#1a1a1a` | Page background |
| `--bg-surface` | `#222` | Header, toolbar |
| `--bg-card` | `#2a2a2a` | Article cards |
| `--bg-card-hover` | `#303030` | Card hover |
| `--accent` | `#cc785c` | Brand, links, active states |
| `--text-primary` | `#e8e8e8` | Main text |
| `--text-secondary` | `#9a9a9a` | Secondary text |
| `--text-muted` | `#5a5a5a` | Placeholders, timestamps |
| `--green` | `#27ae60` | Live indicator |
| `--red` | `#c0392b` | Error indicator |

Fonts: `IBM Plex Sans` (body), `IBM Plex Mono` (labels, timestamps, badges).

---

## Docker

The app is a static site — Docker just runs nginx to serve the files:

```bash
docker compose up -d        # starts on :8080
docker compose logs -f      # watch logs
docker compose down         # stop
```

`nginx.conf` handles:
- SPA fallback (`try_files $uri /index.html`)
- Immutable cache for CSS/JS/images (1 year)
- No-cache for `index.html` and `sw.js` (critical for PWA updates)
- Gzip compression

---

## Testing

Tests live in `src/js/__tests__/`. Run with `npm test`.

Coverage targets:
- `renderer.js` — `timeAgo`, `articleHTML`, `render` filtering
- `storage.js` — date deserialisation, 3-day filter, truncation
- `fetcher.js` — XML parsing, proxy fallback, error handling

See `.claude/rules/testing.md` for conventions.
