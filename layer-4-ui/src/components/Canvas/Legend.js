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
  background: var(--glass-bg, oklch(from var(--color-surface, #f9f8f5) l c h / 0.85));
  border: 1px solid var(--glass-border, oklch(from var(--color-border, #d4d1ca) l c h / 0.5));
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
.legend-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;
// Сервис — SVG микросхема (два соединённых блока)
const ICON_SERVICE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
  <rect x="1" y="1" width="5" height="5" rx="1.5" fill="var(--color-primary, #01696f)"/>
  <rect x="8" y="1" width="5" height="5" rx="1.5" fill="var(--color-primary, #01696f)" opacity="0.5"/>
  <rect x="1" y="8" width="5" height="5" rx="1.5" fill="var(--color-primary, #01696f)" opacity="0.5"/>
  <rect x="8" y="8" width="5" height="5" rx="1.5" fill="var(--color-primary, #01696f)" opacity="0.25"/>
</svg>`;
// БД — цилиндр / эллипс (дважды)
const ICON_DATABASE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
  <ellipse cx="7" cy="3.5" rx="5" ry="2" fill="var(--color-blue, #006494)"/>
  <path d="M2 3.5v7c0 1.1 2.24 2 5 2s5-.9 5-2v-7" fill="var(--color-blue, #006494)" opacity="0.35"/>
  <ellipse cx="7" cy="3.5" rx="5" ry="2" fill="none" stroke="var(--color-blue, #006494)" stroke-width="0.75"/>
  <ellipse cx="7" cy="7" rx="5" ry="2" fill="none" stroke="var(--color-blue, #006494)" stroke-width="0.75" opacity="0.6"/>
</svg>`;
// Кэш — молния гексагон (как на узлах графа)
const ICON_CACHE = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
  <polygon points="7,1 12.2,3.75 12.2,10.25 7,13 1.8,10.25 1.8,3.75" fill="var(--color-purple, #7a39bb)" opacity="0.85"/>
  <polygon points="7,3.5 9.9,5.1 9.9,8.4 7,10 4.1,8.4 4.1,5.1" fill="var(--color-bg, #f7f6f2)" opacity="0.4"/>
</svg>`;
const ITEMS = [
    { icon: ICON_SERVICE, label: 'Сервис' },
    { icon: ICON_DATABASE, label: 'БД' },
    { icon: ICON_CACHE, label: 'Кэш' },
];
export const Legend = {
    mount(container) {
        if (!document.getElementById('legend-css')) {
            const s = document.createElement('style');
            s.id = 'legend-css';
            s.textContent = CSS;
            document.head.appendChild(s);
        }
        const el = document.createElement('div');
        el.className = 'legend';
        el.setAttribute('aria-label', 'Легенда типов узлов');
        el.setAttribute('role', 'img');
        for (const item of ITEMS) {
            const wrap = document.createElement('div');
            wrap.className = 'legend-item';
            const iconWrap = document.createElement('div');
            iconWrap.className = 'legend-icon';
            iconWrap.innerHTML = item.icon;
            const lbl = document.createElement('span');
            lbl.textContent = item.label;
            wrap.appendChild(iconWrap);
            wrap.appendChild(lbl);
            el.appendChild(wrap);
        }
        container.appendChild(el);
    },
};
