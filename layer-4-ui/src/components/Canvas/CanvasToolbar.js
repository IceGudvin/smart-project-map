/**
 * CanvasToolbar.ts — Панель инструментов канваса.
 *
 * Кнопки: Пан | Поток [имя пути] ⟳ Далее | Раскладка
 *
 * Экспорт: `export const CanvasToolbar = { mount(container) → handle }`
 * handle: { setDataflow(active), syncDataflowPath(idx) }
 */
import { on, emit } from '../../lib/eventBus.js';
// ---- CSS ----
const CSS = `
.canvas-toolbar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 0.25rem);
  padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
  border-radius: var(--radius-full, 9999px);
  background: var(--glass-bg, oklch(from var(--color-surface) l c h / 0.85));
  border: 1px solid var(--glass-border, oklch(from var(--color-border) l c h / 0.5));
  box-shadow: var(--glass-shadow, var(--shadow-md));
  backdrop-filter: blur(var(--glass-blur, 12px)) saturate(var(--glass-saturate, 1.6));
  user-select: none;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 0.25rem);
  padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
  height: 28px;
  border-radius: var(--radius-full, 9999px);
  font-size: var(--text-xs, 0.75rem);
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: color 150ms, background 150ms, border-color 150ms;
  white-space: nowrap;
}
.toolbar-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-offset);
  border-color: var(--color-border);
}
.toolbar-btn:active { background: var(--color-surface-dynamic); }
.toolbar-btn--active {
  color: var(--color-primary);
  background: oklch(from var(--color-primary) l c h / 0.1);
  border-color: oklch(from var(--color-primary) l c h / 0.3);
}
.toolbar-sep {
  width: 1px; height: 16px;
  background: var(--color-border);
  flex-shrink: 0;
  margin: 0 var(--space-1, 0.25rem);
}
`;
const LAYOUTS = ['dagre', 'cose', 'grid'];
const LAYOUT_LABELS = {
    dagre: 'Дерево',
    cose: 'Граф',
    grid: 'Сетка',
};
export const CanvasToolbar = {
    mount(container) {
        if (!document.getElementById('canvas-toolbar-css')) {
            const s = document.createElement('style');
            s.id = 'canvas-toolbar-css';
            s.textContent = CSS;
            document.head.appendChild(s);
        }
        const el = document.createElement('div');
        el.className = 'canvas-toolbar';
        el.setAttribute('role', 'toolbar');
        el.setAttribute('aria-label', 'Инструменты канваса');
        // --- Пан
        const btnPan = document.createElement('button');
        btnPan.className = 'toolbar-btn';
        btnPan.setAttribute('aria-pressed', 'false');
        btnPan.title = 'Режим панорамирования (пробел)';
        btnPan.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"
      /><path d="M2 12h20M12 2v20"/></svg> Пан`;
        el.appendChild(btnPan);
        const sep1 = document.createElement('div');
        sep1.className = 'toolbar-sep';
        sep1.setAttribute('aria-hidden', 'true');
        el.appendChild(sep1);
        // --- Поток (DataFlow toggle)
        const btnDf = document.createElement('button');
        btnDf.className = 'toolbar-btn';
        btnDf.title = 'Режим потока данных';
        btnDf.setAttribute('aria-pressed', 'false');
        btnDf.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Поток `;
        const dfLbl = document.createElement('span');
        dfLbl.style.cssText = 'font-size:var(--text-xs);color:var(--color-text-faint);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        btnDf.appendChild(dfLbl);
        el.appendChild(btnDf);
        // ⟳ Следующий путь
        const btnNext = document.createElement('button');
        btnNext.className = 'toolbar-btn';
        btnNext.title = 'Следующий путь';
        btnNext.setAttribute('aria-label', 'Следующий путь');
        btnNext.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
        el.appendChild(btnNext);
        const sep2 = document.createElement('div');
        sep2.className = 'toolbar-sep';
        sep2.setAttribute('aria-hidden', 'true');
        el.appendChild(sep2);
        // --- Раскладка (Layout cycle)
        const btnLayout = document.createElement('button');
        btnLayout.className = 'toolbar-btn';
        btnLayout.title = 'Сменить раскладку';
        btnLayout.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Раскладка`;
        el.appendChild(btnLayout);
        container.appendChild(el);
        // ---- Логика ----
        let _dfActive = false;
        let _layoutIdx = 0;
        btnPan.addEventListener('click', () => {
            const pressed = btnPan.getAttribute('aria-pressed') === 'true';
            btnPan.setAttribute('aria-pressed', String(!pressed));
            btnPan.classList.toggle('toolbar-btn--active', !pressed);
            emit('cy:pan-mode', !pressed);
        });
        btnDf.addEventListener('click', () => {
            _dfActive = !_dfActive;
            btnDf.setAttribute('aria-pressed', String(_dfActive));
            btnDf.classList.toggle('toolbar-btn--active', _dfActive);
            emit('dataflow:toggle', _dfActive);
        });
        btnNext.addEventListener('click', () => {
            emit('dataflow:next', undefined);
        });
        btnLayout.addEventListener('click', () => {
            _layoutIdx = (_layoutIdx + 1) % LAYOUTS.length;
            const layout = LAYOUTS[_layoutIdx];
            const textNode = btnLayout.childNodes[btnLayout.childNodes.length - 1];
            if (textNode)
                textNode.textContent = ` ${LAYOUT_LABELS[layout]}`;
            emit('cy:layout', layout);
        });
        on('dataflow:toggle', (enabled) => {
            _dfActive = enabled;
            btnDf.setAttribute('aria-pressed', String(_dfActive));
            btnDf.classList.toggle('toolbar-btn--active', _dfActive);
        });
        on('dataflow:path:changed', (name) => {
            dfLbl.textContent = _dfActive ? ` ${name}` : '';
        });
        return {
            setDataflow(active) {
                _dfActive = active;
                btnDf.setAttribute('aria-pressed', String(active));
                btnDf.classList.toggle('toolbar-btn--active', active);
                if (!active)
                    dfLbl.textContent = '';
            },
            syncDataflowPath(idx) {
                dfLbl.textContent = _dfActive ? ` Путь ${idx + 1}` : '';
            },
        };
    },
};
