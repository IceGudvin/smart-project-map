/**
 * Legend — glassmorphism pill снизу слева: Service · Database · Cache
 */

const CSS = `
.canvas-legend {
  position: absolute;
  bottom: var(--space-4);
  left: var(--space-4);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  pointer-events: none;
  user-select: none;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
/* Service — скруглённый прямоугольник */
.legend-shape--service {
  width: 16px; height: 10px;
  border-radius: 3px;
  background: var(--color-primary);
  opacity: 0.9;
}
/* Database — эллипс */
.legend-shape--database {
  width: 14px; height: 10px;
  border-radius: 50%;
  background: var(--color-gold, #d19900);
  opacity: 0.9;
}
/* Cache — hexagon (CSS clip-path) */
.legend-shape--cache {
  width: 14px; height: 14px;
  background: var(--color-purple, #7a39bb);
  opacity: 0.9;
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}
.legend-dot-sep {
  display: inline-block;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--color-text-faint);
}
`;

function inject() {
  if (document.getElementById('canvas-legend-css')) return;
  const s = document.createElement('style'); s.id = 'canvas-legend-css';
  s.textContent = CSS; document.head.appendChild(s);
}

const ITEMS = [
  { cls: 'legend-shape--service',  label: 'Service'  },
  { cls: 'legend-shape--database', label: 'Database' },
  { cls: 'legend-shape--cache',    label: 'Cache'    },
] as const;

export const Legend = {
  mount(parent: HTMLElement) {
    inject();
    const el = document.createElement('div');
    el.className = 'canvas-legend';
    el.setAttribute('aria-label', 'Легенда типов узлов');

    ITEMS.forEach((item, i) => {
      if (i > 0) el.appendChild(Object.assign(document.createElement('span'), { className: 'legend-dot-sep' }));
      const li = document.createElement('div');
      li.className = 'legend-item';
      const shape = document.createElement('div');
      shape.className = `legend-shape--${item.cls.split('--')[1]}`;
      shape.setAttribute('aria-hidden', 'true');
      const lbl = document.createElement('span');
      lbl.textContent = item.label;
      li.appendChild(shape); li.appendChild(lbl);
      el.appendChild(li);
    });

    parent.appendChild(el);
    return this;
  },
};
