/**
 * Routes extractor.
 * Detects HTTP route declarations across frameworks:
 * - FastAPI: @router.post("/path"), @router.get("/path")
 * - Express/Fastify: app.get('/path', handler)
 * - NestJS: @Get('/path') decorators
 *
 * TODO (next session): implement extraction logic.
 */

import type { RawRoute } from '@smart-map/shared'

export async function extractRoutes(filePaths: string[]): Promise<RawRoute[]> {
  // Stub
  return []
}
