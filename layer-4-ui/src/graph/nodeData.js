/**
 * nodeData.ts — Маппинг ServiceNode → NodeDetailData для Detail Panel.
 *
 * mapNodeToDetail(node)  — преобразует живой ServiceNode из GraphModel.
 * getNodeData(id)        — отдаёт статичные данные для демо-узлов (фоллбэк).
 * resolveNodeData(node)  — сначала live-маппинг, потом статичный фоллбэк.
 */
import { getIconSlug } from './cytoscapeInit.js';
// ================================================================ helpers
const FRAMEWORK_LABEL = {
    nextjs: 'Next.js',
    fastapi: 'FastAPI',
    express: 'Express',
    fastify: 'Fastify',
    nestjs: 'NestJS',
    gin: 'Gin',
};
const EMOJI_MAP = {
    // Сервисы
    nextjs: '🖥',
    fastapi: '⚙️',
    express: '💫',
    fastify: '⚡',
    nestjs: '🐈',
    gin: '🐹',
    // Инфра
    postgres: '🗄',
    postgresql: '🗄',
    redis: '⚡',
    minio: '🪣',
    mongodb: '📄',
    mysql: '🗄',
    rabbitmq: '🐇',
    kafka: '📨',
    elasticsearch: '🔍',
    external: '🌐',
};
function resolveEmoji(node) {
    return EMOJI_MAP[node.id] ?? EMOJI_MAP[node.framework] ??
        (node.nodeType === 'infrastructure' ? '🗄' : '📦');
}
function frameworkSub(node) {
    const fw = FRAMEWORK_LABEL[node.framework] ?? node.framework;
    const lang = node.language !== 'unknown'
        ? ` · ${node.language.charAt(0).toUpperCase() + node.language.slice(1)}`
        : '';
    return `${fw}${lang}`;
}
/** Преобразует Route[] → RouteEntry[] (type-safe) */
function mapRoutes(routes) {
    return routes.map(r => ({ method: r.method, path: r.path }));
}
/** Преобразует Schema[] → SchemaEntry[] */
function mapSchemas(schemas) {
    return schemas.map(s => ({
        name: s.name,
        fields: s.fields.map(f => ({ name: f.name, type: f.type, required: f.required })),
    }));
}
/** Будует карту зависимостей из живых данных графа */
function buildDeps(node, allNodes) {
    const nodeById = new Map(allNodes.map(n => [n.id, n]));
    const deps = [];
    const depNodeIds = [];
    for (const depId of node.dependencies) {
        const target = nodeById.get(depId);
        if (target) {
            deps.push(`→ ${target.name}`);
            depNodeIds.push(depId);
        }
        else {
            deps.push(`→ ${depId}`);
            depNodeIds.push(depId);
        }
    }
    return { deps, depNodeIds };
}
// ================================================================ main mapper
/**
 * Преобразует живой ServiceNode (+ массив всех узлов для резолва зависимостей)
 * в NodeDetailData для Detail Panel.
 */
export function mapNodeToDetail(node, allNodes = []) {
    const { deps, depNodeIds } = buildDeps(node, allNodes);
    return {
        id: node.id,
        iconSlug: getIconSlug(node),
        iconEmoji: resolveEmoji(node),
        iconClass: node.nodeType === 'service' ? 'service' : 'infra',
        name: node.name,
        sub: frameworkSub(node),
        routes: mapRoutes(node.routes),
        schemas: mapSchemas(node.schemas),
        deps,
        depNodeIds,
    };
}
// ================================================================ static fallback map
// Предзаполненные данные для демо-узлов (Leadway). Используются если узел нет в live-графе.
const STATIC_FALLBACK = {
    frontend: {
        id: 'frontend', iconSlug: 'nextdotjs', iconEmoji: '🖥', iconClass: 'service',
        name: 'frontend', sub: 'Next.js · TypeScript',
        routes: [
            { method: 'GET', path: '/' },
            { method: 'GET', path: '/dashboard' },
            { method: 'POST', path: '/api/auth' },
        ],
        schemas: [
            { name: 'LoginForm', fields: [
                    { name: 'email', type: 'string', required: true },
                    { name: 'password', type: 'string', required: true },
                ] },
        ],
        deps: ['→ backend (POST /auth/login)', '→ backend (GET /auth/me)', '→ backend (POST /files/upload)'],
        depNodeIds: ['backend'],
    },
    backend: {
        id: 'backend', iconSlug: 'fastapi', iconEmoji: '⚙️', iconClass: 'service',
        name: 'backend', sub: 'FastAPI · Python 3.11',
        routes: [
            { method: 'POST', path: '/auth/login' },
            { method: 'GET', path: '/auth/me' },
            { method: 'POST', path: '/auth/logout' },
            { method: 'GET', path: '/users' },
            { method: 'POST', path: '/files/upload' },
            { method: 'GET', path: '/files/:id' },
        ],
        schemas: [
            { name: 'LoginRequest', fields: [
                    { name: 'email', type: 'EmailStr', required: true },
                    { name: 'password', type: 'str', required: true },
                ] },
            { name: 'TokenResponse', fields: [
                    { name: 'access_token', type: 'str', required: true },
                    { name: 'token_type', type: 'str', required: false },
                ] },
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
                    { name: 'id', type: 'UUID', required: true },
                    { name: 'email', type: 'str', required: true },
                    { name: 'hashed_pw', type: 'str', required: true },
                    { name: 'created_at', type: 'datetime', required: false },
                ] },
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
                    { name: 'token:{userId}', type: 'str', required: true },
                    { name: 'TTL', type: 'int = 3600', required: false },
                ] },
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
                    { name: 'bucket', type: 'str', required: true },
                    { name: 'key', type: 'str', required: true },
                    { name: 'presigned_url', type: 'str', required: false },
                    { name: 'size', type: 'int', required: false },
                ] },
        ],
        deps: ['← backend (file upload/download via boto3)'],
        depNodeIds: ['backend'],
    },
};
/**
 * Точка входа для компонентов. Использует live-данные, если узел есть в GraphModel;
 * иначе — статичный фоллбэк.
 */
export function resolveNodeData(node, allNodes = []) {
    // Если у узла есть routes/schemas из парсера — используем живые данные
    if (node.routes.length > 0 || node.schemas.length > 0) {
        return mapNodeToDetail(node, allNodes);
    }
    // Иначе — статичный фоллбэк
    return STATIC_FALLBACK[node.id] ?? mapNodeToDetail(node, allNodes);
}
/** Получить статичные данные по id (только fallback, без live). */
export function getNodeData(id) {
    return STATIC_FALLBACK[id];
}
/** Все id статичных узлов. */
export function getAllNodeIds() {
    return Object.keys(STATIC_FALLBACK);
}
