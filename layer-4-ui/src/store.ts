/**
 * store.ts — Реактивное состояние layer-4-ui.
 */

import type { GraphModel, ServiceNode, Edge, GraphDiff } from '@smart-map/shared'

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
export type DataflowPathIndex = 0 | 1 | 2

export const DATAFLOW_PATHS: Record<DataflowPathIndex, string> = {
  0: 'Login Flow',
  1: 'File Upload',
  2: 'Auth Check',
}

export interface AppState {
  graph:               GraphModel
  selectedNodeId:      string | null
  dataflowMode:        boolean
  activeDataflowPath:  DataflowPathIndex
  wsStatus:            WsStatus
  filter:              string
  theme:               'dark' | 'light'
}

export interface Store extends AppState {
  setGraph(data: GraphModel): void
  applyDiff(diff: GraphDiff): void
  selectNode(id: string | null): void
  setDataflowMode(enabled: boolean): void
  setActiveDataflowPath(index: DataflowPathIndex): void
  nextDataflowPath(): void
  setWsStatus(status: WsStatus): void
  setFilter(q: string): void
  setTheme(t: 'dark' | 'light'): void
  getNode(id: string): ServiceNode | undefined
  getEdgesFor(nodeId: string): Edge[]
  getActivePathName(): string
  subscribe(cb: (state: AppState) => void): () => void
}

export function initStore(): Store {
  let state: AppState = {
    graph:               { nodes: [], edges: [], updatedAt: 0 },
    selectedNodeId:      null,
    dataflowMode:        false,
    activeDataflowPath:  0,
    wsStatus:            'disconnected',
    filter:              '',
    theme:               window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }

  const listeners = new Set<(s: AppState) => void>()
  function notify() { for (const cb of listeners) cb(state) }
  function patch(partial: Partial<AppState>) { state = { ...state, ...partial }; notify() }

  return {
    get graph()              { return state.graph },
    get selectedNodeId()     { return state.selectedNodeId },
    get dataflowMode()       { return state.dataflowMode },
    get activeDataflowPath() { return state.activeDataflowPath },
    get wsStatus()           { return state.wsStatus },
    get filter()             { return state.filter },
    get theme()              { return state.theme },

    setGraph(data) { patch({ graph: data }) },

    applyDiff(diff) {
      const { addedNodes, removedNodeIds, updatedNodes, addedEdges, removedEdgeIds } = diff
      const edgeId = (e: Edge) => `${e.from}->${e.to}->${e.method}-${e.path}`

      let nodes: ServiceNode[] = state.graph.nodes
        .filter((n: ServiceNode) => !removedNodeIds.includes(n.id))
        .map((n: ServiceNode) => {
          const upd = updatedNodes.find((u: ServiceNode) => u.id === n.id)
          return upd ?? n
        })
      nodes = nodes.concat(addedNodes)

      let edges: Edge[] = state.graph.edges.filter((e: Edge) => !removedEdgeIds.includes(edgeId(e)))
      edges = edges.concat(addedEdges)

      patch({
        graph: { nodes, edges, updatedAt: Date.now() },
        selectedNodeId: state.selectedNodeId && removedNodeIds.includes(state.selectedNodeId)
          ? null
          : state.selectedNodeId,
      })
    },

    selectNode(id)            { patch({ selectedNodeId: id }) },
    setDataflowMode(enabled)  { patch({ dataflowMode: enabled }) },
    setActiveDataflowPath(i)  { patch({ activeDataflowPath: i }) },
    nextDataflowPath()        { patch({ activeDataflowPath: ((state.activeDataflowPath + 1) % 3) as DataflowPathIndex }) },
    setWsStatus(status)       { patch({ wsStatus: status }) },
    setFilter(q)              { patch({ filter: q }) },
    setTheme(t)               { document.documentElement.setAttribute('data-theme', t); patch({ theme: t }) },

    getNode(id)     { return state.graph.nodes.find((n: ServiceNode) => n.id === id) },
    getEdgesFor(nodeId) { return state.graph.edges.filter((e: Edge) => e.from === nodeId || e.to === nodeId) },
    getActivePathName() { return DATAFLOW_PATHS[state.activeDataflowPath] },

    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) },
  }
}

export const store = initStore()
