# Iran Watch

A self-hosted, real-time news aggregator that pulls RSS/Atom feeds from 13 major outlets, filters to the last 3 days, and presents them in a clean dark reading interface. Runs entirely in Docker — no accounts, no tracking, no ads.

![Iran Watch screenshot](https://raw.githubusercontent.com/toddswepston/iran-watch/main/docs/screenshot.png)

---

## Features

- **13 live news sources** — BBC World, CBS News, NBC News, Fox News, NY Times, Al Jazeera, Bloomberg, Financial Times, Axios, Euronews, Times of Israel, NPR, PBS NewsHour
- **Colored source LEDs** with glow — instantly identify which feeds are live
- **Per-source filtering** via the chip bar — tap any badge to filter to that outlet
- **Search** — press Enter to filter by headline, description, or source name; Escape to clear
- **3-day rolling window** — stale content is automatically pruned
- **PWA** — installable on iPhone/Android from the browser
- **Local nginx proxy** — bypasses CORS restrictions, no third-party proxy required
- **Offline shell** — service worker caches the app shell for instant load
- Responsive — works on desktop and phone

---

## Quick Start

```bash
git clone https://github.com/toddswepston/iran-watch.git
cd iran-watch
docker compose up -d
```

Open [http://localhost:7474](http://localhost:7474).

On your local network, replace `localhost` with your machine's IP (e.g. `http://192.168.1.13:7474`) to access from a phone.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | TypeScript + Vite (no framework) |
| Styling | Plain CSS (custom properties) |
| Fonts | IBM Plex Sans + IBM Plex Mono |
| Build | Vite — multi-stage Docker build |
| Testing | Vitest (unit) + Playwright (E2E) |
| Serving | nginx 1.27-alpine |
| Proxy | Node.js / tsx (handles CORS for feeds) |

---

## Development

```bash
npm install

# Local dev server + proxy (hot reload)
npm run dev               # http://localhost:7474

# Type-check
npm run typecheck

# Tests
npm run test:unit         # Vitest unit tests
npm run test:e2e          # Playwright E2E (requires Docker running)
npm test                  # typecheck + unit + e2e

# Docker
npm run docker:up         # build + start
npm run docker:down       # stop
npm run docker:restart    # rebuild + restart
npm run docker:logs       # tail logs
```

---

## Feeds

Feeds are configured in `public/feeds.json` — editable without touching code or rebuilding.

Each entry:
```json
{
  "id": "bbc",
  "name": "BBC World",
  "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
  "color": "#cc785c",
  "enabled": true
}
```

Toggle individual feeds on/off at runtime via the **⚙ Feeds** panel — state is saved to `localStorage`.

---

## Architecture

```
Browser  ──► nginx (port 7474)  ──► /assets/*   (Vite build, immutable cache)
                                ──► /proxy?url=  ──► Node proxy ──► RSS feed
                                ──► /*           ──► index.html (SPA fallback)
```

The proxy container fetches RSS feeds server-side, eliminating CORS issues. In local dev, Vite proxies `/proxy` to the same Node service on port 7475.

**Data flow:**

```
localStorage cache ──► instant render on load
        ↓
  fetchAll() — all feeds in parallel
        ↓
  progressive render as each feed resolves
        ↓
  final deduplicated merge + cache save
```

---

## Project Structure

```
iran-watch/
├── src/
│   ├── core/
│   │   ├── feeds.ts        # Feed loader (reads /feeds.json)
│   │   ├── fetcher.ts      # RSS fetch, proxy chain, XML parse
│   │   └── storage.ts      # localStorage cache
│   ├── ui/
│   │   ├── app.ts          # Entry — state, event wiring, refresh
│   │   ├── renderer.ts     # Pure DOM rendering functions
│   │   └── settings.ts     # Settings panel
│   ├── styles/
│   │   └── main.css        # All styles — CSS custom properties
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   └── main.ts             # Vite entry point
├── server/
│   └── proxy.ts            # Node.js CORS proxy service
├── public/
│   ├── feeds.json          # Feed configuration (edit to add/remove sources)
│   └── sw.js               # Service worker
├── tests/
│   ├── unit/               # Vitest unit tests
│   └── e2e/                # Playwright E2E tests
├── docker/
│   ├── Dockerfile          # Multi-stage: node builder → nginx
│   ├── Dockerfile.proxy    # Proxy service
│   └── nginx.conf          # SPA routing, cache headers, gzip
├── index.html
├── docker-compose.yml
└── vite.config.ts
```

---

## License

MIT
