/**
 * DataFlowMode.ts — Оркестратор DataFlow-режима.
 *
 * Отвечает за:
 *   - CSS @keyframes dash на рёбрах .df-active
 *   - подсветку активных узлов/рёбер по пути
 *   - .dimmed на всё остальное
 *   - PathSelector — pill-панель выбора пути (Login Flow / File Upload / Auth Check)
 *   - приём `dataflow:toggle` / `dataflow:next` / `cy:ready` из eventBus
 */
import { on, emit } from '../../lib/eventBus.js';
import { store } from '../../store.js';
// ----------------------------------------------------------------- DataFlow path definitions
//
// Каждый путь — список nodeId в порядке движения.
// Если узел node нет в графе — он просто пропускается, остальные подсвечиваются.
export const DATAFLOW_NODE_IDS = {
    0: ['frontend', 'backend', 'postgres', 'redis'], // Login Flow
    1: ['frontend', 'backend', 'minio'], // File Upload
    2: ['frontend', 'backend'], // Auth Check
};
// ----------------------------------------------------------------- CSS
const CSS = `
/* DataFlow: анимация дашед на активных рёбрах */
@keyframes df-dash {
  to { stroke-dashoffset: -24; }
}

/* PathSelector — pill-панель выбора пути */
.df-path-selector {
  position: absolute;
  bottom: var(--space-8);
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: none;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  opacity: 0;
  transition: opacity 0.2s ease;
}
.df-path-selector--visible {
  display: flex;
  opacity: 1;
}

.df-path-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    background var(--transition-interactive),
    color var(--transition-interactive);
  white-space: nowrap;
}
.df-path-btn:hover {
  background: color-mix(in oklab, var(--color-primary) 10%, transparent);
  color: var(--color-text);
}
.df-path-btn--active {
  background: color-mix(in oklab, var(--color-primary) 22%, transparent);
  color: var(--color-primary);
  font-weight: 600;
}
.df-path-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.df-path-sep {
  width: 1px; height: 16px;
  background: var(--glass-border);
  flex-shrink: 0;
}

/* ----  Dot-badge количества узлов в пути */
.df-path-btn__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: color-mix(in oklab, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.df-path-btn--active .df-path-btn__count {
  background: var(--color-primary);
  color: var(--color-text-inverse);
}
`;
function injectStyles() {
    if (document.getElementById('df-mode-css'))
        return;
    const s = document.createElement('style');
    s.id = 'df-mode-css';
    s.textContent = CSS;
    document.head.appendChild(s);
}
// ----------------------------------------------------------------- highlight helpers
function applyHighlight(cy, pathIndex) {
    const nodeIds = new Set(DATAFLOW_NODE_IDS[pathIndex]);
    cy.batch(() => {
        cy.elements().removeClass('df-active dimmed highlighted');
        cy.nodes().forEach((n) => {
            if (nodeIds.has(n.id()))
                n.addClass('df-active');
            else
                n.addClass('dimmed');
        });
        cy.edges().forEach((e) => {
            const srcIn = nodeIds.has(e.data('source'));
            const tgtIn = nodeIds.has(e.data('target'));
            if (srcIn && tgtIn)
                e.addClass('df-active');
            else
                e.addClass('dimmed');
        });
    });
}
function clearHighlight(cy) {
    cy.elements().removeClass('df-active dimmed highlighted');
}
// ----------------------------------------------------------------- Cytoscape stylesheet patch
//
// Добавляем стили в runtime через cy.style().fromJson()
// (уже есть highlighted/dimmed в cytoscapeInit —
//  df-active использует те же стили + CSS-анимацию поверх SVG)
// NOTE: Cytoscape не поддерживает CSS-анимации напрямую.
// Мы анимируем line-dash-offset через setInterval (уже есть
// startDashAnimation / stopDashAnimation в cytoscapeInit.ts).
// Дополнительно инжектируем CSS для панели PathSelector.
// ----------------------------------------------------------------- PathSelector DOM
export const DataFlowMode = {
    _cy: null,
    _selector: null,
    _buttons: [],
    mount(parent) {
        injectStyles();
        // ---- PathSelector panel
        const sel = document.createElement('div');
        sel.className = 'df-path-selector';
        sel.setAttribute('role', 'toolbar');
        sel.setAttribute('aria-label', 'Выбор DataFlow-пути');
        this._selector = sel;
        const paths = [
            [0, 'Login Flow', DATAFLOW_NODE_IDS[0].length],
            [1, 'File Upload', DATAFLOW_NODE_IDS[1].length],
            [2, 'Auth Check', DATAFLOW_NODE_IDS[2].length],
        ];
        paths.forEach(([idx, label, count], i) => {
            if (i > 0) {
                sel.appendChild(Object.assign(document.createElement('div'), { className: 'df-path-sep' }));
            }
            const btn = document.createElement('button');
            btn.className = 'df-path-btn';
            btn.dataset.idx = String(idx);
            btn.setAttribute('aria-pressed', 'false');
            btn.title = `DataFlow: ${label}`;
            btn.innerHTML = `${label}<span class="df-path-btn__count">${count}</span>`;
            btn.addEventListener('click', () => this._selectPath(idx));
            sel.appendChild(btn);
            this._buttons.push(btn);
        });
        parent.appendChild(sel);
        // ---- EventBus subscriptions
        on('cy:ready', (cy) => {
            this._cy = cy;
        });
        on('dataflow:toggle', (active) => {
            if (active)
                this._activate();
            else
                this._deactivate();
        });
        on('dataflow:next', () => {
            if (!store.dataflowMode)
                return;
            store.nextDataflowPath();
            const idx = store.activeDataflowPath;
            this._selectPath(idx);
        });
    },
    // ----------------------------------------------------------------- private
    _activate() {
        store.setDataflowMode(true);
        const sel = this._selector;
        if (sel) {
            sel.style.display = 'flex';
            requestAnimationFrame(() => sel.classList.add('df-path-selector--visible'));
        }
        // Применяем текущий путь
        if (this._cy) {
            applyHighlight(this._cy, store.activeDataflowPath);
            this._startDash();
        }
        this._syncButtons();
        // Синхронизируем CanvasToolbar
        emit('dataflow:toggle', true);
    },
    _deactivate() {
        store.setDataflowMode(false);
        const sel = this._selector;
        if (sel) {
            sel.classList.remove('df-path-selector--visible');
            // После fade убираем display
            setTimeout(() => { sel.style.display = ''; }, 220);
        }
        if (this._cy) {
            clearHighlight(this._cy);
            this._stopDash();
        }
        this._syncButtons();
    },
    _selectPath(idx) {
        store.setActiveDataflowPath(idx);
        if (this._cy) {
            applyHighlight(this._cy, idx);
            this._stopDash();
            this._startDash();
        }
        this._syncButtons();
    },
    _syncButtons() {
        const active = store.activeDataflowPath;
        const dfOn = store.dataflowMode;
        this._buttons.forEach(btn => {
            const idx = Number(btn.dataset.idx);
            const isActive = dfOn && idx === active;
            btn.classList.toggle('df-path-btn--active', isActive);
            btn.setAttribute('aria-pressed', String(isActive));
        });
    },
    // ---- Dash animation (Cytoscape line-dash-offset setInterval) ----------
    _timer: null,
    _offset: 0,
    _startDash() {
        if (this._timer || !this._cy)
            return;
        this._offset = 0;
        const cy = this._cy;
        this._timer = setInterval(() => {
            // отсчёт идёт в отрицательную сторону (=движение от источника к цели)
            this._offset = (this._offset - 2 + 10000) % 10000;
            cy.edges('.df-active').style('line-dash-offset', this._offset);
        }, 40); // ~25 fps
    },
    _stopDash() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        this._cy?.edges('.df-active').style('line-dash-offset', 0);
    },
    destroy() {
        this._stopDash();
        this._selector?.remove();
        this._selector = null;
        this._buttons = [];
        this._cy = null;
    },
};
