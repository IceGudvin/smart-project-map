/**
 * Header/index.ts — верхняя панель.
 *
 * Изменения:
 *   - Кнопка «Подключить репозиторий» когда projectPath не задан
 *   - Путь проекта + кнопка смены проекта (карандаш) когда подключён
 */
import { store } from '../../store.js';
import { on, emit } from '../../lib/eventBus.js';
// ================================================================ CSS
function injectHeaderStyles() {
    if (document.getElementById('header-styles'))
        return;
    const s = document.createElement('style');
    s.id = 'header-styles';
    s.textContent = `
    .hdr-logo {
      display: flex; align-items: center; gap: var(--space-2, 0.5rem);
      font-size: var(--text-sm, 0.875rem); font-weight: 600;
      color: var(--color-text); letter-spacing: -0.01em;
      flex-shrink: 0; user-select: none;
    }
    .hdr-logo svg { flex-shrink: 0; color: var(--color-primary); }

    .hdr-sep {
      width: 1px; height: 16px;
      background: var(--color-border);
      flex-shrink: 0; margin: 0 var(--space-2, 0.5rem);
    }

    /* ---- Зона проекта ---- */
    .hdr-project {
      display: flex; align-items: center; gap: var(--space-1, 0.25rem);
      min-width: 0; flex-shrink: 1;
    }
    .hdr-path {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      max-width: 280px;
    }
    /* Кнопка смены проекта (карандаш) — появляется при hover на .hdr-project */
    .hdr-project-edit {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 4px;
      color: var(--color-text-faint); cursor: pointer;
      opacity: 0; pointer-events: none;
      transition: opacity 150ms, background 150ms, color 150ms;
      flex-shrink: 0;
    }
    .hdr-project:hover .hdr-project-edit {
      opacity: 1; pointer-events: auto;
    }
    .hdr-project-edit:hover {
      background: var(--color-surface-offset);
      color: var(--color-text);
    }

    /* Кнопка «Подключить» — показывается когда нет проекта */
    .hdr-btn-connect {
      display: inline-flex; align-items: center; gap: 0.3rem;
      padding: 0 var(--space-3, 0.75rem);
      height: 26px;
      border-radius: var(--radius-md, 0.5rem);
      font-size: var(--text-xs, 0.75rem); font-weight: 500;
      color: var(--color-primary);
      background: oklch(from var(--color-primary, #01696f) l c h / 0.08);
      border: 1px solid oklch(from var(--color-primary, #01696f) l c h / 0.25);
      cursor: pointer; white-space: nowrap; flex-shrink: 0;
      transition: background 150ms, border-color 150ms, color 150ms;
    }
    .hdr-btn-connect:hover {
      background: oklch(from var(--color-primary, #01696f) l c h / 0.14);
      border-color: oklch(from var(--color-primary, #01696f) l c h / 0.4);
    }

    .hdr-spacer { flex: 1; }

    .hdr-updated {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-faint); white-space: nowrap; flex-shrink: 0;
      transition: color 300ms;
    }
    .hdr-updated.flash-ok { color: var(--color-success, #437a22); }

    /* ---- WS-индикатор ---- */
    .hdr-ws {
      display: flex; align-items: center; gap: var(--space-1, 0.25rem);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted); flex-shrink: 0;
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      border-radius: var(--radius-full, 9999px);
      background: oklch(from var(--color-surface-offset, #e6e4df) l c h / 0.7);
    }
    .hdr-ws-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--color-text-faint); flex-shrink: 0; transition: background 300ms;
    }
    .hdr-ws--connected .hdr-ws-dot    { background: var(--color-success, #437a22); animation: ws-pulse 2s ease-in-out infinite; }
    .hdr-ws--connecting .hdr-ws-dot   { background: var(--color-gold, #d19900); animation: ws-pulse 1s ease-in-out infinite; }
    .hdr-ws--error .hdr-ws-dot        { background: var(--color-error, #a12c7b); }
    .hdr-ws--disconnected .hdr-ws-dot { background: var(--color-text-faint); }
    @keyframes ws-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.45; transform: scale(0.75); }
    }
    .hdr-ws--connected    .hdr-ws-label { color: var(--color-success); }
    .hdr-ws--connecting   .hdr-ws-label { color: var(--color-gold); }
    .hdr-ws--error        .hdr-ws-label { color: var(--color-error); }
    .hdr-ws--disconnected .hdr-ws-label { color: var(--color-text-faint); }

    /* ---- Кнопки ---- */
    .hdr-btn {
      display: inline-flex; align-items: center; gap: var(--space-1, 0.25rem);
      padding: 0 var(--space-3, 0.75rem); height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      font-size: var(--text-xs, 0.75rem); font-weight: 500;
      color: var(--color-text-muted); background: transparent;
      border: 1px solid transparent; cursor: pointer; flex-shrink: 0;
      transition: color 150ms, background 150ms, border-color 150ms;
      white-space: nowrap;
    }
    .hdr-btn:hover { color: var(--color-text); background: var(--color-surface-offset, #f3f0ec); border-color: var(--color-border); }
    .hdr-btn:active { background: var(--color-surface-dynamic, #e6e4df); }
    .hdr-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .hdr-btn.loading { pointer-events: none; opacity: 0.6; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hdr-refresh-icon.spinning { animation: spin 0.7s linear infinite; display: inline-block; }

    .hdr-theme {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      color: var(--color-text-muted); background: transparent;
      border: 1px solid transparent; cursor: pointer; flex-shrink: 0;
      transition: color 150ms, background 150ms, border-color 150ms, transform 200ms;
    }
    .hdr-theme:hover { color: var(--color-text); background: var(--color-surface-offset, #f3f0ec); border-color: var(--color-border); }
    .hdr-theme:active { transform: scale(0.9); }
  `;
    document.head.appendChild(s);
}
// ================================================================ SVG
const LOGO_SVG = `
<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="1.75"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="12" y1="5" x2="4"  y2="18"/>
  <line x1="12" y1="5" x2="20" y2="18"/>
  <line x1="4"  y1="18" x2="20" y2="18"/>
  <circle cx="12" cy="5"  r="2.5" fill="currentColor" stroke="none"/>
  <circle cx="4"  cy="18" r="2.5" fill="currentColor" stroke="none"/>
  <circle cx="20" cy="18" r="2.5" fill="currentColor" stroke="none"/>
</svg>`;
const MOON_SVG = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
</svg>`;
const SUN_SVG = `
<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42
    M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
