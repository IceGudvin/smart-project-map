import type { ServiceNode } from '../../../../shared/types'
import type { Store } from '../../store'

/**
 * ServiceItem — одна строка в списке сервисов Sidebar.
 *
 * Показывает: имя, бейдж технологии, статус-точку, мета-информацию.
 * При клике вызывает store.selectNode(id) и диспатчит 'spm:selectNode'.
 * Получает active-класс от store.selectedNodeId.
 */

export class ServiceItem {
  private node: ServiceNode
  private store: Store
  private el: HTMLElement | null = null

  constructor(node: ServiceNode, store: Store) {
    this.node = node
    this.store = store
  }

  render(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'service-item'
    div.setAttribute('role', 'listitem')
    div.setAttribute('tabindex', '0')
    div.setAttribute('aria-label', this.node.name)
    div.id = `si-${this.node.id}`

    const tech = this.node.tech ?? this.node.type
    const badgeClass = this._badgeClass(tech)

    div.innerHTML = `
      <div class="si-top">
        <div class="si-name">${this.node.name}</div>
        <span class="badge ${badgeClass}">${tech}</span>
      </div>
      <div class="si-meta">
        <span class="si-dot" aria-hidden="true"></span>
        ${this.node.meta ?? ''}
      </div>
    `

    div.addEventListener('click', () => this._select())
    div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._select() })

    if (this.store.selectedNodeId === this.node.id) div.classList.add('active')
    this.el = div
    return div
  }

  private _select(): void {
    this.store.selectNode(this.node.id)
    document.dispatchEvent(new CustomEvent('spm:selectNode', { detail: { id: this.node.id } }))
  }

  private _badgeClass(tech: string): string {
    const map: Record<string, string> = {
      'Next.js': 'badge-ts', TypeScript: 'badge-ts',
      FastAPI: 'badge-py', Python: 'badge-py',
      PostgreSQL: 'badge-infra', Redis: 'badge-infra',
      MinIO: 'badge-ext', S3: 'badge-ext',
    }
    return map[tech] ?? 'badge-infra'
  }
}
