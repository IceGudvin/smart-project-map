import { parseProject } from '@smart-map/layer-1-parser'
import { buildGraph, buildGraphDiff } from '@smart-map/layer-2-graph'
import type { GraphModel, GraphDiff } from '@smart-map/shared'
import { store } from './store.js'

export let _projectDir = ''

export function setProjectDir(dir: string): void {
  console.log(`[scanner] setProjectDir called: ${dir}`)
  _projectDir = dir
}

export function getCachedGraph(): GraphModel | null {
  return store.get()
}

export async function runScan(): Promise<{ graph: GraphModel; diff: GraphDiff | null }> {
  if (!_projectDir) throw new Error('[scanner] projectDir is not set')

  console.log(`[scanner] runScan START → ${_projectDir}`)
  const t0 = Date.now()

  console.log('[scanner] calling parseProject...')
  const rawOutputs = await parseProject(_projectDir)
  console.log(`[scanner] parseProject done — ${rawOutputs.length} file(s)`)

  console.log('[scanner] calling buildGraph...')
  const graph = buildGraph(rawOutputs)
  console.log(`[scanner] buildGraph done — nodes: ${graph.nodes.length}, edges: ${graph.edges.length}`)

  console.log('[scanner] calling store.set(graph)...')
  const prevSize = store.get()?.nodes.length ?? 0
  const diff: GraphDiff | null = store.set(graph)
  console.log(
    `[scanner] store.set done — prev nodes: ${prevSize} → new nodes: ${graph.nodes.length}, ` +
    (diff
      ? `diff: patch (added: ${diff.addedNodes.length}, removed: ${diff.removedNodeIds.length}, updated: ${diff.updatedNodes.length})`
      : 'diff: null (first scan)')
  )

  console.log(
    `[scanner] runScan DONE in ${Date.now() - t0}ms — ` +
    `${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  )

  return { graph, diff }
}
