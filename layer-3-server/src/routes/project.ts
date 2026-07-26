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
   * FIX: используем reply.hijack() чтобы Fastify не пытался отправить
   * ответ ещё раз после async-хэндлера (исправляет 500 “Reply already sent”).
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

    // Отвечаем немедленно — просим Fastify не добавлять ничего после
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Project-Dir': dir,
    })
    reply.raw.end(JSON.stringify({ ok: true, projectDir: dir }))

    // Скан + watcher полностью асинхронно, после ответа
    setImmediate(() => {
      void (async () => {
        try {
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
