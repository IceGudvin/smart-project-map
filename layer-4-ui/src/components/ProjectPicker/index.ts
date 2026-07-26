/**
 * ProjectPicker — модальный экран выбора проекта.
 *
 * Открывается ТОЛЬКО через emit('project:pick:show') — т.е. по кнопке в Header.
 * Никакого автопоказа при старте / ошибке WS.
 *
 * FIX: CSS-переменные приведены к именам из tokens.css:
 *   --surface, --bg, --border, --text, --text-muted, --text-faint,
 *   --primary, --primary-h, --surface-off, --surface-dyn, --divider,
 *   --error, --success — без префикса --color-*.
 */

import { emit, on } from '../../lib/eventBus.js'

const STORAGE_KEY = 'spm:recentProjects'
const MAX_RECENT = 5

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveRecent(path: string): void {
  const list = [path, ...getRecent().filter((p) => p !== path)].slice(0, MAX_RECENT)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ok */ }
}

function inheritTheme(el: HTMLElement): () => void {
  const applyTheme = (theme?: string) => {
    const t = theme ?? document.documentElement.getAttribute('data-theme')
    if (t) el.setAttribute('data-theme', t)
    else el.removeAttribute('data-theme')
  }
  applyTheme()
  return on('theme:changed', (theme) => applyTheme(theme as string))
}

// ───────────────────────── styles

