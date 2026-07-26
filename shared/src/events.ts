/**
 * WebSocket event types — contract between Layer 3 (Server) and Layer 4 (UI).
 * All messages flowing through /ws must conform to WsEvent.
 */

import type { GraphModel, GraphDiff } from './graph.js'

export type WsEvent =
  | WsEventGraphFull
  | WsEventGraphUpdate
  | WsEventGraphError
  | WsEventPing

/** Sent on initial connection — full graph snapshot */
export interface WsEventGraphFull {
  type: 'graph:full'
  data: GraphModel
}

/** Sent on file change — only the diff, not the full graph */
export interface WsEventGraphUpdate {
  type: 'graph:update'
  diff: GraphDiff
  /** Unix timestamp ms of the triggering file change */
  changedAt: number
}

/** Sent when parsing/building fails for a service */
export interface WsEventGraphError {
  type: 'graph:error'
  message: string
  /** Path of the file that caused the error, if known */
  filePath?: string
}

/** Keep-alive ping — client should respond with pong (optional) */
export interface WsEventPing {
  type: 'ping'
}
