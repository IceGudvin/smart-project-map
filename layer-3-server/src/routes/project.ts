import type { FastifyInstance } from 'fastify'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setProjectDir, runScan } from '../scanner.js'
import { broadcastFull, broadcastPatch } from '../ws/server.js'

interface StartBody {
  projectDir: string
}

export function registerProjectRoutes(app: FastifyInstance): void {
  /**
   * POST /server/start
   * Body: { projectDir: string }
   *
   * Переключает projectDir, сразу отвечает 200, затем запускает скан
   * и рассылает graph:full / graph:patch по WebSocket.
   *
   * FIX: setImmediate-колбэк полностью обёрнут в try/catch,
   *      reply.send вызывается синхронно до любых async-операций —
   *      это исключает случайный 500 от Fastify из-за утечки исключения в stream.
   */
  app.post<{ Body: StartBody }>('/server/start', {
    schema: {
      body: {
        type: 'object',
        required: ['projectDir'],
        properties: {
          projectDir: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const rawDir = req.body.projectDir.trim()
    const dir = resolve(rawDir)

    if (!existsSync(dir)) {
      return reply.status(400).send({
        ok: false,
        error: `Папка не найдена: ${dir}`,
      })
    }

    // Переключаем projectDir
    setProjectDir(dir)
    console.log(`[project] switched to: ${dir}`)

    // Отвечаем немедленно — до любого async-кода
    void reply
      .header('X-Project-Dir', dir)
      .send({ ok: true, projectDir: dir })

    // Сканируем и бродкастим асинхронно, уже после ответа
    setImmediate(() => {
      void (async () => {
        try {
          const { graph, diff } = await runScan()
          if (diff) {
            broadcastPatch(diff)
          } else {
            broadcastFull(graph)
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[project] scan after start failed:', message)
        }
      })()
    })
  })

  /**
   * GET /server/status
   */
  app.get('/server/status', async (_req, reply) => {
    const scannerMod = await import('../scanner.js')
    const graph = scannerMod.getCachedGraph()
    reply.send({
      ok: true,
      projectDir: scannerMod._projectDir || null,
      graph: graph
        ? { nodes: graph.nodes.length, edges: graph.edges.length, updatedAt: graph.updatedAt }
        : null,
    })
  })
}
