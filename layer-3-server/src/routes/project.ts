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
  /**
   * POST /server/start
   * Body: { projectDir: string }
   *
   * Переключает projectDir, отвечает 200 сразу,
   * затем запускает скан + watcher в фоне.
   *
   * ВАЖНО: reply.hijack() + async handler = setImmediate никогда не выполняется
   * (Fastify бросает исключение внутри async-хэндлера после hijack, оно глотается).
   * Решение: планируем setImmediate ДО return reply.send() — тогда callback
   * уже зарегистрирован в event loop и выполнится после ответа.
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

    // Регистрируем скан в event loop ДО того как Fastify отправит ответ.
    // Это гарантирует что setImmediate callback выполнится после I/O ответа.
    setImmediate(() => {
      void (async () => {
        try {
          console.log('[project] setImmediate fired — starting scan...')
          stopWatcher()
          const { graph, diff } = await runScan()
          if (diff) {
            broadcastPatch(diff)
          } else {
            broadcastFull(graph)
          }
          startWatcher(dir)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[project] scan after start failed:', message)
        }
      })()
    })

    // Отвечаем после регистрации setImmediate — Fastify сам управляет ответом
    return reply
      .header('Content-Type', 'application/json')
      .header('X-Project-Dir', dir)
      .send({ ok: true, projectDir: dir })
  })

  /**
   * GET /server/status
   */
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
