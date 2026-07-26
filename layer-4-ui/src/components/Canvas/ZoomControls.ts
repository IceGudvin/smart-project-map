/**
 * ZoomControls — правый ниж, glassmorphism pill.
 * Кнопки: + / − / ⊡
 */

import type { Core } from 'cytoscape'

const ZOOM_STEP   = 0.2
const ZOOM_ANIM   = 200  // ms

function injectZoomStyles(): void {
  if (document.getElementById('zoom-styles')) return
  const s = document.createElement('style')
  s.id = 'zoom-styles'
  s.textContent = `
    .canvas-zoom-controls {
      position: absolute;
      bottom: var(--space-4, 1rem);
      right:  var(--space-4, 1rem);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-1, 0.25rem);
      border-radius: var(--radius-xl, 1rem);
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

    .zoom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-lg, 0.75rem);
      font-size: 16px;
      line-height: 1;
      color: var(--color-text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      transition:
        color 150ms,
        background 150ms;
    }
    .zoom-btn:hover {
      color: var(--color-text);
      background: var(--color-surface-offset, #f3f0ec);
    }
    .zoom-btn:active {
      background: var(--color-surface-dynamic, #e6e4df);
      transform: scale(0.92);
    }
    .zoom-sep {
      width: 16px;
      height: 1px;
      background: var(--color-border);
      opacity: 0.5;
    }
  `
  document.head.appendChild(s)
}

export class ZoomControls {
  private getCy: () => Core | null

  constructor(getCy: () => Core | null) {
    this.getCy = getCy
  }

  mount(container: HTMLElement): void {
    injectZoomStyles()

    const wrap = document.createElement('div')
    wrap.className = 'canvas-zoom-controls'
    wrap.setAttribute('role', 'group')
    wrap.setAttribute('aria-label', 'Управление масштабом')

    const zoomInBtn  = this._makeBtn('+',  'Увеличить')
    const sep1       = this._makeSep()
    const zoomOutBtn = this._makeBtn('−',  'Уменьшить')
    const sep2       = this._makeSep()
    const fitBtn     = this._makeBtn('⊡',  'Уместить в экран')

    zoomInBtn.addEventListener('click', () => {
      const cy = this.getCy()
      if (!cy) return
      cy.animate({ zoom: cy.zoom() + ZOOM_STEP, center: { eles: cy.elements() } } as any,
        { duration: ZOOM_ANIM })
    })

    zoomOutBtn.addEventListener('click', () => {
      const cy = this.getCy()
      if (!cy) return
      cy.animate({ zoom: Math.max(cy.zoom() - ZOOM_STEP, 0.1) } as any,
        { duration: ZOOM_ANIM })
    })

    fitBtn.addEventListener('click', () => {
      const cy = this.getCy()
      cy?.fit(undefined, 60)
    })

    wrap.append(zoomInBtn, sep1, zoomOutBtn, sep2, fitBtn)
    container.appendChild(wrap)
  }

  private _makeBtn(text: string, label: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'zoom-btn'
    btn.textContent = text
    btn.setAttribute('aria-label', label)
    return btn
  }

  private _makeSep(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'zoom-sep'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}
