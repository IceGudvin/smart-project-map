import type { FastifyInstance } from 'fastify'
import { runScan } from '../scanner.js'
import { broadcastFull, broadcastPatch } from '../ws/server.js'

export function registerRebuildRoute(app: FastifyInstance): void {
  /**
   * POST /graph/rebuild
   * Triggers a full re-scan of the project.
   * - If there's a previous snapshot: broadcasts graph:patch diff over WS
   *   and returns { ok: true, updatedAt, stats }
   * - On first scan: broadcasts graph:full
   * Header X-Updated-At is always set.
   */
  app.post('/graph/rebuild', async (_req, reply) => {
    try {
      const { graph, diff } = await runScan()

      if (diff) {
        broadcastPatch(diff)
      } else {
        broadcastFull(graph)
      }

      reply
        .header('X-Updated-At', String(graph.updatedAt))
        .send({
          ok: true,
          updatedAt: graph.updatedAt,
          stats: {
            nodes: graph.nodes.length,
            edges: graph.edges.length,
          },
        })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[rebuild] scan failed:', message)
      reply.status(500).send({ ok: false, error: message })
    }
  })
}
