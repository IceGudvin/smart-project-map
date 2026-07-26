/**
 * FilterBar.ts — Чипы фильтрации: All / Service / Infra.
 *
 * Монтируется в переданный внешний элемент (sb-filter-bar).
 * При клике чипа — вызывает `onChange(filter)`.
 */

export type FilterType = 'all' | 'service' | 'infra'

const CHIPS: Array<{ label: string; value: FilterType }> = [
  { label: 'All',     value: 'all' },
  { label: 'Service', value: 'service' },
  { label: 'Infra',   value: 'infra' },
]

export class FilterBar {
  private container: HTMLElement
  private onChange: (filter: FilterType) => void
  private active: FilterType = 'all'
  private chipEls: Map<FilterType, HTMLButtonElement> = new Map()

  constructor(container: HTMLElement, onChange: (filter: FilterType) => void) {
    this.container = container
    this.onChange = onChange
    this._render()
  }

  private _render(): void {
    this.container.innerHTML = ''
    for (const { label, value } of CHIPS) {
      const btn = document.createElement('button')
      btn.className = 'sb-chip' + (value === this.active ? ' active' : '')
      btn.textContent = label
      btn.setAttribute('aria-pressed', String(value === this.active))
      btn.addEventListener('click', () => this._select(value))
      this.chipEls.set(value, btn)
      this.container.appendChild(btn)
    }
  }

  private _select(value: FilterType): void {
    if (this.active === value) return
    this.chipEls.get(this.active)?.classList.remove('active')
    this.chipEls.get(this.active)?.setAttribute('aria-pressed', 'false')
    this.active = value
    this.chipEls.get(value)?.classList.add('active')
    this.chipEls.get(value)?.setAttribute('aria-pressed', 'true')
    this.onChange(value)
  }
}