function injectStyles(): void {
  if (document.getElementById('pp-styles')) return
  const s = document.createElement('style')
  s.id = 'pp-styles'
  s.textContent = `
    /* ── overlay ── */
    .pp-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: oklch(0 0 0 / 0.55);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 200ms ease;
      pointer-events: none;
    }
    .pp-overlay.visible { opacity: 1; pointer-events: auto; }

    /* ── modal ── */
    .pp-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow-lg);
      padding: 1.5rem;
      width: min(520px, calc(100vw - 2rem));
      display: flex; flex-direction: column; gap: 1rem;
      transform: translateY(10px) scale(0.98);
      transition: transform 200ms cubic-bezier(0.16,1,0.3,1);
    }
    .pp-overlay.visible .pp-modal { transform: translateY(0) scale(1); }

    .pp-head { display: flex; align-items: center; justify-content: space-between; }
    .pp-title {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: var(--text-base, 1rem); font-weight: 600;
      color: var(--text);
    }
    .pp-close {
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px; cursor: pointer;
      color: var(--text-faint);
      transition: background 150ms, color 150ms;
    }
    .pp-close:hover { background: var(--surface-off); color: var(--text); }

    .pp-path-row { display: flex; gap: 0.5rem; align-items: center; }
    .pp-input {
      flex: 1; min-width: 0;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.8rem;
      color: var(--text);
      outline: none;
      transition: border-color 160ms, box-shadow 160ms;
    }
    .pp-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px var(--primary-bg, rgba(1,105,111,0.12));
    }
    .pp-input::placeholder { color: var(--text-faint); }

    .pp-btn-browse {
      flex-shrink: 0;
      display: flex; align-items: center; gap: 0.4rem;
      background: var(--surface-off);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem; font-weight: 500;
      color: var(--text-muted);
      cursor: pointer; white-space: nowrap;
      transition: background 160ms, border-color 160ms, color 160ms;
    }
    .pp-btn-browse:hover {
      background: var(--surface-dyn);
      border-color: var(--primary);
      color: var(--text);
    }
    .pp-btn-open {
      flex-shrink: 0;
      background: var(--primary);
      border: none; border-radius: 8px;
      padding: 0.5rem 1.1rem;
      font-size: 0.85rem; font-weight: 600;
      color: #fff; cursor: pointer; white-space: nowrap;
      transition: background 160ms, opacity 160ms;
    }
    .pp-btn-open:hover { background: var(--primary-h); }
    .pp-btn-open:disabled { opacity: 0.45; cursor: not-allowed; }

    .pp-status {
      min-height: 1.2em; font-size: 0.8rem;
      color: var(--text-muted);
      display: flex; align-items: center; gap: 0.4rem;
    }
    .pp-status.error   { color: var(--error); }
    .pp-status.success { color: var(--success); }

    .pp-section-label {
      font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-faint);
      margin-bottom: 0.25rem;
    }
    .pp-recent-list { list-style: none; display: flex; flex-direction: column; gap: 2px; }
    .pp-recent-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.35rem 0.5rem; border-radius: 6px; cursor: pointer;
      font-family: var(--font-mono, monospace); font-size: 0.75rem;
      color: var(--text-muted);
      transition: background 120ms, color 120ms;
      overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .pp-recent-item:hover { background: var(--surface-off); color: var(--text); }
    .pp-recent-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); flex-shrink: 0; opacity: 0.6; }

    .pp-divider { height: 1px; background: var(--divider); }
    .pp-hint { font-size: 0.72rem; color: var(--text-faint); line-height: 1.5; }
    .pp-hint code {
      font-family: var(--font-mono, monospace);
      background: var(--surface-off);
      padding: 0.1em 0.35em; border-radius: 3px;
      color: var(--text-muted);
    }

    /* ── file browser ── */
    .fb-overlay {
      position: fixed; inset: 0; z-index: 1100;
      display: flex; align-items: center; justify-content: center;
      background: oklch(0 0 0 / 0.60);
      backdrop-filter: blur(4px);
      opacity: 0; transition: opacity 180ms ease;
      pointer-events: none;
    }
    .fb-overlay.visible { opacity: 1; pointer-events: auto; }
    .fb-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      width: min(580px, calc(100vw - 2rem));
      height: min(480px, 80vh);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: scale(0.96); transition: transform 180ms cubic-bezier(0.16,1,0.3,1);
    }
    .fb-overlay.visible .fb-modal { transform: scale(1); }

    .fb-topbar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--divider);
      flex-shrink: 0;
    }
    .fb-topbar-title { font-size: 0.8rem; font-weight: 600; color: var(--text); flex-shrink: 0; }
    .fb-breadcrumb {
      display: flex; align-items: center; gap: 0; flex: 1; min-width: 0; overflow: hidden;
    }
    .fb-crumb {
      font-size: 0.72rem; color: var(--text-muted);
      cursor: pointer; padding: 0.2rem 0.35rem; border-radius: 4px;
      white-space: nowrap; transition: background 120ms, color 120ms;
      max-width: 120px; overflow: hidden; text-overflow: ellipsis;
    }
    .fb-crumb:hover { background: var(--surface-off); color: var(--text); }
    .fb-crumb-sep { color: var(--text-faint); font-size: 0.7rem; padding: 0 1px; flex-shrink: 0; }
    .fb-close {
      width: 26px; height: 26px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      border-radius: 5px; cursor: pointer;
      color: var(--text-faint);
      transition: background 120ms, color 120ms;
    }
    .fb-close:hover { background: var(--surface-off); color: var(--text); }

    .fb-list {
      flex: 1; overflow-y: auto; padding: 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: var(--surface-dyn) transparent;
    }
    .fb-empty {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--text-faint); font-size: 0.8rem;
    }
    .fb-item {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.45rem 0.75rem; border-radius: 6px; cursor: pointer;
      font-size: 0.82rem; color: var(--text-muted);
      transition: background 120ms, color 120ms;
      user-select: none;
    }
    .fb-item:hover { background: var(--surface-off); color: var(--text); }
    .fb-item.selected {
      background: var(--primary-bg, rgba(1,105,111,0.10));
      color: var(--text);
      border: 1px solid var(--primary-hl);
    }
    .fb-item-icon { flex-shrink: 0; color: var(--primary); opacity: 0.85; }
    .fb-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .fb-bottombar {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--divider);
      flex-shrink: 0;
      background: var(--surface-off);
    }
    .fb-selected-path {
      flex: 1; min-width: 0;
      font-family: var(--font-mono, monospace); font-size: 0.75rem;
      color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fb-selected-path.has-value { color: var(--text); }
    .fb-btn-up {
      display: flex; align-items: center; gap: 0.3rem;
      background: none; border: 1px solid var(--border);
      border-radius: 6px; padding: 0.4rem 0.65rem;
      font-size: 0.75rem; color: var(--text-muted);
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      transition: background 150ms, color 150ms, border-color 150ms;
    }
    .fb-btn-up:hover { background: var(--surface-off); border-color: var(--text-faint); color: var(--text); }
    .fb-btn-up:disabled { opacity: 0.3; cursor: not-allowed; }
    .fb-btn-select {
      background: var(--primary);
      border: none; border-radius: 6px;
      padding: 0.4rem 1rem;
      font-size: 0.8rem; font-weight: 600;
      color: #fff; cursor: pointer; white-space: nowrap; flex-shrink: 0;
      transition: background 150ms, opacity 150ms;
    }
    .fb-btn-select:hover { background: var(--primary-h); }
    .fb-btn-select:disabled { opacity: 0.4; cursor: not-allowed; }

    .fb-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; gap: 0.5rem;
      color: var(--text-faint); font-size: 0.8rem;
    }
    @keyframes fb-spin { to { transform: rotate(360deg); } }
    .fb-spinner {
      width: 16px; height: 16px;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: fb-spin 0.7s linear infinite;
    }
  `
  document.head.appendChild(s)
}

