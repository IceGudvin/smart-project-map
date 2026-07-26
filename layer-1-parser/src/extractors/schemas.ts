/**
 * Schemas extractor.
 * Detects data schema definitions:
 * - Pydantic v2 BaseModel classes (Python)
 * - TypeScript DTO classes / interfaces
 * - Zod schemas: z.object({...})
 * - OpenAPI/Swagger YAML/JSON if present
 *
 * TODO (next session): implement extraction logic.
 */

import type { RawSchema } from '@smart-map/shared'

export async function extractSchemas(filePaths: string[]): Promise<RawSchema[]> {
  // Stub
  return []
}
