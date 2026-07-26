/**
 * wsClient.ts — WebSocket-клиент для layer-4-ui.
 *
 * Подключается к ws://localhost:3001/ws (layer-3-server).
 *
 * Обработка входящих сообщений (протокол WsEvent из shared/src/events.ts):
 *   graph:full   — полный снимок графа при подключении
 *   graph:update — инкрементальный diff при изменении файла
 *   graph:error  — ошибка парсинга/билда
 *   ping         — кипалив (отвечаем pong)
 *
 * Реконнект: экспоненциальный backoff, макс. 10 попыток, jitter.
 * Фоллбэк: если graph:full не пришёл за 2с — запрос GET /graph через eventBus.
 */

import type { WsEvent as SharedWsEvent } from '../../../shared/src/events.js'
import { emit } from './eventBus.js'
import { store } from '../store.js'

// ----------------------------------------------------------------- config

const WS_URL          = 'ws://localhost:3001/ws'
const MAX_RETRIES     = 10
const BASE_DELAY_MS   = 1000
const MAX_DELAY_MS    = 30_000
/** Таймаут: если graph:full не пришёл за X мс после open — фоллбэк HTTP */
const FULL_TIMEOUT_MS = 2_000

// ----------------------------------------------------------------- state

let ws:             WebSocket | null  = null
let retryCount:     number            = 0
let retryTimer:     ReturnType<typeof setTimeout> | null = null
let fullTimer:      ReturnType<typeof setTimeout> | null = null
let destroyed:      boolean           = false

// ----------------------------------------------------------------- public API

/** Запустить подключение. Вызывается из AppShell при mount. */
export function connectWs(): void {
  destroyed   = false
  retryCount  = 0
  doConnect()
}

/** Навсегда закрыть соединение (без реконнекта). */
export function disconnectWs(): void {
  destroyed = true
  clearTimers()
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  store.setWsStatus('disconnected')
  emit('ws:disconnected', undefined)
}

/** true если WS в состоянии OPEN. */
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN
}

// ----------------------------------------------------------------- internals

function doConnect(): void {
  if (destroyed) return

  store.setWsStatus('connecting')
  ws = new WebSocket(WS_URL)

  ws.onopen = handleOpen
  ws.onmessage = handleMessage
  ws.onerror = handleError
  ws.onclose = handleClose
}

function handleOpen(): void {
  retryCount = 0
  store.setWsStatus('connected')
  emit('ws:connected', undefined)

  // Фоллбэк: если graph:full не пришёл за FULL_TIMEOUT_MS — сигнализируем graph:refresh
  fullTimer = setTimeout(() => {
    if (isConnected() && store.graph.nodes.length === 0) {
      console.warn('[wsClient] graph:full not received, triggering HTTP fallback')
      emit('graph:refresh', undefined)
    }
  }, FULL_TIMEOUT_MS)
}

function handleMessage(event: MessageEvent): void {
  let msg: SharedWsEvent
  try {
    msg = JSON.parse(event.data as string) as SharedWsEvent
  } catch {
    console.warn('[wsClient] Failed to parse WS message')
    return
  }

  switch (msg.type) {
    case 'graph:full':
      if (fullTimer) { clearTimeout(fullTimer); fullTimer = null }
      store.setGraph(msg.data)
      emit('graph:full', msg.data)
      break

    case 'graph:update':
      store.applyDiff(msg.diff)
      emit('graph:update', { diff: msg.diff, changedAt: msg.changedAt })
      break

    case 'graph:error':
      console.warn('[wsClient] Server error:', msg.message, msg.filePath ?? '')
      store.setWsStatus('error')
      emit('graph:error', msg.message)
      break

    case 'ping':
      // Отвечаем pong если канал ещё открыт
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'pong' }))
      }
      break

    default:
      console.warn('[wsClient] Unknown message type:', (msg as any).type)
  }
}

function handleError(err: Event): void {
  console.warn('[wsClient] WebSocket error:', err)
  store.setWsStatus('error')
  emit('ws:error', err)
}

function handleClose(): void {
  ws = null
  if (!destroyed) {
    store.setWsStatus('disconnected')
    emit('ws:disconnected', undefined)
    scheduleReconnect()
  }
}

function scheduleReconnect(): void {
  if (destroyed || retryCount >= MAX_RETRIES) {
    if (retryCount >= MAX_RETRIES) {
      console.warn('[wsClient] Max retries reached. Manual reconnect required.')
    }
    return
  }

  // Экспоненциальный backoff с jitter: delay = min(base * 2^n, max) + rand(0..500)
  const exp   = BASE_DELAY_MS * Math.pow(2, retryCount)
  const delay = Math.min(exp, MAX_DELAY_MS) + Math.random() * 500
  retryCount++

  console.info(`[wsClient] Reconnecting in ${Math.round(delay)}ms (attempt ${retryCount}/${MAX_RETRIES})`)
  store.setWsStatus('connecting')

  retryTimer = setTimeout(() => {
    retryTimer = null
    doConnect()
  }, delay)
}

function clearTimers(): void {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  if (fullTimer)  { clearTimeout(fullTimer);  fullTimer  = null }
}
