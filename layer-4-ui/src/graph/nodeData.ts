import type { ServiceNode, Route, Schema } from '@smart-map/shared'

export interface NodeDisplayData {
  id:         string
  name:       string
  language:   string
  framework:  string
  nodeType:   string
  routes:     Route[]
  schemas:    Schema[]
  envKeys:    string[]
}

export function toDisplayData(node: ServiceNode): NodeDisplayData {
  return {
    id:        node.id,
    name:      node.name,
    language:  node.language  ?? 'unknown',
    framework: node.framework ?? 'unknown',
    nodeType:  node.nodeType,
    routes:    node.routes    ?? [],
    schemas:   node.schemas   ?? [],
    envKeys:   node.envConfig ? Object.keys(node.envConfig) : [],
  }
}
