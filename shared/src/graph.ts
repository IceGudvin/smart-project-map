/**
 * Core graph model types — shared between Layer 2 (Graph Builder),
 * Layer 3 (Server), Layer 4 (UI) and Layer 5 (DataFlow Visualizer).
 */

export type Language = 'typescript' | 'python' | 'go' | 'unknown'

export type Framework =
  | 'fastapi'
  | 'express'
  | 'fastify'
  | 'nestjs'
  | 'nextjs'
  | 'gin'
  | 'unknown'

export type NodeType = 'service' | 'infrastructure' | 'external'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

// ─── Schema types ────────────────────────────────────────────────────────────

export interface SchemaField {
  name: string
  type: string
  required: boolean
  description?: string
}

export interface Schema {
  name: string
  fields: SchemaField[]
  /** Source file where this schema was defined */
  sourceFile?: string
  sourceLine?: number
}

export interface SchemaRef {
  /** References Schema.name */
  schemaName: string
  /** Inline preview of key fields (up to 3) */
  preview?: SchemaField[]
}

// ─── Route types ─────────────────────────────────────────────────────────────

export interface Route {
  method: HttpMethod
  path: string
  handler: string
  inputPayload?: SchemaRef
  outputPayload?: SchemaRef
  sourceFile: string
  sourceLine: number
}

// ─── Graph node / edge ───────────────────────────────────────────────────────

export interface ServiceNode {
  id: string
  name: string
  /** Absolute path to service root directory */
  path: string
  language: Language
  framework: Framework
  nodeType: NodeType
  routes: Route[]
  /** IDs of ServiceNodes this service depends on */
  dependencies: string[]
  schemas: Schema[]
}

export interface Edge {
  from: string           // id of source ServiceNode
  to: string             // id of target ServiceNode
  method: HttpMethod
  path: string
  inputPayload?: SchemaRef
  outputPayload?: SchemaRef
  /** Source file where this HTTP call was found */
  sourceFile?: string
  sourceLine?: number
}

export interface GraphModel {
  nodes: ServiceNode[]
  edges: Edge[]
  updatedAt: number      // Unix timestamp ms
}

// ─── Diff (for incremental WebSocket updates) ────────────────────────────────

export interface GraphDiff {
  addedNodes: ServiceNode[]
  removedNodeIds: string[]
  updatedNodes: ServiceNode[]
  addedEdges: Edge[]
  removedEdgeIds: string[]
}
