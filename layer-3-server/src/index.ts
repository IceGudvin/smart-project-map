import Fastify from 'fastify'
import FastifyWebSocket from '@fastify/websocket'
import { registerGraphRoutes } from './routes/graph.js'
import { registerWsHandler } from './ws/handler.js'
import { pathToFileURL } from 'node:url'

let _app: ReturnType<typeof Fastify> | null = null

/**
 * startServer — creates and starts the Fastify instance.
 * Called by layer-0-cli directly, or in standalone mode via pnpm dev.
 */
export async function startServer(
  port: number = Number(process.env['PORT'] ?? 3001),
  host: string = process.env['HOST'] ?? '127.0.0.1',
): Promise<void> {
  const app = Fastify({ logger: true })
  _app = app

  await app.register(FastifyWebSocket)
  registerGraphRoutes(app)
  registerWsHandler(app)

  await app.listen({ port, host })
  console.log(`\n🗺  smart-project-map server running at http://localhost:${port}`)
  console.log(`   REST: GET  http://localhost:${port}/graph`)
  console.log(`   REST: POST http://localhost:${port}/graph/rebuild`)
  console.log(`   WS:   ws://localhost:${port}/ws`)
}

export { store } from './store.js'
export { broadcast } from './ws/handler.js'

// ─── Standalone mode: only when this file is the entry point ───────────────
// ESM-safe check: compare import.meta.url with argv[1] as file URL
const entryUrl = pathToFileURL(process.argv[1] ?? '').href
const isMain = import.meta.url === entryUrl
  || import.meta.url.replace(/\.js$/, '.ts') === entryUrl
  || entryUrl.endsWith('layer-3-server/src/index.ts')
  || entryUrl.endsWith('layer-3-server/dist/index.js')

if (isMain) {
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down...')
    await _app?.close()
    process.exit(0)
  }
  process.on('SIGINT', () => { void shutdown() })
  process.on('SIGTERM', () => { void shutdown() })

  void startServer()
}
