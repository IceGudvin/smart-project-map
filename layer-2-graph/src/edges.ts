import type { RawParserOutput } from '@smart-map/shared'
import type { Edge, ServiceNode } from '@smart-map/shared'
import { resolveServiceId, deriveServiceId } from './resolver.js'

let _edgeCounter = 0
function edgeId(from: string, to: string, suffix: string): string {
  return `${from}->${to}:${suffix}:${++_edgeCounter}`
}

/**
 * Builds HTTP edges from all RawParserOutput[].httpCalls.
 * Each RawHttpCall URL is resolved to a target ServiceNode ID.
 * Unresolvable URLs go to the 'external' pseudo-node.
 */
export function buildHttpEdges(
  outputs: RawParserOutput[],
  nodes: ServiceNode[],
): Edge[] {
  const edges: Edge[] = []

  for (const output of outputs) {
    const fromId = deriveServiceId(output.servicePath)

    for (const call of output.httpCalls) {
      const toId = resolveServiceId(call.url, nodes, outputs)

      // Skip self-loops
      if (toId === fromId) continue

      // Ensure target node exists (add external if needed — handled in buildGraph)
      edges.push({
        from: fromId,
        to: toId,
        method: call.method,
        path: extractPath(call.url),
        sourceFile: call.file,
        sourceLine: call.line,
      })
    }
  }

  return edges
}

function extractPath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/**
 * Builds Redis queue edges.
 * If service A publishes to queue X and service B consumes from queue X → Edge A→B (kind: queue).
 * If a queue has no consumer → Edge from publisher to the Redis infra node.
 *
 * Note: Edge type in shared/ doesn't have a `kind` field yet,
 * so we encode queue edges with method='GET' and path='queue:<name>'.
 * This can be extended when shared/ adds an EdgeKind type.
 */
export function buildRedisEdges(
  outputs: RawParserOutput[],
  nodes: ServiceNode[],
): Edge[] {
  const edges: Edge[] = []

  // Map: queueName → { publishers: serviceId[], consumers: serviceId[] }
  const queueMap = new Map<string, { publishers: string[]; consumers: string[] }>()

  for (const output of outputs) {
    const serviceId = deriveServiceId(output.servicePath)
    for (const call of output.redisCalls) {
      if (!queueMap.has(call.queueName)) {
        queueMap.set(call.queueName, { publishers: [], consumers: [] })
      }
      const entry = queueMap.get(call.queueName)!
      if (call.direction === 'publish') {
        if (!entry.publishers.includes(serviceId)) entry.publishers.push(serviceId)
      } else {
        if (!entry.consumers.includes(serviceId)) entry.consumers.push(serviceId)
      }
    }
  }

  const redisNodeExists = nodes.some((n) => n.id === 'redis')

  for (const [queueName, { publishers, consumers }] of queueMap) {
    for (const pub of publishers) {
      if (consumers.length > 0) {
        for (const con of consumers) {
          if (pub === con) continue
          edges.push({
            from: pub,
            to: con,
            method: 'POST',
            path: `queue:${queueName}`,
          })
        }
      } else if (redisNodeExists) {
        // No consumer known — edge to Redis infra node
        edges.push({
          from: pub,
          to: 'redis',
          method: 'POST',
          path: `queue:${queueName}`,
        })
      }
    }
  }

  return edges
}
