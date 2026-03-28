import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCachedArticles,
  saveCachedArticles,
  applyFeedConfig,
  saveFeedConfig,
} from '../../src/core/storage.js';
import { THREE_DAYS_MS } from '../../src/core/feeds.js';
import type { Feed, Article } from '../../src/types/index.js';

const CACHE_KEY = 'iranwatch_articles';
const CONFIG_KEY = 'iranwatch_feeds';

describe('loadCachedArticles', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when cache is empty', () => {
    expect(loadCachedArticles()).toEqual([]);
  });

  it('deserialises date strings back to Date objects', () => {
    const now = new Date();
    localStorage.setItem(CACHE_KEY, JSON.stringify([{ id: '1', date: now.toISOString() }]));
    const [article] = loadCachedArticles();
    expect(article.date).toBeInstanceOf(Date);
    expect(article.date.getTime()).toBeCloseTo(now.getTime(), -2);
  });

  it('filters out articles older than 3 days', () => {
    const old = new Date(Date.now() - THREE_DAYS_MS - 1000);
    const recent = new Date(Date.now() - 60_000);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify([
        { id: '1', date: old.toISOString() },
        { id: '2', date: recent.toISOString() },
      ]),
    );
    const result = loadCachedArticles();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem(CACHE_KEY, 'not-json{{{');
    expect(loadCachedArticles()).toEqual([]);
  });
});

describe('saveCachedArticles', () => {
  beforeEach(() => localStorage.clear());

  it('saves articles to localStorage', () => {
    const articles = [{ id: '1', date: new Date() }] as Article[];
    saveCachedArticles(articles);
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY)!) as unknown[];
    expect(raw).toHaveLength(1);
  });

  it('truncates to 1500 articles', () => {
    const articles = Array.from(
      { length: 2000 },
      (_, i) => ({ id: String(i), date: new Date() }) as Article,
    );
    saveCachedArticles(articles);
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY)!) as unknown[];
    expect(raw).toHaveLength(1500);
  });
});

describe('applyFeedConfig', () => {
  beforeEach(() => localStorage.clear());

  const sampleFeeds: Feed[] = [
    { id: 'bbc', name: 'BBC', url: 'https://example.com/rss', color: '#fff', enabled: true },
    { id: 'npr', name: 'NPR', url: 'https://example.com/rss2', color: '#000', enabled: true },
  ];

  it('returns feeds with default enabled state when no saved config', () => {
    const config = applyFeedConfig(sampleFeeds);
    expect(config).toHaveLength(2);
    config.forEach((f) => {
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('url');
      expect(f).toHaveProperty('color');
      expect(typeof f.enabled).toBe('boolean');
    });
  });

  it('restores saved enabled/disabled state', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ bbc: false }));
    const config = applyFeedConfig(sampleFeeds);
    expect(config.find((f) => f.id === 'bbc')!.enabled).toBe(false);
    expect(config.find((f) => f.id === 'npr')!.enabled).toBe(true);
  });
});

describe('saveFeedConfig', () => {
  beforeEach(() => localStorage.clear());

  it('persists enabled flags keyed by feed id', () => {
    const config: Feed[] = [
      { id: 'bbc', name: 'BBC', url: 'https://example.com', color: '#fff', enabled: false },
    ];
    saveFeedConfig(config);
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY)!) as Record<string, boolean>;
    expect(saved['bbc']).toBe(false);
  });
});
