/**
 * TypeScript language adapter.
 * Uses ts-morph for type-aware AST analysis.
 *
 * TODO (next session): implement route/schema/http-call extractors.
 */

import type { RawParserOutput } from '@smart-map/shared'

export async function parseTypeScript(servicePath: string): Promise<Partial<RawParserOutput>> {
  // Stub
  return { language: 'typescript' }
}
