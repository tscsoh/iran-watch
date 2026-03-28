---
paths:
  - "src/js/__tests__/**/*.test.js"
---

# Testing Rules

## General
- Test files live in `src/js/__tests__/` and are named `<module>.test.js`
- Each `test()` covers one behaviour — no mega-tests
- Always test the error path alongside the happy path
- Use `vi.stubGlobal('fetch', ...)` for network calls — never make real HTTP requests in tests
- Use `vi.restoreAllMocks()` in `beforeEach` when using stubs

## DOM tests
- `jsdom` is configured in `vitest.config.js` — set up required DOM elements in `beforeEach`
- Don't rely on DOM state leaking between tests — always reset `document.body.innerHTML`

## What to test per module
- `renderer.js`: `timeAgo` edge cases, `articleHTML` output structure, `render` filtering logic
- `storage.js`: date deserialisation, 3-day filter, truncation limit, saved config restore
- `fetcher.js`: XML parsing, date parsing, proxy fallback order, error handling

## Forbidden patterns
- `expect(el).toBeTruthy()` — be specific about what value is expected
- Tests that import from `app.js` — app.js has side effects (calls `init()`); test modules independently
- Asserting implementation details (e.g. which proxy URL was called) instead of observable behaviour
