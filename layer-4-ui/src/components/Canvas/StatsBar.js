const CSS = `
.stats-bar {
  position: absolute;
  top: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  font-family: var(--font-body);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}
.stats-bar__dot {
  display: inline-block;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--color-text-faint);
}
.stats-bar__num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--color-text);
  transition: color 0.2s;
}
`;
function inject() {
    if (document.getElementById('stats-bar-css'))
        return;
    const s = document.createElement('style');
    s.id = 'stats-bar-css';
    s.textContent = CSS;
    document.head.appendChild(s);
}
function plural(n, one, few, many) {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)
        return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14))
        return `${n} ${few}`;
    return `${n} ${many}`;
}
export const StatsBar = {
    _el: null,
    _nums: [],
    mount(parent) {
        inject();
        const el = document.createElement('div');
        el.className = 'stats-bar';
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', 'Статистика графа');
        el.innerHTML = `
      <span class="stats-bar__num" data-i="0">0</span>
      <span>сервисов</span>
      <span class="stats-bar__dot"></span>
      <span class="stats-bar__num" data-i="1">0</span>
      <span>связей</span>
      <span class="stats-bar__dot"></span>
      <span class="stats-bar__num" data-i="2">0</span>
      <span>роутов</span>
    `;
        parent.appendChild(el);
        this._el = el;
        this._nums = Array.from(el.querySelectorAll('.stats-bar__num'));
        return this;
    },
    update(graph) {
        if (!this._el)
            return;
        const services = graph.nodes?.length ?? 0;
        const edges = graph.edges?.length ?? 0;
        const routes = graph.nodes?.reduce((a, n) => a + (n.routes?.length ?? 0), 0) ?? 0;
        const labels = [
            [services, 'сервис', 'сервиса', 'сервисов'],
            [edges, 'связь', 'связи', 'связей'],
            [routes, 'роут', 'роута', 'роутов'],
        ];
        labels.forEach(([n, one, few, many], i) => {
            const el = this._nums[i];
            if (el && el.textContent !== String(n)) {
                el.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 220, easing: 'ease-out' });
                el.textContent = String(n);
            }
            // обновляем соседний span с тексом
            const label = el?.nextElementSibling;
            if (label)
                label.textContent = ` ${plural(n, one, few, many).split(' ').slice(1).join(' ')}`;
        });
    },
};
