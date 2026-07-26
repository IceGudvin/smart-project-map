import { parseProject } from '@smart-map/layer-1-parser'
import { buildGraph, buildGraphDiff } from '@smart-map/layer-2-graph'
import type { GraphModel, GraphDiff } from '@smart-map/shared'

let _cache: GraphModel | null = null
let _projectDir = ''

export function setProjectDir(dir: string): void {
  _projectDir = dir
}

export function getCachedGraph(): GraphModel | null {
  return _cache
}

/**
 * Run full scan: layer-1-parser → layer-2-graph.
 * Returns the new GraphModel (always) and a diff vs the previous snapshot
 * (null on first scan).
 */
export async function runScan(): Promise<{ graph: GraphModel; diff: GraphDiff | null }> {
  if (!_projectDir) throw new Error('[scanner] projectDir is not set')

  console.log(`[scanner] scanning ${_projectDir}...`)
  const t0 = Date.now()

  const rawOutputs = await parseProject(_projectDir)
  const graph = buildGraph(rawOutputs)

  const diff: GraphDiff | null = _cache ? buildGraphDiff(_cache, graph) : null
  _cache = graph

  console.log(
    `[scanner] done in ${Date.now() - t0}ms — ` +
    `${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  )

  return { graph, diff }
}
