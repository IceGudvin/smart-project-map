import { parseProject } from './layer-1-parser/dist/index.js'
import { buildGraph } from './layer-2-graph/dist/index.js'

const backendOutputs = await parseProject('C:/Users/Кирилл/Desktop/leadway/backend')
const agentOutputs   = await parseProject('C:/Users/Кирилл/Desktop/leadway/agent')

console.log('backend outputs count:', backendOutputs.length)
console.log('agent outputs count:', agentOutputs.length)

const first = backendOutputs[0]
console.log('\nFirst backend output keys:', Object.keys(first))
console.log('servicePath:', first.servicePath)
console.log('routes:', first.routes?.length)
console.log('httpCalls:', first.httpCalls?.length)
console.log('redisCalls:', first.redisCalls?.length)

// Теперь передаём все outputs сразу в buildGraph
const allOutputs = [...backendOutputs, ...agentOutputs]
const graph = buildGraph(allOutputs)

console.log('\n=== NODES ===')
console.log('Total:', graph.nodes.length)
graph.nodes.forEach(n =>
  console.log(` [${n.nodeType}] ${n.id} — routes: ${n.routes.length}, deps: ${n.dependencies.join(', ') || 'none'}`)
)

console.log('\n=== EDGES ===')
console.log('Total:', graph.edges.length)
const httpEdges  = graph.edges.filter(e => !e.path.startsWith('queue:'))
const queueEdges = graph.edges.filter(e => e.path.startsWith('queue:'))
console.log(' HTTP edges:', httpEdges.length)
console.log(' Queue edges:', queueEdges.length)
queueEdges.forEach(e => console.log(`  ${e.from} → ${e.to}  [${e.path}]`))