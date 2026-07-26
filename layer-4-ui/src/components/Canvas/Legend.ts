/**
 * Legend — левый ниж, glassmorphism.
 * Показывает 3 типа узлов с формами Cytoscape:
 *   ☐ Service   — roundrectangle
 *   ○ Database  — ellipse
 *   ⬡ Cache     — hexagon (diamond)
 */

function injectLegendStyles(): void {
  if (document.getElementById('legend-styles')) return
  const s = document.createElement('style')
  s.id = 'legend-styles'
  s.textContent = `
    .canvas-legend {
      position: absolute;
      bottom: var(--space-4, 1rem);
      left:   var(--space-4, 1rem);
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
      border-radius: var(--radius-lg, 0.75rem);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-muted);
      pointer-events: none;
      /* glassmorphism */
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

    .legend-item {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
    }

    /* Формы-чипсы повторяют Cytoscape-шапы узлов */
    .legend-shape {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      opacity: 0.7;
    }
    /* Service = закруглённый прямоугольник */
    .legend-shape--service {
      background: var(--color-primary);
      border-radius: var(--radius-sm, 0.375rem);
    }
    /* Database = круг */
    .legend-shape--database {
      background: var(--color-blue, #006494);
      border-radius: 50%;
    }
    /* Cache/Queue = ромб (CSS-клиппинг) */
    .legend-shape--cache {
      background: var(--color-gold, #d19900);
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    }

    .legend-title {
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      color: var(--color-text-faint);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: var(--space-1, 0.25rem);
    }
  `
  document.head.appendChild(s)
}

const ITEMS = [
  { shape: 'service',  label: 'Service'  },
  { shape: 'database', label: 'Database' },
  { shape: 'cache',    label: 'Cache / Queue' },
] as const

export class Legend {
  mount(container: HTMLElement): void {
    injectLegendStyles()

    const el = document.createElement('div')
    el.className = 'canvas-legend'
    el.setAttribute('aria-label', 'Легенда типов узлов')

    const title = document.createElement('div')
    title.className = 'legend-title'
    title.textContent = 'Node types'
    el.appendChild(title)

    for (const { shape, label } of ITEMS) {
      const row = document.createElement('div')
      row.className = 'legend-item'

      const chip = document.createElement('span')
      chip.className = `legend-shape legend-shape--${shape}`
      chip.setAttribute('aria-hidden', 'true')

      const text = document.createElement('span')
      text.textContent = label

      row.appendChild(chip)
      row.appendChild(text)
      el.appendChild(row)
    }

    container.appendChild(el)
  }
}
