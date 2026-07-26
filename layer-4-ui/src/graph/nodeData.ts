/**
 * nodeData.ts — Маппинг ServiceNode → NodeDetailData для Detail Panel.
 *
 * mapNodeToDetail(node)  — преобразует живой ServiceNode из GraphModel.
 * getNodeData(id)        — отдаёт статичные данные для демо-узлов (фоллбэк).
 * resolveNodeData(node)  — сначала live-маппинг, потом статичный фоллбэк.
 */

import type { ServiceNode, Route, Schema, SchemaField, Framework, NodeType } from '../../../shared/src/graph.js'
import { getIconSlug } from './cytoscapeInit.js'

// ================================================================ output types

export type HttpMethodBadge = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface RouteEntry {
  method: HttpMethodBadge
  path:   string
}

export interface SchemaEntry {
  name:   string
  fields: Array<{ name: string; type: string; required: boolean }>
}

export interface NodeDetailData {
  id:        string
  /** Simple Icons slug для CDN: nextdotjs / fastapi / postgresql … */
  iconSlug:  string | null
  /** Строковый emoji для фоллбэка (ui-only) */
  iconEmoji: string
  iconClass: 'service' | 'infra'
  name:      string
  /** Подзаголовок: фреймворк + язык */
  sub:       string
  routes:    RouteEntry[]
  schemas:   SchemaEntry[]
  /** Строковые описания зависимостей: '→ backend (POST /auth/login)' */
  deps:      string[]
  /** id целевых узлов (for node:select on click in DepList) */
  depNodeIds: string[]
}

// ================================================================ helpers

const FRAMEWORK_LABEL: Partial<Record<Framework, string>> = {
  nextjs:  'Next.js',
  fastapi: 'FastAPI',
  express: 'Express',
  fastify: 'Fastify',
  nestjs:  'NestJS',
  gin:     'Gin',
}

const EMOJI_MAP: Record<string, string> = {
  // Сервисы
  nextjs:  '🖥',
  fastapi: '⚙️',
  express: '💫',
  fastify: '⚡',
  nestjs:  '🐈',
  gin:     '🐹',
  // Инфра
  postgres:    '🗄',
  postgresql:  '🗄',
  redis:       '⚡',
  minio:       '🪣',
  mongodb:     '📄',
  mysql:       '🗄',
  rabbitmq:    '🐇',
  kafka:       '📨',
  elasticsearch: '🔍',
  external:    '🌐',
}

function resolveEmoji(node: ServiceNode): string {
  return EMOJI_MAP[node.id] ?? EMOJI_MAP[node.framework] ??
    (node.nodeType === 'infrastructure' ? '🗄' : '📦')
}

function frameworkSub(node: ServiceNode): string {
  const fw = FRAMEWORK_LABEL[node.framework] ?? node.framework
  const lang = node.language !== 'unknown'
    ? ` · ${node.language.charAt(0).toUpperCase() + node.language.slice(1)}`
    : ''
  return `${fw}${lang}`
}

/** Преобразует Route[] → RouteEntry[] (type-safe) */
function mapRoutes(routes: Route[]): RouteEntry[] {
  return routes.map(r => ({ method: r.method as HttpMethodBadge, path: r.path }))
}

/** Преобразует Schema[] → SchemaEntry[] */
function mapSchemas(schemas: Schema[]): SchemaEntry[] {
  return schemas.map(s => ({
    name:   s.name,
    fields: s.fields.map(f => ({ name: f.name, type: f.type, required: f.required })),
  }))
}

/** Будует карту зависимостей из живых данных графа */
function buildDeps(
  node: ServiceNode,
  allNodes: ServiceNode[]
): { deps: string[]; depNodeIds: string[] } {
  const nodeById = new Map(allNodes.map(n => [n.id, n]))
  const deps: string[]     = []
  const depNodeIds: string[] = []

  for (const depId of node.dependencies) {
    const target = nodeById.get(depId)
    if (target) {
      deps.push(`→ ${target.name}`)
      depNodeIds.push(depId)
    } else {
      deps.push(`→ ${depId}`)
      depNodeIds.push(depId)
    }
  }

  return { deps, depNodeIds }
}

// ================================================================ main mapper

/**
 * Преобразует живой ServiceNode (+ массив всех узлов для резолва зависимостей)
 * в NodeDetailData для Detail Panel.
 */
export function mapNodeToDetail(
  node: ServiceNode,
  allNodes: ServiceNode[] = []
): NodeDetailData {
  const { deps, depNodeIds } = buildDeps(node, allNodes)
  return {
    id:        node.id,
    iconSlug:  getIconSlug(node),
    iconEmoji: resolveEmoji(node),
    iconClass: node.nodeType === 'service' ? 'service' : 'infra',
    name:      node.name,
    sub:       frameworkSub(node),
    routes:    mapRoutes(node.routes),
    schemas:   mapSchemas(node.schemas),
    deps,
    depNodeIds,
  }
}

