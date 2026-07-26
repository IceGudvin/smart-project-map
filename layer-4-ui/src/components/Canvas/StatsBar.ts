/**
 * StatsBar — N сервисов · N связей · N роутов
 * Позиция: абсолютная, левый верх
 */

import type { GraphModel } from '../../../../shared/src/graph.js'

function injectStatsBarStyles(): void {
  if (document.getElementById('statsbar-styles')) return
  const s = document.createElement('style')
  s.id = 'statsbar-styles'
  s.textContent = `
    .canvas-statsbar {
      position: absolute;
      top: var(--space-3, 0.75rem);
      left: var(--space-3, 0.75rem);
      z-index: 10;
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
      border-radius: var(--radius-full, 9999px);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 500;
      color: var(--color-text-muted);
      pointer-events: none;
      /* glassmorphism легкий */
      background: var(--glass-bg,
        oklch(from var(--color-surface, #f9f8f5) l c h / 0.75));
      backdrop-filter: blur(var(--glass-blur, 10px))
                       saturate(var(--glass-saturate, 1.5));
      -webkit-backdrop-filter: blur(var(--glass-blur, 10px))
                                saturate(var(--glass-saturate, 1.5));
      border: 1px solid var(--glass-border,
        oklch(from var(--color-border, #d4d1ca) l c h / 0.5));
      box-shadow: var(--shadow-sm,
        0 1px 3px oklch(0.2 0.01 80 / 0.08));
    }
    .canvas-statsbar-sep {
      width: 1px;
      height: 10px;
      background: var(--color-border);
      opacity: 0.6;
    }
    .canvas-statsbar-item {
      white-space: nowrap;
    }
    .canvas-statsbar-num {
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      font-weight: 600;
    }
  `
  document.head.appendChild(s)
}

export class StatsBar {
  private el!:     HTMLElement
  private unsubs:  Array<() => void> = []

  // DOM-рефы для пяти чисел
  private _nServices!: HTMLElement
  private _nEdges!:    HTMLElement
  private _nRoutes!:   HTMLElement

  mount(container: HTMLElement): void {
    injectStatsBarStyles()

    this.el = document.createElement('div')
    this.el.className = 'canvas-statsbar'
    this.el.setAttribute('aria-live', 'polite')
    this.el.setAttribute('aria-label', 'Статистика графа')

    this._nServices = this._makeItem()
    this._nEdges    = this._makeItem()
    this._nRoutes   = this._makeItem()

    const sep1 = this._makeSep()
    const sep2 = this._makeSep()

    this.el.append(
      this._nServices, sep1,
      this._nEdges,    sep2,
      this._nRoutes,
    )

    container.appendChild(this.el)
  }

  update(graph: GraphModel): void {
    const services = graph.nodes.length
    const edges    = graph.edges.length
    const routes   = graph.nodes.reduce(
      (sum, n) => sum + (n.routes?.length ?? 0), 0
    )

    this._setText(this._nServices, services, 'сервисов', 'сервис')
    this._setText(this._nEdges,    edges,    'связей',   'связи')
    this._setText(this._nRoutes,   routes,   'роутов',   'роута')
  }

  destroy(): void {
    for (const u of this.unsubs) u()
  }

  // ---- helpers

  private _makeItem(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'canvas-statsbar-item'
    return el
  }

  private _makeSep(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'canvas-statsbar-sep'
    el.setAttribute('aria-hidden', 'true')
    return el
  }

  private _setText(el: HTMLElement, n: number, labelPlural: string, labelFew: string): void {
    // Простое плюрализование: 1 → few, 2-4 → few, else → plural
    const label = n === 1 ? labelFew : (n >= 2 && n <= 4 ? labelFew : labelPlural)
    el.innerHTML = `<span class="canvas-statsbar-num">${n}</span>&thinsp;${label}`
  }
}
