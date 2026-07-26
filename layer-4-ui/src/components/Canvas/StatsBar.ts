import type { GraphModel } from '@smart-map/shared'

export interface StatsBarOptions {
  container: HTMLElement
}

export interface StatsBar {
  update(graph: GraphModel): void
  destroy(): void
}

export function createStatsBar({ container }: StatsBarOptions): StatsBar {
  const el = document.createElement('div')
  el.className = 'stats-bar'
  container.appendChild(el)

  function render(graph: GraphModel) {
    const nodes   = graph.nodes?.length ?? 0
    const edges   = graph.edges?.length ?? 0
    const routes  = graph.nodes?.reduce((a: number, n) => a + (n.routes?.length ?? 0), 0) ?? 0
    const schemas = graph.nodes?.reduce((a: number, n) => a + (n.schemas?.length ?? 0), 0) ?? 0
    el.innerHTML = [
      `<span class="stats-item"><b>${nodes}</b> nodes</span>`,
      `<span class="stats-item"><b>${edges}</b> edges</span>`,
      `<span class="stats-item"><b>${routes}</b> routes</span>`,
      `<span class="stats-item"><b>${schemas}</b> schemas</span>`,
    ].join('<span class="stats-divider">·</span>')
  }

  render(graph_empty())

  function graph_empty(): GraphModel {
    return { nodes: [], edges: [], updatedAt: 0 }
  }

  return {
    update(graph) { render(graph) },
    destroy()     { el.remove() },
  }
}
