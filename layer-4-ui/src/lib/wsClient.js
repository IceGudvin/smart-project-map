/**
 * wsClient.js — WebSocket-клиент для layer-3-server.
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
    store.setWsStatus('disconnected');
    emit('ws:status', 'disconnected');
}
function _connect() {
    if (_stopped) return;
    console.log(`[wsClient] _connect() attempt=${_reconnectAttempt}`);
    store.setWsStatus('connecting');
    emit('ws:status', 'connecting');
    _ws = new WebSocket(WS_URL);
    _ws.onopen = () => {
        console.log('[wsClient] onopen — connection established');
        _reconnectAttempt = 0;
        store.setWsStatus('connected');
        emit('ws:status', 'connected');
        _graphReceived = false;
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
        } catch {
            console.warn('[wsClient] invalid JSON:', event.data);
            return;
        }
        console.log(`[wsClient] onmessage type=${msg.type}`, msg.payload);
        if (msg.type === 'graph:full') {
            _clearFallback();
            _graphReceived = true;
            store.setGraph(msg.payload);
            emit('graph:full', store.graph);
            return;
        }
        if (msg.type === 'graph:patch') {
            // guard: применяем diff только если базовый граф уже загружен
            if (!store.graph?.nodes?.length) {
                console.warn('[wsClient] graph:patch received before graph:full — ignoring');
                return;
            }
            store.applyDiff(msg.payload);
            emit('graph:update', store.graph);
            return;
        }
        if (msg.type === 'server:status') {
            const status = msg.payload;
            console.log(`[wsClient] server:status → ready=${status.ready}, projectDir=${status.projectDir ?? 'null'}`);
            // Сохраняем путь к проекту в store — Header покажет его
            store.setProjectDir(status.projectDir ?? null);
            emit('project:status', status);
            if (!status.ready) {
                _clearFallback();
                _graphReceived = true;
            }
            return;
        }
        console.debug('[wsClient] unknown message type:', msg.type);
    };
    _ws.onclose = (ev) => {
        _clearFallback();
        console.log(`[wsClient] onclose — code=${ev.code} _stopped=${_stopped}`);
        store.setWsStatus('disconnected');
        emit('ws:status', 'disconnected');
        if (_stopped) return;
        const delay = RECONNECT_DELAYS[Math.min(_reconnectAttempt, RECONNECT_DELAYS.length - 1)];
        _reconnectAttempt++;
        console.log(`[wsClient] reconnecting in ${delay}ms (attempt ${_reconnectAttempt})...`);
        setTimeout(_connect, delay);
    };
    _ws.onerror = (ev) => {
        console.warn('[wsClient] onerror:', ev);
    };
}
function _clearFallback() {
    if (_fallbackTimer) {
        clearTimeout(_fallbackTimer);
        _fallbackTimer = null;
        console.log('[wsClient] fallback timer cleared');
    }
}
