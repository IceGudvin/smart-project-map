/**
 * eventBus.ts
 * Лёгкий типизированный event bus для внутренней коммуникации компонентов.
 *
 * Позволяет компонентам общаться без прямых зависимостей друг от друга.
 * Пример: wsClient эмитит 'graph:update' → Canvas подписывается и перерисовывает граф.
 *
 * Использование:
 *   on('graph:update', (data) => { ... });
 *   emit('graph:update', graphData);
 *   off('graph:update', handler);
 */

import { GraphData } from '../../../shared/src/types';

// ─── Типы событий ─────────────────────────────────────────────────────────────

export interface WsEventMap {
  'graph:update':     GraphData;
  'ws:connected':     undefined;
  'ws:disconnected':  undefined;
  'ws:error':         Event | unknown;
  'node:selected':    string;        // id узла
  'node:deselected':  undefined;
  'theme:changed':    'dark' | 'light';
  'layout:changed':   'TB' | 'LR';
  'dataflow:toggled': boolean;
}

export type WsEvent = keyof WsEventMap;

type Handler<K extends WsEvent> = (payload: WsEventMap[K]) => void;

// ─── Внутреннее хранилище ─────────────────────────────────────────────────────

const _listeners: {
  [K in WsEvent]?: Set<Handler<K>>;
} = {};

// ─── Публичный API ────────────────────────────────────────────────────────────

export function on<K extends WsEvent>(event: K, handler: Handler<K>): void {
  if (!_listeners[event]) {
    (_listeners as any)[event] = new Set();
  }
  (_listeners[event] as Set<Handler<K>>).add(handler);
}

export function off<K extends WsEvent>(event: K, handler: Handler<K>): void {
  (_listeners[event] as Set<Handler<K>> | undefined)?.delete(handler);
}

export function once<K extends WsEvent>(event: K, handler: Handler<K>): void {
  const wrapper: Handler<K> = (payload) => {
    handler(payload);
    off(event, wrapper);
  };
  on(event, wrapper);
}

export function emit<K extends WsEvent>(event: K, payload: WsEventMap[K]): void {
  const handlers = _listeners[event] as Set<Handler<K>> | undefined;
  if (!handlers) return;
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[eventBus] Error in handler for '${event}':`, err);
    }
  }
}

/** Удалить все слушатели конкретного события (для тестов/cleanup). */
export function clear(event: WsEvent): void {
  delete _listeners[event];
}
