/**
 * FilterBar.ts — Чипы фильтрации: Все / Сервисы / Инфра.
 */

export type FilterType = 'all' | 'service' | 'infra'

const CHIPS: Array<{ label: string; value: FilterType }> = [
  { label: 'Все',     value: 'all'     },
  { label: 'Сервисы', value: 'service' },
  { label: 'Инфра',   value: 'infra'   },
]

export class FilterBar {
  private btns: HTMLButtonElement[] = []

  constructor(container: HTMLElement, onChange: (f: FilterType) => void) {
    for (const { label, value } of CHIPS) {
      const btn = document.createElement('button')
      btn.className = 'sb-chip' + (value === 'all' ? ' active' : '')
      btn.textContent = label
      btn.dataset['filter'] = value
      btn.setAttribute('aria-pressed', value === 'all' ? 'true' : 'false')
      btn.addEventListener('click', () => {
        this.btns.forEach(b => {
          const active = b === btn
          b.classList.toggle('active', active)
          b.setAttribute('aria-pressed', String(active))
        })
        onChange(value)
      })
      container.appendChild(btn)
      this.btns.push(btn)
    }
  }
}
