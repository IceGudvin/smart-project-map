/**
 * ZoomControls — glassmorphism pill снизу справа: + / − / ⊡
 */
import { emit } from '../../lib/eventBus';
const CSS = `
.zoom-controls {
  position: absolute;
  bottom: var(--space-4);
  right: var(--space-4);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-1);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}
.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1;
  transition: background var(--transition-interactive), color var(--transition-interactive);
}
.zoom-btn:hover {
  background: color-mix(in oklab, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}
.zoom-btn:active {
  background: color-mix(in oklab, var(--color-primary) 22%, transparent);
}
.zoom-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.zoom-sep {
  height: 1px;
  background: var(--glass-border);
  margin: 2px 4px;
}
`;
function inject() {
    if (document.getElementById('zoom-controls-css'))
        return;
    const s = document.createElement('style');
    s.id = 'zoom-controls-css';
    s.textContent = CSS;
    document.head.appendChild(s);
}
export const ZoomControls = {
    mount(parent) {
        inject();
        const el = document.createElement('div');
        el.className = 'zoom-controls';
        el.setAttribute('role', 'group');
        el.setAttribute('aria-label', 'Масштаб');
        const mkBtn = (label, title, ev) => {
            const b = document.createElement('button');
            b.className = 'zoom-btn';
            b.title = title;
            b.setAttribute('aria-label', title);
            b.innerHTML = label;
            b.addEventListener('click', () => emit(ev, null));
            return b;
        };
        el.appendChild(mkBtn('+', 'Увеличить', 'zoom:in'));
        el.appendChild(Object.assign(document.createElement('div'), { className: 'zoom-sep' }));
        el.appendChild(mkBtn('−', 'Уменьшить', 'zoom:out'));
        el.appendChild(Object.assign(document.createElement('div'), { className: 'zoom-sep' }));
        el.appendChild(mkBtn(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
      </svg>`, 'По размеру', 'zoom:reset'));
        parent.appendChild(el);
        return this;
    },
    // При наличии cy — дополнительно обновляем текущий уровень зума
    bind(_cy) {
        // используется через eventBus emit('zoom:in' | 'zoom:out' | 'zoom:reset')
        // прямая привязка нужна только если понадобится показывать текущий %
    },
};
