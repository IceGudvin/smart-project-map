import type { Store } from '../../store'
import { RouteList } from './RouteList'
import { SchemaBlock } from './SchemaBlock'
import { DepList } from './DepList'
import type { ServiceNode } from '../../../../shared/types'

/**
 * DetailPanel — правая панель с деталями выбранного узла.
 *
 * Структура (когда открыта):
 *   .panel-header — иконка, имя, подзаголовок, кнопка закрытия
 *   .panel-body
 *     ├── RouteList   — HTTP роуты (если есть)
 *     ├── SchemaBlock — схемы данных (Pydantic / TypeScript-типы)
 *     └── DepList     — зависимости (входящие и исходящие рёбра)
 *
 * show(id) — открывает панель для узла с данным id.
 * hide()   — закрывает панель.
 */

export class DetailPanel {
  private store: Store
  private el: HTMLElement | null = null

  constructor(store: Store) {
    this.store = store
  }

  render(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'detail-panel'
    panel.id = 'detailPanel'
    panel.setAttribute('role', 'complementary')
    panel.setAttribute('aria-label', 'Детали сервиса')
    panel.setAttribute('aria-hidden', 'true')
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-icon service" id="panelIcon" aria-hidden="true">⚙</div>
        <div>
          <div class="panel-name" id="panelName">—</div>
          <div class="panel-sub" id="panelSub">—</div>
        </div>
        <button class="panel-close" aria-label="Закрыть панель" id="panelClose">✕</button>
      </div>
      <div class="panel-body" id="panelBody"></div>
    `
    panel.querySelector('#panelClose')?.addEventListener('click', () => this.hide())
    this.el = panel
    return panel
  }

  show(nodeId: string): void {
    const node = this.store.getNode(nodeId)
    if (!node || !this.el) return

    this._fillHeader(node)
    this._fillBody(node)

    this.el.classList.add('open')
    this.el.setAttribute('aria-hidden', 'false')
  }

  hide(): void {
    this.el?.classList.remove('open')
    this.el?.setAttribute('aria-hidden', 'true')
    this.store.selectNode(null)
  }

  private _fillHeader(node: ServiceNode): void {
    const icon = this.el?.querySelector('#panelIcon')
    const name = this.el?.querySelector('#panelName')
    const sub = this.el?.querySelector('#panelSub')
    if (icon) { icon.textContent = node.type === 'service' ? '⚙' : '🗄'; icon.className = `panel-icon ${node.type === 'service' ? 'service' : 'infra'}` }
    if (name) name.textContent = node.name
    if (sub) sub.textContent = `${node.tech ?? node.type} · ${node.lang ?? ''}`
  }

  private _fillBody(node: ServiceNode): void {
    const body = this.el?.querySelector('#panelBody')
    if (!body) return

    const edges = this.store.getEdgesFor(node.id)
    body.innerHTML = ''

    if (node.routes?.length) {
      body.appendChild(new RouteList(node.routes).render())
    }
    if (node.schemas?.length) {
      body.appendChild(new SchemaBlock(node.schemas).render())
    }
    if (edges.length) {
      body.appendChild(new DepList(node.id, edges, this.store).render())
    }
  }
}
