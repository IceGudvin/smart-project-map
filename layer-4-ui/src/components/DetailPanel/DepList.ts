import type { ServiceEdge } from '../../../../shared/types'
import type { Store } from '../../store'

/**
 * DepList — секция зависимостей в DetailPanel.
 *
 * Показывает входящие и исходящие рёбра для выбранного узла.
 * Клик на зависимость → store.selectNode(targetId).
 */

export class DepList {
  private nodeId: string
  private edges: ServiceEdge[]
  private store: Store

  constructor(nodeId: string, edges: ServiceEdge[], store: Store) {
    this.nodeId = nodeId
    this.edges = edges
    this.store = store
  }

  render(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'panel-section'
    section.innerHTML = '<div class="ps-title">Зависимости</div>'
    this.edges.forEach(e => {
      const isOut = e.source === this.nodeId
      const otherId = isOut ? e.target : e.source
      const otherName = this.store.getNode(otherId)?.name ?? otherId
      const item = document.createElement('div')
      item.className = 'dep-item'
      item.setAttribute('role', 'button')
      item.setAttribute('tabindex', '0')
      item.innerHTML = `<span class="dep-arrow">${isOut ? '⟶' : '⟵'}</span> ${otherName} <span style="color:var(--text-faint);font-size:11px">(${e.method ?? ''} ${e.path ?? ''})</span>`
      item.addEventListener('click', () => {
        this.store.selectNode(otherId)
        document.dispatchEvent(new CustomEvent('spm:selectNode', { detail: { id: otherId } }))
      })
      section.appendChild(item)
    })
    return section
  }
}
