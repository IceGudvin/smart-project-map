import type { EnvEntry } from '@smart-map/shared'
import type { ServiceNode } from '@smart-map/shared'

const INFRA_PATTERNS: Array<{
  keys: RegExp[]
  id: string
  name: string
  framework: 'unknown'
  language: 'unknown'
}> = [
  {
    keys: [/^DATABASE_URL$/, /^POSTGRES_/],
    id: 'postgres',
    name: 'PostgreSQL',
    framework: 'unknown',
    language: 'unknown',
  },
  {
    keys: [/^REDIS_URL$/, /^REDIS_HOST$/, /^REDIS_PORT$/],
    id: 'redis',
    name: 'Redis',
    framework: 'unknown',
    language: 'unknown',
  },
  {
    keys: [/^MINIO_/, /^S3_/],
    id: 'minio',
    name: 'MinIO / S3',
    framework: 'unknown',
    language: 'unknown',
  },
  {
    keys: [/^MONGO_URL$/, /^MONGODB_URI$/, /^MONGO_/],
    id: 'mongodb',
    name: 'MongoDB',
    framework: 'unknown',
    language: 'unknown',
  },
  {
    keys: [/^RABBITMQ_URL$/, /^RABBITMQ_/],
    id: 'rabbitmq',
    name: 'RabbitMQ',
    framework: 'unknown',
    language: 'unknown',
  },
]

/**
 * Scans envConfig arrays from all services and builds infrastructure ServiceNodes.
 * Each unique infrastructure type (postgres, redis, minio…) is added at most once.
 */
export function detectInfraNodes(allEnvConfigs: EnvEntry[][]): ServiceNode[] {
  const detected = new Set<string>()
  const nodes: ServiceNode[] = []

  for (const envConfig of allEnvConfigs) {
    for (const entry of envConfig) {
      for (const pattern of INFRA_PATTERNS) {
        if (detected.has(pattern.id)) continue
        const matches = pattern.keys.some((re) => re.test(entry.key))
        if (matches) {
          detected.add(pattern.id)
          nodes.push({
            id: pattern.id,
            name: pattern.name,
            path: '',
            language: pattern.language,
            framework: pattern.framework,
            nodeType: 'infrastructure',
            routes: [],
            dependencies: [],
            schemas: [],
          })
        }
      }
    }
  }

  return nodes
}
