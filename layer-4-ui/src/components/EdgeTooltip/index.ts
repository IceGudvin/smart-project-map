/**
 * EdgeTooltip — тултип при hover на ребро.
 *
 * Позиционирование: position:fixed, следует за курсором через mousemove.
 * Glassmorphism: backdrop-filter blur(8px).
 * Содержимое: метод + путь + INPUT → OUTPUT schema.
 * opacity fade 0.15s.
 */
import { on } from '../../lib/eventBus.js';
import type { EdgeHoverPayload } from '../../lib/eventBus.js';

// ----------------------------------------------------------------- CSS
const CSS = `
.edge-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  max-width: 280px;

  /* glassmorphism */
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(8px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(8px) saturate(var(--glass-saturate));
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);

  /* fade */
  opacity: 0;
  transition: opacity 0.15s ease;

  /* шрифт */
  font-family: var(--font-body);
  font-size: var(--text-xs);
  line-height: 1.5;
}
.edge-tooltip--visible {
  opacity: 1;
}

/* Строка метод + путь */
.et-top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.et-method {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  min-width: 48px;
}
.et-method--GET     { color: var(--color-success); }
.et-method--POST    { color: var(--color-primary); }
.et-method--PUT     { color: var(--color-gold, #d19900); }
.et-method--PATCH   { color: var(--color-orange); }
.et-method--DELETE  { color: var(--color-error); }
.et-method--HEAD,
.et-method--OPTIONS { color: var(--color-text-muted); }

.et-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  color: var(--color-text);
  word-break: break-all;
}

/* Строка-разделитель */
.et-divider {
  height: 1px;
  background: var(--glass-border);
  margin: var(--space-2) 0;
}

/* INPUT / OUTPUT секции */
.et-flow {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.et-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.et-label {
  font-size: var(--text-xs);
  font-weight: 600;
  min-width: 44px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-faint);
}
.et-schema {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  flex: 1;
}
.et-schema--defined {
  color: var(--color-text);
  font-weight: 500;
}
.et-arrow {
  display: flex;
  align-items: center;
  padding-left: var(--space-6);
  color: var(--color-text-faint);
}
.et-arrow svg {
  display: block;
}
`;

function injectStyles(): void {
  if (document.getElementById('edge-tooltip-css')) return;
  const s = document.createElement('style');
  s.id = 'edge-tooltip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ----------------------------------------------------------------- tooltip element

function createEl(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'edge-tooltip';
  el.id = 'edgeTooltip';
  el.setAttribute('role', 'tooltip');
  el.setAttribute('aria-live', 'polite');
  return el;
}

// ----------------------------------------------------------------- position helpers

/**
 * Рассчитывает left/top так, чтобы tooltip не вылезал за пределы экрана.
 * По умолчанию: offset +14px правее / -10px выше курсора.
 */
function calcPos(el: HTMLElement, cx: number, cy: number): { left: number; top: number } {
  const W = el.offsetWidth  || 280;
  const H = el.offsetHeight || 100;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const GAP = 14;

  let left = cx + GAP;
  let top  = cy - GAP;

  // если вылезает за правый край — показываем слева
  if (left + W + 8 > vw) left = cx - W - GAP;
  // если вылезает за нижний край
  if (top + H + 8 > vh) top = vh - H - 8;
  if (top < 8)          top = 8;

  return { left, top };
}

// ----------------------------------------------------------------- EdgeTooltip singleton

export const EdgeTooltip = {
  _el:      null as HTMLElement | null,
  _visible: false,
  _raf:     0,
  _cx:      0,
  _cy:      0,

  /** Монтирует tooltip в body (один раз, при старте приложения). */
  mount(): void {
    injectStyles();
    if (document.getElementById('edgeTooltip')) return; // уже есть

    this._el = createEl();
    document.body.appendChild(this._el);

    // Подписка на события через eventBus
    on('edge:mouseover', (p) => this._show(p));
    on('edge:mousemove', (p) => this._move(p.x, p.y));
    on('edge:mouseout',  ()  => this._hide());

    // Также слушаем реальный mousemove через window
    // (на случай если cy рендередПозицион отстаёт от client*)
    window.addEventListener('mousemove', (e) => {
      if (this._visible) this._moveToClient(e.clientX, e.clientY);
    }, { passive: true });
  },

  _show(p: EdgeHoverPayload): void {
    const el = this._el;
    if (!el) return;

    // рендер содержимого
    el.innerHTML = _buildInner(p);

    this._visible = true;
    this._moveToClient(p.x, p.y);

    // requestAnimationFrame чтобы transition сработал
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => {
      el.classList.add('edge-tooltip--visible');
    });
  },

  _hide(): void {
    const el = this._el;
    if (!el) return;
    this._visible = false;
    el.classList.remove('edge-tooltip--visible');
  },

  _move(renderedX: number, renderedY: number): void {
    // cy.renderedPosition — пиксели относительно cy-контейнера
    const container = document.getElementById('cy');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this._moveToClient(rect.left + renderedX, rect.top + renderedY);
  },

  _moveToClient(clientX: number, clientY: number): void {
    const el = this._el;
    if (!el || !this._visible) return;
    const { left, top } = calcPos(el, clientX, clientY);
    el.style.left = `${left}px`;
    el.style.top  = `${top}px`;
  },

  destroy(): void {
    this._el?.remove();
    this._el = null;
  },
};

// ----------------------------------------------------------------- inner HTML builder

const METHOD_CLS: Record<string, string> = {
  GET: 'et-method--GET', POST: 'et-method--POST', PUT: 'et-method--PUT',
  PATCH: 'et-method--PATCH', DELETE: 'et-method--DELETE',
  HEAD: 'et-method--HEAD', OPTIONS: 'et-method--OPTIONS',
};

function _esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _buildInner(p: EdgeHoverPayload): string {
  const mCls = METHOD_CLS[p.method] ?? '';
  const inp  = p.inputSchema  || '—';
  const out  = p.outputSchema || '—';
  const inpCls  = p.inputSchema  ? 'et-schema et-schema--defined' : 'et-schema';
  const outCls  = p.outputSchema ? 'et-schema et-schema--defined' : 'et-schema';

  return `
    <div class="et-top">
      <span class="et-method ${mCls}">${_esc(p.method)}</span>
      <span class="et-path">${_esc(p.path)}</span>
    </div>
    <div class="et-divider"></div>
    <div class="et-flow">
      <div class="et-row">
        <span class="et-label">INPUT</span>
        <span class="${inpCls}">${_esc(inp)}</span>
      </div>
      <div class="et-arrow">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="none"
          stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M5 1v12M1 9l4 4 4-4"/>
        </svg>
      </div>
      <div class="et-row">
        <span class="et-label">OUTPUT</span>
        <span class="${outCls}">${_esc(out)}</span>
      </div>
    </div>
  `;
}
