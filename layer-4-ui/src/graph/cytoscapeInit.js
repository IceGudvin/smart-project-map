/**
 * cytoscapeInit.js
 */
import cytoscape from 'cytoscape';
import dagre    from 'cytoscape-dagre';
import { emit } from '../lib/eventBus.js';
import { store } from '../store.js';
cytoscape.use(dagre);

const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

const ICON_SLUG = {
    nextjs:        'nextdotjs',
    fastapi:       'fastapi',
    express:       'express',
    fastify:       'fastify',
    nestjs:        'nestjs',
    gin:           'go',
    postgres:      'postgresql',
    postgresql:    'postgresql',
    redis:         'redis',
    minio:         'minio',
    s3:            'amazons3',
    mongodb:       'mongodb',
    mysql:         'mysql',
    rabbitmq:      'rabbitmq',
    kafka:         'apachekafka',
    elasticsearch: 'elasticsearch',
};

const NODE_COLOR = {
    service:        { light: '#01696f', dark: '#4f98a3' },
    infrastructure: { light: '#437a22', dark: '#6daa45' },
    external:       { light: '#964219', dark: '#bb653b' },
};

// Node dimensions — must match stylesheet width/height
const NODE_W = 120;
const NODE_H = 44;
// Icon badge size and margin
const ICON_SIZE   = 16;
const ICON_MARGIN = 4;
// Absolute pixel positions for top-right badge
// Cytoscape background-position is relative to (node_width - icon_width)
// so right-edge offset = NODE_W - ICON_SIZE - ICON_MARGIN
const ICON_POS_X = NODE_W - ICON_SIZE - ICON_MARGIN;  // 100
const ICON_POS_Y = ICON_MARGIN;                        // 4

function nodeShape(node) {
    if (node.nodeType === 'service') return 'roundrectangle';
    const dbSet = new Set(['postgres','postgresql','mysql','mongodb','elasticsearch']);
    return (dbSet.has(node.id) || dbSet.has(node.framework)) ? 'ellipse' : 'hexagon';
}

export function getIconSlug(node) {
    return ICON_SLUG[node.id] ?? ICON_SLUG[node.framework] ?? null;
}

function buildNodeElement(node, isDark) {
    const color   = isDark
        ? NODE_COLOR[node.nodeType]?.dark   ?? NODE_COLOR.service.dark
        : NODE_COLOR[node.nodeType]?.light  ?? NODE_COLOR.service.light;
    const slug    = getIconSlug(node);
    const iconColor = isDark ? 'ffffff' : color.replace('#', '');
    const iconUrl = slug ? `${SIMPLE_ICONS_CDN}/${slug}/${iconColor}` : '';
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

function edgeGroupKey(edge) {
    return `${edge.from ?? edge.source}->${edge.to ?? edge.target}`;
}

function groupEdges(edges) {
    const groups = new Map();
    for (const e of edges) {
        const gk = edgeGroupKey(e);
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk).push(e);
    }
    const result = [];
    for (const [, group] of groups) {
        const first = group[0];
        const count = group.length;
        result.push({
            data: {
                id:           edgeGroupKey(first),
                source:       first.from ?? first.source,
                target:       first.to   ?? first.target,
                method:       count === 1 ? (first.method ?? '') : '',
                path:         count === 1 ? (first.path   ?? '') : '',
                count,
                label:        count > 1 ? `×${count}` : '',
                inputSchema:  first.inputPayload?.schemaName  ?? '',
                outputSchema: first.outputPayload?.schemaName ?? '',
                routes: group.map(e => ({
                    method: e.method ?? '',
                    path:   e.path   ?? '',
                    inputSchema:  e.inputPayload?.schemaName  ?? '',
                    outputSchema: e.outputPayload?.schemaName ?? '',
                })),
            },
        });
    }
    return result;
}

