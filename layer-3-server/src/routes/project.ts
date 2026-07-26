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
   * Позволяет UI передать путь к проекту в рантайме.
   * Сервер переключает projectDir, запускает сканирование
   * и рассылает graph:full по WebSocket.
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

    // Переключаем projectDir в scanner
    setProjectDir(dir)
    console.log(`[project] switched to: ${dir}`)

    // Запускаем сканирование асинхронно — не блокируем ответ
    reply
      .header('X-Project-Dir', dir)
      .send({ ok: true, projectDir: dir })

    // После ответа — сканируем и бродкастим
    setImmediate(async () => {
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
    })
  })

  /**
   * GET /server/status
   * Возвращает текущий projectDir и статистику последнего скана.
   */
  app.get('/server/status', async (_req, reply) => {
    const { getCachedGraph } = await import('../scanner.js')
    const graph = getCachedGraph()
    reply.send({
      ok: true,
      projectDir: (await import('../scanner.js') as { _projectDir?: string })._projectDir ?? null,
      graph: graph
        ? { nodes: graph.nodes.length, edges: graph.edges.length, updatedAt: graph.updatedAt }
        : null,
    })
  })
}
