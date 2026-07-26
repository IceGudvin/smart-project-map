/**
 * Header/index.ts — Полная реализация верхней панели.
 *
 * Содержит:
 *   - SVG-логотип: 3 круга + линии между ними, currentColor
 *   - Путь проекта из store.graph.meta?.projectPath
 *   - WS-индикатор: пульсирующая точка + текст live/offline
 *   - ↺ Refresh → POST /graph/rebuild
 *   - ⊡ Fit → emit('cy:fit')
 *   - Переключатель темы (moon/sun)
 *   - updatedAt таймстамп
 */

import { store }    from '../../store.js'
import { on, emit } from '../../lib/eventBus.js'

// ================================================================ CSS

function injectHeaderStyles(): void {
  if (document.getElementById('header-styles')) return
  const s = document.createElement('style')
  s.id = 'header-styles'
  s.textContent = `
    /* ---- Лого ---- */
    .hdr-logo {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      font-size: var(--text-sm, 0.875rem);
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: -0.01em;
      flex-shrink: 0;
      user-select: none;
    }
    .hdr-logo svg {
      flex-shrink: 0;
      color: var(--color-primary);
    }

    /* ---- Разделитель ---- */
    .hdr-sep {
      width: 1px;
      height: 16px;
      background: var(--color-border);
      flex-shrink: 0;
      margin: 0 var(--space-2, 0.5rem);
    }

    /* ---- Путь проекта ---- */
    .hdr-path {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 320px;
      flex-shrink: 1;
    }

    /* ---- Спейсер (раздвигает правые элементы вправо) ---- */
    .hdr-spacer {
      flex: 1;
    }

    /* ---- updatedAt ---- */
    .hdr-updated {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-faint);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* ---- WS-индикатор ---- */
    .hdr-ws {
      display: flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted);
      flex-shrink: 0;
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border-radius: var(--radius-full, 9999px);
      background: oklch(from var(--color-surface-offset, #e6e4df) l c h / 0.7);
    }
    .hdr-ws-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-text-faint);
      flex-shrink: 0;
      transition: background 300ms;
    }
    .hdr-ws--connected .hdr-ws-dot {
      background: var(--color-success, #437a22);
      animation: ws-pulse 2s ease-in-out infinite;
    }
    .hdr-ws--connecting .hdr-ws-dot {
      background: var(--color-gold, #d19900);
      animation: ws-pulse 1s ease-in-out infinite;
    }
    .hdr-ws--error .hdr-ws-dot {
      background: var(--color-error, #a12c7b);
    }
    .hdr-ws--disconnected .hdr-ws-dot {
      background: var(--color-text-faint);
    }
    @keyframes ws-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.45; transform: scale(0.75); }
    }
    .hdr-ws--connected   .hdr-ws-label { color: var(--color-success);     }
    .hdr-ws--connecting  .hdr-ws-label { color: var(--color-gold);         }
    .hdr-ws--error       .hdr-ws-label { color: var(--color-error);        }
    .hdr-ws--disconnected .hdr-ws-label { color: var(--color-text-faint);  }

    /* ---- Кнопки ---- */
    .hdr-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: 0 var(--space-3, 0.75rem);
      height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 500;
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      flex-shrink: 0;
      transition:
        color 150ms,
        background 150ms,
        border-color 150ms;
      white-space: nowrap;
    }
    .hdr-btn:hover {
      color: var(--color-text);
      background: var(--color-surface-offset, #f3f0ec);
      border-color: var(--color-border);
    }
    .hdr-btn:active {
      background: var(--color-surface-dynamic, #e6e4df);
    }
    .hdr-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hdr-btn.loading {
      pointer-events: none;
      opacity: 0.6;
    }
    /* Спиннер внутри кнопки Refresh во время загрузки */
    @keyframes spin { to { transform: rotate(360deg); } }
    .hdr-refresh-icon.spinning { animation: spin 0.7s linear infinite; display: inline-block; }

    /* ---- Тема-кнопка ---- */
    .hdr-theme {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      color: var(--color-text-muted);
      background: transparent;
      border: 1px solid transparent;
      cursor: pointer;
      flex-shrink: 0;
      transition:
        color 150ms,
        background 150ms,
        border-color 150ms,
        transform 200ms;
    }
    .hdr-theme:hover {
      color: var(--color-text);
      background: var(--color-surface-offset, #f3f0ec);
      border-color: var(--color-border);
    }
    .hdr-theme:active { transform: scale(0.9); }
  `
  document.head.appendChild(s)
}

