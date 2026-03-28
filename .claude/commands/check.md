Run a full health check on the Iran Watch project: tests, feed status, and Docker.

## Steps

1. **Run tests**
   ```
   npm test
   ```
   Report any failures.

2. **Check feed reachability** — for each feed in `src/js/feeds.js`, verify the URL is reachable via WebFetch or corsproxy. Flag any that return non-200 or non-XML.

3. **Check Docker**
   ```
   docker compose ps
   ```
   Report if the container is running and healthy.

4. **Summarise** in a table: tests (pass/fail count), feeds (reachable/blocked count), Docker (up/down).

Use `@feed-debugger` for detailed diagnosis of any blocked feeds.