</svg>`;
const PENCIL_SVG = `
<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
</svg>`;
const PLUG_SVG = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="2.5"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/>
  <path d="M18 8H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"/>
</svg>`;
// ================================================================ WS labels
const WS_LABEL = {
    connected: 'активен',
    connecting: 'подключение',
    disconnected: 'отключён',
    error: 'ошибка',
};
// ================================================================ Header
export class Header {
    el;
    unsubs = [];
    _projectZone;
    _wsEl;
    _wsDot;
    _wsLabel;
    _updatedEl;
    _refreshBtn;
    _themeBtn;
    _flashTimer = null;
    constructor(el) { this.el = el; }
    mount() {
        injectHeaderStyles();
        this._render();
        this._bindEvents();
        this._syncWsStatus();
        this._syncProject();
        this._syncUpdatedAt();
        this._syncThemeIcon();
    }
    update() {
        this._syncProject();
        this._syncUpdatedAt();
        this._syncWsStatus();
        this._syncThemeIcon();
    }
    destroy() {
        if (this._flashTimer)
            clearTimeout(this._flashTimer);
        for (const u of this.unsubs)
            u();
        this.unsubs = [];
    }
    // ============================================================ render
    _render() {
        this.el.innerHTML = '';
        // Лого
        const logo = document.createElement('div');
        logo.className = 'hdr-logo';
        logo.setAttribute('aria-label', 'Smart Project Map');
        logo.innerHTML = LOGO_SVG + '<span>Smart Project Map</span>';
        this.el.appendChild(logo);
        this.el.appendChild(this._makeSep());
        // Зона проекта (путь или кнопка Подключить)
        this._projectZone = document.createElement('div');
        this._projectZone.className = 'hdr-project';
        this.el.appendChild(this._projectZone);
        const spacer = document.createElement('div');
        spacer.className = 'hdr-spacer';
        this.el.appendChild(spacer);
        // updatedAt
        this._updatedEl = document.createElement('div');
        this._updatedEl.className = 'hdr-updated';
        this._updatedEl.setAttribute('aria-live', 'off');
        this._updatedEl.setAttribute('title', 'Последнее обновление графа');
        this.el.appendChild(this._updatedEl);
        this.el.appendChild(this._makeSep());
        // WS-индикатор
        this._wsEl = document.createElement('div');
        this._wsEl.className = 'hdr-ws hdr-ws--disconnected';
        this._wsEl.setAttribute('aria-live', 'polite');
        this._wsDot = document.createElement('div');
        this._wsDot.className = 'hdr-ws-dot';
        this._wsLabel = document.createElement('span');
        this._wsLabel.className = 'hdr-ws-label';
        this._wsLabel.textContent = 'отключён';
        this._wsEl.appendChild(this._wsDot);
        this._wsEl.appendChild(this._wsLabel);
        this.el.appendChild(this._wsEl);
        this.el.appendChild(this._makeSep());
        // Обновить
        this._refreshBtn = document.createElement('button');
        this._refreshBtn.className = 'hdr-btn';
        this._refreshBtn.setAttribute('aria-label', 'Пересобрать граф');
        this._refreshBtn.innerHTML = `<span class="hdr-refresh-icon">↺</span> Обновить`;
        this.el.appendChild(this._refreshBtn);
        // Вписать
        const fitBtn = document.createElement('button');
        fitBtn.className = 'hdr-btn';
        fitBtn.setAttribute('aria-label', 'Вписать граф в экран');
        fitBtn.textContent = '⊡ Вписать';
        fitBtn.addEventListener('click', () => emit('cy:fit', undefined));
        this.el.appendChild(fitBtn);
        this.el.appendChild(this._makeSep());
        // Тема
        this._themeBtn = document.createElement('button');
        this._themeBtn.className = 'hdr-theme';
        this._themeBtn.setAttribute('aria-label', 'Сменить тему');
        this.el.appendChild(this._themeBtn);
    }
    _makeSep() {
        const sep = document.createElement('div');
        sep.className = 'hdr-sep';
        sep.setAttribute('aria-hidden', 'true');
        return sep;
    }
    // ============================================================ events
    _bindEvents() {
        this._refreshBtn.addEventListener('click', () => this._doRebuild());
        this._themeBtn.addEventListener('click', () => {
            const next = store.theme === 'dark' ? 'light' : 'dark';
            emit('theme:changed', next);
        });
        this.unsubs.push(on('ws:connected', () => this._syncWsStatus()), on('ws:disconnected', () => this._syncWsStatus()), on('ws:error', () => this._syncWsStatus()));
        this.unsubs.push(on('graph:full', () => { this._syncProject(); this._syncUpdatedAt(); }), on('graph:update', () => this._syncUpdatedAt()));
        this.unsubs.push(on('graph:rebuild:done', (updatedAt) => {
            if (updatedAt > 0)
                this._setUpdatedAt(updatedAt, true);
        }));
        this.unsubs.push(on('theme:changed', () => this._syncThemeIcon()));
        // После смены проекта — обновить зону
        this.unsubs.push(on('project:changed', () => this._syncProject()));
    }
    // ============================================================ sync
    _syncWsStatus() {
        const status = store.wsStatus;
        this._wsEl.className = `hdr-ws hdr-ws--${status}`;
        this._wsLabel.textContent = WS_LABEL[status] ?? status;
    }
    /**
     * Обновляет зону проекта:
     *   - Если projectPath задан → показывает путь + кнопку смены (карандаш)
     *   - Если нет → показывает кнопку «Подключить репозиторий»
     */
    _syncProject() {
        const graph = store.graph;
        const projectPath = graph.meta?.projectPath;
        const hasProject = !!projectPath;
        this._projectZone.innerHTML = '';
        if (hasProject) {
            // Путь
            const pathEl = document.createElement('div');
            pathEl.className = 'hdr-path';
            pathEl.textContent = projectPath;
            pathEl.title = projectPath;
            this._projectZone.appendChild(pathEl);
            // Кнопка смены проекта (карандаш)
            const editBtn = document.createElement('button');
            editBtn.className = 'hdr-project-edit';
            editBtn.setAttribute('aria-label', 'Сменить проект');
            editBtn.setAttribute('title', 'Сменить проект');
            editBtn.innerHTML = PENCIL_SVG;
            editBtn.addEventListener('click', () => emit('project:pick:show', undefined));
            this._projectZone.appendChild(editBtn);
        }
        else {
            // Кнопка «Подключить репозиторий»
            const connectBtn = document.createElement('button');
            connectBtn.className = 'hdr-btn-connect';
            connectBtn.setAttribute('aria-label', 'Подключить репозиторий');
            connectBtn.innerHTML = PLUG_SVG + ' Подключить репозиторий';
            connectBtn.addEventListener('click', () => emit('project:pick:show', undefined));
            this._projectZone.appendChild(connectBtn);
        }
    }
    _syncUpdatedAt() {
        this._setUpdatedAt(store.graph.updatedAt, false);
    }
    _setUpdatedAt(ts, flash) {
        if (!ts || ts === 0) {
            this._updatedEl.textContent = '';
            return;
        }
        const d = new Date(ts);
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        const ss = d.getSeconds().toString().padStart(2, '0');
        this._updatedEl.textContent = `Синх: ${hh}:${mm}:${ss}`;
        this._updatedEl.setAttribute('title', `Последнее обновление: ${d.toLocaleString()}`);
        if (flash) {
            if (this._flashTimer)
                clearTimeout(this._flashTimer);
            this._updatedEl.classList.add('flash-ok');
            this._flashTimer = setTimeout(() => {
                this._updatedEl.classList.remove('flash-ok');
                this._flashTimer = null;
            }, 1500);
        }
    }
    _syncThemeIcon() {
        const isDark = store.theme === 'dark';
        this._themeBtn.innerHTML = isDark ? SUN_SVG : MOON_SVG;
        this._themeBtn.setAttribute('aria-label', isDark ? 'Светлая тема' : 'Тёмная тема');
    }
    // ============================================================ rebuild
    async _doRebuild() {
        if (this._refreshBtn.classList.contains('loading'))
            return;
        this._refreshBtn.classList.add('loading');
        const icon = this._refreshBtn.querySelector('.hdr-refresh-icon');
        icon?.classList.add('spinning');
        emit('graph:rebuild:start', undefined);
        let updatedAt = 0;
        try {
            const res = await fetch('/graph/rebuild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (res.ok) {
                const raw = res.headers.get('x-updated-at');
                if (raw) {
                    const n = Number(raw);
                    if (Number.isFinite(n) && n > 0)
                        updatedAt = n;
                }
                try {
                    const body = await res.json();
                    if (body.updatedAt && body.updatedAt > 0)
                        updatedAt = body.updatedAt;
                }
                catch { /* ok */ }
                if (updatedAt === 0)
                    updatedAt = Date.now();
            }
            else {
                console.warn('[Header] POST /graph/rebuild failed:', res.status);
            }
        }
        catch (err) {
            console.warn('[Header] POST /graph/rebuild network error:', err);
        }
        finally {
            this._refreshBtn.classList.remove('loading');
            icon?.classList.remove('spinning');
            emit('graph:rebuild:done', updatedAt);
        }
    }
}
