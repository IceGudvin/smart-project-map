/**
 * Env config extractor.
 * Reads .env files and config modules to discover service URLs and
 * infrastructure references (DATABASE_URL, REDIS_URL, MINIO_ENDPOINT, etc.).
 *
 * TODO (next session): implement extraction logic.
 */

import type { EnvEntry } from '@smart-map/shared'

export async function extractEnvConfig(servicePath: string): Promise<EnvEntry[]> {
  // Stub
  return []
}
