/**
 * Legend — glassmorphism pill снизу слева: Сервис · БД · Кэш
 *
 * Экспорт: `export const Legend = { mount(container) }`
 */

const CSS = `
.legend {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4, 1rem);
  padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
  border-radius: var(--radius-full, 9999px);
  background: var(--glass-bg, oklch(from var(--color-surface) l c h / 0.85));
  border: 1px solid var(--glass-border, oklch(from var(--color-border) l c h / 0.5));
  box-shadow: var(--glass-shadow, var(--shadow-md));
  backdrop-filter: blur(var(--glass-blur, 12px)) saturate(var(--glass-saturate, 1.6));
  font-size: var(--text-xs, 0.75rem);
  color: var(--color-text-muted);
  user-select: none;
  pointer-events: none;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2, 0.5rem);
}
.legend-shape--service {
  width: 14px; height: 14px;
  border-radius: var(--radius-sm, 0.375rem);
  background: var(--color-primary);
  flex-shrink: 0;
}
.legend-shape--database {
  width: 14px; height: 10px;
  border-radius: 50%;
  background: var(--color-blue, #006494);
  flex-shrink: 0;
}
.legend-shape--cache {
  width: 12px; height: 14px;
  background: var(--color-purple, #7a39bb);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  flex-shrink: 0;
}
`

const ITEMS = [
  { cls: 'legend-shape--service',  label: 'Сервис' },
  { cls: 'legend-shape--database', label: 'БД'      },
  { cls: 'legend-shape--cache',    label: 'Кэш'     },
]

export const Legend = {
  mount(container: HTMLElement): void {
    if (!document.getElementById('legend-css')) {
      const s = document.createElement('style')
      s.id = 'legend-css'
      s.textContent = CSS
      document.head.appendChild(s)
    }

    const el = document.createElement('div')
    el.className = 'legend'
    el.setAttribute('aria-label', 'Легенда типов узлов')
    el.setAttribute('role', 'img')

    for (const item of ITEMS) {
      const wrap = document.createElement('div')
      wrap.className = 'legend-item'
      const shape = document.createElement('div')
      shape.className = `legend-shape ${item.cls}`
      shape.setAttribute('aria-hidden', 'true')
      const lbl = document.createElement('span')
      lbl.textContent = item.label
      wrap.appendChild(shape)
      wrap.appendChild(lbl)
      el.appendChild(wrap)
    }

    container.appendChild(el)
  },
}
