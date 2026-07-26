/**
 * Python language adapter.
 * Uses ast-grep (Python grammar) for FastAPI/Pydantic analysis.
 *
 * TODO (next session): implement FastAPI route extractor and Pydantic v2 schema extractor.
 */

import type { RawParserOutput } from '@smart-map/shared'

export async function parsePython(servicePath: string): Promise<Partial<RawParserOutput>> {
  // Stub
  return { language: 'python' }
}
