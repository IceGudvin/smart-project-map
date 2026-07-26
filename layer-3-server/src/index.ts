import Fastify from 'fastify'
import FastifyWebSocket from '@fastify/websocket'
import { registerGraphRoutes } from './routes/graph.js'
import { registerWsHandler } from './ws/handler.js'

const PORT = Number(process.env['PORT'] ?? 3001)
const HOST = process.env['HOST'] ?? '0.0.0.0'

async function start(): Promise<void> {
  const app = Fastify({ logger: true })

  // Register WebSocket support
  await app.register(FastifyWebSocket)

  // Register routes
  registerGraphRoutes(app)
  registerWsHandler(app)

  // Start server
  await app.listen({ port: PORT, host: HOST })
  console.log(`\n🗺  smart-project-map server running at http://localhost:${PORT}`)
  console.log(`   REST: GET  http://localhost:${PORT}/graph`)
  console.log(`   REST: POST http://localhost:${PORT}/graph/rebuild`)
  console.log(`   WS:   ws://localhost:${PORT}/ws`)

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('\nShutting down...')
    await app.close()
    process.exit(0)
  }

  process.on('SIGINT', () => { void shutdown() })
  process.on('SIGTERM', () => { void shutdown() })
}

void start()
