/**
 * wsClient.ts — WebSocket-клиент для layer-3-server.
 *
 * Протокол сообщений (входящие):
 *   { type: 'graph:full',     payload: GraphModel }   — полный снимок
 *   { type: 'graph:patch',    payload: GraphDiff  }   — инкрементальный дифф
 *   { type: 'server:status',  payload: { ready: boolean; projectDir?: string } }
 *
 * Логика переподключения:
 *   - Бесконечные попытки с backoff 1s / 2s / 4s
 *
 * Фоллбэк:
 *   - Если graph:full не пришёл за 2с после open — emit('graph:refresh')
 *
 * ProjectPicker:
 *   - НЕ показывается автоматически ни при каких условиях.
 *   - Открывается ТОЛЬКО через кнопку «Подключить репозиторий» в Header.
 */
import { emit } from './eventBus.js';
import { store } from '../store.js';
const WS_URL = `ws://${location.host}/ws`;
const FALLBACK_TIMEOUT_MS = 2000;
const RECONNECT_DELAYS = [1000, 2000, 4000];
let _ws = null;
let _reconnectAttempt = 0;
let _fallbackTimer = null;
let _graphReceived = false;
let _stopped = false;
export function connectWs() {
    _stopped = false;
    _connect();
}
export function disconnectWs() {
    _stopped = true;
    _clearFallback();
    if (_ws) {
        _ws.onclose = null;
        _ws.close();
        _ws = null;
    }
    emit('ws:status', 'disconnected');
}
function _connect() {
    if (_stopped)
        return;
    console.log(`[wsClient] _connect() attempt=${_reconnectAttempt}`);
    emit('ws:status', 'connecting');
    _ws = new WebSocket(WS_URL);
    _ws.onopen = () => {
        console.log('[wsClient] onopen — connection established');
        _reconnectAttempt = 0;
        emit('ws:status', 'connected');
        _graphReceived = false;
        // Фоллбэк: если graph:full не пришёл за 2с — HTTP GET /graph
        _fallbackTimer = setTimeout(() => {
            if (!_graphReceived) {
                console.warn('[wsClient] graph:full NOT received in 2s — falling back to GET /graph');
                emit('graph:refresh', undefined);
            }
        }, FALLBACK_TIMEOUT_MS);
    };
    _ws.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        }
        catch {
            console.warn('[wsClient] invalid JSON:', event.data);
            return;
        }
        console.log(`[wsClient] onmessage type=${msg.type}`, msg.payload);
        if (msg.type === 'graph:full') {
            _clearFallback();
            _graphReceived = true;
            console.log('[wsClient] graph:full received → calling store.setGraph + emit graph:full');
            store.setGraph(msg.payload);
            emit('graph:full', store.graph);
            return;
        }
        if (msg.type === 'graph:patch') {
            store.applyDiff(msg.payload);
            emit('graph:update', store.graph);
            return;
        }
        // server:status — не показываем пикер автоматически,
        // просто отменяем фоллбэк если проект не задан
        if (msg.type === 'server:status') {
            const status = msg.payload;
            console.log(`[wsClient] server:status → ready=${status.ready}, projectDir=${status.projectDir ?? 'null'}`);
            if (!status.ready) {
                console.log('[wsClient] server not ready — cancelling fallback timer, waiting for graph:full after scan');
                _clearFallback();
                _graphReceived = true; // предотвращаем фоллбэк GET /graph пока нет проекта
            }
            return;
        }
        console.debug('[wsClient] unknown message type:', msg.type);
    };
    _ws.onclose = (ev) => {
        _clearFallback();
        console.log(`[wsClient] onclose — code=${ev.code}, reason=${ev.reason || '(none)'}`, `_stopped=${_stopped}`);
        emit('ws:status', 'disconnected');
        if (_stopped)
            return;
        const delay = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)];
        _reconnectAttempt++;
        console.log(`[wsClient] reconnecting in ${delay}ms (attempt ${_reconnectAttempt})...`);
        setTimeout(_connect, delay);
    };
    _ws.onerror = (ev) => {
        console.warn('[wsClient] onerror:', ev);
        // onclose вызовется следом
    };
}
function _clearFallback() {
    if (_fallbackTimer) {
        clearTimeout(_fallbackTimer);
        _fallbackTimer = null;
        console.log('[wsClient] fallback timer cleared');
    }
}
