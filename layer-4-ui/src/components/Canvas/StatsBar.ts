import type { Store } from '../../store'

/**
 * StatsBar — плашки со статистикой (левый верхний угол канваса).
 *
 * Показывает: кол-во сервисов, связей, роутов.
 * update() пересчитывает значения из store.graph.
 */

export class StatsBar {
  private store: Store
  private el: HTMLElement | null = null

  constructor(store: Store) {
    this.store = store
  }

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'stats-bar'
    el.setAttribute('aria-live', 'polite')
    el.setAttribute('aria-label', 'Статистика графа')
    this.el = el
    this.update()
    return el
  }

  update(): void {
    if (!this.el) return
    const { nodes, edges } = this.store.graph
    const routes = nodes.reduce((acc, n) => acc + (n.routes?.length ?? 0), 0)
    this.el.innerHTML = `
      <div class="stat-chip"><span>${nodes.length}</span> сервисов</div>
      <div class="stat-chip"><span>${edges.length}</span> связей</div>
      <div class="stat-chip"><span>${routes}</span> роутов</div>
    `
  }
}
