/**
 * wsClient.ts — WebSocket-клиент для layer-3-server.
 *
 * Протокол сообщений (входящие):
 *   { type: 'graph:full',     payload: GraphModel }   — полный снимок
 *   { type: 'graph:patch',    payload: GraphDiff  }   — инкрементальный дифф
 *   { type: 'server:status',  payload: { ready: boolean; projectDir?: string } }
 *                                                     — статус сервера при подключении
 *
 * Логика переподключения:
 *   - Бесконечные попытки с backoff 1s / 2s / 4s (после 3-й попытки — фиксированно 4s)
 *   - emit('ws:status', 'disconnected') при обрыве
 *
 * Фоллбэк:
 *   - Если graph:full не пришёл за 2с после open — emit('graph:refresh')
 *     → AppShell делает GET /graph
 *
 * Показ ProjectPicker:
 *   - Если WS не смог подключиться вообще (сервер не запущен) — emit('project:pick:show')
 *   - Если WS подключился, но сервер ответил server:status { ready: false }
 *     (проект не задан) — тоже emit('project:pick:show')
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

// Флаг: пикер уже был показан в этой сессии страницы
// Сбрасывается при смене проекта (project:changed)
let _pickerShown = false

export function connectWs(): void {
  _stopped = false
  _pickerShown = false
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

/** Вызывается из AppShell/ProjectPicker после успешного POST /server/start */
export function resetPickerShown(): void {
  _pickerShown = false
}

function _showPickerOnce(): void {
  if (_pickerShown) return
  _pickerShown = true
  emit('project:pick:show', undefined)
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

    // Сервер сообщает что проект не задан — показываем ProjectPicker
    if (msg.type === 'server:status') {
      const status = msg.payload as { ready: boolean; projectDir?: string }
      if (!status.ready) {
        _clearFallback()
        _graphReceived = true // не ждём graph:full — он не придёт
        _showPickerOnce()
      }
      return
    }

    console.debug('[wsClient] unknown message type:', msg.type)
  }

  _ws.onclose = () => {
    _clearFallback()
    emit('ws:status', 'disconnected')

    if (_stopped) return

    // Если ни разу не подключались — сервер не запущен, показываем пикер
    if (!_everConnected) {
      _showPickerOnce()
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
