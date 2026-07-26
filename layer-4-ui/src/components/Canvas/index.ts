/**
 * Canvas/index.ts — Основная область с графом Cytoscape + все оверлеи.
 *
 * Структура DOM (все через CSS position:absolute поверх #cy):
 *   .canvas-wrap
 *     ├─ #cy                     — Cytoscape (width/height 100%)
 *     ├─ .canvas-statsbar        — левый верх
 *     ├─ .canvas-toolbar         — центр верх, glassmorphism
 *     ├─ .canvas-zoom-controls   — правый ниж, glassmorphism
 *     └─ .canvas-legend           — левый ниж, glassmorphism
 */

import { cytoscapeInit, syncGraph, updateTheme, runLayout }
  from '../../graph/cytoscapeInit.js'
import { store }    from '../../store.js'
import { on, emit } from '../../lib/eventBus.js'
import { StatsBar }      from './StatsBar.js'
import { CanvasToolbar } from './CanvasToolbar.js'
import { ZoomControls }  from './ZoomControls.js'
import { Legend }        from './Legend.js'
import type { Core }     from 'cytoscape'

// ================================================================ CSS

function injectCanvasStyles(): void {
  if (document.getElementById('canvas-styles')) return
  const s = document.createElement('style')
  s.id = 'canvas-styles'
  s.textContent = `
    /* ---- Обёртка ---- */
    .canvas-wrap {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    /* ---- Cytoscape-контейнер ---- */
    #cy {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      /* dot-grid паттерн (переменные из tokens.css) */
      background-color: var(--color-bg);
      background-image: radial-gradient(
        circle at center,
        var(--dot-color, rgba(120,120,120,0.2)) var(--dot-size, 1.5px),
        transparent var(--dot-size, 1.5px)
      );
      background-size: var(--dot-spacing, 24px) var(--dot-spacing, 24px);
    }
    /* радиальный фейд по краям — псевдоэлемент ::after */
    #cy::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        transparent 40%,
        var(--color-bg) 100%
      );
    }
  `
  document.head.appendChild(s)
}

// ================================================================ Canvas

export class Canvas {
  private wrap!:     HTMLElement
  private cyEl!:    HTMLElement
  private cy:       Core | null = null
  private unsubs:   Array<() => void> = []

  private statsBar:    StatsBar
  private toolbar:     CanvasToolbar
  private zoomCtrl:   ZoomControls
  private legend:     Legend

  constructor() {
    this.statsBar  = new StatsBar()
    this.toolbar   = new CanvasToolbar()
    this.zoomCtrl  = new ZoomControls(() => this.cy)
    this.legend    = new Legend()
  }

  // ============================================================ mount

  mount(container: HTMLElement): void {
    injectCanvasStyles()

    // ---- Обёртка
    this.wrap = document.createElement('div')
    this.wrap.className = 'canvas-wrap'

    // ---- #cy
    this.cyEl = document.createElement('div')
    this.cyEl.id = 'cy'
    this.cyEl.setAttribute('aria-label', 'Граф сервисов')
    this.cyEl.setAttribute('role', 'img')
    this.wrap.appendChild(this.cyEl)

    // ---- Оверлеи
    this.statsBar.mount(this.wrap)
    this.toolbar.mount(this.wrap)
    this.zoomCtrl.mount(this.wrap)
    this.legend.mount(this.wrap)

    container.appendChild(this.wrap)

    // ---- Cytoscape — нужен ReqAnimFrame чтобы #cy был в DOM
    requestAnimationFrame(() => this._initCy())
  }

  // ============================================================ destroy

  destroy(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
    this.cy?.destroy()
    this.cy = null
    this.toolbar.destroy()
    this.statsBar.destroy()
  }

  // ============================================================ getCy

  getCy(): Core | null {
    return this.cy
  }

  // ============================================================ private — init

  private _initCy(): void {
    const isDark = store.theme === 'dark'
    this.cy = cytoscapeInit({
      container: this.cyEl,
      graph:     store.graph,
      isDark,
    })

    // Сообщаем AppShell через шину
    emit('cy:ready', this.cy as unknown)

    // Статистика
    this.statsBar.update(store.graph)

    this._bindEvents()
  }

  // ============================================================ private — events

  private _bindEvents(): void {
    // graph:full / graph:update — пересинх
    this.unsubs.push(
      on('graph:full', (graph) => {
        if (!this.cy) return
        syncGraph(this.cy, graph, store.theme === 'dark')
        this.statsBar.update(graph)
      }),
      on('graph:update', ({ diff }) => {
        if (!this.cy) return
        syncGraph(this.cy, store.graph, store.theme === 'dark')
        this.statsBar.update(store.graph)
      }),
    )

    // cy:fit — эмитит Header
    this.unsubs.push(
      on('cy:fit', () => {
        this.cy?.fit(undefined, 60)
      }),
    )

    // theme:changed
    this.unsubs.push(
      on('theme:changed', (theme) => {
        if (!this.cy) return
        updateTheme(this.cy, theme === 'dark')
      }),
    )

    // dataflow:toggle
    this.unsubs.push(
      on('dataflow:toggle', (enabled) => {
        this.toolbar.setDataflow(enabled)
      }),
    )

    // dataflow:next — толбар отображает новое имя
    this.unsubs.push(
      on('dataflow:next', () => {
        this.toolbar.syncDataflowPath(store.activeDataflowPath)
      }),
    )

    // Повторный layout (для toolbar)
    this.unsubs.push(
      on('graph:refresh', () => {
        if (!this.cy) return
        runLayout(this.cy, 'TB')
      }),
    )
  }
}
