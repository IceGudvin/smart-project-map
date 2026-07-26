import type { FastifyInstance } from 'fastify'
import { getCachedGraph, runScan } from '../scanner.js'

export function registerGraphRoutes(app: FastifyInstance): void {
  /**
   * GET /graph
   * Returns the current GraphModel.
   * If the cache is empty (first request before any scan) — runs a scan first.
   * Header X-Updated-At: <unix ms timestamp>
   */
  app.get('/graph', async (_req, reply) => {
    let graph = getCachedGraph()

    if (!graph) {
      const result = await runScan()
      graph = result.graph
    }

    reply
      .header('X-Updated-At', String(graph.updatedAt))
      .header('Cache-Control', 'no-store')
      .send(graph)
  })
}
