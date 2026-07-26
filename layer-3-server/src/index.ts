import Fastify from 'fastify'
import FastifyWebSocket from '@fastify/websocket'
import { registerGraphRoutes } from './routes/graph.js'
import { registerWsHandler } from './ws/handler.js'

let _app: ReturnType<typeof Fastify> | null = null

/**
 * startServer — creates and starts the Fastify instance.
 * Can be called by layer-0-cli directly (no HTTP needed for rebuild).
 * Falls back to env PORT/HOST if no args provided.
 */
export async function startServer(
  port: number = Number(process.env['PORT'] ?? 3001),
  host: string = process.env['HOST'] ?? '0.0.0.0',
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

// Re-export store and broadcast so layer-0-cli can import everything from one place
export { store } from './store.js'
export { broadcast } from './ws/handler.js'

// ─── Standalone mode (pnpm dev inside layer-3-server) ──────────────────────

const isMain = process.argv[1]?.endsWith('index.ts')
  || process.argv[1]?.endsWith('index.js')

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
