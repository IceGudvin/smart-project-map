/**
 * wsClient.ts — WebSocket-клиент для layer-3-server.
 *
 * Протокол сообщений (входящие):
 *   { type: 'graph:full',  payload: GraphModel }  — полный снимок
 *   { type: 'graph:patch', payload: GraphDiff  }  — инкрементальный дифф
 *
 * Логика переподключения:
 *   - 3 попытки с backoff 1s / 2s / 4s
 *   - После 3 неудач — emit('ws:status', 'disconnected')
 *
 * Фоллбэк:
 *   - Если graph:full не пришёл за 2с после open — emit('graph:refresh')
 *     → AppShell делает GET /graph
 *
 * Показ ProjectPicker:
 *   - Если ws не смог подключиться ни разу (первый connect упал) — emit('project:pick:show')
 */

import { emit } from './eventBus.js'
import { store } from '../store.js'

const WS_URL = `ws://${location.host}/ws`
const FALLBACK_TIMEOUT_MS = 2000
const RECONNECT_DELAYS = [1000, 2000, 4000]

let _ws: WebSocket | null = null
let _reconnectAttempt = 0
let _fallbackTimer: ReturnType<typeof setTimeout> | null = null
let _graphReceived = false
let _everConnected = false
let _stopped = false

export function connectWs(): void {
  _stopped = false
  _connect()
}

export function disconnectWs(): void {
  _stopped = true
  _clearFallback()
  if (_ws) {
    _ws.onclose = null
    _ws.close()
    _ws = null
  }
  emit('ws:status', 'disconnected')
}

function _connect(): void {
  if (_stopped) return

  emit('ws:status', 'connecting')

  _ws = new WebSocket(WS_URL)

  _ws.onopen = () => {
    _reconnectAttempt = 0
    _everConnected = true
    emit('ws:status', 'connected')
    _graphReceived = false

    // Фоллбэк: если graph:full не пришёл за 2с — HTTP GET /graph
    _fallbackTimer = setTimeout(() => {
      if (!_graphReceived) {
        console.warn('[wsClient] graph:full not received in 2s — falling back to GET /graph')
        emit('graph:refresh', undefined)
      }
    }, FALLBACK_TIMEOUT_MS)
  }

  _ws.onmessage = (event) => {
    let msg: { type: string; payload: unknown }
    try {
      msg = JSON.parse(event.data as string)
    } catch {
      console.warn('[wsClient] invalid JSON:', event.data)
      return
    }

    if (msg.type === 'graph:full') {
      _clearFallback()
      _graphReceived = true
      store.setGraph(msg.payload as Parameters<typeof store.setGraph>[0])
      emit('graph:full', store.graph)
      return
    }

    if (msg.type === 'graph:patch') {
      store.applyDiff(msg.payload as Parameters<typeof store.applyDiff>[0])
      emit('graph:update', store.graph)
      return
    }

    console.debug('[wsClient] unknown message type:', msg.type)
  }

  _ws.onclose = () => {
    _clearFallback()
    emit('ws:status', 'disconnected')

    if (_stopped) return

    // Первый раз не смогли подключиться — показываем ProjectPicker
    if (!_everConnected && _reconnectAttempt === 0) {
      emit('project:pick:show', undefined)
    }

    const delay = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    _reconnectAttempt++
    console.log(`[wsClient] reconnecting in ${delay}ms (attempt ${_reconnectAttempt})...`)
    setTimeout(_connect, delay)
  }

  _ws.onerror = () => {
    // onclose будет вызван следом — там обрабатываем
  }
}

function _clearFallback(): void {
  if (_fallbackTimer) {
    clearTimeout(_fallbackTimer)
    _fallbackTimer = null
  }
}
