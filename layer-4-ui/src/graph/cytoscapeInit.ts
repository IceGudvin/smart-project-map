/**
 * cytoscapeInit.ts — Полная реализация инициализации Cytoscape-графа.
 *
 * Отвечает за:
 *   - Регистрацию плагина dagre
 *   - Стили узлов по типу (roundrectangle / ellipse / hexagon)
 *   - Фоновые иконки через Simple Icons CDN
 *   - Состояния highlighted / dimmed с плавным переходом
 *   - DataFlow анимацию рёбер через line-dash-offset + JS-таймер
 *   - Обработчики: tap node/bg, mouseover/move/out edge
 */

import cytoscape from 'cytoscape'
import type { Core, ElementDefinition, Stylesheet, NodeSingular, EdgeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import type { GraphModel, ServiceNode, Edge, NodeType, Framework } from '../../../shared/src/graph.js'
import { emit } from '../lib/eventBus.js'
import { store } from '../store.js'

cytoscape.use(dagre as any)

// ================================================================ constants

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org'

/** Маппинг framework/инфра → слаг Simple Icons */
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

/** Цвет узла в light/dark по NodeType */
const NODE_COLOR: Record<NodeType, { light: string; dark: string }> = {
  service:        { light: '#01696f', dark: '#4f98a3' },
  infrastructure: { light: '#437a22', dark: '#6daa45' },
  external:       { light: '#964219', dark: '#bb653b' },
}

/** Форма узла по NodeType + роль */
function nodeShape(node: ServiceNode): string {
  if (node.nodeType === 'service') return 'roundrectangle'
  // infrastructure: DB → ellipse, кэш / очередь → hexagon
  const dbFrameworks = new Set(['postgres', 'postgresql', 'mysql', 'mongodb', 'elasticsearch'])
  const isDb = dbFrameworks.has(node.id) || dbFrameworks.has(node.framework)
  return isDb ? 'ellipse' : 'hexagon'
}

/** Слаг иконки для Simple Icons CDN */
export function getIconSlug(node: ServiceNode): string | null {
  return ICON_SLUG[node.id] ?? ICON_SLUG[node.framework] ?? null
}

// ================================================================ element builders

function buildNodeElement(node: ServiceNode, isDark: boolean): ElementDefinition {
  const color = isDark
    ? NODE_COLOR[node.nodeType]?.dark ?? NODE_COLOR.service.dark
    : NODE_COLOR[node.nodeType]?.light ?? NODE_COLOR.service.light

  const slug    = getIconSlug(node)
  // Simple Icons выдает белые иконки на тёмном фоне (последний сегмент пути = HEX)
  const iconUrl = slug ? `${SIMPLE_ICONS_CDN}/${slug}/ffffff` : ''

  return {
    data: {
      id:        node.id,
      label:     node.name,
      nodeType:  node.nodeType,
      framework: node.framework,
      shape:     nodeShape(node),
      color,
      iconUrl,
    },
  }
}

function buildEdgeElement(edge: Edge): ElementDefinition {
  return {
    data: {
      id:           `${edge.from}->${edge.to}::${edge.method}:${edge.path}`,
      source:       edge.from,
      target:       edge.to,
      method:       edge.method,
      path:         edge.path,
      inputSchema:  edge.inputPayload?.schemaName  ?? '',
      outputSchema: edge.outputPayload?.schemaName ?? '',
    },
  }
}

// ================================================================ stylesheet

function buildStylesheet(isDark: boolean): Stylesheet[] {
  const primary   = isDark ? '#4f98a3' : '#01696f'
  const textColor = isDark ? '#d1d0ce' : '#1e1d19'
  const dimText   = isDark ? '#4e4d4b' : '#b0afa9'
  const dimBorder = isDark ? 0.12 : 0.10

  return [
    // ---- base node
    {
      selector: 'node',
      style: {
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
        // Cytoscape поддерживает только одно имя шрифта без кавычек
        'font-family':          'Inter',
        'font-weight':          '500' as any,
        'width':                120,
        'height':               44,
        'padding':              '10px' as any,
        // Иконка через background-image
        'background-image':     'data(iconUrl)' as any,
        'background-fit':       'contain',
        'background-clip':      'none',
        'background-width':     '55%',
        'background-height':    '55%',
        'background-position-x': '50%',
        'background-position-y': '30%',
        'text-margin-y':        10,
        // Плавный переход
        'transition-property':  'background-opacity border-width border-opacity color' as any,
        'transition-duration':  '200ms' as any,
        'transition-timing-function': 'ease-out' as any,
      },
    },
    // ---- node без иконки
    {
      selector: 'node[iconUrl = ""]',
      style: {
        'background-width':  '0%',
        'background-height': '0%',
        'text-margin-y':     0,
      },
    },
    // ---- hover
    {
      selector: 'node.hover',
      style: {
        'background-opacity': 0.30,
        'border-width':       3,
      },
    },
    // ---- selected
    {
      selector: 'node:selected',
      style: {
        'background-opacity': 0.38,
        'border-width':       3,
        'border-opacity':     1,
      },
    },
    // ---- highlighted
    {
      selector: 'node.highlighted',
      style: {
        'background-opacity': 0.38,
        'border-width':       3,
        'border-opacity':     1,
      },
    },
    // ---- dimmed
    {
      selector: 'node.dimmed',
      style: {
        'background-opacity': 0.05,
        'border-opacity':     dimBorder,
        'color':              dimText,
        'background-width':   '0%',
        'background-height':  '0%',
      },
    },
    // ---- base edge
    {
      selector: 'edge',
      style: {
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
    // ---- edge hover
    {
      selector: 'edge.hover',
      style: {
        'line-opacity': 0.85,
        'width':        3,
      },
    },
    // ---- highlighted edge (DataFlow анимация)
    {
      selector: 'edge.highlighted',
      style: {
        'width':             3,
        'line-opacity':      1,
        'line-style':        'dashed',
        'line-dash-pattern': [10, 6] as any,
        'line-dash-offset':  0,
        'target-arrow-shape': 'triangle',
      },
    },
    // ---- dimmed edge
    {
      selector: 'edge.dimmed',
      style: {
        'line-opacity': 0.07,
        'width':        1,
      },
    },
  ]
}

// ================================================================ DataFlow animation

let _dashTimer: ReturnType<typeof setInterval> | null = null
let _dashOffset = 0

/** Запустить анимацию дашед на рёбрах с классом highlighted */
export function startDashAnimation(cy: Core): void {
  if (_dashTimer) return
  _dashOffset = 0
  _dashTimer = setInterval(() => {
    _dashOffset = (_dashOffset - 2 + 10000) % 10000
    cy.edges('.highlighted').style('line-dash-offset', _dashOffset)
  }, 40) // ~25fps
}

/** Остановить анимацию */
export function stopDashAnimation(cy: Core): void {
  if (_dashTimer) { clearInterval(_dashTimer); _dashTimer = null }
  cy.edges('.highlighted').style('line-dash-offset', 0)
}

// ================================================================ highlight helpers

export interface DataflowPathDef {
  name:    string
  nodeIds: string[]
}

/** Три предустановленных DataFlow-пути */
export const DATAFLOW_PATHS: DataflowPathDef[] = [
  { name: 'Login Flow',  nodeIds: ['frontend', 'backend', 'postgres', 'redis'] },
  { name: 'File Upload', nodeIds: ['frontend', 'backend', 'minio'] },
  { name: 'Auth Check',  nodeIds: ['frontend', 'backend'] },
]

/** Применить highlighted/dimmed по DataFlow-пути */
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

/** Снять все DataFlow-классы */
export function clearDataflowHighlight(cy: Core): void {
  cy.elements().removeClass('highlighted dimmed')
}

/** Подсветить выбранный узел + соседей */
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

// ================================================================ graph sync

/**
 * Синхронизирует элементы cy с новым GraphModel (дельта).
 */
export function syncGraph(cy: Core, graph: GraphModel, isDark: boolean): void {
  cy.batch(() => {
    const existingNodeIds = new Set(cy.nodes().map((n: NodeSingular) => n.id()))
    const existingEdgeIds = new Set(cy.edges().map((e: EdgeSingular) => e.id()))

    for (const node of graph.nodes) {
      if (!existingNodeIds.has(node.id)) cy.add(buildNodeElement(node, isDark))
    }
    const newNodeIds = new Set(graph.nodes.map(n => n.id))
    cy.nodes().forEach((n: NodeSingular) => { if (!newNodeIds.has(n.id())) n.remove() })

    for (const edge of graph.edges) {
      const eid = `${edge.from}->${edge.to}::${edge.method}:${edge.path}`
      if (!existingEdgeIds.has(eid)) cy.add(buildEdgeElement(edge))
    }
    const newEdgeIds = new Set(
      graph.edges.map(e => `${e.from}->${e.to}::${e.method}:${e.path}`)
    )
    cy.edges().forEach((e: EdgeSingular) => { if (!newEdgeIds.has(e.id())) e.remove() })
  })
}

// ================================================================ event handlers

function attachEventHandlers(cy: Core): void {
  // ---- tap node → node:select
  cy.on('tap', 'node', (evt) => {
    const node = evt.target as NodeSingular
    const id   = node.id()
    store.selectNode(id)
    emit('node:select', id)
    if (!store.dataflowMode) highlightSelected(cy, id)
  })

  // ---- tap background → node:deselect
  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      store.selectNode(null)
      emit('node:deselect', undefined)
      if (!store.dataflowMode) cy.elements().removeClass('highlighted dimmed')
    }
  })

  // ---- node hover
  cy.on('mouseover', 'node', (evt) => {
    ;(evt.target as NodeSingular).addClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'pointer')
  })
  cy.on('mouseout', 'node', (evt) => {
    ;(evt.target as NodeSingular).removeClass('hover')
    ;(cy.container() as HTMLElement | null)?.style.setProperty('cursor', 'default')
  })

  // ---- edge hover → EdgeTooltip
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

