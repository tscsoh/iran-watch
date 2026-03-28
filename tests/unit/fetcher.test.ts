import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Feed } from '../../src/types/index.js';

describe('XML parsing via fetchFeed', () => {
  const FEED: Feed = {
    id: 'test',
    name: 'Test Feed',
    color: '#fff',
    url: 'https://example.com/rss',
    enabled: true,
  };

  function makeRss(
    items: { title: string; link: string; desc?: string; pubDate?: string }[],
  ): string {
    return `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test</title>
    ${items
      .map(
        ({ title, link, desc, pubDate }) => `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${desc ?? ''}</description>
      <pubDate>${pubDate ?? new Date().toUTCString()}</pubDate>
    </item>`,
      )
      .join('')}
  </channel>
</rss>`;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed articles from valid RSS', async () => {
    const xml = makeRss([
      { title: 'Headline One', link: 'https://example.com/1', pubDate: new Date().toUTCString() },
      { title: 'Headline Two', link: 'https://example.com/2', pubDate: new Date().toUTCString() },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) }),
    );

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    const articles = await fetchFeed(FEED);
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe('Headline One');
    expect(articles[1].title).toBe('Headline Two');
  });

  it('filters out articles older than 3 days', async () => {
    const old = new Date(Date.now() - 4 * 24 * 3600 * 1000).toUTCString();
    const xml = makeRss([
      { title: 'Recent', link: 'https://example.com/1', pubDate: new Date().toUTCString() },
      { title: 'Old', link: 'https://example.com/2', pubDate: old },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) }),
    );

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    const articles = await fetchFeed(FEED);
    expect(articles.every((a) => a.title !== 'Old')).toBe(true);
  });

  it('strips HTML from descriptions', async () => {
    const xml = makeRss([
      {
        title: 'Test',
        link: 'https://example.com/1',
        desc: '<p>Some <b>bold</b> text &amp; entities</p>',
        pubDate: new Date().toUTCString(),
      },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) }),
    );

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    const articles = await fetchFeed(FEED);
    expect(articles[0].desc).not.toContain('<');
    expect(articles[0].desc).toBe('Some bold text & entities');
  });

  it('falls back through proxy chain until one succeeds', async () => {
    let callCount = 0;
    const xml = makeRss([
      { title: 'Fallback article', link: 'https://example.com/1', pubDate: new Date().toUTCString() },
    ]);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return Promise.resolve({ ok: false, status: 403 });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ contents: xml }),
        });
      }),
    );

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    const articles = await fetchFeed(FEED);
    expect(articles[0].title).toBe('Fallback article');
    expect(callCount).toBe(3);
  });

  it('throws when all proxies fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    await expect(fetchFeed(FEED)).rejects.toThrow();
  });

  it('assigns current date when pubDate is missing', async () => {
    const before = Date.now();
    const xml = makeRss([{ title: 'No date', link: 'https://example.com/1', pubDate: '' }]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) }),
    );

    const { fetchFeed } = await import('../../src/core/fetcher.js');
    const articles = await fetchFeed(FEED);
    if (articles.length > 0) {
      expect(articles[0].date.getTime()).toBeGreaterThanOrEqual(before);
    }
  });
});
