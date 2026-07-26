/**
 * FilterBar.ts — Чипы фильтрации: Все / Сервисы / Инфра.
 */
const CHIPS = [
    { label: 'Все', value: 'all' },
    { label: 'Сервисы', value: 'service' },
    { label: 'Инфра', value: 'infra' },
];
export class FilterBar {
    btns = [];
    constructor(container, onChange) {
        for (const { label, value } of CHIPS) {
            const btn = document.createElement('button');
            btn.className = 'sb-chip' + (value === 'all' ? ' active' : '');
            btn.textContent = label;
            btn.dataset['filter'] = value;
            btn.setAttribute('aria-pressed', value === 'all' ? 'true' : 'false');
            btn.addEventListener('click', () => {
                this.btns.forEach(b => {
                    const active = b === btn;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-pressed', String(active));
                });
                onChange(value);
            });
            container.appendChild(btn);
            this.btns.push(btn);
        }
    }
}