// ───────────────────────── File Browser

interface BrowseResult {
  ok: boolean
  path: string
  parent: string | null
  sep: string
  breadcrumbs: { label: string; path: string }[]
  entries: { name: string; isDir: boolean }[]
}

let _fbOverlay: HTMLElement | null = null
let _fbCurrentPath = ''
let _fbSelectedPath = ''
let _fbOnSelect: ((path: string) => void) | null = null
let _fbThemeUnsub: (() => void) | null = null

async function _fbBrowse(path: string): Promise<BrowseResult | null> {
  try {
    const res = await fetch(`/fs/browse?path=${encodeURIComponent(path)}`)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) {
      console.error('[FileBrowser] /fs/browse returned non-JSON:', ct)
      return null
    }
    return res.json()
  } catch (err) {
    console.error('[FileBrowser] fetch error:', err)
    return null
  }
}

function _fbRender(result: BrowseResult): void {
  const topbar         = _fbOverlay!.querySelector<HTMLElement>('.fb-topbar')!
  const list           = _fbOverlay!.querySelector<HTMLElement>('.fb-list')!
  const selectedPathEl = _fbOverlay!.querySelector<HTMLElement>('.fb-selected-path')!
  const btnSelect      = _fbOverlay!.querySelector<HTMLButtonElement>('.fb-btn-select')!
  const btnUp          = _fbOverlay!.querySelector<HTMLButtonElement>('.fb-btn-up')!

  _fbCurrentPath = result.path

  const breadcrumb = topbar.querySelector('.fb-breadcrumb')!
  breadcrumb.innerHTML = result.breadcrumbs.map((c, i) =>
    `<span class="fb-crumb" data-path="${c.path}">${c.label}</span>` +
    (i < result.breadcrumbs.length - 1 ? `<span class="fb-crumb-sep">›</span>` : '')
  ).join('')
  breadcrumb.querySelectorAll<HTMLElement>('.fb-crumb').forEach((el) => {
    el.addEventListener('click', () => _fbNavigate(el.dataset.path!))
  })

  btnUp.disabled = !result.parent
  btnUp.onclick = () => { if (result.parent) _fbNavigate(result.parent) }

  list.innerHTML = ''
  if (result.entries.length === 0) {
    list.innerHTML = '<div class="fb-empty">Папок нет</div>'
  } else {
    for (const entry of result.entries) {
      const fullPath = result.path.endsWith(result.sep)
        ? result.path + entry.name
        : result.path + result.sep + entry.name

      const item = document.createElement('div')
      item.className = 'fb-item'
      if (_fbSelectedPath === fullPath) item.classList.add('selected')
      item.innerHTML = `
        <span class="fb-item-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z"/>
          </svg>
        </span>
        <span class="fb-item-name">${entry.name}</span>
      `
      item.addEventListener('click', () => {
        _fbOverlay!.querySelectorAll('.fb-item').forEach((i) => i.classList.remove('selected'))
        item.classList.add('selected')
        _fbSelectedPath = fullPath
        selectedPathEl.textContent = fullPath
        selectedPathEl.classList.add('has-value')
        btnSelect.disabled = false
      })
      item.addEventListener('dblclick', () => _fbNavigate(fullPath))
      list.appendChild(item)
    }
  }

  selectedPathEl.textContent = _fbSelectedPath || result.path
  selectedPathEl.classList.toggle('has-value', !!_fbSelectedPath)
  btnSelect.disabled = !_fbSelectedPath
}