// ================================================================ SVG helpers

/** Лого — граф: 3 круга + линии между ними, currentColor */
const LOGO_SVG = /* svg */`
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.75"
  stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <!-- Рёбра -->
  <line x1="12" y1="5" x2="4"  y2="18"/>
  <line x1="12" y1="5" x2="20" y2="18"/>
  <line x1="4"  y1="18" x2="20" y2="18"/>
  <!-- Узлы (рисуются поверх рёбер) -->
  <circle cx="12" cy="5"  r="2.5" fill="currentColor" stroke="none"/>
  <circle cx="4"  cy="18" r="2.5" fill="currentColor" stroke="none"/>
  <circle cx="20" cy="18" r="2.5" fill="currentColor" stroke="none"/>
</svg>`

/** Moon icon (тёмная тема активна — предложить светлую) */
const MOON_SVG = /* svg */`
<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`

/** Sun icon (светлая тема активна — предложить тёмную) */
const SUN_SVG = /* svg */`
<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round"
  aria-hidden="true">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
    M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`

// ================================================================ WS status labels

const WS_LABEL: Record<string, string> = {
  connected:    'live',
  connecting:   'connecting',
  disconnected: 'offline',
  error:        'error',
}

// ================================================================ Header

export class Header {
  private el: HTMLElement
  private unsubs: Array<() => void> = []

  /** DOM-рефы */
  private _pathEl!:    HTMLElement
  private _wsEl!:      HTMLElement
  private _wsDot!:     HTMLElement
  private _wsLabel!:   HTMLElement
  private _updatedEl!: HTMLElement
  private _refreshBtn!: HTMLButtonElement
  private _themeBtn!:  HTMLButtonElement

  constructor(el: HTMLElement) {
    this.el = el
  }

  // ============================================================ mount

  mount(): void {
    injectHeaderStyles()
    this._render()
    this._bindEvents()
    this._syncWsStatus()
    this._syncPath()
    this._syncUpdatedAt()
    this._syncThemeIcon()
  }

  // ============================================================ update (called by AppShell)

  update(): void {
    this._syncPath()
    this._syncUpdatedAt()
    this._syncWsStatus()
    this._syncThemeIcon()
  }

  // ============================================================ destroy

  destroy(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
  }

  // ============================================================ private — render

  private _render(): void {
    this.el.innerHTML = ''

    // ---- Лого
    const logo = document.createElement('div')
    logo.className  = 'hdr-logo'
    logo.setAttribute('aria-label', 'Smart Project Map')
    logo.innerHTML  = LOGO_SVG + '<span>Smart Project Map</span>'
    this.el.appendChild(logo)

    // ---- Разделитель
    const sep1 = document.createElement('div')
    sep1.className = 'hdr-sep'
    sep1.setAttribute('aria-hidden', 'true')
    this.el.appendChild(sep1)

    // ---- Путь проекта
    this._pathEl = document.createElement('div')
    this._pathEl.className = 'hdr-path'
    this._pathEl.textContent = '~/projects/…'
    this.el.appendChild(this._pathEl)

    // ---- Спейсер
    const spacer = document.createElement('div')
    spacer.className = 'hdr-spacer'
    this.el.appendChild(spacer)

    // ---- updatedAt
    this._updatedEl = document.createElement('div')
    this._updatedEl.className = 'hdr-updated'
    this._updatedEl.setAttribute('aria-live', 'off')
    this.el.appendChild(this._updatedEl)

    const sep2 = document.createElement('div')
    sep2.className = 'hdr-sep'
    sep2.setAttribute('aria-hidden', 'true')
    this.el.appendChild(sep2)

    // ---- WS-индикатор
    this._wsEl = document.createElement('div')
    this._wsEl.className = 'hdr-ws hdr-ws--disconnected'
    this._wsEl.setAttribute('aria-live', 'polite')
    this._wsDot   = document.createElement('div')
    this._wsDot.className = 'hdr-ws-dot'
    this._wsLabel = document.createElement('span')
    this._wsLabel.className = 'hdr-ws-label'
    this._wsLabel.textContent = 'offline'
    this._wsEl.appendChild(this._wsDot)
    this._wsEl.appendChild(this._wsLabel)
    this.el.appendChild(this._wsEl)

    const sep3 = document.createElement('div')
    sep3.className = 'hdr-sep'
    sep3.setAttribute('aria-hidden', 'true')
    this.el.appendChild(sep3)

    // ---- Refresh
    this._refreshBtn = document.createElement('button')
    this._refreshBtn.className = 'hdr-btn'
    this._refreshBtn.setAttribute('aria-label', 'Rebuild graph')
    this._refreshBtn.innerHTML = `<span class="hdr-refresh-icon">↺</span> Refresh`
    this.el.appendChild(this._refreshBtn)

    // ---- Fit
    const fitBtn = document.createElement('button')
    fitBtn.className = 'hdr-btn'
    fitBtn.setAttribute('aria-label', 'Fit graph to canvas')
    fitBtn.textContent = '⊡ Fit'
    fitBtn.addEventListener('click', () => emit('cy:fit', undefined as any))
    this.el.appendChild(fitBtn)

    const sep4 = document.createElement('div')
    sep4.className = 'hdr-sep'
    sep4.setAttribute('aria-hidden', 'true')
    this.el.appendChild(sep4)

    // ---- Тема
    this._themeBtn = document.createElement('button')
    this._themeBtn.className = 'hdr-theme'
    this._themeBtn.setAttribute('aria-label', 'Toggle theme')
    this.el.appendChild(this._themeBtn)
  }

