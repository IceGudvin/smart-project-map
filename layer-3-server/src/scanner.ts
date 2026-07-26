import { parseProject } from '@smart-map/layer-1-parser'
import { buildGraph, buildGraphDiff } from '@smart-map/layer-2-graph'
import type { GraphModel, GraphDiff } from '@smart-map/shared'
import { store } from './store.js'

export let _projectDir = ''

export function setProjectDir(dir: string): void {
  _projectDir = dir
}

/** Совместимость: getCachedGraph берёт данные из store (единый кэш) */
export function getCachedGraph(): GraphModel | null {
  return store.get()
}

/**
 * Run full scan: layer-1-parser → layer-2-graph → store.
 * Сохраняет результат в store — тот же экземпляр, что читает ws/server.ts.
 * Returns the new GraphModel and a diff vs the previous snapshot (null on first scan).
 */
export async function runScan(): Promise<{ graph: GraphModel; diff: GraphDiff | null }> {
  if (!_projectDir) throw new Error('[scanner] projectDir is not set')

  console.log(`[scanner] scanning ${_projectDir}...`)
  const t0 = Date.now()

  const rawOutputs = await parseProject(_projectDir)
  const graph = buildGraph(rawOutputs)

  // Сохраняем в store — store.set() сам считает дифференциал
  const diff: GraphDiff | null = store.set(graph)

  console.log(
    `[scanner] done in ${Date.now() - t0}ms — ` +
    `${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  )

  return { graph, diff }
}
