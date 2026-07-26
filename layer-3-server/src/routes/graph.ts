import type { FastifyInstance } from 'fastify'
import type { WsEvent } from '@smart-map/shared'
import { store } from '../store.js'
import { broadcast } from '../ws/handler.js'

export function registerGraphRoutes(app: FastifyInstance): void {
  app.get('/graph', async (_req, reply) => {
    const model = store.get()
    if (model === null) {
      return reply.code(503).send({ error: 'Graph not ready. Call POST /graph/rebuild first.' })
    }
    return reply.send(model)
  })

  app.post<{ Body: { projectPath?: string; projectPaths?: string[] } }>(
    '/graph/rebuild',
    async (req, reply) => {
      const { projectPath, projectPaths } = req.body

      const paths: string[] = []
      if (projectPaths && projectPaths.length > 0) {
        paths.push(...projectPaths)
      } else if (projectPath) {
        paths.push(projectPath)
      }

      if (paths.length === 0) {
        return reply.code(400).send({ error: 'projectPath or projectPaths is required' })
      }

      // Debug: print received paths and hex of first path
      console.log('[rebuild] received paths:', JSON.stringify(paths))
      if (paths[0]) {
        const hex = Buffer.from(paths[0], 'utf8').toString('hex')
        console.log('[rebuild] path[0] hex:', hex)
      }

      try {
        const diff = await store.rebuild(paths)
        const model = store.get()!

        if (diff === null) {
          const event: WsEvent = { type: 'graph:full', data: model }
          broadcast(event)
        } else {
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
        const event: WsEvent = { type: 'graph:error', message }
        broadcast(event)
        return reply.code(500).send({ error: message })
      }
    },
  )

  app.get('/health', async (_req, reply) => {
    const model = store.get()
    return reply.send({
      status: 'ok',
      nodesCount: model?.nodes.length ?? 0,
      edgesCount: model?.edges.length ?? 0,
    })
  })
}
