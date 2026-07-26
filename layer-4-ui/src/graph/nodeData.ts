/**
 * nodeData.ts
 * Статические расширенные данные для Detail Panel.
 * Содержит роуты, схемы данных и зависимости для каждого сервиса.
 * В будущем может быть заменён данными от layer-1-parser через WS.
 */

export interface RouteEntry {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'SQL' | 'SET' | 'PUT';
  path: string;
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
}

export interface SchemaEntry {
  name: string;
  fields: SchemaField[];
}

export interface NodeDetailData {
  id: string;
  icon: string;
  iconClass: 'service' | 'infra';
  name: string;
  sub: string;
  routes: RouteEntry[];
  schemas: SchemaEntry[];
  deps: string[];
}

const nodeDataMap: Record<string, NodeDetailData> = {
  frontend: {
    id: 'frontend',
    icon: '🖥',
    iconClass: 'service',
    name: 'frontend',
    sub: 'Next.js · TypeScript',
    routes: [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/dashboard' },
      { method: 'POST', path: '/api/auth' },
    ],
    schemas: [
      {
        name: 'LoginForm',
        fields: [
          { name: 'email', type: 'string', required: true },
          { name: 'password', type: 'string', required: true },
        ],
      },
    ],
    deps: [
      '→ backend (POST /auth/login)',
      '→ backend (GET /auth/me)',
      '→ backend (POST /files/upload)',
    ],
  },

  backend: {
    id: 'backend',
    icon: '⚙',
    iconClass: 'service',
    name: 'backend',
    sub: 'FastAPI · Python 3.11',
    routes: [
      { method: 'POST', path: '/auth/login' },
      { method: 'GET',  path: '/auth/me' },
      { method: 'POST', path: '/auth/logout' },
      { method: 'GET',  path: '/users' },
      { method: 'POST', path: '/files/upload' },
      { method: 'GET',  path: '/files/:id' },
    ],
    schemas: [
      {
        name: 'LoginRequest',
        fields: [
          { name: 'email',    type: 'EmailStr', required: true },
          { name: 'password', type: 'str',      required: true },
        ],
      },
      {
        name: 'TokenResponse',
        fields: [
          { name: 'access_token', type: 'str', required: true },
          { name: 'token_type',   type: 'str', required: false },
        ],
      },
    ],
    deps: [
      '→ PostgreSQL (SQLAlchemy)',
      '→ Redis (JWT cache)',
      '→ MinIO (file storage)',
    ],
  },

  postgres: {
    id: 'postgres',
    icon: '🗄',
    iconClass: 'infra',
    name: 'PostgreSQL',
    sub: 'Infrastructure · asyncpg',
    routes: [],
    schemas: [
      {
        name: 'User model',
        fields: [
          { name: 'id',         type: 'UUID', required: true },
          { name: 'email',      type: 'str',  required: true },
          { name: 'hashed_pw',  type: 'str',  required: true },
          { name: 'created_at', type: 'datetime', required: false },
        ],
      },
    ],
    deps: ['← backend (queries via SQLAlchemy)'],
  },

  redis: {
    id: 'redis',
    icon: '⚡',
    iconClass: 'infra',
    name: 'Redis',
    sub: 'Infrastructure · aioredis 2.0',
    routes: [],
    schemas: [
      {
        name: 'TokenCache',
        fields: [
          { name: 'token:{userId}', type: 'str', required: true },
          { name: 'TTL',           type: 'int = 3600', required: false },
        ],
      },
    ],
    deps: ['← backend (JWT token cache)'],
  },

  minio: {
    id: 'minio',
    icon: '🪣',
    iconClass: 'infra',
    name: 'MinIO',
    sub: 'Infrastructure · S3 · boto3',
    routes: [],
    schemas: [
      {
        name: 'FileObject',
        fields: [
          { name: 'bucket',       type: 'str', required: true },
          { name: 'key',          type: 'str', required: true },
          { name: 'presigned_url', type: 'str', required: false },
          { name: 'size',         type: 'int', required: false },
        ],
      },
    ],
    deps: ['← backend (file upload/download via boto3)'],
  },
};

/** Получить данные для Detail Panel по id узла. */
export function getNodeData(id: string): NodeDetailData | undefined {
  return nodeDataMap[id];
}

/** Все доступные id узлов. */
export function getAllNodeIds(): string[] {
  return Object.keys(nodeDataMap);
}
