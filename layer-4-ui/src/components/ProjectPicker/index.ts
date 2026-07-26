/**
 * ProjectPicker — модальный экран выбора проекта.
 *
 * Показывается когда:
 *   - WS не подключён после 3 секунд (emit 'project:pick:show')
 *   - Пользователь кликает "~/projects/..." в Header
 *
 * Позволяет:
 *   - Ввести путь к проекту вручную
 *   - Отправить POST /server/start { projectDir } на сервер
 *   - Сервер переключает projectDir и запускает пересканирование
 */

import { emit, on } from '../../lib/eventBus.js'

const STORAGE_KEY = 'spm:recentProjects'
const MAX_RECENT = 5

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(path: string): void {
  const list = [path, ...getRecent().filter((p) => p !== path)].slice(0, MAX_RECENT)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

function injectStyles(): void {
  if (document.getElementById('project-picker-styles')) return
  const s = document.createElement('style')
  s.id = 'project-picker-styles'
  s.textContent = `
    .pp-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: oklch(0 0 0 / 0.55);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 220ms ease;
      pointer-events: none;
    }
    .pp-overlay.visible {
      opacity: 1; pointer-events: auto;
    }
    .pp-modal {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-xl, 1rem);
      box-shadow: 0 24px 64px oklch(0 0 0 / 0.4);
      padding: 2rem;
      width: min(480px, calc(100vw - 2rem));
      display: flex; flex-direction: column; gap: 1.25rem;
      transform: translateY(12px); transition: transform 220ms ease;
    }
    .pp-overlay.visible .pp-modal {
      transform: translateY(0);
    }
    .pp-title {
      font-size: var(--text-lg, 1.25rem);
      font-weight: 600;
      color: var(--color-text);
      display: flex; align-items: center; gap: 0.5rem;
    }
    .pp-title svg { flex-shrink: 0; }
    .pp-subtitle {
      font-size: var(--text-sm, 0.875rem);
      color: var(--color-text-muted);
      margin-top: -0.75rem;
    }
    .pp-input-wrap {
      display: flex; gap: 0.5rem;
    }
    .pp-input {
      flex: 1;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md, 0.5rem);
      padding: 0.5rem 0.75rem;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: var(--text-sm, 0.875rem);
      color: var(--color-text);
      outline: none;
      transition: border-color 180ms;
    }
    .pp-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px oklch(from var(--color-primary) l c h / 0.15);
    }
    .pp-input::placeholder { color: var(--color-text-faint); }
    .pp-btn-go {
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-md, 0.5rem);
      padding: 0.5rem 1rem;
      font-size: var(--text-sm, 0.875rem);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 180ms, opacity 180ms;
    }
    .pp-btn-go:hover { background: var(--color-primary-hover); }
    .pp-btn-go:disabled { opacity: 0.5; cursor: not-allowed; }
    .pp-recent-title {
      font-size: var(--text-xs, 0.75rem);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-faint);
    }
    .pp-recent-list {
      list-style: none; display: flex; flex-direction: column; gap: 0.25rem;
    }
    .pp-recent-item {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.375rem 0.5rem;
      border-radius: var(--radius-sm, 0.375rem);
      cursor: pointer;
      transition: background 150ms;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted);
      overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    }
    .pp-recent-item:hover { background: var(--color-surface-offset); color: var(--color-text); }
    .pp-recent-item svg { flex-shrink: 0; opacity: 0.5; }
    .pp-status {
      font-size: var(--text-sm, 0.875rem);
      min-height: 1.4em;
      color: var(--color-text-muted);
      display: flex; align-items: center; gap: 0.5rem;
    }
    .pp-status.error { color: var(--color-error); }
    .pp-status.success { color: var(--color-success); }
    .pp-hint {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-faint);
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-divider);
    }
    .pp-hint code {
      font-family: var(--font-mono, monospace);
      background: var(--color-surface-offset);
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    .pp-skip {
      background: none;
      border: none;
      color: var(--color-text-faint);
      font-size: var(--text-xs, 0.75rem);
      cursor: pointer;
      align-self: flex-end;
      padding: 0;
      transition: color 180ms;
    }
    .pp-skip:hover { color: var(--color-text-muted); }
  `
  document.head.appendChild(s)
}

// ──────────────────────────────────────────────────────────────

let _overlay: HTMLElement | null = null
let _input: HTMLInputElement | null = null
let _statusEl: HTMLElement | null = null
let _goBtn: HTMLButtonElement | null = null
let _recentListEl: HTMLElement | null = null

function _render(): void {
  injectStyles()

  const overlay = document.createElement('div')
  overlay.className = 'pp-overlay'
  _overlay = overlay

  overlay.innerHTML = `
    <div class="pp-modal" role="dialog" aria-modal="true" aria-labelledby="pp-title">
      <div class="pp-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
        <span id="pp-title">Открыть проект</span>
      </div>
      <p class="pp-subtitle">Укажи путь к локальному репозиторию. Сервер просканирует его и построит граф.</p>

      <div class="pp-input-wrap">
        <input
          class="pp-input"
          type="text"
          placeholder="C:\\Users\\...\\my-project  или  /home/.../my-project"
          autocomplete="off"
          spellcheck="false"
        />
        <button class="pp-btn-go">Открыть</button>
      </div>

      <div class="pp-status"></div>

      <div class="pp-recent-section" style="display:none">
        <div class="pp-recent-title">Недавние</div>
        <ul class="pp-recent-list"></ul>
      </div>

      <div class="pp-hint">
        Сервер должен быть запущен: <code>pnpm server</code><br/>
        Или укажи проект сразу: <code>pnpm server --project C:\path\to\repo</code>
      </div>

      <button class="pp-skip">Пропустить — подключусь вручную</button>
    </div>
  `

  _input = overlay.querySelector<HTMLInputElement>('.pp-input')!
  _statusEl = overlay.querySelector<HTMLElement>('.pp-status')!
  _goBtn = overlay.querySelector<HTMLButtonElement>('.pp-btn-go')!
  _recentListEl = overlay.querySelector<HTMLElement>('.pp-recent-list')!
  const recentSection = overlay.querySelector<HTMLElement>('.pp-recent-section')!
  const skipBtn = overlay.querySelector<HTMLButtonElement>('.pp-skip')!

  // Заполнить недавние
  const recent = getRecent()
  if (recent.length > 0) {
    recentSection.style.display = ''
    recent.forEach((path) => {
      const li = document.createElement('li')
      li.className = 'pp-recent-item'
      li.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        ${path}
      `
      li.title = path
      li.addEventListener('click', () => {
        if (_input) _input.value = path
        _submit()
      })
      _recentListEl!.appendChild(li)
    })
  }

  // Enter в поле
  _input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') _submit()
  })

  _goBtn.addEventListener('click', _submit)

  skipBtn.addEventListener('click', () => ProjectPicker.hide())

  // Закрытие по Escape
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') ProjectPicker.hide()
  }
  document.addEventListener('keydown', onKey)

  document.body.appendChild(overlay)

  // Анимация появления
  requestAnimationFrame(() => {
    requestAnimationFrame(() => overlay.classList.add('visible'))
  })

  setTimeout(() => _input?.focus(), 250)
}

async function _submit(): Promise<void> {
  const path = _input?.value.trim()
  if (!path) {
    _setStatus('Укажи путь к проекту', 'error')
    return
  }

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

    setTimeout(() => ProjectPicker.hide(), 800)
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

// ──────────────────────────────────────────────────────────────

export const ProjectPicker = {
  mount(): void {
    // Слушаем событие от wsClient когда нет соединения за 3с
    on('project:pick:show', () => ProjectPicker.show())
  },

  show(): void {
    if (_overlay) return // уже открыт
    _render()
  },

  hide(): void {
    if (!_overlay) return
    _overlay.classList.remove('visible')
    setTimeout(() => {
      _overlay?.remove()
      _overlay = null
      _input = null
      _statusEl = null
      _goBtn = null
      _recentListEl = null
    }, 220)
  },
}
