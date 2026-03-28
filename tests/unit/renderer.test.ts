import { describe, it, expect, beforeEach } from 'vitest';
import { timeAgo, articleHTML, render } from '../../src/ui/renderer.js';
import type { Article } from '../../src/types/index.js';

describe('timeAgo', () => {
  it('returns "just now" for sub-minute dates', () => {
    expect(timeAgo(new Date(Date.now() - 30_000))).toBe('just now');
  });

  it('returns minutes for < 1 hour', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60_000))).toBe('5m ago');
  });

  it('returns hours for < 24 hours', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000))).toBe('3h ago');
  });

  it('returns days for >= 24 hours', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 86400_000))).toBe('2d ago');
  });
});

describe('articleHTML', () => {
  const base: Article = {
    id: 'abc123',
    source: 'bbc',
    sourceName: 'BBC World',
    sourceColor: '#cc785c',
    title: 'Test headline',
    link: 'https://example.com/article',
    desc: 'A short description.',
    date: new Date(Date.now() - 60_000),
    image: null,
  };

  it('renders title and source name', () => {
    const html = articleHTML(base);
    expect(html).toContain('Test headline');
    expect(html).toContain('BBC World');
  });

  it('links to the article URL', () => {
    const html = articleHTML(base);
    expect(html).toContain('href="https://example.com/article"');
  });

  it('shows placeholder when no image', () => {
    const html = articleHTML(base);
    expect(html).toContain('article-thumb-placeholder');
    expect(html).not.toContain('<img');
  });

  it('renders img tag when image is present', () => {
    const html = articleHTML({ ...base, image: 'https://example.com/img.jpg' });
    expect(html).toContain('<img');
    expect(html).toContain('src="https://example.com/img.jpg"');
  });

  it('truncates description at 180 chars', () => {
    const longDesc = 'x'.repeat(200);
    const html = articleHTML({ ...base, desc: longDesc });
    expect(html).toContain('x'.repeat(180));
    expect(html).not.toContain('x'.repeat(181));
  });

  it('omits description block when desc is empty', () => {
    const html = articleHTML({ ...base, desc: '' });
    expect(html).not.toContain('article-desc');
  });

  it('opens in new tab with noopener', () => {
    const html = articleHTML(base);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });
});

describe('render', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="main"></div>
      <span id="countBadge"></span>
      <div id="sourceFilters"></div>
    `;
  });

  const makeArticle = (overrides: Partial<Article> = {}): Article => ({
    id: 'test1',
    source: 'bbc',
    sourceName: 'BBC',
    sourceColor: '#cc785c',
    title: 'Article title',
    link: 'https://example.com',
    desc: 'desc',
    date: new Date(),
    image: null,
    ...overrides,
  });

  it('renders the correct article count in badge', () => {
    render([makeArticle(), makeArticle({ id: 'test2' })], 'all', '');
    expect(document.getElementById('countBadge')!.textContent).toBe('2 articles');
  });

  it('shows singular "article" for count of 1', () => {
    render([makeArticle()], 'all', '');
    expect(document.getElementById('countBadge')!.textContent).toBe('1 article');
  });

  it('filters by source', () => {
    const articles = [
      makeArticle({ id: 'a1', source: 'bbc' }),
      makeArticle({ id: 'a2', source: 'npr' }),
    ];
    render(articles, 'bbc', '');
    expect(document.getElementById('countBadge')!.textContent).toBe('1 article');
  });

  it('filters by search query', () => {
    const articles = [
      makeArticle({ id: 'a1', title: 'Iran nuclear deal' }),
      makeArticle({ id: 'a2', title: 'Sports news today' }),
    ];
    render(articles, 'all', 'nuclear');
    expect(document.getElementById('countBadge')!.textContent).toBe('1 article');
  });

  it('shows empty state when no results', () => {
    render([], 'all', '');
    expect(document.getElementById('main')!.innerHTML).toContain('state-view');
  });
});
