#!/usr/bin/env node
/**
 * Feed diagnostic script
 *
 * Tests all feeds in feeds.json against each proxy strategy and reports
 * article counts. Exits 1 if no feeds return any articles at all.
 *
 * Usage: tsx scripts/test-feeds.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';

interface Feed {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

const feedsPath = join(process.cwd(), 'public', 'feeds.json');
const feeds: Feed[] = JSON.parse(readFileSync(feedsPath, 'utf-8')) as Feed[];

interface ProxyStrategy {
  name: string;
  buildUrl: (url: string) => string;
  extract: (res: Response) => Promise<string>;
}

const PROXIES: ProxyStrategy[] = [
  {
    name: 'direct',
    buildUrl: (url) => url,
    extract: (res) => res.text(),
  },
  {
    name: 'corsproxy.io',
    buildUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    extract: (res) => res.text(),
  },
  {
    name: 'allorigins',
    buildUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extract: async (res) => {
      const data = (await res.json()) as { contents?: string };
      return data.contents ?? '';
    },
  },
];

async function testFeed(feed: Feed): Promise<void> {
  console.log(`\n${DIM}Testing: ${feed.name} (${feed.url})${RESET}`);

  for (const proxy of PROXIES) {
    try {
      const proxyUrl = proxy.buildUrl(feed.url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });

      if (!res.ok) {
        console.log(`  ${RED}✗${RESET} ${proxy.name}: HTTP ${res.status}`);
        continue;
      }

      const text = await proxy.extract(res);
      if (!text) {
        console.log(`  ${RED}✗${RESET} ${proxy.name}: empty response`);
        continue;
      }

      const { document } = parseHTML(`<html><body>${text}</body></html>`);
      const items = document.querySelectorAll('item, entry');
      const cutoff = Date.now() - THREE_DAYS_MS;

      let recent = 0;
      items.forEach((item) => {
        const dateStr =
          item.querySelector('pubDate')?.textContent ??
          item.querySelector('published')?.textContent ??
          item.querySelector('updated')?.textContent ??
          '';
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date.getTime() > cutoff) recent++;
      });

      const color = recent > 0 ? GREEN : YELLOW;
      console.log(
        `  ${color}✓${RESET} ${proxy.name}: ${items.length} items total, ${recent} in last 3 days`,
      );

      if (recent > 0) break; // stop after first working proxy
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ${RED}✗${RESET} ${proxy.name}: ${message}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`\nTesting ${feeds.length} feeds...\n${'─'.repeat(60)}`);

  for (const feed of feeds) {
    await testFeed(feed);
  }

  console.log(`\n${'─'.repeat(60)}\nDone.\n`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
