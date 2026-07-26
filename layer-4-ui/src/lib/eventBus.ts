/**
 * eventBus.ts — Типизированная шина событий для layer-4-ui.
 *
 * Позволяет компонентам общаться без прямых зависимостей.
 *
 * Использование:
 *   on('node:select', (id) => { ... });
 *   emit('node:select', 'svc-backend');
 *   off('node:select', handler);
 *   once('graph:refresh', () => { ... });
 *
 * События:
 *   UI-действия:  node:select, node:deselect,
 *                     dataflow:toggle, dataflow:next, graph:refresh
 *   Cytoscape:        cy:ready
 *   WS-состояние:  ws:connected, ws:disconnected, ws:error
 *   Тема:             theme:changed
 */

import type { GraphModel, GraphDiff } from '../../../shared/src/graph.js'

// ----------------------------------------------------------------- event map

export interface EventMap {
  // ---- Выбор узла —————————————————————————————
  /** Клик на узел (сайдбар, cy tap) → все подписчики обновляют состояние */
  'node:select':         string
  /** Клик по фону / ESC / кнопка × в DetailPanel */
  'node:deselect':       undefined

  // ---- DataFlow-режим ————————————————————————
  /** true = включить, false = выключить */
  'dataflow:toggle':     boolean
  /** Переключить на следующий предустановленный путь (0→1→2→0) */
  'dataflow:next':       undefined

  // ---- Граф ————————————————————————————————
  /** Полный снимок графа от layer-3 */
  'graph:full':          GraphModel
  /** Инкрементальное обновление */
  'graph:update':        { diff: GraphDiff; changedAt: number }
  /** Ручной rebuild через кнопку Refresh в Header */
  'graph:refresh':       undefined
  /** Ошибка сервера */
  'graph:error':         string

  // ---- Cytoscape —————————————————————————————
  /** Canvas эмитит после инициализации cy */
  'cy:ready':            unknown  // cy instance (typed as unknown чтоб не тянуть cytoscape в bus)

  // ---- WS-состояние ————————————————————————
  'ws:connected':        undefined
  'ws:disconnected':     undefined
  'ws:error':            Event | unknown

  // ---- Тема —————————————————————————————————
  'theme:changed':       'dark' | 'light'
}

export type EventKey = keyof EventMap
type Handler<K extends EventKey> = (payload: EventMap[K]) => void

// ---------------------------------------------------------------- storage

const _listeners: { [K in EventKey]?: Set<Handler<K>> } = {}

// ---------------------------------------------------------------- public API

/** Подписаться на событие. Возвращает функцию-отписку для отписки. */
export function on<K extends EventKey>(event: K, handler: Handler<K>): () => void {
  if (!_listeners[event]) {
    (_listeners as any)[event] = new Set()
  }
  ;(_listeners[event] as Set<Handler<K>>).add(handler)
  return () => off(event, handler)
}

/** Отписаться от события. */
export function off<K extends EventKey>(event: K, handler: Handler<K>): void {
  ;(_listeners[event] as Set<Handler<K>> | undefined)?.delete(handler)
}

/** Подписаться на одно срабатывание. */
export function once<K extends EventKey>(event: K, handler: Handler<K>): () => void {
  const wrapper: Handler<K> = (payload) => {
    handler(payload)
    off(event, wrapper)
  }
  return on(event, wrapper)
}

/** Эмитить событие. Ошибки в хандлерах перехватываются и логируются без сбоя остальных. */
export function emit<K extends EventKey>(event: K, payload: EventMap[K]): void {
  const handlers = _listeners[event] as Set<Handler<K>> | undefined
  if (!handlers) return
  for (const handler of handlers) {
    try {
      handler(payload)
    } catch (err) {
      console.error(`[eventBus] Error in handler for '${event}':`, err)
    }
  }
}

/** Удалить всех слушателей события (для cleanup / тестов). */
export function clear(event: EventKey): void {
  delete _listeners[event]
}