async function _fbNavigate(path: string): Promise<void> {
  const list = _fbOverlay!.querySelector<HTMLElement>('.fb-list')!
  list.innerHTML = '<div class="fb-loading"><div class="fb-spinner"></div> Загрузка...</div>'
  const result = await _fbBrowse(path)
  if (!result || !result.ok) {
    list.innerHTML = '<div class="fb-empty">Нет доступа к папке</div>'
    return
  }
  _fbRender(result)
}

function _showFileBrowser(initialPath: string, onSelect: (path: string) => void): void {
  if (_fbOverlay) return

  _fbSelectedPath = ''
  _fbOnSelect = onSelect

  const overlay = document.createElement('div')
  overlay.className = 'fb-overlay'
  _fbThemeUnsub = inheritTheme(overlay)
  _fbOverlay = overlay

  overlay.innerHTML = `
    <div class="fb-modal">
      <div class="fb-topbar">
        <span class="fb-topbar-title">Выбор папки</span>
        <div class="fb-breadcrumb"></div>
        <div class="fb-close" title="Закрыть">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      </div>
      <div class="fb-list">
        <div class="fb-loading"><div class="fb-spinner"></div> Загрузка...</div>
      </div>
      <div class="fb-bottombar">
        <button class="fb-btn-up">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Вверх
        </button>
        <span class="fb-selected-path">Выберите папку...</span>
        <button class="fb-btn-select" disabled>Выбрать</button>
      </div>
    </div>
  `

  overlay.querySelector('.fb-close')!.addEventListener('click', _hideFileBrowser)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _hideFileBrowser() })
  overlay.querySelector('.fb-btn-select')!.addEventListener('click', () => {
    if (_fbSelectedPath) { _fbOnSelect?.(_fbSelectedPath); _hideFileBrowser() }
  })

  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')))
  _fbNavigate(initialPath)
}

function _hideFileBrowser(): void {
  if (!_fbOverlay) return
  _fbOverlay.classList.remove('visible')
  _fbThemeUnsub?.()
  _fbThemeUnsub = null
  setTimeout(() => { _fbOverlay?.remove(); _fbOverlay = null }, 180)
}

// ───────────────────────── ProjectPicker modal

let _overlay: HTMLElement | null = null
let _input: HTMLInputElement | null = null
let _statusEl: HTMLElement | null = null
let _goBtn: HTMLButtonElement | null = null
let _ppThemeUnsub: (() => void) | null = null

