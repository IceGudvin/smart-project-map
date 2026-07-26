/**
 * Raw parser output types — contract between Layer 1 (Parser) and Layer 2 (Graph Builder).
 * These are the unresolved, service-level extraction results before graph normalization.
 */

import type { Language, Framework, HttpMethod } from './graph.js'

// ─── Raw route (before schema linking) ────────────────────────────────────────

export interface RawRoute {
  method: HttpMethod
  path: string
  /** Function/handler name as it appears in source */
  handler: string
  /** Name of the input schema/DTO class, if detected */
  inputSchemaName?: string
  /** Name of the output schema/DTO class (response_model), if detected */
  outputSchemaName?: string
  file: string
  line: number
}

// ─── Raw HTTP call (outgoing request from this service) ────────────────────

export interface RawHttpCall {
  /** Resolved URL string (env vars expanded when possible) */
  url: string
  /**
   * HTTP method. Defaults to 'GET' when the method cannot be statically determined
   * (e.g. bare fetch() without options, or dynamic method variable).
   */
  method: HttpMethod
  /** Hint for resolver — the service name or hostname extracted from URL */
  targetServiceHint?: string
  file: string
  line: number
}

// ─── Raw schema (before cross-service linking) ───────────────────────────

export interface RawSchemaField {
  name: string
  type: string
  required: boolean
  description?: string
}

export interface RawSchema {
  name: string
  fields: RawSchemaField[]
  file: string
  line: number
}

// ─── Environment / config entry ──────────────────────────────────────────

export interface EnvEntry {
  key: string
  value: string
  /** Resolved service id if this entry points to a known service/infrastructure */
  resolvedServiceId?: string
}

// ─── Top-level parser output ───────────────────────────────────────────────

export interface RawParserOutput {
  /** Absolute path to the service root directory */
  servicePath: string
  language: Language
  framework: Framework
  routes: RawRoute[]
  httpCalls: RawHttpCall[]
  schemas: RawSchema[]
  envConfig: EnvEntry[]
  /** Unix timestamp ms — when this output was produced */
  parsedAt: number
}
