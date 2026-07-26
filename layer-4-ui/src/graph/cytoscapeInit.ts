/**
 * cytoscapeInit.ts
 */

import cytoscape from 'cytoscape'
import type { Core, ElementDefinition, StylesheetCSS, NodeSingular, EdgeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { GraphModel, ServiceNode, Edge, NodeType } from '@smart-map/shared'
import { emit } from '../lib/eventBus.js'
import { store } from '../store.js'

declare module 'cytoscape-dagre'

cytoscape.use(dagre as any)

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org'

const ICON_SLUG: Record<string, string> = {
  nextjs:         'nextdotjs',
  fastapi:        'fastapi',
  express:        'express',
  fastify:        'fastify',
  nestjs:         'nestjs',
  gin:            'go',
  postgres:       'postgresql',
  postgresql:     'postgresql',
  redis:          'redis',
  minio:          'minio',
  s3:             'amazons3',
  mongodb:        'mongodb',
  mysql:          'mysql',
  rabbitmq:       'rabbitmq',
  kafka:          'apachekafka',
  elasticsearch:  'elasticsearch',
}

const NODE_COLOR: Record<NodeType, { light: string; dark: string }> = {
  service:        { light: '#01696f', dark: '#4f98a3' },
  infrastructure: { light: '#437a22', dark: '#6daa45' },
  external:       { light: '#964219', dark: '#bb653b' },
}

function nodeShape(node: ServiceNode): string {
  if (node.nodeType === 'service') return 'roundrectangle'
  const dbFrameworks = new Set(['postgres', 'postgresql', 'mysql', 'mongodb', 'elasticsearch'])
  const isDb = dbFrameworks.has(node.id) || dbFrameworks.has(node.framework ?? '')
  return isDb ? 'ellipse' : 'hexagon'
}

export function getIconSlug(node: ServiceNode): string | null {
  return ICON_SLUG[node.id] ?? ICON_SLUG[node.framework ?? ''] ?? null
}

// ── edge key (дедупликация) ────────────────────────────────────────────────

export function edgeKey(edge: Edge): string {
  return `${edge.from}->${edge.to}::${edge.method ?? ''}:${edge.path ?? ''}`
}

// ── element builders ──────────────────────────────────────────────────────

function buildNodeElement(node: ServiceNode, isDark: boolean): ElementDefinition {
  const color = isDark
    ? NODE_COLOR[node.nodeType]?.dark ?? NODE_COLOR.service.dark
    : NODE_COLOR[node.nodeType]?.light ?? NODE_COLOR.service.light

  const slug    = getIconSlug(node)
  const iconUrl = slug ? `${SIMPLE_ICONS_CDN}/${slug}/ffffff` : ''

  return {
    data: {
      id:        node.id,
      label:     node.name,
      nodeType:  node.nodeType,
      framework: node.framework ?? '',
      shape:     nodeShape(node),
      color,
      iconUrl,
    },
  }
}

function buildEdgeElement(edge: Edge): ElementDefinition {
  return {
    data: {
      id:           edgeKey(edge),
      source:       edge.from,
      target:       edge.to,
      method:       edge.method ?? '',
      path:         edge.path ?? '',
      inputSchema:  edge.inputPayload?.schemaName  ?? '',
      outputSchema: edge.outputPayload?.schemaName ?? '',
    },
  }
}

// ── stylesheet ────────────────────────────────────────────────────────────

function buildStylesheet(isDark: boolean): StylesheetCSS[] {
  const primary   = isDark ? '#4f98a3' : '#01696f'
  const textColor = isDark ? '#d1d0ce' : '#1e1d19'
  const dimText   = isDark ? '#4e4d4b' : '#b0afa9'
  const dimBorder = isDark ? 0.12 : 0.10

  return [
    {
      selector: 'node',
      css: {
        'shape':                'data(shape)' as any,
        'background-color':     'data(color)' as any,
        'background-opacity':   0.18,
        'border-color':         'data(color)' as any,
        'border-width':         2,
        'border-opacity':       0.85,
        'label':                'data(label)' as any,
        'text-valign':          'center',
        'text-halign':          'center',
        'color':                textColor,
        'font-size':            12,
        'font-family':          'Inter',
        'font-weight':          '500' as any,
        'width':                120,
        'height':               44,
        'padding':              '10px' as any,
        'background-image':     'data(iconUrl)' as any,
        'background-fit':       'contain',
        'background-clip':      'none',
        'background-width':     '55%',
        'background-height':    '55%',
        'background-position-x': '50%',
        'background-position-y': '30%',
        'text-margin-y':        10,
        'transition-property':  'background-opacity border-width border-opacity color' as any,
        'transition-duration':  '200ms' as any,
        'transition-timing-function': 'ease-out' as any,
      },
    },
    {
      selector: 'node[iconUrl = ""]',
      css: {
        'background-width':  '0%' as any,
        'background-height': '0%' as any,
        'text-margin-y':     0,
      },
    },
    { selector: 'node.hover',        css: { 'background-opacity': 0.30, 'border-width': 3 } },
    { selector: 'node:selected',     css: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
    { selector: 'node.highlighted',  css: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
    {
      selector: 'node.dimmed',
      css: {
        'background-opacity': 0.05,
        'border-opacity':     dimBorder,
        'color':              dimText,
        'background-width':   '0%' as any,
        'background-height':  '0%' as any,
      },
    },
    {
      selector: 'edge',
      css: {
        'width':               2,
        'line-color':          primary,
        'line-opacity':        0.45,
        'target-arrow-color':  primary,
        'target-arrow-shape':  'triangle',
        'arrow-scale':         1.2,
        'curve-style':         'bezier',
        'transition-property': 'line-opacity width' as any,
        'transition-duration': '200ms' as any,
      },
    },
    { selector: 'edge.hover',       css: { 'line-opacity': 0.85, 'width': 3 } },
    {
      selector: 'edge.highlighted',
      css: {
        'width':             3,
        'line-opacity':      1,
        'line-style':        'dashed',
        'line-dash-pattern': [10, 6] as any,
        'line-dash-offset':  0,
        'target-arrow-shape': 'triangle',
      },
    },
    { selector: 'edge.dimmed', css: { 'line-opacity': 0.07, 'width': 1 } },
  ]
}

// ── DataFlow animation ────────────────────────────────────────────────────

let _dashTimer: ReturnType<typeof setInterval> | null = null
let _dashOffset = 0

export function startDashAnimation(cy: Core): void {
  if (_dashTimer) return
  _dashOffset = 0
  _dashTimer = setInterval(() => {
    _dashOffset = (_dashOffset - 2 + 10000) % 10000
    cy.edges('.highlighted').style('line-dash-offset', _dashOffset)
  }, 40)
}

export function stopDashAnimation(cy: Core): void {
  if (_dashTimer) { clearInterval(_dashTimer); _dashTimer = null }
  cy.edges('.highlighted').style('line-dash-offset', 0)
}

// ── highlight helpers ─────────────────────────────────────────────────────

export interface DataflowPathDef {
  name:    string
  nodeIds: string[]
}

export const DATAFLOW_PATHS: DataflowPathDef[] = [
  { name: 'Login Flow',  nodeIds: ['frontend', 'backend', 'postgres', 'redis'] },
  { name: 'File Upload', nodeIds: ['frontend', 'backend', 'minio'] },
  { name: 'Auth Check',  nodeIds: ['frontend', 'backend'] },
]

export function applyDataflowHighlight(cy: Core, pathIndex: 0 | 1 | 2): void {
  const path = DATAFLOW_PATHS[pathIndex]
  const activeNodeIds = new Set(path.nodeIds)
  cy.batch(() => {
    cy.elements().removeClass('highlighted dimmed')
    cy.nodes().forEach((node: NodeSingular) => {
      if (activeNodeIds.has(node.id())) node.addClass('highlighted')
      else                              node.addClass('dimmed')
    })
    cy.edges().forEach((edge: EdgeSingular) => {
      const srcOk = activeNodeIds.has(edge.data('source') as string)
      const tgtOk = activeNodeIds.has(edge.data('target') as string)
      if (srcOk && tgtOk) edge.addClass('highlighted')
      else                edge.addClass('dimmed')
    })
  })
}

export function clearDataflowHighlight(cy: Core): void {
  cy.elements().removeClass('highlighted dimmed')
}

export function highlightSelected(cy: Core, nodeId: string): void {
  cy.batch(() => {
    cy.elements().removeClass('highlighted dimmed')
    const node = cy.getElementById(nodeId)
    if (!node.length) return
    node.addClass('highlighted')
    node.connectedEdges().addClass('highlighted')
    node.connectedEdges().connectedNodes().addClass('highlighted')
    cy.elements().not('.highlighted').addClass('dimmed')
  })
}

// ── graph sync ────────────────────────────────────────────────────────────

/**
 * Полная синхронизация cy с GraphModel.
 * Перед добавлением рёбер — дедупликация по edgeKey.
 */
export function syncGraph(cy: Core, graph: GraphModel, isDark: boolean): void {
  cy.batch(() => {
    const existingNodeIds = new Set(cy.nodes().map((n: NodeSingular) => n.id()))
    const existingEdgeIds = new Set(cy.edges().map((e: EdgeSingular) => e.id()))

    // Добавить новые узлы
    for (const node of graph.nodes) {
      if (!existingNodeIds.has(node.id)) cy.add(buildNodeElement(node, isDark))
    }
    // Удалить пропавшие узлы
    const newNodeIds = new Set(graph.nodes.map((n: ServiceNode) => n.id))
    cy.nodes().forEach((n: NodeSingular) => { if (!newNodeIds.has(n.id())) n.remove() })

    // Дедуплицировать рёбра перед добавлением
    const seen = new Set<string>(existingEdgeIds)
    for (const edge of graph.edges) {
      const eid = edgeKey(edge)
      if (!seen.has(eid)) { seen.add(eid); cy.add(buildEdgeElement(edge)) }
    }
    // Удалить пропавшие рёбра
    const newEdgeIds = new Set(graph.edges.map((e: Edge) => edgeKey(e)))
    cy.edges().forEach((e: EdgeSingular) => { if (!newEdgeIds.has(e.id())) e.remove() })
  })
}

// ── event handlers ────────────────────────────────────────────────────────

function attachEventHandlers(cy: Core): void {
  cy.on('tap', 'node', (evt) => {
    const id = (evt.target as NodeSingular).id()
    store.selectNode(id)
    emit('node:select', id)
    if (!store.dataflowMode) highlightSelected(cy, id)
  })

  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      store.selectNode(null)
      emit('node:deselect', undefined)
      if (!store.dataflowMode) cy.elements().removeClass('highlighted dimmed')
    }
  })

  cy.on('mouseover', 'node', (evt) => {
    ;(evt.target as NodeSingular).addClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'pointer')
  })
  cy.on('mouseout', 'node', (evt) => {
    ;(evt.target as NodeSingular).removeClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'default')
  })

  cy.on('mouseover', 'edge', (evt) => {
    ;(evt.target as EdgeSingular).addClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'crosshair')
    const edge = evt.target as EdgeSingular
    emit('edge:mouseover', {
      edgeId:       edge.id(),
      method:       edge.data('method')       as string,
      path:         edge.data('path')         as string,
      inputSchema:  edge.data('inputSchema')  as string,
      outputSchema: edge.data('outputSchema') as string,
      x:            evt.renderedPosition.x,
      y:            evt.renderedPosition.y,
    })
  })

  cy.on('mousemove', 'edge', (evt) => {
    emit('edge:mousemove', { x: evt.renderedPosition.x, y: evt.renderedPosition.y })
  })

  cy.on('mouseout', 'edge', (evt) => {
    ;(evt.target as EdgeSingular).removeClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'default')
    emit('edge:mouseout', undefined)
  })
}

