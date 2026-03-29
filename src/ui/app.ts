import type { Feed, Article } from '../types/index.js';
import { loadFeeds } from '../core/feeds.js';
import { fetchFeed } from '../core/fetcher.js';
import { render, buildSourceChips } from './renderer.js';
import { openSettings, closeSettings } from './settings.js';
import {
  applyFeedConfig,
  saveFeedConfig,
  loadCachedArticles,
  saveCachedArticles,
  purgeCachedArticles,
  LAST_KEY,
} from '../core/storage.js';

// ─── STATE ───────────────────────────────────────────────────────────────────
let allArticles: Article[] = [];
let activeSource = 'all';
let searchQuery = '';
let feedConfig: Feed[] = [];

// ─── LOADING STATUS ──────────────────────────────────────────────────────────
function setLoadingStatus(pendingIds: Set<string>): void {
  const el = document.getElementById('loadingStatus')!;
  if (!pendingIds.size) {
    el.hidden = true;
    return;
  }
  const names = feedConfig
    .filter((f) => pendingIds.has(f.id))
    .map((f) => f.name)
    .join(' · ');
  el.hidden = false;
  el.innerHTML = `<span class="loading-spinner"></span>Fetching: <span class="loading-names">${names}</span>`;
}

// ─── REFRESH ─────────────────────────────────────────────────────────────────
async function refreshAll(): Promise<void> {
  const btn = document.getElementById('refreshBtn') as HTMLButtonElement;
  const bar = document.getElementById('progressBar')!;
  const dot = document.getElementById('statusDot')!;

  btn.disabled = true;
  btn.textContent = '↻ Fetching…';
  bar.className = 'progress-bar active';
  dot.className = 'status-dot';

  const enabledFeeds = feedConfig.filter((f) => f.enabled);
  const pending = new Set(enabledFeeds.map((f) => f.id));
  setLoadingStatus(pending);

  const newArticles: Article[] = [];
  let errors = 0;

  await Promise.allSettled(
    enabledFeeds.map((feed) =>
      fetchFeed(feed)
        .then((items) => {
          newArticles.push(...items);
          pending.delete(feed.id);
          setLoadingStatus(pending);
          mergeAndRender(newArticles);
        })
        .catch(() => {
          errors++;
          pending.delete(feed.id);
          setLoadingStatus(pending);
        }),
    ),
  );

  // Final deduplicated merge with cache
  const seen = new Set<string>();
  allArticles = [...newArticles, ...loadCachedArticles()]
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 1500);

  saveCachedArticles(allArticles);
  localStorage.setItem(LAST_KEY, new Date().toISOString());

  window.scrollTo({ top: 0, behavior: 'smooth' });
  bar.className = 'progress-bar done';
  setTimeout(() => {
    bar.className = 'progress-bar';
  }, 800);
  btn.disabled = false;
  btn.textContent = '↻ Refresh';
  dot.className = errors === enabledFeeds.length ? 'status-dot error' : 'status-dot live';

  document.getElementById('lastRefreshed')!.textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  buildSourceChips(allArticles, feedConfig, activeSource, setSource);
  render(allArticles, activeSource, searchQuery);
}

function mergeAndRender(newArticles: Article[]): void {
  const seen = new Set<string>();
  allArticles = [...newArticles, ...loadCachedArticles()]
    .filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 1500);
  buildSourceChips(allArticles, feedConfig, activeSource, setSource);
  render(allArticles, activeSource, searchQuery);
}

function setSource(id: string): void {
  activeSource = id;
  buildSourceChips(allArticles, feedConfig, activeSource, setSource);
  render(allArticles, activeSource, searchQuery);
}

function clearCache(): void {
  purgeCachedArticles();
  allArticles = [];
  closeSettings();
  render(allArticles, activeSource, searchQuery);
  void refreshAll();
}

// ─── INIT ────────────────────────────────────────────────────────────────────
export async function init(): Promise<void> {
  const feeds = await loadFeeds();
  feedConfig = applyFeedConfig(feeds);

  // Show cached articles instantly before any network request
  allArticles = loadCachedArticles();
  const last = localStorage.getItem(LAST_KEY);
  if (last) {
    document.getElementById('lastRefreshed')!.textContent = new Date(last).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (allArticles.length > 0) {
    document.getElementById('statusDot')!.className = 'status-dot live';
    buildSourceChips(allArticles, feedConfig, activeSource, setSource);
    render(allArticles, activeSource, searchQuery);
  }

  void refreshAll();

  document.getElementById('search')!.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      searchQuery = (e.target as HTMLInputElement).value;
      render(allArticles, activeSource, searchQuery);
    }
    if (e.key === 'Escape') {
      const el = e.target as HTMLInputElement;
      el.value = '';
      searchQuery = '';
      render(allArticles, activeSource, searchQuery);
    }
  });

  document.getElementById('refreshBtn')!.addEventListener('click', () => void refreshAll());

  document.getElementById('settingsBtn')!.addEventListener('click', () =>
    openSettings(feedConfig, (id, enabled) => {
      const feed = feedConfig.find((f) => f.id === id);
      if (feed) feed.enabled = enabled;
      saveFeedConfig(feedConfig);
    }),
  );

  document.getElementById('clearCacheBtn')!.addEventListener('click', clearCache);

  document.getElementById('settingsOverlay')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeSettings();
  });

  document.querySelector<HTMLButtonElement>('.close-btn')!.addEventListener('click', closeSettings);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
