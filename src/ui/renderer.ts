import type { Feed, Article } from '../types/index.js';

export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function articleHTML(a: Article): string {
  const ago = timeAgo(a.date);
  const thumb = a.image
    ? `<img class="article-thumb" src="${a.image}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="article-thumb-placeholder" style="display:none">🗞</div>`
    : `<div class="article-thumb-placeholder">🗞</div>`;
  return `<a class="article-card" href="${a.link}" target="_blank" rel="noopener">
    ${thumb}
    <div class="article-body">
      <div class="article-meta">
        <span class="article-source"><span class="dot" style="background:${a.sourceColor}"></span>${a.sourceName}</span>
        <span class="article-date">${ago}</span>
      </div>
      <div class="article-title">${a.title}</div>
      ${a.desc ? `<div class="article-desc">${a.desc.slice(0, 180)}</div>` : ''}
    </div>
  </a>`;
}

export function buildSourceChips(
  allArticles: Article[],
  feedConfig: Feed[],
  activeSource: string,
  onSetSource: (id: string) => void,
): void {
  const sources = new Set(allArticles.map((a) => a.source));
  const chips = [
    { id: 'all', name: 'All', color: '#888' },
    ...feedConfig.filter((f) => sources.has(f.id)),
  ];

  const container = document.getElementById('sourceFilters')!;
  container.innerHTML = chips
    .map(
      (f) => `
    <button class="source-chip ${activeSource === f.id ? 'active' : ''}" data-source="${f.id}" style="--chip-color:${f.color}">
      <span class="dot" style="background:${f.color}"></span>${f.name}
    </button>
  `,
    )
    .join('');

  container.querySelectorAll<HTMLButtonElement>('.source-chip').forEach((btn) =>
    btn.addEventListener('click', () => onSetSource(btn.dataset['source']!)),
  );
}

export function render(allArticles: Article[], activeSource: string, searchQuery: string): void {
  const q = searchQuery.toLowerCase();
  const filtered = allArticles.filter((a) => {
    const matchSource = activeSource === 'all' || a.source === activeSource;
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q) ||
      a.sourceName.toLowerCase().includes(q);
    return matchSource && matchSearch;
  });

  const main = document.getElementById('main')!;
  const badge = document.getElementById('countBadge')!;
  badge.textContent = `${filtered.length} article${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    main.innerHTML = `<div class="state-view">
      <span class="big">${searchQuery ? '🔍' : '📡'}</span>
      <span>${searchQuery ? `No results for "${searchQuery}"` : 'No articles loaded yet. Hit Refresh.'}</span>
    </div>`;
    return;
  }

  main.innerHTML = filtered.map(articleHTML).join('');
}
