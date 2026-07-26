import type { Store } from '../../store'

/**
 * Header — верхняя панель приложения.
 *
 * Содержит:
 *   - Логотип Smart Project Map (SVG)
 *   - Путь к проекту (из store.graph.meta?.projectPath)
 *   - WS-индикатор (live / offline)
 *   - Кнопки: Refresh, Fit, Toggle theme
 *
 * Обновляет WS-статус через eventBus ('ws:open', 'ws:close').
 */

export class Header {
  private store: Store
  private el: HTMLElement | null = null
  private wsStatus: 'live' | 'offline' = 'offline'

  constructor(store: Store) {
    this.store = store
  }

  render(): HTMLElement {
    const header = document.createElement('header')
    header.className = 'header'
    header.innerHTML = `
      <div class="logo" aria-label="Smart Project Map">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
          <line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>
        </svg>
        Smart Project Map
      </div>
      <div class="logo-sep" aria-hidden="true"></div>
      <div class="header-path" id="hdr-path">~/projects/…</div>
      <div class="ws-indicator" id="hdr-ws" aria-live="polite">
        <div class="ws-dot"></div>
        <span id="hdr-ws-label">connecting</span>
      </div>
      <button class="header-btn" id="hdr-refresh" aria-label="Refresh graph">↺ Refresh</button>
      <button class="header-btn" id="hdr-fit" aria-label="Fit graph">⊡ Fit</button>
      <button class="theme-btn" aria-label="Toggle theme" data-theme-toggle id="hdr-theme">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    `
    this.el = header
    this._bindEvents()
    return header
  }

  private _bindEvents(): void {
    if (!this.el) return
    this.el.querySelector('#hdr-refresh')?.addEventListener('click', () =>
      document.dispatchEvent(new CustomEvent('spm:refresh'))
    )
    this.el.querySelector('#hdr-fit')?.addEventListener('click', () =>
      document.dispatchEvent(new CustomEvent('spm:fit'))
    )
    this.el.querySelector('#hdr-theme')?.addEventListener('click', () => {
      const next = this.store.theme === 'dark' ? 'light' : 'dark'
      this.store.setTheme(next)
    })
  }

  setWsStatus(status: 'live' | 'offline'): void {
    this.wsStatus = status
    const ind = this.el?.querySelector('#hdr-ws')
    const lbl = this.el?.querySelector('#hdr-ws-label')
    if (ind) ind.className = `ws-indicator ws-${status}`
    if (lbl) lbl.textContent = status
  }

  setPath(path: string): void {
    const el = this.el?.querySelector('#hdr-path')
    if (el) el.textContent = path
  }
}
