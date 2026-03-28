---
paths:
  - "src/js/feeds.js"
  - "src/js/fetcher.js"
---

# Feed Rules

## Feed definitions
- All feed entries live in `src/js/feeds.js` — never inline feed URLs in other modules
- Each feed must have: `id` (unique, slug), `name`, `url`, `color` (hex), `enabled` (bool)
- Add `direct: true` only for feeds whose servers serve CORS headers natively

## Known broken feeds (do not re-add without a working URL)
| Feed | Reason |
|---|---|
| AP News | No public RSS; rsshub mirror blocks all proxy IPs |
| Reuters | `feeds.reuters.com` dead (530); rsshub mirror also blocked |
| CNN | `rss.cnn.com` persistent SSL failures (525) |

## Proxy chain (fetcher.js)
Order matters — do not reorder without testing:
1. `corsproxy.io` — primary, returns raw content
2. `allorigins.win/get` — fallback, returns JSON `{ contents: "..." }`

If both fail and the feed has `direct: true`, the direct URL is tried first (before proxies).

## Adding a new feed
1. Verify the RSS URL returns valid XML via WebFetch before adding
2. Test through both proxies to confirm at least one works
3. Assign a distinct `color` that doesn't collide with existing feed colours
4. Bump the SW cache version in `sw.js` after any feed list change (triggers fresh install)
