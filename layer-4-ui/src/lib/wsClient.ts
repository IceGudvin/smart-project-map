/**
 * wsClient.ts
 * WebSocket-клиент для получения обновлений GraphData от layer-3-server.
 *
 * Устанавливает соединение с WS-сервером (ws://localhost:3000),
 * парсит входящие сообщения типа GraphData и рассылает их через eventBus.
 * При обрыве соединения — автоматический реконнект с экспоненциальной задержкой.
 */

import { GraphData } from '../../../shared/src/types';
import { emit, WsEvent } from './eventBus';

const DEFAULT_URL = 'ws://localhost:3000';
const MAX_RETRIES = 10;
const BASE_DELAY_MS = 1000;

interface WsClientOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
}

let ws: WebSocket | null = null;
let retryCount = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let options: WsClientOptions = {};

// ─── Публичный API ────────────────────────────────────────────────────────────

export function connectWs(opts: WsClientOptions = {}): void {
  options = opts;
  retryCount = 0;
  connect();
}

export function disconnectWs(): void {
  if (retryTimer) clearTimeout(retryTimer);
  if (ws) {
    ws.onclose = null; // не триггерим реконнект
    ws.close();
    ws = null;
  }
  emit('ws:disconnected', undefined);
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

// ─── Внутренняя логика ────────────────────────────────────────────────────────

function connect(): void {
  const url = options.url ?? DEFAULT_URL;
  ws = new WebSocket(url);

  ws.onopen = () => {
    retryCount = 0;
    emit('ws:connected', undefined);
    options.onOpen?.();
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as GraphData;
      emit('graph:update', data);
    } catch (err) {
      console.warn('[wsClient] Failed to parse message:', err);
    }
  };

  ws.onerror = (err) => {
    console.warn('[wsClient] WebSocket error:', err);
    emit('ws:error', err);
  };

  ws.onclose = () => {
    ws = null;
    emit('ws:disconnected', undefined);
    options.onClose?.();
    scheduleReconnect();
  };
}

function scheduleReconnect(): void {
  if (retryCount >= MAX_RETRIES) {
    console.warn('[wsClient] Max retries reached, giving up.');
    return;
  }
  const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
  retryCount++;
  retryTimer = setTimeout(() => {
    connect();
  }, delay);
}
