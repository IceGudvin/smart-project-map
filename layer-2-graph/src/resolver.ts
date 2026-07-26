import type { RawParserOutput, RawRoute, RawSchema } from '@smart-map/shared'
import type { ServiceNode, Schema, Route, NodeType } from '@smart-map/shared'

/**
 * Derives a stable service ID from the service root path.
 * e.g. "/projects/leadway/backend" → "backend"
 */
export function deriveServiceId(servicePath: string): string {
  // Works on both POSIX and Windows paths
  const normalized = servicePath.replace(/\\/g, '/')
  const base = normalized.split('/').filter(Boolean).pop() ?? 'unknown'
  return base.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
}

/**
 * Resolves a URL string to a target ServiceNode ID.
 * Resolution order:
 *   1. Hostname matches a known service path basename
 *   2. Port matches a known service's envConfig PORT
 *   3. External URL → returns 'external'
 */
export function resolveServiceId(
  rawUrl: string,
  nodes: ServiceNode[],
  allOutputs: RawParserOutput[],
): string {
  try {
    const parsed = new URL(rawUrl)
    const hostname = parsed.hostname
    const port = parsed.port

    // Match by hostname (e.g. http://backend:8000 → serviceId 'backend')
    for (const node of nodes) {
      if (node.id === hostname || node.name === hostname) {
        return node.id
      }
    }

    // Match by port from envConfig (e.g. localhost:3000)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      for (const output of allOutputs) {
        const portEntry = output.envConfig.find(
          (e) => (e.key === 'PORT' || e.key === 'APP_PORT') && e.value === port,
        )
        if (portEntry) {
          return deriveServiceId(output.servicePath)
        }
      }
    }
  } catch {
    // Not a valid URL — skip
  }

  return 'external'
}

/** Converts RawSchema[] to Schema[] */
function convertSchemas(raw: RawSchema[]): Schema[] {
  return raw.map((s) => ({
    name: s.name,
    fields: s.fields,
    sourceFile: s.file,
    sourceLine: s.line,
  }))
}

/** Converts RawRoute[] to Route[] with SchemaRef linking.
 * Uses explicit conditional spread to satisfy exactOptionalPropertyTypes.
 */
function convertRoutes(raw: RawRoute[]): Route[] {
  return raw.map((r) => ({
    method: r.method,
    path: r.path,
    handler: r.handler,
    ...(r.inputSchemaName !== undefined
      ? { inputPayload: { schemaName: r.inputSchemaName } }
      : {}),
    ...(r.outputSchemaName !== undefined
      ? { outputPayload: { schemaName: r.outputSchemaName } }
      : {}),
    sourceFile: r.file,
    sourceLine: r.line,
  }))
}

/** Determines NodeType for a service. */
function determineNodeType(_output: RawParserOutput): NodeType {
  return 'service'
}

/**
 * Builds a ServiceNode from a single RawParserOutput.
 * Dependencies are filled later by edge builder.
 */
export function buildServiceNode(output: RawParserOutput): ServiceNode {
  const id = deriveServiceId(output.servicePath)
  return {
    id,
    name: id,
    path: output.servicePath,
    language: output.language,
    framework: output.framework,
    nodeType: determineNodeType(output),
    routes: convertRoutes(output.routes),
    dependencies: [],
    schemas: convertSchemas(output.schemas),
  }
}
