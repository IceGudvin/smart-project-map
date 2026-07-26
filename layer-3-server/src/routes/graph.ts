import type { FastifyInstance } from 'fastify'
import type { WsEvent } from '@smart-map/shared'
import { store } from '../store.js'
import { broadcast } from '../ws/handler.js'

export function registerGraphRoutes(app: FastifyInstance): void {
  /**
   * GET /graph
   * Returns the current GraphModel as JSON.
   * 503 if the graph hasn't been built yet.
   */
  app.get('/graph', async (_req, reply) => {
    const model = store.get()
    if (model === null) {
      return reply.code(503).send({ error: 'Graph not ready. Call POST /graph/rebuild first.' })
    }
    return reply.send(model)
  })

  /**
   * POST /graph/rebuild
   * Body: { projectPath: string }
   * Rebuilds the graph from scratch and broadcasts the diff via WebSocket.
   */
  app.post<{ Body: { projectPath: string } }>('/graph/rebuild', async (req, reply) => {
    const { projectPath } = req.body

    if (!projectPath || typeof projectPath !== 'string') {
      return reply.code(400).send({ error: 'projectPath is required' })
    }

    try {
      const diff = await store.rebuild(projectPath)
      const model = store.get()!

      // Broadcast to WebSocket clients
      if (diff === null) {
        // First build — send full graph
        const event: WsEvent = { type: 'graph:full', data: model }
        broadcast(event)
      } else {
        // Incremental update
        const event: WsEvent = { type: 'graph:update', diff, changedAt: Date.now() }
        broadcast(event)
      }

      return reply.send({
        ok: true,
        nodesCount: model.nodes.length,
        edgesCount: model.edges.length,
        updatedAt: model.updatedAt,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Broadcast error to WS clients
      const event: WsEvent = { type: 'graph:error', message }
      broadcast(event)

      return reply.code(500).send({ error: message })
    }
  })

  /**
   * GET /health
   * Healthcheck endpoint.
   */
  app.get('/health', async (_req, reply) => {
    const model = store.get()
    return reply.send({
      status: 'ok',
      nodesCount: model?.nodes.length ?? 0,
      edgesCount: model?.edges.length ?? 0,
    })
  })
}
