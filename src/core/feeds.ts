import type { Feed } from '../types/index.js';

export const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// Fallback used only if feeds.json fails to load
const FALLBACK_FEEDS: Feed[] = [
  { id: 'bbc', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', color: '#cc785c', enabled: true },
  { id: 'npr', name: 'NPR', url: 'https://feeds.npr.org/1004/rss.xml', color: '#5d4037', enabled: true },
  { id: 'pbs', name: 'PBS NewsHour', url: 'https://www.pbs.org/newshour/feeds/rss/headlines', color: '#4a235a', enabled: true },
];

/**
 * Load the feed list from /feeds.json (editable without touching code).
 * Falls back to FALLBACK_FEEDS if the file is unreachable.
 */
export async function loadFeeds(): Promise<Feed[]> {
  try {
    const res = await fetch('/feeds.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as Feed[];
  } catch {
    console.warn('feeds.json unavailable — using fallback feed list');
    return FALLBACK_FEEDS;
  }
}