// ================================================================ static fallback map
// Предзаполненные данные для демо-узлов (Leadway). Используются если узел нет в live-графе.

const STATIC_FALLBACK: Record<string, NodeDetailData> = {
  frontend: {
    id: 'frontend', iconSlug: 'nextdotjs', iconEmoji: '🖥', iconClass: 'service',
    name: 'frontend', sub: 'Next.js · TypeScript',
    routes: [
      { method: 'GET',  path: '/' },
      { method: 'GET',  path: '/dashboard' },
      { method: 'POST', path: '/api/auth' },
    ],
    schemas: [
      { name: 'LoginForm', fields: [
        { name: 'email',    type: 'string',  required: true },
        { name: 'password', type: 'string',  required: true },
      ]},
    ],
    deps: ['→ backend (POST /auth/login)', '→ backend (GET /auth/me)', '→ backend (POST /files/upload)'],
    depNodeIds: ['backend'],
  },
  backend: {
    id: 'backend', iconSlug: 'fastapi', iconEmoji: '⚙️', iconClass: 'service',
    name: 'backend', sub: 'FastAPI · Python 3.11',
    routes: [
      { method: 'POST', path: '/auth/login' },
      { method: 'GET',  path: '/auth/me' },
      { method: 'POST', path: '/auth/logout' },
      { method: 'GET',  path: '/users' },
      { method: 'POST', path: '/files/upload' },
      { method: 'GET',  path: '/files/:id' },
    ],
    schemas: [
      { name: 'LoginRequest',  fields: [
        { name: 'email',    type: 'EmailStr', required: true },
        { name: 'password', type: 'str',      required: true },
      ]},
      { name: 'TokenResponse', fields: [
        { name: 'access_token', type: 'str', required: true },
        { name: 'token_type',   type: 'str', required: false },
      ]},
    ],
    deps: ['→ PostgreSQL (SQLAlchemy)', '→ Redis (JWT cache)', '→ MinIO (file storage)'],
    depNodeIds: ['postgres', 'redis', 'minio'],
  },
  postgres: {
    id: 'postgres', iconSlug: 'postgresql', iconEmoji: '🗄', iconClass: 'infra',
    name: 'PostgreSQL', sub: 'Infrastructure · asyncpg',
    routes: [],
    schemas: [
      { name: 'User model', fields: [
        { name: 'id',         type: 'UUID',     required: true },
        { name: 'email',      type: 'str',      required: true },
        { name: 'hashed_pw',  type: 'str',      required: true },
        { name: 'created_at', type: 'datetime', required: false },
      ]},
    ],
    deps: ['← backend (queries via SQLAlchemy)'],
    depNodeIds: ['backend'],
  },
  redis: {
    id: 'redis', iconSlug: 'redis', iconEmoji: '⚡', iconClass: 'infra',
    name: 'Redis', sub: 'Infrastructure · aioredis 2.0',
    routes: [],
    schemas: [
      { name: 'TokenCache', fields: [
        { name: 'token:{userId}', type: 'str',          required: true },
        { name: 'TTL',            type: 'int = 3600',   required: false },
      ]},
    ],
    deps: ['← backend (JWT token cache)'],
    depNodeIds: ['backend'],
  },
  minio: {
    id: 'minio', iconSlug: 'minio', iconEmoji: '🪣', iconClass: 'infra',
    name: 'MinIO', sub: 'Infrastructure · S3 · boto3',
    routes: [],
    schemas: [
      { name: 'FileObject', fields: [
        { name: 'bucket',        type: 'str', required: true },
        { name: 'key',           type: 'str', required: true },
        { name: 'presigned_url', type: 'str', required: false },
        { name: 'size',          type: 'int', required: false },
      ]},
    ],
    deps: ['← backend (file upload/download via boto3)'],
    depNodeIds: ['backend'],
  },
}

/**
 * Точка входа для компонентов. Использует live-данные, если узел есть в GraphModel;
 * иначе — статичный фоллбэк.
 */
export function resolveNodeData(
  node: ServiceNode,
  allNodes: ServiceNode[] = []
): NodeDetailData {
  // Если у узла есть routes/schemas из парсера — используем живые данные
  if (node.routes.length > 0 || node.schemas.length > 0) {
    return mapNodeToDetail(node, allNodes)
  }
  // Иначе — статичный фоллбэк
  return STATIC_FALLBACK[node.id] ?? mapNodeToDetail(node, allNodes)
}

/** Получить статичные данные по id (только fallback, без live). */
export function getNodeData(id: string): NodeDetailData | undefined {
  return STATIC_FALLBACK[id]
}

/** Все id статичных узлов. */
export function getAllNodeIds(): string[] {
  return Object.keys(STATIC_FALLBACK)
}
