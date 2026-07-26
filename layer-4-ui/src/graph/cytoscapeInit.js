/**
 * cytoscapeInit.js
 */
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { emit } from '../lib/eventBus.js';
import { store } from '../store.js';
cytoscape.use(dagre);

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

const ICON_SLUG = {
    nextjs: 'nextdotjs',
    fastapi: 'fastapi',
    express: 'express',
    fastify: 'fastify',
    nestjs: 'nestjs',
    gin: 'go',
    postgres: 'postgresql',
    postgresql: 'postgresql',
    redis: 'redis',
    minio: 'minio',
    s3: 'amazons3',
    mongodb: 'mongodb',
    mysql: 'mysql',
    rabbitmq: 'rabbitmq',
    kafka: 'apachekafka',
    elasticsearch: 'elasticsearch',
};

const NODE_COLOR = {
    service:        { light: '#01696f', dark: '#4f98a3' },
    infrastructure: { light: '#437a22', dark: '#6daa45' },
    external:       { light: '#964219', dark: '#bb653b' },
};

function nodeShape(node) {
    if (node.nodeType === 'service') return 'roundrectangle';
    const dbFrameworks = new Set(['postgres', 'postgresql', 'mysql', 'mongodb', 'elasticsearch']);
    const isDb = dbFrameworks.has(node.id) || dbFrameworks.has(node.framework);
    return isDb ? 'ellipse' : 'hexagon';
}

export function getIconSlug(node) {
    return ICON_SLUG[node.id] ?? ICON_SLUG[node.framework] ?? null;
}

function buildNodeElement(node, isDark) {
    const color = isDark
        ? NODE_COLOR[node.nodeType]?.dark ?? NODE_COLOR.service.dark
        : NODE_COLOR[node.nodeType]?.light ?? NODE_COLOR.service.light;
    const slug    = getIconSlug(node);
    // Если слаг есть — полный URL, иначе — пустая строка (селектор node[iconUrl=""] скроет настройки)
    const iconUrl = slug ? `${SIMPLE_ICONS_CDN}/${slug}/ffffff` : '';
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
    };
}

export function edgeKey(edge) {
    return `${edge.from}->${edge.to}::${edge.method ?? ''}:${edge.path ?? ''}`;
}

function buildEdgeElement(edge) {
    return {
        data: {
            id:           edgeKey(edge),
            source:       edge.from,
            target:       edge.to,
            method:       edge.method  ?? '',
            path:         edge.path    ?? '',
            inputSchema:  edge.inputPayload?.schemaName  ?? '',
            outputSchema: edge.outputPayload?.schemaName ?? '',
        },
    };
}

function buildStylesheet(isDark) {
    const primary   = isDark ? '#4f98a3' : '#01696f';
    const textColor = isDark ? '#d1d0ce' : '#1e1d19';
    const dimText   = isDark ? '#4e4d4b' : '#b0afa9';
    const dimBorder = isDark ? 0.12 : 0.10;
    return [
        {
            selector: 'node',
            style: {
                'shape':              'data(shape)',
                'background-color':   'data(color)',
                'background-opacity': 0.18,
                'border-color':       'data(color)',
                'border-width':       2,
                'border-opacity':     0.85,
                'label':              'data(label)',
                'text-valign':        'center',
                'text-halign':        'center',
                'color':              textColor,
                'font-size':          12,
                'font-family':        'Inter',
                'font-weight':        '500',
                'width':              120,
                'height':             44,
                'padding':            '10px',
                // Базовое значение none — переопределяется селектором node[iconUrl != ""] ниже
                'background-image':   'none',
                'background-fit':     'contain',
                'background-clip':    'none',
                'background-width':   '0%',
                'background-height':  '0%',
                'text-margin-y':      0,
                'transition-property':  'background-opacity border-width border-opacity color',
                'transition-duration':  '200ms',
                'transition-timing-function': 'ease-out',
            },
        },
        // Узлы С иконкой — применяем URL из data
        {
            selector: 'node[iconUrl != ""]',
            style: {
                'background-image':      'data(iconUrl)',
                'background-width':      '55%',
                'background-height':     '55%',
                'background-position-x': '50%',
                'background-position-y': '30%',
                'text-margin-y':         10,
            },
        },
        { selector: 'node.hover',       style: { 'background-opacity': 0.30, 'border-width': 3 } },
        { selector: 'node:selected',    style: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
        { selector: 'node.highlighted', style: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
        {
            selector: 'node.dimmed',
            style: {
                'background-opacity': 0.05,
                'border-opacity':     dimBorder,
                'color':              dimText,
                'background-image':   'none',
                'background-width':   '0%',
                'background-height':  '0%',
            },
        },
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
                'transition-property': 'line-opacity width',
                'transition-duration': '200ms',
            },
        },
        { selector: 'edge.hover',       style: { 'line-opacity': 0.85, 'width': 3 } },
        {
            selector: 'edge.highlighted',
            style: {
                'width':             3,
                'line-opacity':      1,
                'line-style':        'dashed',
                'line-dash-pattern': [10, 6],
                'line-dash-offset':  0,
                'target-arrow-shape': 'triangle',
            },
        },
        { selector: 'edge.dimmed', style: { 'line-opacity': 0.07, 'width': 1 } },
    ];
}

// ================================================================ DataFlow animation
let _dashTimer  = null;
let _dashOffset = 0;

export function startDashAnimation(cy) {
    if (_dashTimer) return;
    _dashOffset = 0;
    _dashTimer = setInterval(() => {
        _dashOffset = (_dashOffset - 2 + 10000) % 10000;
        cy.edges('.highlighted').style('line-dash-offset', _dashOffset);
    }, 40);
}

