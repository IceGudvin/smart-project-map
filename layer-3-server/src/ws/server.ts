import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { GraphModel, GraphDiff } from '@smart-map/shared'

const clients = new Set<WebSocket>()

export function registerWs(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)
    console.log(`[ws] client connected (total: ${clients.size})`)

    // On connect — send current graph if available
    const { getCachedGraph } = require('../scanner.js')
    const cached: GraphModel | null = getCachedGraph()
    if (cached) {
      socket.send(JSON.stringify({ type: 'graph:full', payload: cached }))
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
