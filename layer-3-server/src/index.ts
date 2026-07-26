import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'
import fastifyCors from '@fastify/cors'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { setProjectDir, runScan } from './scanner.js'
import { registerWs } from './ws/server.js'
import { registerGraphRoutes } from './routes/graph.js'
import { registerRebuildRoute } from './routes/rebuild.js'
import { registerProjectRoutes } from './routes/project.js'
import { registerFsBrowse } from './routes/fsBrowse.js'
import { startWatcher } from './watcher.js'

function parseArgs(): { projectDir: string | null; port: number; watch: boolean } {
  const args = process.argv.slice(2)
  let projectDir: string | null = null
  let port = 3001
  let watch = true

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--project' || args[i] === '-p') && args[i + 1]) {
      projectDir = resolve(args[i + 1])
      i++
    } else if ((args[i] === '--port') && args[i + 1]) {
      port = Number(args[i + 1]) || 3001
      i++
    } else if (args[i] === '--no-watch') {
      watch = false
    }
  }

  return { projectDir, port, watch }
}

async function main(): Promise<void> {
  const { projectDir: cliProjectDir, port, watch } = parseArgs()

  if (cliProjectDir && !existsSync(cliProjectDir)) {
    console.error(`[server] project directory not found: ${cliProjectDir}`)
    process.exit(1)
  }

  if (cliProjectDir) {
    console.log(`[server] project: ${cliProjectDir}`)
    setProjectDir(cliProjectDir)
  } else {
    console.log('[server] no --project specified — waiting for UI to set project via POST /server/start')
  }

  const app = Fastify({ logger: false })

  await app.register(fastifyCors, {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
  })

  await app.register(fastifyWebsocket)

  registerWs(app)
  registerGraphRoutes(app)
  registerRebuildRoute(app)
  registerProjectRoutes(app)
  registerFsBrowse(app)

  app.get('/health', async () => ({ ok: true, uptime: process.uptime() }))

  await app.listen({ port, host: '127.0.0.1' })
  console.log(`[server] listening on http://localhost:${port}`)

  if (cliProjectDir) {
    console.log('[server] running initial scan...')
    try {
      const { graph } = await runScan()
      console.log(`[server] initial scan complete: ${graph.nodes.length} nodes, ${graph.edges.length} edges`)
      if (watch) startWatcher(cliProjectDir)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[server] initial scan failed (server still running):', message)
    }
  }

  const shutdown = async (): Promise<void> => {
    console.log('[server] shutting down...')
    await app.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[server] fatal error:', err)
  process.exit(1)
})
