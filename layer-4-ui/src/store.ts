import type { GraphData, ServiceNode, ServiceEdge } from '../../shared/types'

/**
 * store.ts — реактивное состояние layer-4-ui.
 *
 * Хранит:
 *   - graph: GraphData — текущий граф (узлы + рёбра)
 *   - selectedNodeId: string | null — выбранный узел
 *   - filter: string — строка поиска/фильтрации
 *   - theme: 'dark' | 'light'
 *
 * Используется: AppShell, Sidebar, Canvas, DetailPanel.
 * Не использует localStorage (sandbox-ограничение).
 */

export interface AppState {
  graph: GraphData
  selectedNodeId: string | null
  filter: string
  theme: 'dark' | 'light'
}

export interface Store extends AppState {
  setGraph(data: GraphData): void
  selectNode(id: string | null): void
  setFilter(q: string): void
  setTheme(t: 'dark' | 'light'): void
  getNode(id: string): ServiceNode | undefined
  getEdgesFor(id: string): ServiceEdge[]
  subscribe(cb: (state: AppState) => void): () => void
}

export function initStore(): Store {
  let state: AppState = {
    graph: { nodes: [], edges: [] },
    selectedNodeId: null,
    filter: '',
    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }

  const listeners = new Set<(s: AppState) => void>()

  function notify() {
    listeners.forEach(cb => cb(state))
  }

  return {
    get graph() { return state.graph },
    get selectedNodeId() { return state.selectedNodeId },
    get filter() { return state.filter },
    get theme() { return state.theme },

    setGraph(data) {
      state = { ...state, graph: data }
      notify()
    },
    selectNode(id) {
      state = { ...state, selectedNodeId: id }
      notify()
    },
    setFilter(q) {
      state = { ...state, filter: q }
      notify()
    },
    setTheme(t) {
      state = { ...state, theme: t }
      document.documentElement.setAttribute('data-theme', t)
      notify()
    },
    getNode(id) {
      return state.graph.nodes.find(n => n.id === id)
    },
    getEdgesFor(id) {
      return state.graph.edges.filter(e => e.source === id || e.target === id)
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
  }
}