function buildStylesheet(isDark) {
    const primary        = isDark ? '#4f98a3' : '#01696f';
    const textColor      = isDark ? '#d1d0ce' : '#1e1d19';
    const dimText        = isDark ? '#4e4d4b' : '#b0afa9';
    const dimBorder      = isDark ? 0.12 : 0.10;
    const edgeLabelColor = isDark ? '#9a9896' : '#7a7974';
    return [
        // ---- base node
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
                'font-size':          11,
                'font-family':        'Inter',
                'font-weight':        '500',
                'width':              NODE_W,
                'height':             NODE_H,
                'padding':            '10px',
                'background-image':            'none',
                'background-width':            0,
                'background-height':           0,
                // FIX: plain numbers — Cytoscape does NOT support calc() in position props
                'background-position-x':       0,
                'background-position-y':       0,
                'background-image-opacity':    0,
                'transition-property':         'background-opacity border-width border-opacity color',
                'transition-duration':         '200ms',
                'transition-timing-function':  'ease-out',
            },
        },
        // ---- nodes with icon: small 16×16 badge, top-right corner
        {
            selector: 'node[iconUrl != ""]',
            style: {
                'background-image':         'data(iconUrl)',
                'background-fit':           'none',
                'background-clip':          'none',
                'background-repeat':        'no-repeat',
                'background-width':         ICON_SIZE,
                'background-height':        ICON_SIZE,
                // FIX: absolute pixel offsets — no calc(), no percentages with expressions
                'background-position-x':    ICON_POS_X,
                'background-position-y':    ICON_POS_Y,
                'background-image-opacity': 0.80,
            },
        },
        { selector: 'node.hover',       style: { 'background-opacity': 0.30, 'border-width': 3 } },
        { selector: 'node:selected',    style: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
        { selector: 'node.highlighted', style: { 'background-opacity': 0.38, 'border-width': 3, 'border-opacity': 1 } },
        {
            selector: 'node.dimmed',
            style: {
                'background-opacity':       0.05,
                'border-opacity':           dimBorder,
                'color':                    dimText,
                'background-image':         'none',
                'background-width':         0,
                'background-height':        0,
                'background-image-opacity': 0,
            },
        },
        // ---- base edge
        {
            selector: 'edge',
            style: {
                'width':               2,
                'line-color':          primary,
                'line-opacity':        0.40,
                'target-arrow-color':  primary,
                'target-arrow-shape':  'triangle',
                'arrow-scale':         1.0,
                'curve-style':         'bezier',
                'label':               'data(label)',
                'font-size':           9,
                'font-family':         'Inter',
                'color':               edgeLabelColor,
                'text-background-color':   isDark ? '#1c1b19' : '#f9f8f5',
                'text-background-opacity': 0.85,
                'text-background-padding': '2px',
                'transition-property': 'line-opacity width',
                'transition-duration': '200ms',
            },
        },
        { selector: 'edge[count > 1]',   style: { 'width': 2.5 } },
        { selector: 'edge[count > 5]',   style: { 'width': 3   } },
        { selector: 'edge[count > 15]',  style: { 'width': 3.5 } },
        { selector: 'edge.hover',        style: { 'line-opacity': 0.90, 'width': 4 } },
        {
            selector: 'edge.highlighted',
            style: {
                'width':              3.5,
                'line-opacity':       1,
                'line-style':         'dashed',
                'line-dash-pattern':  [10, 6],
                'line-dash-offset':   0,
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
        cy.nodes().forEach(n => {
            if (activeNodeIds.has(n.id())) n.addClass('highlighted');
            else                           n.addClass('dimmed');
        });
        cy.edges().forEach(e => {
            const ok = activeNodeIds.has(e.data('source')) && activeNodeIds.has(e.data('target'));
            e.addClass(ok ? 'highlighted' : 'dimmed');
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

// ================================================================ syncGraph
export function syncGraph(cy, graph, isDark) {
    if (!graph?.nodes) return;

    const seenEdges = new Set();
    const uniqueEdges = graph.edges.filter(e => {
        const k = edgeKey(e);
        if (seenEdges.has(k)) return false;
        seenEdges.add(k);
        return true;
    });

    const nodeEls = graph.nodes.map(n => buildNodeElement(n, isDark));
    const edgeEls = groupEdges(uniqueEdges);

    cy.batch(() => {
        cy.elements().remove();
        cy.add([...nodeEls, ...edgeEls]);
    });
    runLayout(cy);
}

// ================================================================ event handlers
function attachEventHandlers(cy) {
    cy.on('tap', 'node', evt => {
        const id = evt.target.id();
        store.selectNode(id);
        emit('node:select', id);
        if (!store.dataflowMode) highlightSelected(cy, id);
    });
    cy.on('tap', evt => {
        if (evt.target === cy) {
            store.selectNode(null);
            emit('node:deselect', undefined);
            if (!store.dataflowMode) cy.elements().removeClass('highlighted dimmed');
        }
    });
    cy.on('mouseover', 'node', evt => {
        evt.target.addClass('hover');
        cy.container()?.style.setProperty('cursor', 'pointer');
    });
    cy.on('mouseout', 'node', evt => {
        evt.target.removeClass('hover');
        cy.container()?.style.setProperty('cursor', 'default');
    });
    cy.on('mouseover', 'edge', evt => {
        evt.target.addClass('hover');
        cy.container()?.style.setProperty('cursor', 'crosshair');
        const edge = evt.target;
        emit('edge:mouseover', {
            edgeId:       edge.id(),
            method:       edge.data('method'),
            path:         edge.data('path'),
            count:        edge.data('count'),
            routes:       edge.data('routes'),
            inputSchema:  edge.data('inputSchema'),
            outputSchema: edge.data('outputSchema'),
            x:            evt.renderedPosition.x,
            y:            evt.renderedPosition.y,
        });
    });
    cy.on('mousemove', 'edge', evt => {
        emit('edge:mousemove', { x: evt.renderedPosition.x, y: evt.renderedPosition.y });
    });
    cy.on('mouseout', 'edge', evt => {
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
        rankSep: 120,
        padding: 60,
    }).run();
}

export function updateTheme(cy, isDark) {
    cy.style(buildStylesheet(isDark));
    if (cy.nodes().length > 0) {
        cy.nodes().forEach(n => {
            const slug = ICON_SLUG[n.id()] ?? ICON_SLUG[n.data('framework')] ?? null;
            if (slug) {
                const color = n.data('color').replace('#', '');
                const iconColor = isDark ? 'ffffff' : color;
                n.data('iconUrl', `${SIMPLE_ICONS_CDN}/${slug}/${iconColor}`);
            }
        });
    }
}

// ================================================================ init
export function initCytoscape({ container, graph, isDark = true }) {
    const seenEdges = new Set();
    const edges = (graph?.edges ?? []).filter(e => {
        const k = edgeKey(e);
        if (seenEdges.has(k)) return false;
        seenEdges.add(k);
        return true;
    });

    const elements = graph?.nodes?.length
        ? [
            ...graph.nodes.map(n => buildNodeElement(n, isDark)),
            ...groupEdges(edges),
          ]
        : [];

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

    if (elements.length) runLayout(cy);
    attachEventHandlers(cy);
    emit('cy:ready', cy);
    return cy;
}
