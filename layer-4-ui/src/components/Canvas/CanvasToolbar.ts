/**
 * CanvasToolbar — glassmorphism pill по центру сверху (под StatsBar)
 * Кнопки: Pan | DataFlow [path name] ⟳ Next | Layout
 */
import { emit } from '../../lib/eventBus';
import { store } from '../../store';

const CSS = `
.canvas-toolbar {
  position: absolute;
  top: calc(var(--space-3) + 36px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}
.toolbar-btn {
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
  transition: background var(--transition-interactive), color var(--transition-interactive);
  white-space: nowrap;
}
.toolbar-btn:hover {
  background: color-mix(in oklab, var(--color-primary) 10%, transparent);
  color: var(--color-text);
}
.toolbar-btn--active {
  background: color-mix(in oklab, var(--color-primary) 18%, transparent);
  color: var(--color-primary);
}
.toolbar-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.toolbar-sep {
  width: 1px; height: 20px;
  background: var(--glass-border);
  flex-shrink: 0;
}
.toolbar-btn__path {
  font-size: var(--text-xs);
  opacity: 0.75;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;

function inject() {
  if (document.getElementById('canvas-toolbar-css')) return;
  const s = document.createElement('style');
  s.id = 'canvas-toolbar-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const LAYOUTS = ['TB', 'LR', 'circle'] as const;
type Layout = typeof LAYOUTS[number];
let _layoutIdx = 0;

export const CanvasToolbar = {
  _btnDataflow: null as HTMLButtonElement | null,
  _pathLabel: null as HTMLElement | null,
  _dfActive: false,

  mount(parent: HTMLElement) {
    inject();

    const el = document.createElement('div');
    el.className = 'canvas-toolbar';
    el.setAttribute('role', 'toolbar');
    el.setAttribute('aria-label', 'Инструменты канваса');

    // --- Pan
    const btnPan = document.createElement('button');
    btnPan.className = 'toolbar-btn';
    btnPan.setAttribute('aria-pressed', 'false');
    btnPan.title = 'Режим панорамирования (пробел)';
    btnPan.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3"/>
      <path d="M2 12h20M12 2v20"/>
    </svg> Pan`;
    el.appendChild(btnPan);

    el.appendChild(Object.assign(document.createElement('div'), { className: 'toolbar-sep' }));

    // --- DataFlow
    const btnDf = document.createElement('button');
    btnDf.className = 'toolbar-btn';
    btnDf.setAttribute('aria-pressed', 'false');
    btnDf.title = 'DataFlow-режим';
    const pathLabel = document.createElement('span');
    pathLabel.className = 'toolbar-btn__path';
    pathLabel.textContent = '';
    btnDf.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2l9 4.5V18L12 22l-9-5.5V6.5z"/>
      <path d="M12 22V12M3 6.5l9 5.5 9-5.5"/>
    </svg> DataFlow `;
    btnDf.appendChild(pathLabel);
    this._btnDataflow = btnDf;
    this._pathLabel = pathLabel;
    el.appendChild(btnDf);

    // ⟳ Next
    const btnNext = document.createElement('button');
    btnNext.className = 'toolbar-btn';
    btnNext.title = 'Следующий шаг DataFlow';
    btnNext.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
    el.appendChild(btnNext);

    el.appendChild(Object.assign(document.createElement('div'), { className: 'toolbar-sep' }));

    // --- Layout
    const btnLayout = document.createElement('button');
    btnLayout.className = 'toolbar-btn';
    btnLayout.title = 'Сменить раскладку';
    btnLayout.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg> Layout`;
    el.appendChild(btnLayout);

    parent.appendChild(el);

    // --- handlers ---
    btnPan.addEventListener('click', () => {
      const pressed = btnPan.getAttribute('aria-pressed') === 'true';
      btnPan.setAttribute('aria-pressed', String(!pressed));
      btnPan.classList.toggle('toolbar-btn--active', !pressed);
      emit('canvas:pan-mode', !pressed);
    });

    btnDf.addEventListener('click', () => {
      this._dfActive = !this._dfActive;
      emit('dataflow:toggle', this._dfActive);
    });

    btnNext.addEventListener('click', () => {
      if (!this._dfActive) return;
      const paths = store.dataflowPaths;
      if (!paths.length) return;
      store.dataflowIdx = (store.dataflowIdx + 1) % paths[store.dataflowPathIndex]?.steps?.length;
      emit('dataflow:next', store.dataflowIdx);
    });

    btnLayout.addEventListener('click', () => {
      _layoutIdx = (_layoutIdx + 1) % LAYOUTS.length;
      const layout = LAYOUTS[_layoutIdx];
      emit('graph:layout', layout);
    });

    return this;
  },

  setDataflow(active: boolean) {
    this._dfActive = active;
    if (!this._btnDataflow) return;
    this._btnDataflow.setAttribute('aria-pressed', String(active));
    this._btnDataflow.classList.toggle('toolbar-btn--active', active);
  },

  syncDataflowPath(idx: number) {
    if (!this._pathLabel) return;
    const paths = store.dataflowPaths;
    const path = paths[store.dataflowPathIndex];
    const step = path?.steps?.[idx];
    this._pathLabel.textContent = step?.label ?? '';
  },
};
