import type { Feed } from '../types/index.js';

export function openSettings(feedConfig: Feed[], onToggle: (id: string, enabled: boolean) => void): void {
  const feedList = document.getElementById('feedList')!;

  feedList.innerHTML = feedConfig
    .map(
      (f) => `
    <div class="feed-item">
      <div class="feed-color" style="background:${f.color};--chip-color:${f.color}"></div>
      <div class="feed-info">
        <div class="feed-name">${f.name}</div>
        <div class="feed-url">${f.url}</div>
      </div>
      <label class="feed-toggle">
        <input type="checkbox" data-id="${f.id}" ${f.enabled ? 'checked' : ''} />
        <span class="feed-toggle-track"></span>
        <span class="feed-toggle-thumb"></span>
      </label>
    </div>
  `,
    )
    .join('');

  feedList.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) =>
    cb.addEventListener('change', () => onToggle(cb.dataset['id']!, cb.checked)),
  );

  document.getElementById('settingsOverlay')!.classList.add('open');
}

export function closeSettings(): void {
  document.getElementById('settingsOverlay')!.classList.remove('open');
}
