/**
 * AppShell/index.ts — Полная реализация корневой оболочки.
 *
 * Отвечает за:
 *   - DOM-лейаут: header 48px + flex(sidebar 260px + canvas flex-1), 100dvh
 *   - Запуск wsClient при mount, остановка при destroy
 *   - Получение cy-инстанса через cy:ready
 *   - Связывание всех нужных событий eventBus → store/cy
 *
 * Интеграция с layer-3-server:
 *   - GET  /graph          — фоллбэк если WS не вернул graph:full за 2с
 *   - POST /graph/rebuild  — принудительный пересбор графа (в Header)
 *   - X-Updated-At         — заголовок в обоих ответах, мс-таймштамп
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
// Canvas, DetailPanel, EdgeTooltip — singleton-объекты, не классы
import { Canvas }      from '../Canvas/index.js'
import { DetailPanel } from '../DetailPanel/index.js'
import { EdgeTooltip } from '../EdgeTooltip/index.js'

// ================================================================ helpers

/**
 * Парсит миллисекундный таймштамп из заголовка X-Updated-At.
 * Сервер шлёт строку вида "1753542345678" (Unix ms).
 * Если заголовка нет или он невалиден — возвращает Date.now().
 */
function parseUpdatedAt(res: Response): number {
  const raw = res.headers.get('x-updated-at')
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return Date.now()
}

// ================================================================ CSS

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
  private root: HTMLElement
  private cy:   Core | null = null

  // Header и Sidebar — классы; Canvas/DetailPanel/EdgeTooltip — объекты-синглтоны
  private header!:  Header
  private sidebar!: Sidebar

  private unsubs: Array<() => void> = []

  constructor(root: HTMLElement) {
    this.root = root
  }

  // ============================================================ mount

  mount(): void {
    injectLayoutStyles()
    this.root.innerHTML = ''
    this.root.className = 'app-shell'

    document.documentElement.setAttribute('data-theme', store.theme)

    // ---- DOM-скелет
    const headerEl = document.createElement('header')
    headerEl.className = 'app-header'

    const mainEl = document.createElement('div')
    mainEl.className = 'app-main'

    const sidebarEl = document.createElement('aside')
    sidebarEl.className = 'app-sidebar'

    const canvasWrapEl = document.createElement('div')
    canvasWrapEl.className = 'app-canvas-wrap'

    mainEl.appendChild(sidebarEl)
    mainEl.appendChild(canvasWrapEl)
    this.root.appendChild(headerEl)
    this.root.appendChild(mainEl)

    // ---- Header: класс — new + mount(уже не нужен el в конструкторе — передаётся в new)
    this.header = new Header(headerEl)
    this.header.mount()

    // ---- Sidebar: класс без аргумента в конструкторе — el передаётся в mount(el)
    this.sidebar = new Sidebar()
    this.sidebar.mount(sidebarEl)

    // ---- Canvas: singleton-объект — mount(el)
    Canvas.mount(canvasWrapEl)

    // ---- DetailPanel: singleton-объект — создаёт свой el и вставляет в canvasWrapEl
    const dpEl = document.createElement('div')
    dpEl.className = 'app-detail-panel'
    canvasWrapEl.appendChild(dpEl)
    DetailPanel.mount(dpEl)

    // ---- EdgeTooltip: singleton-объект — монтирует себя в body самостоятельно
    EdgeTooltip.mount()

    this._bindEvents()

    connectWs()

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
    this.header.destroy()
    this.sidebar.destroy()
    Canvas.destroy()
    DetailPanel.destroy()
    EdgeTooltip.destroy()
  }

  // ============================================================ private

  private _bindEvents(): void {
    // ---- cy:ready
    this.unsubs.push(
      on('cy:ready', (cyInstance) => {
        this.cy = cyInstance as Core
      })
    )

    // ---- graph:full — полный снимок пришёл по WS
    this.unsubs.push(
      on('graph:full', (graph) => {
        if (this.cy) syncGraph(this.cy, graph, store.theme === 'dark')
        this.sidebar.update(store.graph)
        this.header.update()
      })
    )

    // ---- graph:update — инкрементальный дифф по WS
    this.unsubs.push(
      on('graph:update', (_payload) => {
        if (this.cy) syncGraph(this.cy, store.graph, store.theme === 'dark')
        this.sidebar.update(store.graph)
        this.header.update()
      })
    )

    // ---- graph:refresh — HTTP-фоллбэк (WS не вернул graph:full за 2с)
    //
    // Протокол:
    //   GET /graph
    //   Ответ: { nodes, edges, updatedAt } + заголовок X-Updated-At: <ms>
    //   updatedAt берём из тела (data.updatedAt) если есть,
    //   иначе из заголовка X-Updated-At, иначе Date.now().
    this.unsubs.push(
      on('graph:refresh', async () => {
        try {
          const res = await fetch('/graph')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)

          const data = await res.json() as import('../../../../shared/src/graph.js').GraphModel

          // Если сервер не заполнил updatedAt в теле — берём из заголовка
          if (!data.updatedAt || data.updatedAt === 0) {
            data.updatedAt = parseUpdatedAt(res)
          }

          store.setGraph(data)
          if (this.cy) syncGraph(this.cy, data, store.theme === 'dark')
          this.sidebar.update(store.graph)
          this.header.update()
        } catch (err) {
          console.warn('[AppShell] HTTP fallback GET /graph failed:', err)
        }
      })
    )

    // ---- graph:rebuild:done — POST /graph/rebuild завершился (эмитит Header)
    //
    // Реальное обновление данных идёт через graph:full по WS после rebuild.
    // AppShell просто синхронизирует header-метку времени.
    this.unsubs.push(
      on('graph:rebuild:done', (_updatedAt) => {
        this.header.update()
      })
    )

    // ---- node:select
    this.unsubs.push(
      on('node:select', (id) => {
        store.selectNode(id)
        if (this.cy && !store.dataflowMode) {
          highlightSelected(this.cy, id)
        }
        DetailPanel.show(id)
        this.sidebar.setActive(id)
      })
    )

    // ---- node:deselect
    this.unsubs.push(
      on('node:deselect', () => {
        store.selectNode(null)
        if (this.cy && !store.dataflowMode) {
          clearDataflowHighlight(this.cy)
        }
        DetailPanel.hide()
        this.sidebar.setActive(null)
      })
    )

    // ---- dataflow:toggle
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
      })
    )

    // ---- dataflow:next
    this.unsubs.push(
      on('dataflow:next', () => {
        store.nextDataflowPath()
        if (this.cy && store.dataflowMode) {
          applyDataflowHighlight(this.cy, store.activeDataflowPath)
        }
      })
    )

    // ---- theme:changed
    this.unsubs.push(
      on('theme:changed', (theme) => {
        store.setTheme(theme)
        document.documentElement.setAttribute('data-theme', theme)
        if (this.cy) updateTheme(this.cy, theme === 'dark')
        this.header.update()
      })
    )

    // ---- sidebar:collapsed — адаптируем .app-sidebar под collapsed-класс
    this.unsubs.push(
      on('sidebar:collapsed', (collapsed) => {
        const sidebarEl = this.root.querySelector<HTMLElement>('.app-sidebar')
        if (sidebarEl) sidebarEl.classList.toggle('collapsed', collapsed as unknown as boolean)
      })
    )
  }
}
