import type { RawParserOutput } from '@smart-map/shared'
import type { GraphModel, GraphDiff, ServiceNode, Edge } from '@smart-map/shared'
import { buildServiceNode, deriveServiceId } from './resolver.js'
import { detectInfraNodes } from './infrastructure.js'
import { buildHttpEdges, buildRedisEdges } from './edges.js'

/**
 * Main entry point for Layer 2.
 * Accepts an array of RawParserOutput (one per scanned service)
 * and returns a fully resolved GraphModel.
 */
export function buildGraph(outputs: RawParserOutput[]): GraphModel {
  // 1. Build service nodes
  const serviceNodes: ServiceNode[] = outputs.map(buildServiceNode)

  // 2. Detect and add infrastructure nodes
  const infraNodes = detectInfraNodes(outputs.map((o) => o.envConfig))
  const allNodes: ServiceNode[] = [...serviceNodes, ...infraNodes]

  // 3. Add external pseudo-node if any HTTP call goes outside known services
  const httpEdges = buildHttpEdges(outputs, allNodes)
  const needsExternal = httpEdges.some((e) => e.to === 'external')
  if (needsExternal && !allNodes.some((n) => n.id === 'external')) {
    allNodes.push({
      id: 'external',
      name: 'External',
      path: '',
      language: 'unknown',
      framework: 'unknown',
      nodeType: 'external',
      routes: [],
      dependencies: [],
      schemas: [],
    })
  }

  // 4. Build Redis edges (now that infra nodes including redis are known)
  const redisEdges = buildRedisEdges(outputs, allNodes)

  // 5. Populate dependencies on service nodes
  const allEdges: Edge[] = [...httpEdges, ...redisEdges]
  for (const node of serviceNodes) {
    const deps = allEdges
      .filter((e) => e.from === node.id)
      .map((e) => e.to)
      .filter((id, i, arr) => arr.indexOf(id) === i && id !== node.id)
    node.dependencies = deps
  }

  return {
    nodes: allNodes,
    edges: allEdges,
    updatedAt: Date.now(),
  }
}

/**
 * Computes an incremental diff between two GraphModel snapshots.
 * Used by Layer 3 WebSocket to send minimal updates to the UI.
 */
export function buildGraphDiff(prev: GraphModel, next: GraphModel): GraphDiff {
  const prevNodeIds = new Set(prev.nodes.map((n) => n.id))
  const nextNodeIds = new Set(next.nodes.map((n) => n.id))

  const addedNodes = next.nodes.filter((n) => !prevNodeIds.has(n.id))
  const removedNodeIds = prev.nodes.filter((n) => !nextNodeIds.has(n.id)).map((n) => n.id)
  const updatedNodes = next.nodes.filter((n) => {
    if (!prevNodeIds.has(n.id)) return false
    const prevNode = prev.nodes.find((p) => p.id === n.id)!
    return JSON.stringify(prevNode) !== JSON.stringify(n)
  })

  const edgeKey = (e: Edge) => `${e.from}->${e.to}:${e.method}:${e.path}`
  const prevEdgeKeys = new Set(prev.edges.map(edgeKey))
  const nextEdgeKeys = new Set(next.edges.map(edgeKey))

  const addedEdges = next.edges.filter((e) => !prevEdgeKeys.has(edgeKey(e)))
  const removedEdgeIds = prev.edges
    .filter((e) => !nextEdgeKeys.has(edgeKey(e)))
    .map(edgeKey)

  return {
    addedNodes,
    removedNodeIds,
    updatedNodes,
    addedEdges,
    removedEdgeIds,
  }
}

export type { GraphModel, GraphDiff, ServiceNode, Edge } from '@smart-map/shared'
