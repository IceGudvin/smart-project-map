/**
 * cytoscapeInit.ts
 * Инициализация и конфигурация Cytoscape-графа.
 * Регистрирует плагин dagre, задаёт стили узлов/рёбер, layout.
 * Экспортирует функцию initCytoscape(container, data) → Core.
 */

import cytoscape, { Core, ElementDefinition, Stylesheet } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { GraphData, ServiceNode, ServiceEdge } from '../../../shared/src/types';

cytoscape.use(dagre);

// ─── Стили ───────────────────────────────────────────────────────────────────

function buildStylesheet(isDark: boolean): Stylesheet[] {
  const primary   = isDark ? '#4f98a3' : '#01696f';
  const success   = isDark ? '#6daa45' : '#437a22';
  const warning   = isDark ? '#bb653b' : '#964219';
  const textColor = isDark ? '#cdccca' : '#28251d';
  const dimText   = isDark ? '#5a5957' : '#bab9b4';

  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(bg)',
        'background-opacity': 0.15,
        'border-color': 'data(bg)',
        'border-width': 2,
        'border-opacity': 0.9,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': textColor,
        'font-size': 12,
        'font-family': 'Inter, Satoshi, sans-serif',
        'font-weight': '500',
        'width': 'label',
        'height': 40,
        'padding': '12px 16px',
        'shape': 'data(shape)',
        'transition-property': 'background-opacity, border-width',
        'transition-duration': '200ms',
      },
    },
    {
      selector: 'node:selected',
      style: { 'background-opacity': 0.35, 'border-width': 3 },
    },
    {
      selector: 'node.highlighted',
      style: { 'background-opacity': 0.35, 'border-width': 3 },
    },
    {
      selector: 'node.dimmed',
      style: {
        'background-opacity': 0.05,
        'border-opacity': 0.15,
        'color': dimText,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': primary,
        'line-opacity': 0.45,
        'target-arrow-color': primary,
        'target-arrow-shape': 'triangle',
        'arrow-scale': 1.2,
        'curve-style': 'bezier',
        'transition-property': 'line-opacity, width',
        'transition-duration': '200ms',
      },
    },
    {
      selector: 'edge.highlighted',
      style: { 'line-opacity': 1, 'width': 3 },
    },
    {
      selector: 'edge.dimmed',
      style: { 'line-opacity': 0.07 },
    },
  ];
}

// ─── Конвертация типов ────────────────────────────────────────────────────────

function nodeToElement(node: ServiceNode, isDark: boolean): ElementDefinition {
  const primary = isDark ? '#4f98a3' : '#01696f';
  const success  = isDark ? '#6daa45' : '#437a22';
  const warning  = isDark ? '#bb653b' : '#964219';

  let shape = 'roundrectangle';
  let bg    = primary;

  if (node.type === 'infrastructure') {
    if (node.id === 'postgres') { shape = 'ellipse'; bg = success; }
    else { shape = 'hexagon'; bg = warning; }
  }

  return {
    data: {
      id: node.id,
      label: node.name,
      sublabel: node.framework,
      type: node.type,
      shape,
      bg,
    },
  };
}

function edgeToElement(edge: ServiceEdge): ElementDefinition {
  return {
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      method: edge.method,
      path: edge.path,
      input: edge.inputSchema,
      output: edge.outputSchema,
    },
  };
}

// ─── Основной export ──────────────────────────────────────────────────────────

export interface CytoscapeInitOptions {
  container: HTMLElement;
  data: GraphData;
  isDark?: boolean;
}

export function initCytoscape({ container, data, isDark = true }: CytoscapeInitOptions): Core {
  const elements = [
    ...data.nodes.map(n => nodeToElement(n, isDark)),
    ...data.edges.map(e => edgeToElement(e)),
  ];

  return cytoscape({
    container,
    elements,
    style: buildStylesheet(isDark),
    layout: {
      name: 'dagre',
      rankDir: 'TB',
      nodeSep: 80,
      rankSep: 100,
      padding: 60,
    } as any,
    minZoom: 0.3,
    maxZoom: 3,
    wheelSensitivity: 0.3,
  });
}

/**
 * Перестраивает layout без пересоздания экземпляра.
 */
export function rerunLayout(cy: Core, direction: 'TB' | 'LR' = 'TB'): void {
  cy.layout({
    name: 'dagre',
    rankDir: direction,
    nodeSep: 80,
    rankSep: 100,
    padding: 60,
  } as any).run();
}
