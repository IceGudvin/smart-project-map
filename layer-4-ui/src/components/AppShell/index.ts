/**
 * AppShell/index.ts — Полная реализация корневой оболочки.
 *
 * Отвечает за:
 *   - DOM-лейаут: header 48px + flex(sidebar 260px + canvas flex-1), 100dvh
 *   - Запуск wsClient при mount, остановка при destroy
 *   - Получение cy-инстанса через cy:ready
 *   - Связывание всех нужных событий eventBus → store/cy
 */

import type { Core } from 'cytoscape'

import { store }                    from '../../store.js'
import { on, emit }                 from '../../lib/eventBus.js'
import { connectWs, disconnectWs }  from '../../lib/wsClient.js'
import {
  syncGraph,
  updateTheme,
  highlightSelected,
  clearDataflowHighlight,
  applyDataflowHighlight,
  startDashAnimation,
  stopDashAnimation,
} from '../../graph/cytoscapeInit.js'

import { Header }      from '../Header/index.js'
import { Sidebar }     from '../Sidebar/index.js'
import { Canvas }      from '../Canvas/index.js'
import { DetailPanel } from '../DetailPanel/index.js'
import { EdgeTooltip } from '../EdgeTooltip/index.js'

// ================================================================ CSS
//
// Лейаут инжектируется при первом mount — один раз.
// Основные токены (цвета, отступы, glassmorphism) заданы в tokens.css.

function injectLayoutStyles(): void {
  if (document.getElementById('app-shell-styles')) return
  const s = document.createElement('style')
  s.id = 'app-shell-styles'
  s.textContent = `
    /* ---- Сброс по умолчанию ---- */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ---- Корень приложения ---- */
    html, body, #app {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .app-shell {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      width: 100vw;
      overflow: hidden;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-body, 'Satoshi', 'Inter', system-ui, sans-serif);
    }

    /* ---- Header: фиксированная высота ---- */
    .app-header {
      flex: 0 0 48px;
      min-height: 48px;
      max-height: 48px;
      width: 100%;
      z-index: 100;
      border-bottom: 1px solid var(--color-border);
      background: var(--glass-bg, var(--color-surface));
      backdrop-filter: blur(var(--glass-blur, 12px)) saturate(var(--glass-saturate, 1.6));
      display: flex;
      align-items: center;
      padding: 0 var(--space-4, 1rem);
      gap: var(--space-3, 0.75rem);
    }

    /* ---- Главная область: sidebar + canvas ---- */
    .app-main {
      flex: 1 1 0;
      display: flex;
      flex-direction: row;
      overflow: hidden;
      height: 0; /* важно: заставляет flex-child считать высоту от flex-parent */
    }

    /* ---- Sidebar: фиксированная ширина ---- */
    .app-sidebar {
      flex: 0 0 260px;
      min-width: 260px;
      max-width: 260px;
      height: 100%;
      overflow: hidden;
      border-right: 1px solid var(--color-border);
      background: var(--color-surface);
      display: flex;
      flex-direction: column;
      transition: min-width 200ms ease, max-width 200ms ease, flex-basis 200ms ease;
      z-index: 50;
    }

    .app-sidebar.collapsed {
      flex: 0 0 48px;
      min-width: 48px;
      max-width: 48px;
    }

    /* ---- Canvas-обёртка: оставшееся место ---- */
    .app-canvas-wrap {
      flex: 1 1 0;
      position: relative;
      overflow: hidden;
      height: 100%;
    }

    /* ---- Позиционирование оверлеев ---- */
    .app-detail-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 60;
      pointer-events: auto;
    }

    .app-edge-tooltip {
      position: fixed;
      z-index: 200;
      pointer-events: none;
    }
  `
  document.head.appendChild(s)
}

// ================================================================ AppShell

export class AppShell {
  private root:        HTMLElement
  private cy:          Core | null = null

  // Компоненты инициализируются при mount()
  private header!:      Header
  private sidebar!:     Sidebar
  private canvas!:      Canvas
  private detailPanel!: DetailPanel
  private edgeTooltip!: EdgeTooltip

  // Отписки для cleanup
  private unsubs: Array<() => void> = []

  constructor(root: HTMLElement) {
    this.root = root
  }

  // ============================================================ mount

