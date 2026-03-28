import type { Feed, Article, FeedConfigMap } from '../types/index.js';
import { THREE_DAYS_MS } from './feeds.js';

const CACHE_KEY = 'iranwatch_articles';
const CONFIG_KEY = 'iranwatch_feeds';
export const LAST_KEY = 'iranwatch_last';

/**
 * Merge the loaded feed list with any saved per-feed enabled/disabled state.
 */
export function applyFeedConfig(feeds: Feed[]): Feed[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') as FeedConfigMap;
    return feeds.map((f) => ({
      ...f,
      enabled: saved[f.id] !== undefined ? saved[f.id] : f.enabled,
    }));
  } catch {
    return [...feeds];
  }
}

export function saveFeedConfig(feedConfig: Feed[]): void {
  const map: FeedConfigMap = {};
  feedConfig.forEach((f) => (map[f.id] = f.enabled));
  localStorage.setItem(CONFIG_KEY, JSON.stringify(map));
}

export function loadCachedArticles(): Article[] {
  try {
    return (JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]') as Article[])
      .map((a) => ({ ...a, date: new Date(a.date) }))
      .filter((a) => Date.now() - a.date.getTime() <= THREE_DAYS_MS);
  } catch {
    return [];
  }
}

export function saveCachedArticles(articles: Article[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(articles.slice(0, 1500)));
  } catch {
    // Storage quota exceeded — silently skip
  }
}

export function purgeCachedArticles(): void {
  localStorage.removeItem(CACHE_KEY);
}
