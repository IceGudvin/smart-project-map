/**
 * HTTP calls extractor.
 * Detects outgoing HTTP requests:
 * - axios.get(url), fetch(url), got(url) in TypeScript
 * - httpx.get(url), requests.get(url) in Python
 * Resolves env vars in URL strings when possible.
 *
 * TODO (next session): implement extraction logic.
 */

import type { RawHttpCall } from '@smart-map/shared'

export async function extractHttpCalls(filePaths: string[]): Promise<RawHttpCall[]> {
  // Stub
  return []
}
