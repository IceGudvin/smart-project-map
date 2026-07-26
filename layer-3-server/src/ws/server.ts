import type { FastifyInstance } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import type { GraphModel, GraphDiff } from '@smart-map/shared'
import { store } from '../store.js'

const clients = new Set<WebSocket>()

let _projectDir: string | null = null

export function setProjectDir(dir: string): void {
  _projectDir = dir
}

export function registerWs(app: FastifyInstance): void {
  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket)

    const cached: GraphModel | null = store.get()

    // ── ДИАГНОСТИКА ──────────────────────────────────────────────────
    console.log(`[ws] client connected (total: ${clients.size})`)
    console.log(`[ws] store.get() at connect → ${cached ? `graph OK (nodes: ${cached.nodes.length}, edges: ${cached.edges.length}, updatedAt: ${cached.updatedAt})` : 'NULL'}`)
    console.log(`[ws] _projectDir at connect → ${_projectDir ?? 'null'}`)
    // ─────────────────────────────────────────────────────────────────

    if (cached) {
      console.log('[ws] → sending graph:full to new client')
      socket.send(JSON.stringify({ type: 'graph:full', payload: cached }))
    } else {
      console.log('[ws] → sending server:status { ready: false } (no graph in store)')
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
  console.log(`[ws] broadcastFull called — clients: ${clients.size}, nodes: ${graph.nodes.length}, edges: ${graph.edges.length}`)
  const msg = JSON.stringify({ type: 'graph:full', payload: graph })
  for (const client of clients) {
    try { client.send(msg) } catch { clients.delete(client) }
  }
  console.log(`[ws] broadcast graph:full → ${clients.size} client(s) done`)
}

/** Broadcast graph:patch (incremental diff) to all connected clients */
export function broadcastPatch(diff: GraphDiff): void {
  console.log(`[ws] broadcastPatch called — clients: ${clients.size}`)
  const msg = JSON.stringify({ type: 'graph:patch', payload: diff })
  for (const client of clients) {
    try { client.send(msg) } catch { clients.delete(client) }
  }
  console.log(`[ws] broadcast graph:patch → ${clients.size} client(s) done`)
}
