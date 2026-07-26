import type { FastifyInstance } from 'fastify'
import type { WebSocket, RawData } from '@fastify/websocket'
import type { WsEvent } from '@smart-map/shared'
import { store } from '../store.js'

// Active WebSocket connections
const clients = new Set<WebSocket>()

/**
 * Broadcast a WsEvent to all connected clients.
 * Dead connections are removed automatically.
 */
export function broadcast(event: WsEvent): void {
  const payload = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(payload)
    } else {
      clients.delete(client)
    }
  }
}

/**
 * Register the WebSocket route at /ws.
 * On connect: send graph:full snapshot.
 * Keeps clients in the set; cleans up on close.
 */
export function registerWsHandler(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)

    // Send full graph snapshot on connect
    const current = store.get()
    if (current !== null) {
      const event: WsEvent = { type: 'graph:full', data: current }
      socket.send(JSON.stringify(event))
    }

    // Handle incoming messages (pong, ignored)
    socket.on('message', (raw: RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type?: string }
        if (msg.type === 'pong') return // keepalive response
      } catch {
        // ignore malformed
      }
    })

    socket.on('close', () => {
      clients.delete(socket)
    })

    socket.on('error', () => {
      clients.delete(socket)
    })
  })

  // Ping keepalive every 30 seconds
  setInterval(() => {
    const ping: WsEvent = { type: 'ping' }
    broadcast(ping)
  }, 30_000)
}

export function getClientsCount(): number {
  return clients.size
}
