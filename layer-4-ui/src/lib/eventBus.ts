/**
 * eventBus.ts — Типизированная шина событий для layer-4-ui.
 */

import type { GraphModel, GraphDiff } from '../../../shared/src/graph.js'

// ----------------------------------------------------------------- edge tooltip payload

export interface EdgeHoverPayload {
  edgeId:       string
  method:       string
  path:         string
  inputSchema:  string
  outputSchema: string
  x:            number
  y:            number
}

export interface EdgeMovePayload {
  x: number
  y: number
}

// ----------------------------------------------------------------- event map

export interface EventMap {
  // ---- Выбор узла
  'node:select':         string
  'node:deselect':       undefined

  // ---- Ребра
  'edge:mouseover':      EdgeHoverPayload
  'edge:mousemove':      EdgeMovePayload
  'edge:mouseout':       undefined

  // ---- DataFlow
  'dataflow:toggle':     boolean
  'dataflow:next':       undefined

  // ---- Граф
  'graph:full':          GraphModel
  'graph:update':        { diff: GraphDiff; changedAt: number }
  'graph:refresh':       undefined
  'graph:error':         string
  'graph:layout':        string

  // ---- Cytoscape
  'cy:ready':            unknown
  'cy:fit':              undefined

  // ---- Canvas
  'canvas:pan-mode':     boolean

  // ---- Zoom
  'zoom:in':             null
  'zoom:out':            null
  'zoom:reset':          null

  // ---- Sidebar
  'sidebar:filter':      Set<string>
  'sidebar:collapsed':   boolean

  // ---- WS
  'ws:connected':        undefined
  'ws:disconnected':     undefined
  'ws:error':            Event | unknown

  // ---- Тема
  'theme:changed':       'dark' | 'light'
}

export type EventKey = keyof EventMap
type Handler<K extends EventKey> = (payload: EventMap[K]) => void

const _listeners: { [K in EventKey]?: Set<Handler<K>> } = {}

export function on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
  if (!_listeners[event]) (_listeners as any)[event] = new Set()
  ;(_listeners[event] as Set<Handler<K>>).add(handler)
  return () => off(event, handler)
}

export function off<K extends EventKey>(event: K, handler: Handler<K>): void {
  ;(_listeners[event] as Set<Handler<K>> | undefined)?.delete(handler)
}

export function once<K extends EventKey>(event: K, handler: Handler<K>): () => void {
  const wrapper: Handler<K> = (payload) => { handler(payload); off(event, wrapper) }
  return on(event, wrapper)
}

export function emit<K extends EventKey>(event: K, payload: EventMap[K]): void {
  const handlers = _listeners[event] as Set<Handler<K>> | undefined
  if (!handlers) return
  for (const handler of handlers) {
    try { handler(payload) } catch (err) { console.error(`[eventBus] '${event}':`, err) }
  }
}

export function clear(event: EventKey): void {
  delete _listeners[event]
}
