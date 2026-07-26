/**
 * CanvasToolbar — центр сверху, glassmorphism.
 *
 * Кнопки:
 *   Pan     — режим перемещения (TODO: toggleGrabToCursor)
 *   DataFlow — вкл/выкл dataflow-режим + имя текущего пути
 *   ⟳ Next — следующий dataflow-путь (0→1→2→0)
 *   Layout  — повторный dagre layout
 */

import { emit, on } from '../../lib/eventBus.js'

const DATAFLOW_NAMES = ['Login Flow', 'File Upload', 'Auth Check'] as const

function injectToolbarStyles(): void {
  if (document.getElementById('toolbar-styles')) return
  const s = document.createElement('style')
  s.id = 'toolbar-styles'
  s.textContent = `
    .canvas-toolbar {
      position: absolute;
      top: var(--space-3, 0.75rem);
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      display: flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-1, 0.25rem);
      border-radius: var(--radius-full, 9999px);
      background: var(--glass-bg,
        oklch(from var(--color-surface, #f9f8f5) l c h / 0.80));
      backdrop-filter: blur(var(--glass-blur, 12px))
                       saturate(var(--glass-saturate, 1.6));
      -webkit-backdrop-filter: blur(var(--glass-blur, 12px))
                                saturate(var(--glass-saturate, 1.6));
      border: 1px solid var(--glass-border,
        oklch(from var(--color-border, #d4d1ca) l c h / 0.5));
      box-shadow: var(--glass-shadow,
        0 1px 0 rgba(255,255,255,0.05) inset,
        0 8px 24px rgba(0,0,0,0.18));
    }

    .toolbar-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      height: 30px;
      border-radius: var(--radius-full, 9999px);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 500;
      color: var(--color-text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition:
        color 150ms,
        background 150ms;
      flex-shrink: 0;
    }
    .toolbar-btn:hover {
      color: var(--color-text);
      background: var(--color-surface-offset, #f3f0ec);
    }
    .toolbar-btn:active {
      background: var(--color-surface-dynamic, #e6e4df);
    }
    /* Активная кнопка */
    .toolbar-btn--active {
      color: var(--color-primary);
      background: var(--color-primary-highlight, #cedcd8);
    }
    .toolbar-btn--active:hover {
      background: var(--color-primary-highlight);
      opacity: 0.85;
    }

    /* Имя DataFlow-пути — показывается когда dataflow включён */
    .toolbar-path-name {
      display: none;
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-primary);
      font-weight: 600;
      padding: 0 var(--space-2, 0.5rem);
      white-space: nowrap;
    }
    .toolbar-path-name.visible {
      display: inline;
    }

    /* Разделитель */
    .toolbar-sep {
      width: 1px;
      height: 16px;
      background: var(--color-border);
      opacity: 0.5;
      flex-shrink: 0;
      margin: 0 var(--space-1, 0.25rem);
    }
  `
  document.head.appendChild(s)
}

export class CanvasToolbar {
  private el!: HTMLElement
  private _dfBtn!:    HTMLButtonElement
  private _nextBtn!:  HTMLButtonElement
  private _pathName!: HTMLElement
  private _dfActive   = false
  private unsubs: Array<() => void> = []

  mount(container: HTMLElement): void {
    injectToolbarStyles()

    this.el = document.createElement('div')
    this.el.className = 'canvas-toolbar'
    this.el.setAttribute('role', 'toolbar')
    this.el.setAttribute('aria-label', 'Инструменты канваса')

    // ---- Pan
    const panBtn = this._makeBtn('✓ Pan')
    panBtn.setAttribute('aria-label', 'Режим перемещения')
    panBtn.classList.add('toolbar-btn--active')
    panBtn.addEventListener('click', () => {
      // Пан-режим всегда активен по умолчанию в Cytoscape
    })

    const sep1 = this._makeSep()

    // ---- DataFlow
    this._dfBtn = this._makeBtn('⚡ DataFlow')
    this._dfBtn.setAttribute('aria-label', 'Включить DataFlow-режим')
    this._dfBtn.setAttribute('aria-pressed', 'false')
    this._dfBtn.addEventListener('click', () => {
      this._dfActive = !this._dfActive
      emit('dataflow:toggle', this._dfActive)
    })

    // ---- Имя пути
    this._pathName = document.createElement('span')
    this._pathName.className = 'toolbar-path-name'
    this._pathName.textContent = DATAFLOW_NAMES[0]

    // ---- Next
    this._nextBtn = this._makeBtn('⟳')
    this._nextBtn.setAttribute('aria-label', 'Следующий DataFlow-путь')
    this._nextBtn.style.display = 'none'
    this._nextBtn.addEventListener('click', () => {
      emit('dataflow:next', undefined)
    })

    const sep2 = this._makeSep()

    // ---- Layout
    const layoutBtn = this._makeBtn('⋆ Layout')
    layoutBtn.setAttribute('aria-label', 'Перестроить граф')
    layoutBtn.addEventListener('click', () => {
      emit('graph:refresh', undefined)
    })

    this.el.append(
      panBtn, sep1,
      this._dfBtn, this._pathName, this._nextBtn,
      sep2,
      layoutBtn,
    )

    container.appendChild(this.el)

    // Слушаем dataflow:toggle снаружи (AppShell может эмитить)
    this.unsubs.push(
      on('dataflow:toggle', (active) => this.setDataflow(active)),
      on('dataflow:next',   ()       => this.syncDataflowPath(0)),
    )
  }

  // ---- Внешнее API

  setDataflow(active: boolean): void {
    this._dfActive = active
    this._dfBtn.setAttribute('aria-pressed', String(active))
    this._dfBtn.classList.toggle('toolbar-btn--active', active)
    this._pathName.classList.toggle('visible', active)
    this._nextBtn.style.display = active ? 'inline-flex' : 'none'
  }

  syncDataflowPath(idx: number): void {
    this._pathName.textContent = DATAFLOW_NAMES[idx % DATAFLOW_NAMES.length]
  }

  destroy(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
  }

  // ---- helpers

  private _makeBtn(label: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'toolbar-btn'
    btn.textContent = label
    return btn
  }

  private _makeSep(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'toolbar-sep'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}