  // ============================================================ private — events

  private _bindEvents(): void {
    // Refresh → POST /graph/rebuild
    this._refreshBtn.addEventListener('click', () => this._doRefresh())

    // Theme toggle
    this._themeBtn.addEventListener('click', () => {
      const next = store.theme === 'dark' ? 'light' : 'dark'
      emit('theme:changed', next)
    })

    // WS-события
    this.unsubs.push(
      on('ws:connected',    () => this._syncWsStatus()),
      on('ws:disconnected', () => this._syncWsStatus()),
      on('ws:error',        () => this._syncWsStatus()),
    )

    // Обновление графа
    this.unsubs.push(
      on('graph:full',   () => { this._syncPath(); this._syncUpdatedAt() }),
      on('graph:update', () => this._syncUpdatedAt()),
    )

    // Смена темы
    this.unsubs.push(
      on('theme:changed', () => this._syncThemeIcon()),
    )
  }

  // ============================================================ private — sync helpers

  private _syncWsStatus(): void {
    const status = store.wsStatus  // 'connecting' | 'connected' | 'disconnected' | 'error'
    this._wsEl.className = `hdr-ws hdr-ws--${status}`
    this._wsLabel.textContent = WS_LABEL[status] ?? status
  }

  private _syncPath(): void {
    // GraphModel в shared/ не имеет meta — берём из первого узла (пользователь может передать через extra)
    const graph = store.graph
    const extra = (graph as any).meta?.projectPath as string | undefined
    const nodes = graph.nodes
    const guessed = nodes[0]?.language
      ? `${nodes.length} сервисов · ${nodes[0].language ?? ''}`
      : null
    this._pathEl.textContent = extra ?? guessed ?? '~/projects/…'
    this._pathEl.title = extra ?? ''
  }

  private _syncUpdatedAt(): void {
    const ts = store.graph.updatedAt
    if (!ts) {
      this._updatedEl.textContent = ''
      return
    }
    const d = new Date(ts)
    const hh = d.getHours().toString().padStart(2, '0')
    const mm = d.getMinutes().toString().padStart(2, '0')
    const ss = d.getSeconds().toString().padStart(2, '0')
    this._updatedEl.textContent = `Синх: ${hh}:${mm}:${ss}`
  }

  private _syncThemeIcon(): void {
    const isDark = store.theme === 'dark'
    this._themeBtn.innerHTML = isDark ? SUN_SVG : MOON_SVG
    this._themeBtn.setAttribute(
      'aria-label',
      isDark ? 'Switch to light theme' : 'Switch to dark theme'
    )
  }

  // ============================================================ private — rebuild

  private async _doRefresh(): Promise<void> {
    if (this._refreshBtn.classList.contains('loading')) return

    this._refreshBtn.classList.add('loading')
    const icon = this._refreshBtn.querySelector('.hdr-refresh-icon')
    icon?.classList.add('spinning')

    try {
      const res = await fetch('/graph/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Путь из store (если есть) или пустой body
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.warn('[Header] rebuild failed:', res.status, text)
      }
      // Успех: ожидаем graph:full / graph:update по каналу WS
    } catch (err) {
      console.warn('[Header] rebuild network error:', err)
    } finally {
      this._refreshBtn.classList.remove('loading')
      icon?.classList.remove('spinning')
    }
  }
}
