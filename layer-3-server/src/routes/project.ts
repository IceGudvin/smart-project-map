import type { FastifyInstance } from 'fastify'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setProjectDir, runScan, _projectDir, getCachedGraph } from '../scanner.js'
import { broadcastFull, broadcastPatch } from '../ws/server.js'
import { startWatcher, stopWatcher } from '../watcher.js'

interface StartBody {
  projectDir: string
}

export function registerProjectRoutes(app: FastifyInstance): void {
  app.post<{ Body: StartBody }>('/server/start', {
    schema: {
      body: {
        type: 'object',
        required: ['projectDir'],
        additionalProperties: true,
        properties: {
          projectDir: { type: 'string', minLength: 1 },
        },
      },
      // FIX: явно описываем response чтобы Fastify не падал на сериализации
      response: {
        200: {
          type: 'object',
          properties: {
            ok:         { type: 'boolean' },
            projectDir: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            ok:    { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    try {
      const rawDir = req.body.projectDir.trim()
      const dir = resolve(rawDir)

      if (!existsSync(dir)) {
        return reply.status(400).send({ ok: false, error: `Папка не найдена: ${dir}` })
      }

      setProjectDir(dir)
      console.log(`[project] switched to: ${dir}`)

      // Планируем скан в event loop ДО отправки ответа
      setImmediate(() => {
        void (async () => {
          try {
            stopWatcher()
            const { graph, diff } = await runScan()
            if (diff) broadcastPatch(diff)
            else      broadcastFull(graph)
            startWatcher(dir)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            console.error('[project] scan failed:', message)
          }
        })()
      })

      // FIX: убираем ручной Content-Type — Fastify выставляет его сам при .send(object)
      // Двойной .header('Content-Type') вызывал FST_ERR_REP_ALREADY_SENT → 500
      return reply.send({ ok: true, projectDir: dir })

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[project] /server/start handler error:', message)
      return reply.status(500).send({ ok: false, error: message })
    }
  })

  app.get('/server/status', async (_req, reply) => {
    const graph = getCachedGraph()
    return reply.send({
      ok: true,
      projectDir: _projectDir || null,
      graph: graph
        ? { nodes: graph.nodes.length, edges: graph.edges.length, updatedAt: graph.updatedAt }
        : null,
    })
  })
}
