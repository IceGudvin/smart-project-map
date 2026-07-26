import type { Store } from '../../store'

/**
 * FilterBar — строка поиска + чипы фильтра в шапке Sidebar.
 *
 * Фильтры: All | Service | Infra
 * При вводе в input → store.setFilter(q)
 * При клике на чип — фильтрует список по типу узла (диспатчит 'spm:filter')
 */

export class FilterBar {
  private store: Store

  constructor(store: Store) {
    this.store = store
  }

  render(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.innerHTML = `
      <input class="search-input" type="text" placeholder="Поиск..." aria-label="Поиск сервисов" id="sidebar-search">
      <div class="filter-row" role="group" aria-label="Фильтр по типу">
        <button class="filter-chip active" data-filter="all">All</button>
        <button class="filter-chip" data-filter="service">Service</button>
        <button class="filter-chip" data-filter="infra">Infra</button>
      </div>
    `
    wrap.querySelector('#sidebar-search')?.addEventListener('input', (e) => {
      this.store.setFilter((e.target as HTMLInputElement).value)
      document.dispatchEvent(new CustomEvent('spm:filter', { detail: { q: this.store.filter } }))
    })
    wrap.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        document.dispatchEvent(new CustomEvent('spm:filter', { detail: { type: (btn as HTMLElement).dataset.filter } }))
      })
    })
    return wrap
  }
}
