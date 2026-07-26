import type { GraphModel, GraphDiff } from '@smart-map/shared'
import { buildGraph, buildGraphDiff } from '@smart-map/layer-2-graph'
import { parseProject } from '@smart-map/layer-1-parser'

/**
 * GraphStore — singleton that holds the current GraphModel in memory.
 * All mutations go through set() which returns a diff for broadcasting.
 */
class GraphStore {
  private current: GraphModel | null = null

  get(): GraphModel | null {
    return this.current
  }

  /**
   * Replace the stored model.
   * Returns GraphDiff if a previous model existed, null otherwise (first load).
   */
  set(next: GraphModel): GraphDiff | null {
    const prev = this.current
    this.current = next
    if (prev === null) return null
    return buildGraphDiff(prev, next)
  }

  /**
   * Run Layer 1 (parser) + Layer 2 (graph builder) for the given project path.
   * Updates the store and returns the diff (null on first build).
   */
  async rebuild(projectPath: string): Promise<GraphDiff | null> {
    const outputs = await parseProject(projectPath)
    const next = buildGraph(outputs)
    return this.set(next)
  }
}

// Singleton export
export const store = new GraphStore()
