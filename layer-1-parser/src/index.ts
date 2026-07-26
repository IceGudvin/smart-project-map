/**
 * Layer 1 — Parser
 * Entry point: given a service root path, returns RawParserOutput.
 *
 * TODO (next session): implement real extractors for TypeScript and Python.
 */

import type { RawParserOutput } from '@smart-map/shared'

/**
 * Parse a single service directory and return raw extraction results.
 * @param servicePath - Absolute path to the service root
 */
export async function parse(servicePath: string): Promise<RawParserOutput> {
  // Stub — will be replaced with real language detection + extraction
  return {
    servicePath,
    language: 'unknown',
    framework: 'unknown',
    routes: [],
    httpCalls: [],
    schemas: [],
    envConfig: [],
    parsedAt: Date.now(),
  }
}
