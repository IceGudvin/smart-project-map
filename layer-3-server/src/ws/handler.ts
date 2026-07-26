import type { FastifyInstance } from 'fastify'
import type { WsEvent } from '@smart-map/shared'

const clients = new Set<import('@fastify/websocket').WebSocket>()

export function broadcast(event: WsEvent): void {
  const payload = JSON.stringify(event)
  for (const client of clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(payload)
    }
  }
}

export function registerWsHandler(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)
    console.log(`[ws] client connected, total: ${clients.size}`)

    socket.on('close', () => {
      clients.delete(socket)
      console.log(`[ws] client disconnected, total: ${clients.size}`)
    })

    socket.on('error', (err) => {
      console.error('[ws] socket error:', err.message)
      clients.delete(socket)
    })
  })
}