  mount(): void {
    injectLayoutStyles()
    this.root.innerHTML = ''
    this.root.className = 'app-shell'

    // Тема — применяем до рендера
    document.documentElement.setAttribute('data-theme', store.theme)

    // ---- Строим DOM -----------------------------------------------
    const headerEl    = document.createElement('header')
    headerEl.className = 'app-header'

    const mainEl      = document.createElement('div')
    mainEl.className   = 'app-main'

    const sidebarEl   = document.createElement('aside')
    sidebarEl.className = 'app-sidebar'

    const canvasWrapEl = document.createElement('div')
    canvasWrapEl.className = 'app-canvas-wrap'

    mainEl.appendChild(sidebarEl)
    mainEl.appendChild(canvasWrapEl)
    this.root.appendChild(headerEl)
    this.root.appendChild(mainEl)

    // ---- Монтируем компоненты ---------------------------------
    this.header      = new Header(headerEl)
    this.sidebar     = new Sidebar(sidebarEl)
    this.detailPanel = new DetailPanel()
    this.edgeTooltip = new EdgeTooltip()
    this.canvas      = new Canvas(canvasWrapEl)

    this.header.mount()
    this.sidebar.mount()

    // Canvas монтируется первым — создаёт #cy и эмитит cy:ready
    this.canvas.mount()

    // DetailPanel и EdgeTooltip монтируются внутри canvas-wrap
    const dpEl = document.createElement('div')
    dpEl.className = 'app-detail-panel'
    canvasWrapEl.appendChild(dpEl)
    this.detailPanel.mount(dpEl)

    const ttEl = document.createElement('div')
    ttEl.className = 'app-edge-tooltip'
    document.body.appendChild(ttEl)
    this.edgeTooltip.mount(ttEl)

    // ---- Подписки eventBus ------------------------------------
    this._bindEvents()

    // ---- Запуск WS ---------------------------------------------------
    connectWs()

    // ---- Keyboard shortcut: Escape → deselect ----------------------
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') emit('node:deselect', undefined)
    }
    document.addEventListener('keydown', onKeydown)
    this.unsubs.push(() => document.removeEventListener('keydown', onKeydown))
  }

  // ============================================================ destroy

  destroy(): void {
    for (const unsub of this.unsubs) unsub()
    this.unsubs = []
    disconnectWs()
  }

  // ============================================================ refresh (store → UI)

  /**
   * Вызывается внешне (out of main.ts) после обновления стора.
   * AppShell сам подписан на граф-события — этат метод для экстренного форсирования обновления.
   */
  refresh(): void {
    this.sidebar.update()
    this.canvas.update()
  }

  // ============================================================ private

  private _bindEvents(): void {
    // ---- cy:ready — получаем инстанс -------------------------
    this.unsubs.push(
      on('cy:ready', (cyInstance) => {
        this.cy = cyInstance as Core
      })
    )

    // ---- graph:full — полный снимок --------------------------------
    this.unsubs.push(
      on('graph:full', (graph) => {
        if (this.cy) syncGraph(this.cy, graph, store.theme === 'dark')
        this.sidebar.update()
        this.header.update()
      })
    )

    // ---- graph:update — инкрементальный дифф ------------------
    this.unsubs.push(
      on('graph:update', ({ diff }) => {
        if (this.cy) syncGraph(this.cy, store.graph, store.theme === 'dark')
        this.sidebar.update()
        this.header.update()
      })
    )

    // ---- graph:refresh — HTTP-фоллбэк ---------------------------
    this.unsubs.push(
      on('graph:refresh', async () => {
        try {
          const res  = await fetch('/graph')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json() as import('../../../../shared/src/graph.js').GraphModel
          store.setGraph(data)
          if (this.cy) syncGraph(this.cy, data, store.theme === 'dark')
          this.sidebar.update()
          this.header.update()
        } catch (err) {
          console.warn('[AppShell] HTTP fallback failed:', err)
        }
      })
    )

    // ---- node:select ------------------------------------------------
    this.unsubs.push(
      on('node:select', (id) => {
        store.selectNode(id)
        if (this.cy && !store.dataflowMode) {
          highlightSelected(this.cy, id)
        }
        this.detailPanel.show(id)
        this.sidebar.setActive(id)
      })
    )

    // ---- node:deselect ----------------------------------------------
    this.unsubs.push(
      on('node:deselect', () => {
        store.selectNode(null)
        if (this.cy && !store.dataflowMode) {
          clearDataflowHighlight(this.cy)
        }
        this.detailPanel.hide()
        this.sidebar.setActive(null)
      })
    )

    // ---- dataflow:toggle -------------------------------------------
    this.unsubs.push(
      on('dataflow:toggle', (enabled) => {
        store.setDataflowMode(enabled)
        if (this.cy) {
          if (enabled) {
            applyDataflowHighlight(this.cy, store.activeDataflowPath)
            startDashAnimation(this.cy)
          } else {
            clearDataflowHighlight(this.cy)
            stopDashAnimation(this.cy)
          }
        }
        this.header.update()
        this.canvas.update()
      })
    )

    // ---- dataflow:next ---------------------------------------------
    this.unsubs.push(
      on('dataflow:next', () => {
        store.nextDataflowPath()
        if (this.cy && store.dataflowMode) {
          applyDataflowHighlight(this.cy, store.activeDataflowPath)
        }
        this.canvas.update()   // обновляет название пути в CanvasToolbar
      })
    )

    // ---- theme:changed ---------------------------------------------
    this.unsubs.push(
      on('theme:changed', (theme) => {
        store.setTheme(theme)
        if (this.cy) updateTheme(this.cy, theme === 'dark')
        this.header.update()
      })
    )
  }
}