export function stopDashAnimation(cy) {
    if (_dashTimer) { clearInterval(_dashTimer); _dashTimer = null; }
    cy.edges('.highlighted').style('line-dash-offset', 0);
}

export const DATAFLOW_PATHS = [
    { name: 'Login Flow',  nodeIds: ['frontend', 'backend', 'postgres', 'redis'] },
    { name: 'File Upload', nodeIds: ['frontend', 'backend', 'minio'] },
    { name: 'Auth Check',  nodeIds: ['frontend', 'backend'] },
];

export function applyDataflowHighlight(cy, pathIndex) {
    const path = DATAFLOW_PATHS[pathIndex];
    const activeNodeIds = new Set(path.nodeIds);
    cy.batch(() => {
        cy.elements().removeClass('highlighted dimmed');
        cy.nodes().forEach((node) => {
            if (activeNodeIds.has(node.id())) node.addClass('highlighted');
            else                              node.addClass('dimmed');
        });
        cy.edges().forEach((edge) => {
            const srcOk = activeNodeIds.has(edge.data('source'));
            const tgtOk = activeNodeIds.has(edge.data('target'));
            if (srcOk && tgtOk) edge.addClass('highlighted');
            else                edge.addClass('dimmed');
        });
    });
}

export function clearDataflowHighlight(cy) {
    cy.elements().removeClass('highlighted dimmed');
}

export function highlightSelected(cy, nodeId) {
    cy.batch(() => {
        cy.elements().removeClass('highlighted dimmed');
        const node = cy.getElementById(nodeId);
        if (!node.length) return;
        node.addClass('highlighted');
        node.connectedEdges().addClass('highlighted');
        node.connectedEdges().connectedNodes().addClass('highlighted');
        cy.elements().not('.highlighted').addClass('dimmed');
    });
}

// ================================================================ graph sync
/**
 * Полная замена всех элементов cy.
 * Ремов всех → дедупликация рёбер → добавление → layout.
 */
export function syncGraph(cy, graph, isDark) {
    const seenEdges = new Set();
    const uniqueEdges = graph.edges.filter((e) => {
        const k = edgeKey(e);
        if (seenEdges.has(k)) return false;
        seenEdges.add(k);
        return true;
    });

    const nodeEls = graph.nodes.map((n) => buildNodeElement(n, isDark));
    const edgeEls = uniqueEdges.map((e) => buildEdgeElement(e));

    cy.batch(() => {
        cy.elements().remove();
        cy.add([...nodeEls, ...edgeEls]);
    });

    runLayout(cy);
}

// ================================================================ event handlers
function attachEventHandlers(cy) {
    cy.on('tap', 'node', (evt) => {
        const id = evt.target.id();
        store.selectNode(id);
        emit('node:select', id);
        if (!store.dataflowMode) highlightSelected(cy, id);
    });
    cy.on('tap', (evt) => {
        if (evt.target === cy) {
            store.selectNode(null);
            emit('node:deselect', undefined);
            if (!store.dataflowMode) cy.elements().removeClass('highlighted dimmed');
        }
    });
    cy.on('mouseover', 'node', (evt) => {
        evt.target.addClass('hover');
        cy.container()?.style.setProperty('cursor', 'pointer');
    });
    cy.on('mouseout', 'node', (evt) => {
        evt.target.removeClass('hover');
        cy.container()?.style.setProperty('cursor', 'default');
    });
    cy.on('mouseover', 'edge', (evt) => {
        evt.target.addClass('hover');
        cy.container()?.style.setProperty('cursor', 'crosshair');
        const edge = evt.target;
        emit('edge:mouseover', {
            edgeId:       edge.id(),
            method:       edge.data('method'),
            path:         edge.data('path'),
            inputSchema:  edge.data('inputSchema'),
            outputSchema: edge.data('outputSchema'),
            x:            evt.renderedPosition.x,
            y:            evt.renderedPosition.y,
        });
    });
    cy.on('mousemove', 'edge', (evt) => {
        emit('edge:mousemove', { x: evt.renderedPosition.x, y: evt.renderedPosition.y });
    });
    cy.on('mouseout', 'edge', (evt) => {
        evt.target.removeClass('hover');
        cy.container()?.style.setProperty('cursor', 'default');
        emit('edge:mouseout', undefined);
    });
}

// ================================================================ layout
export function runLayout(cy, direction = 'TB') {
    cy.layout({
        name:    'dagre',
        rankDir: direction,
        nodeSep: 80,
        rankSep: 100,
        padding: 60,
    }).run();
}

export function updateTheme(cy, isDark) {
    cy.style(buildStylesheet(isDark));
}

// ================================================================ init
export function initCytoscape({ container, graph, isDark = true }) {
    const seenEdges = new Set();
    const uniqueEdges = graph.edges.filter((e) => {
        const k = edgeKey(e);
        if (seenEdges.has(k)) return false;
        seenEdges.add(k);
        return true;
    });

    const elements = [
        ...graph.nodes.map(n => buildNodeElement(n, isDark)),
        ...uniqueEdges.map(e => buildEdgeElement(e)),
    ];

    const cy = cytoscape({
        container,
        elements,
        style:           buildStylesheet(isDark),
        layout:          { name: 'preset' },
        minZoom:         0.25,
        maxZoom:         3,
        autoungrabify:   false,
        autounselectify: false,
    });

    runLayout(cy);
    attachEventHandlers(cy);
    emit('cy:ready', cy);
    return cy;
}