// ================================================================ layout

export function runLayout(cy: Core, direction: 'TB' | 'LR' = 'TB'): void {
  cy.layout({
    name:    'dagre',
    rankDir: direction,
    nodeSep: 80,
    rankSep: 100,
    padding: 60,
  } as any).run()
}

// ================================================================ main export

export interface CytoscapeInitOptions {
  container: HTMLElement
  graph:     GraphModel
  isDark?:   boolean
}

/**
 * Инициализирует Cytoscape, навешивает стили, запускает лейаут, привязывает события.
 */
export function initCytoscape({ container, graph, isDark = true }: CytoscapeInitOptions): Core {
  const elements: ElementDefinition[] = [
    ...graph.nodes.map(n => buildNodeElement(n, isDark)),
    ...graph.edges.map(e => buildEdgeElement(e)),
  ]

  const cy = cytoscape({
    container,
    elements,
    style:           buildStylesheet(isDark),
    layout:          { name: 'preset' },
    minZoom:         0.25,
    maxZoom:         3,
    // wheelSensitivity намеренно не задаётся — используем дефолт Cytoscape (1)
    // чтобы скролл работал одинаково на всех мышах и ОС
    autoungrabify:   false,
    autounselectify: false,
  })

  runLayout(cy)
  attachEventHandlers(cy)
  emit('cy:ready', cy)

  return cy
}

/**
 * Перестроить стили после смены темы.
 */
export function updateTheme(cy: Core, isDark: boolean): void {
  cy.style(buildStylesheet(isDark) as any)
}
