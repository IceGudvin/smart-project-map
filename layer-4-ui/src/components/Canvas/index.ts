import type { Store } from '../../store'
import type { DetailPanel } from '../DetailPanel'
import type { EdgeTooltip } from '../EdgeTooltip'
import { initCytoscape } from '../../graph/cytoscapeInit'
import { CanvasToolbar } from './CanvasToolbar'
import { ZoomControls } from './ZoomControls'
import { Legend } from './Legend'
import { StatsBar } from './StatsBar'
import type cytoscape from 'cytoscape'

/**
 * Canvas — главная область с графом Cytoscape.
 *
 * Структура:
 *   #cy                — контейнер Cytoscape
 *   StatsBar           — счётчики (сервисы / связи / роуты)
 *   CanvasToolbar      — инструменты (pan, dataflow, layout)
 *   ZoomControls       — +/−/fit
 *   Legend             — легенда типов узлов
 *
 * init() вызывается AppShell после монтирования DOM.
 * update() пересоздаёт граф при смене store.graph.
 */

export class Canvas {
  private store: Store
  private detailPanel: DetailPanel
  private edgeTooltip: EdgeTooltip
  private el: HTMLElement | null = null
  private cy: cytoscape.Core | null = null
  private toolbar: CanvasToolbar
  private zoomControls: ZoomControls
  private legend: Legend
  private statsBar: StatsBar

  constructor(store: Store, detailPanel: DetailPanel, edgeTooltip: EdgeTooltip) {
    this.store = store
    this.detailPanel = detailPanel
    this.edgeTooltip = edgeTooltip
    this.toolbar = new CanvasToolbar()
    this.zoomControls = new ZoomControls(() => this.cy)
    this.legend = new Legend()
    this.statsBar = new StatsBar(store)
  }

  render(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'canvas-inner'

    const cyEl = document.createElement('div')
    cyEl.id = 'cy'
    cyEl.setAttribute('aria-label', 'Граф сервисов')
    cyEl.setAttribute('role', 'img')

    wrap.appendChild(cyEl)
    wrap.appendChild(this.statsBar.render())
    wrap.appendChild(this.toolbar.render())
    wrap.appendChild(this.zoomControls.render())
    wrap.appendChild(this.legend.render())

    this.el = wrap
    return wrap
  }

  init(): void {
    this.cy = initCytoscape({
      container: document.getElementById('cy')!,
      graph: this.store.graph,
      theme: this.store.theme,
      onNodeClick: (id) => {
        this.store.selectNode(id)
        this.detailPanel.show(id)
      },
      onEdgeHover: (data, pos) => this.edgeTooltip.show(data, pos),
      onEdgeOut: () => this.edgeTooltip.hide(),
      onBgClick: () => {
        this.store.selectNode(null)
        this.detailPanel.hide()
      },
    })

    document.addEventListener('spm:refresh', () => this._reLayout())
    document.addEventListener('spm:fit', () => this.cy?.fit(undefined, 60))
    document.addEventListener('spm:selectNode', (e) => {
      const { id } = (e as CustomEvent).detail
      this._highlightNode(id)
    })
  }

  update(): void {
    if (!this.cy) return
    this.cy.elements().remove()
    this._addElements()
    this.statsBar.update()
  }

  private _addElements(): void {
    if (!this.cy) return
    // Узлы и рёбра добавляются из store.graph через cytoscapeInit helpers
  }

  private _reLayout(): void {
    this.cy?.layout({ name: 'dagre', rankDir: 'TB', nodeSep: 80, rankSep: 100, padding: 60 } as any).run()
  }

  private _highlightNode(id: string): void {
    if (!this.cy) return
    this.cy.elements().removeClass('highlighted dimmed')
    const node = this.cy.getElementById(id)
    if (node.length) {
      const connected = node.closedNeighborhood()
      this.cy.elements().not(connected).addClass('dimmed')
      connected.addClass('highlighted')
    }
  }
}