function _render(): void {
  injectStyles()

  const overlay = document.createElement('div')
  overlay.className = 'pp-overlay'
  _ppThemeUnsub = inheritTheme(overlay)
  _overlay = overlay

  const recent = getRecent()
  const recentHtml = recent.length > 0 ? `
    <div>
      <div class="pp-section-label">Недавние</div>
      <ul class="pp-recent-list">
        ${recent.map((p) => `
          <li class="pp-recent-item" data-path="${p}">
            <span class="pp-recent-dot"></span>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    <div class="pp-divider"></div>
  ` : ''

  overlay.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true">
      <div class="pp-head">
        <div class="pp-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          Открыть проект
        </div>
        <div class="pp-close" title="Закрыть">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </div>
      </div>

      ${recentHtml}

      <div class="pp-path-row">
        <input class="pp-input" type="text" placeholder="/home/user/my-project" autocomplete="off" spellcheck="false" />
        <button class="pp-btn-browse" title="Выбрать папку в проводнике">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <line x1="12" y1="12" x2="12" y2="18"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Обзор
        </button>
        <button class="pp-btn-open">Открыть</button>
      </div>

      <div class="pp-status"></div>

      <div class="pp-divider"></div>
      <div class="pp-hint">
        Запусти сервер: <code>pnpm server</code> — затем выбери папку выше.<br/>
        Или сразу: <code>pnpm server --project /path/to/repo</code>
      </div>
    </div>
  `

  _input    = overlay.querySelector<HTMLInputElement>('.pp-input')!
  _statusEl = overlay.querySelector<HTMLElement>('.pp-status')!
  _goBtn    = overlay.querySelector<HTMLButtonElement>('.pp-btn-open')!
  const browseBtn = overlay.querySelector<HTMLButtonElement>('.pp-btn-browse')!

  overlay.querySelectorAll<HTMLElement>('.pp-recent-item').forEach((li) => {
    li.addEventListener('click', () => {
      if (_input) _input.value = li.dataset.path ?? ''
      _submit()
    })
  })

  browseBtn.addEventListener('click', () => {
    const startPath = _input?.value.trim() || '/'
    _showFileBrowser(startPath, (selectedPath) => {
      if (_input) _input.value = selectedPath
      _setStatus('', '')
    })
  })

  _input.addEventListener('keydown', (e) => { if (e.key === 'Enter') _submit() })
  _goBtn.addEventListener('click', _submit)
  overlay.querySelector('.pp-close')!.addEventListener('click', () => ProjectPicker.hide())
  overlay.addEventListener('click', (e) => { if (e.target === overlay) ProjectPicker.hide() })

  document.addEventListener('keydown', _onEsc)
  document.body.appendChild(overlay)
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('visible')))
  setTimeout(() => _input?.focus(), 250)
}

function _onEsc(e: KeyboardEvent): void {
  if (e.key === 'Escape') { _hideFileBrowser(); ProjectPicker.hide() }
}

async function _submit(): Promise<void> {
  const path = _input?.value.trim()
  if (!path) { _setStatus('Укажи путь к проекту', 'error'); return }

  _setStatus('Подключаюсь...', '')
  if (_goBtn) _goBtn.disabled = true

  try {
    const res = await fetch('/server/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectDir: path }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
    }
    saveRecent(path)
    _setStatus('✓ Сервер сканирует проект...', 'success')
    emit('project:changed', path)
    setTimeout(() => ProjectPicker.hide(), 700)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    _setStatus(`Ошибка: ${msg}`, 'error')
    if (_goBtn) _goBtn.disabled = false
  }
}

function _setStatus(msg: string, type: '' | 'error' | 'success'): void {
  if (!_statusEl) return
  _statusEl.textContent = msg
  _statusEl.className = `pp-status${type ? ' ' + type : ''}`
}

export const ProjectPicker = {
  mount(): void {
    on('project:pick:show', () => ProjectPicker.show())
  },
  show(): void { if (_overlay) return; _render() },
  hide(): void {
    document.removeEventListener('keydown', _onEsc)
    _ppThemeUnsub?.()
    _ppThemeUnsub = null
    if (!_overlay) return
    _overlay.classList.remove('visible')
    setTimeout(() => {
      _overlay?.remove(); _overlay = null
      _input = null; _statusEl = null; _goBtn = null
    }, 200)
  },
}
