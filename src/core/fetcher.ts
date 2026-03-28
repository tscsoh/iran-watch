import type { Feed, Article } from '../types/index.js';
import { THREE_DAYS_MS } from './feeds.js';

interface Proxy {
  buildUrl: (url: string) => string;
  extract: (res: Response) => Promise<string>;
}

// Proxy chain — tried in order, first success wins.
//
// 1. Local nginx proxy  — works in Docker (same-origin, most reliable)
// 2. corsproxy.io       — external fallback for local dev
// 3. allorigins.win/get — second external fallback (returns JSON wrapper)
const PROXIES: Proxy[] = [
  {
    buildUrl: (url) => `/proxy?url=${encodeURIComponent(url)}`,
    extract: (res) => res.text(),
  },
  {
    buildUrl: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    extract: (res) => res.text(),
  },
  {
    buildUrl: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extract: async (res) => {
      const data = (await res.json()) as { contents?: string };
      if (!data.contents) throw new Error('allorigins: empty contents');
      return data.contents;
    },
  },
];

async function fetchRaw(feed: Feed): Promise<string> {
  if (feed.direct) {
    try {
      const res = await fetch(feed.url, { signal: AbortSignal.timeout(12_000) });
      if (res.ok) return res.text();
    } catch {
      // fall through to proxy chain
    }
  }

  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy.buildUrl(feed.url), { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await proxy.extract(res);
    } catch {
      // try next proxy
    }
  }

  throw new Error(`All fetch attempts failed for ${feed.name}`);
}

function parseDate(str: string): Date {
  if (!str) return new Date();
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function extractImage(item: Element): string | null {
  const media = item.querySelector('thumbnail, [medium="image"]');
  if (media) return media.getAttribute('url') ?? media.getAttribute('src');

  const enclosure = item.querySelector('enclosure[type^="image"]');
  if (enclosure) return enclosure.getAttribute('url');

  const html = item.querySelector('description, content, summary')?.textContent ?? '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

/**
 * FNV-1a 32-bit hash → base-36 string.
 * Produces a stable, unique ID for any URL/title regardless of common prefixes.
 */
function hashId(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

export function stripHtml(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchFeed(feed: Feed): Promise<Article[]> {
  const text = await fetchRaw(feed);
  const xml = new DOMParser().parseFromString(text, 'text/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error(`Invalid XML from ${feed.name}`);
  }

  const cutoff = Date.now() - THREE_DAYS_MS;

  return [...xml.querySelectorAll('item, entry')].flatMap((item): Article[] => {
    const get = (sel: string, attr?: string): string => {
      const el = item.querySelector(sel);
      return attr ? (el?.getAttribute(attr) ?? '') : (el?.textContent?.trim() ?? '');
    };

    const title = get('title');
    const link = get('link') || item.querySelector('link')?.getAttribute('href') || '';
    if (!title && !link) return [];

    const desc = stripHtml(get('description') || get('summary') || get('content'));
    const date = parseDate(get('pubDate') || get('published') || get('updated') || '');

    if (date.getTime() < cutoff) return [];

    return [
      {
        id: hashId(link || title),
        source: feed.id,
        sourceName: feed.name,
        sourceColor: feed.color,
        title,
        link,
        desc,
        date,
        image: extractImage(item),
      },
    ];
  });
}
