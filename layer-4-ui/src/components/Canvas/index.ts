import { on } from '../../lib/eventBus.js'
import { store } from '../../store.js'
import { isDark } from '../../lib/theme.js'
import {
  initCytoscape,
  syncGraph,
  updateTheme,
  runLayout,
  applyDataflowHighlight,
  clearDataflowHighlight,
  startDashAnimation,
  stopDashAnimation,
  highlightSelected,
} from '../../graph/cytoscapeInit.js'
import { createCanvasToolbar } from './CanvasToolbar.js'
import { createStatsBar } from './StatsBar.js'
import type { Core } from 'cytoscape'
import type { GraphModel, GraphDiff } from '@smart-map/shared'

export interface CanvasOptions {
  container: HTMLElement
}

export function createCanvas({ container }: CanvasOptions): { destroy(): void } {
  let _cy: Core | null = null

  const canvasEl = document.createElement('div')
  canvasEl.className = 'canvas'
  container.appendChild(canvasEl)

  const toolbar = createCanvasToolbar({ container: canvasEl })
  const statsBar = createStatsBar({ container: canvasEl })

  const unsubs: Array<() => void> = []

  unsubs.push(
    on('graph:full', (graph: GraphModel) => {
      if (!_cy) {
        _cy = initCytoscape({ container: canvasEl, graph, isDark: isDark() })
      } else {
        syncGraph(_cy, graph, isDark())
        runLayout(_cy)
      }
      statsBar.update(graph)
    }),

    on('graph:update', ({ diff }: { diff: GraphDiff; changedAt: number }) => {
      if (!_cy) return
      store.applyDiff(diff)
      syncGraph(_cy, store.graph, isDark())
      statsBar.update(store.graph)
    }),

    on('theme:changed', (theme: string) => {
      if (_cy) updateTheme(_cy, theme === 'dark')
    }),

    on('cy:layout',   (layout: 'TB' | 'LR')  => { if (_cy) runLayout(_cy, layout) }),
    on('cy:pan-mode', (enabled: boolean)      => {
      if (!_cy) return
      _cy.autoungrabify(enabled)
      _cy.panningEnabled(enabled)
    }),

    on('dataflow:next', (idx: 0 | 1 | 2) => {
      if (!_cy) return
      applyDataflowHighlight(_cy, idx)
      startDashAnimation(_cy)
      toolbar.syncDataflowPath(idx)
    }),

    on('dataflow:mode', (enabled: boolean) => {
      if (!_cy) return
      if (enabled) {
        applyDataflowHighlight(_cy, store.activeDataflowPath)
        startDashAnimation(_cy)
      } else {
        clearDataflowHighlight(_cy)
        stopDashAnimation(_cy)
      }
    }),

    on('node:select',  (id: string)  => { if (_cy && !store.dataflowMode) highlightSelected(_cy, id) }),
    on('node:deselect', ()           => { if (_cy && !store.dataflowMode) clearDataflowHighlight(_cy) }),
  )

  return {
    destroy() {
      unsubs.forEach(u => u())
      toolbar.destroy()
      statsBar.destroy()
      _cy?.destroy()
    },
  }
}
