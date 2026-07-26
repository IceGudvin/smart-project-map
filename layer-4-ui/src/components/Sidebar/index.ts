import type { Store } from '../../store'
import { ServiceItem } from './ServiceItem'
import { FilterBar } from './FilterBar'

/**
 * Sidebar — левая панель со списком сервисов.
 *
 * Структура:
 *   .sidebar-header
 *     ├── .sidebar-title
 *     ├── FilterBar (input поиска + чипы фильтрации)
 *   .sidebar-list
 *     └── ServiceItem[] (по одному на каждый узел графа)
 *
 * При выборе ServiceItem → store.selectNode(id).
 * При изменении store — update() перерисовывает список.
 */

export class Sidebar {
  private store: Store
  private el: HTMLElement | null = null
  private filterBar: FilterBar
  private items: Map<string, ServiceItem> = new Map()

  constructor(store: Store) {
    this.store = store
    this.filterBar = new FilterBar(store)
  }

  render(): HTMLElement {
    const aside = document.createElement('aside')
    aside.className = 'sidebar'
    aside.setAttribute('aria-label', 'Список сервисов')

    const header = document.createElement('div')
    header.className = 'sidebar-header'
    header.innerHTML = '<div class="sidebar-title">Сервисы</div>'
    header.appendChild(this.filterBar.render())

    const list = document.createElement('div')
    list.className = 'sidebar-list'
    list.id = 'sidebar-list'
    list.setAttribute('role', 'list')

    aside.appendChild(header)
    aside.appendChild(list)
    this.el = aside
    this._renderList()
    return aside
  }

  update(): void {
    this._renderList()
  }

  private _renderList(): void {
    const list = this.el?.querySelector('#sidebar-list')
    if (!list) return
    list.innerHTML = ''
    this.items.clear()

    const nodes = this.store.graph.nodes
    const groups = new Map<string, typeof nodes>() 
    nodes.forEach(n => {
      const group = n.type === 'service' ? 'Application' : 'Infrastructure'
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(n)
    })

    groups.forEach((groupNodes, groupName) => {
      const section = document.createElement('div')
      section.className = 'sidebar-section'
      section.textContent = groupName
      list.appendChild(section)

      groupNodes.forEach(node => {
        const item = new ServiceItem(node, this.store)
        this.items.set(node.id, item)
        list.appendChild(item.render())
      })
    })
  }
}
