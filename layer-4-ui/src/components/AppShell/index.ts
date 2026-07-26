import type { Store } from '../../store'
import { Header } from '../Header'
import { Sidebar } from '../Sidebar'
import { Canvas } from '../Canvas'
import { DetailPanel } from '../DetailPanel'
import { EdgeTooltip } from '../EdgeTooltip'

/**
 * AppShell — корневой компонент-оболочка.
 *
 * Компонует всё приложение:
 *   Header (верхняя панель)
 *   ├── Sidebar (левая панель со списком сервисов)
 *   ├── Canvas (граф cytoscape + тулбар + зум + легенда)
 *   └── DetailPanel (правая панель с деталями узла)
 *   EdgeTooltip (tooltip поверх канваса при hover на ребро)
 *
 * Принимает store и корневой DOM-элемент (#app).
 * Методы: mount() — первый рендер, refresh() — обновление при смене store.
 */

export class AppShell {
  private root: HTMLElement
  private store: Store
  private header!: Header
  private sidebar!: Sidebar
  private canvas!: Canvas
  private detailPanel!: DetailPanel
  private edgeTooltip!: EdgeTooltip

  constructor(root: HTMLElement, store: Store) {
    this.root = root
    this.store = store
  }

  mount(): void {
    this.root.innerHTML = ''
    this.root.className = 'app-shell'

    this.header = new Header(this.store)
    this.sidebar = new Sidebar(this.store)
    this.detailPanel = new DetailPanel(this.store)
    this.edgeTooltip = new EdgeTooltip()
    this.canvas = new Canvas(this.store, this.detailPanel, this.edgeTooltip)

    const main = document.createElement('div')
    main.className = 'main'
    main.appendChild(this.sidebar.render())

    const canvasWrap = document.createElement('div')
    canvasWrap.className = 'canvas-wrap'
    canvasWrap.appendChild(this.canvas.render())
    canvasWrap.appendChild(this.detailPanel.render())
    canvasWrap.appendChild(this.edgeTooltip.render())
    main.appendChild(canvasWrap)

    this.root.appendChild(this.header.render())
    this.root.appendChild(main)

    this.canvas.init()
  }

  refresh(): void {
    this.sidebar.update()
    this.canvas.update()
  }
}
