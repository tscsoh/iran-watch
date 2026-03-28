Diagnose why one or more RSS feeds are failing to return articles.

## Usage
Pass a feed ID or name: `/debug-feeds bbc` or `/debug-feeds` to check all feeds.

## Process
Use the `@feed-debugger` agent to:
1. Fetch each failing feed URL directly and through each proxy
2. Identify whether the failure is: feed down, proxy blocked, SSL error, or XML parse issue
3. Recommend whether to: fix the URL, switch proxies, mark as `direct: true`, or remove the feed

After diagnosis, if a fix is clear (e.g. updated URL), apply it to `src/js/feeds.js`.