// ── layout ────────────────────────────────────────────────────────────────

export function runLayout(cy: Core, direction: 'TB' | 'LR' = 'TB'): void {
  cy.layout({
    name:    'dagre',
    rankDir: direction,
    nodeSep: 80,
    rankSep: 100,
    padding: 60,
  } as any).run()
}

export function updateTheme(cy: Core, isDark: boolean): void {
  cy.style(buildStylesheet(isDark) as any)
}

// ── init ──────────────────────────────────────────────────────────────────

export interface CytoscapeInitOptions {
  container: HTMLElement
  graph:     GraphModel
  isDark?:   boolean
}

export function initCytoscape({ container, graph, isDark = true }: CytoscapeInitOptions): Core {
  // Дедуплицируем рёбра по ключу перед передачей в Cytoscape
  const seenEdges = new Set<string>()
  const uniqueEdges = graph.edges.filter((e: Edge) => {
    const k = edgeKey(e)
    if (seenEdges.has(k)) return false
    seenEdges.add(k)
    return true
  })

  const elements: ElementDefinition[] = [
    ...graph.nodes.map((n: ServiceNode) => buildNodeElement(n, isDark)),
    ...uniqueEdges.map((e: Edge) => buildEdgeElement(e)),
  ]

  const cy = cytoscape({
    container,
    elements,
    style:           buildStylesheet(isDark) as any,
    layout:          { name: 'preset' },
    minZoom:         0.25,
    maxZoom:         3,
    autoungrabify:   false,
    autounselectify: false,
  })

  runLayout(cy)
  attachEventHandlers(cy)
  emit('cy:ready', cy)

  return cy
}
