import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { GraphModel, GraphDiff } from '@smart-map/shared'
import { store } from '../store.js'

const clients = new Set<WebSocket>()

/**
 * projectDir — текущий путь к проекту.
 * Устанавливается из routes/server.ts после POST /server/start.
 */
let _projectDir: string | null = null

export function setProjectDir(dir: string): void {
  _projectDir = dir
}

export function registerWs(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)
    console.log(`[ws] client connected (total: ${clients.size})`)

    const cached: GraphModel | null = store.get()

    if (cached) {
      // Проект уже просканирован — отправляем граф
      socket.send(JSON.stringify({ type: 'graph:full', payload: cached }))
    } else {
      // Проекта нет — сообщаем UI чтобы показал ProjectPicker
      socket.send(JSON.stringify({
        type:    'server:status',
        payload: { ready: false, projectDir: null },
      }))
    }

    socket.on('close', () => {
      clients.delete(socket)
      console.log(`[ws] client disconnected (total: ${clients.size})`)
    })

    socket.on('error', (err) => {
      console.warn('[ws] socket error:', err.message)
      clients.delete(socket)
    })
  })
}

/** Broadcast graph:full to all connected clients */
export function broadcastFull(graph: GraphModel): void {
  const msg = JSON.stringify({ type: 'graph:full', payload: graph })
  for (const client of clients) {
    try { client.send(msg) } catch { clients.delete(client) }
  }
  console.log(`[ws] broadcast graph:full → ${clients.size} client(s)`)
}

/** Broadcast graph:patch (incremental diff) to all connected clients */
export function broadcastPatch(diff: GraphDiff): void {
  const msg = JSON.stringify({ type: 'graph:patch', payload: diff })
  for (const client of clients) {
    try { client.send(msg) } catch { clients.delete(client) }
  }
  console.log(`[ws] broadcast graph:patch → ${clients.size} client(s)`)
}
