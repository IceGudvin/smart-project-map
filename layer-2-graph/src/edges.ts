import type { RawParserOutput } from '@smart-map/shared'
import type { Edge, ServiceNode } from '@smart-map/shared'
import { resolveServiceId, deriveServiceId } from './resolver.js'

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

function extractPath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname
  } catch {
    return rawUrl
  }
}

/**
 * Builds Redis queue edges.
 * publish A + consume B on same queue → Edge A→B.
 * publish with no consumer → Edge to Redis infra node.
 *
 * Queue edges are encoded as method='POST', path='queue:<name>'.
 */
export function buildRedisEdges(
  outputs: RawParserOutput[],
  nodes: ServiceNode[],
): Edge[] {
  const edges: Edge[] = []

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
