import type { GraphDiff, ServiceNode } from '@smart-map/shared'
import { on } from '../../lib/eventBus.js'
import { store } from '../../store.js'
import { createServiceItem, type ServiceItem } from './ServiceItem.js'
import { createFilterBar, type FilterBar } from './FilterBar.js'

export interface SidebarOptions {
  container: HTMLElement
}

export class Sidebar {
  private el:          HTMLElement
  private listEl:      HTMLElement
  private items:       Map<string, ServiceItem> = new Map()
  private unsubs:      Array<() => void>        = []
  private filterBar!:  FilterBar
  private filterQuery: string                   = ''

  constructor({ container }: SidebarOptions) {
    this.el = document.createElement('aside')
    this.el.className = 'sidebar'
    this.el.setAttribute('aria-label', 'Service list')

    // ---- Filter bar
    const fbWrap = document.createElement('div')
    fbWrap.className = 'sidebar__filter'
    this.filterBar = createFilterBar({
      container: fbWrap,
      onSearch: (q) => { this.filterQuery = q; this._rerender() },
    })
    this.el.appendChild(fbWrap)

    // ---- List
    this.listEl = document.createElement('ul')
    this.listEl.className = 'sidebar__list'
    this.listEl.setAttribute('role', 'list')
    this.el.appendChild(this.listEl)

    container.appendChild(this.el)
    this._bindEvents()
  }

  private _bindEvents(): void {
    this.unsubs.push(
      on('graph:full',   (graph)          => this._rebuild(graph.nodes ?? [])),
      on('graph:update', ({ diff })        => this._applyDiff(diff)),
      on('node:select',  (id)             => this._setSelected(id)),
      on('node:deselect', ()              => this._setSelected(null)),
    )
  }

  private _rebuild(nodes: ServiceNode[]): void {
    // Очистить
    this.items.forEach(item => item.destroy())
    this.items.clear()
    this.listEl.innerHTML = ''

    // Разделить на сервисы и инфру
    const appNodes   = nodes.filter(n => n.nodeType === 'service')
    const infraNodes = nodes.filter(n => n.nodeType !== 'service')

    if (appNodes.length)   this._addSection('Applications', appNodes)
    if (infraNodes.length) this._addSection('Infrastructure', infraNodes)

    this._rerender()
  }

  private _addSection(label: string, nodes: ServiceNode[]): void {
    const header = document.createElement('li')
    header.className = 'sidebar__section-header'
    header.textContent = label
    this.listEl.appendChild(header)

    for (const node of nodes) {
      const item = createServiceItem({
        node,
        onClick: (id) => {
          store.selectNode(id)
          on('node:select', () => {})
        },
      })
      this.items.set(node.id, item)
      this.listEl.appendChild(item.el)
    }
  }

  private _rerender(): void {
    const q = this.filterQuery.toLowerCase()
    this.items.forEach((item, id) => {
      const node = store.getNode(id)
      if (!node) return
      const visible = !q || node.name.toLowerCase().includes(q) || node.nodeType.toLowerCase().includes(q)
      item.el.style.display = visible ? '' : 'none'
    })
  }

  private _setSelected(id: string | null): void {
    this.items.forEach((item, itemId) => {
      const node = store.getNode(itemId)
      if (node) item.update(node, itemId === id)
    })
  }

  private _applyDiff(diff: GraphDiff): void {
    // Добавить новые узлы
    for (const node of diff.addedNodes) {
      const isService = node.nodeType === 'service'
      const label = isService ? 'Applications' : 'Infrastructure'
      const item = createServiceItem({
        node,
        onClick: (id) => { store.selectNode(id) },
      })
      this.items.set(node.id, item)
      // Найти нужную секцию
      const sections = this.listEl.querySelectorAll('.sidebar__section-header')
      let targetSection: Element | null = null
      sections.forEach(s => { if (s.textContent === label) targetSection = s })
      if (targetSection) {
        // Вставить после последнего элемента секции
        const nextSection = (targetSection as Element).nextElementSibling
        if (nextSection && nextSection.classList.contains('sidebar__section-header')) {
          this.listEl.insertBefore(item.el, nextSection)
        } else {
          this.listEl.appendChild(item.el)
        }
      }
    }

    // Удалить ушедшие
    for (const id of diff.removedNodeIds) {
      this.items.get(id)?.destroy()
      this.items.delete(id)
    }

    // Обновить изменившиеся
    for (const node of diff.updatedNodes) {
      const item = this.items.get(node.id)
      if (item) item.update(node, store.selectedNodeId === node.id)
    }
  }

  destroy(): void {
    this.unsubs.forEach(u => u())
    this.items.forEach(i => i.destroy())
    this.el.remove()
  }
}
