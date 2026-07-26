/**
 * Canvas — монтирует #cy, все оверлеи и связывает eventBus
 */
import { initCytoscape, runLayout, syncGraph, updateTheme } from '../../graph/cytoscapeInit.js';
import { emit, on } from '../../lib/eventBus.js';
import { store } from '../../store.js';
import { StatsBar } from './StatsBar.js';
import { CanvasToolbar } from './CanvasToolbar.js';
import { ZoomControls } from './ZoomControls.js';
import { Legend } from './Legend.js';
import type { Core } from 'cytoscape';
import type { GraphModel } from '../../../../shared/src/graph.js';

let _cy: Core | null = null;

function isDark(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export const Canvas = {
  mount(container: HTMLElement): void {
    container.innerHTML = '';
    container.style.cssText = 'position:relative;flex:1;overflow:hidden;display:flex;flex-direction:column;';

    const wrap = document.createElement('div');
    wrap.className = 'canvas-wrap';
    wrap.style.cssText = 'position:relative;flex:1;overflow:hidden;';
    container.appendChild(wrap);

    const cyEl = document.createElement('div');
    cyEl.id = 'cy';
    cyEl.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
    wrap.appendChild(cyEl);

    const statsBar = StatsBar.mount(wrap);
    const toolbar  = CanvasToolbar.mount(wrap);
    const zoom     = ZoomControls.mount(wrap);
    Legend.mount(wrap);

    requestAnimationFrame(() => {
      const g = store.graph;
      const emptyGraph: GraphModel = { nodes: [], edges: [], updatedAt: 0 };

      _cy = initCytoscape({
        container: cyEl,
        graph:     g ?? emptyGraph,
        isDark:    isDark(),
      });

      // emit cy:ready уже вызывается внутри initCytoscape — не дублируем

      if (g) statsBar.update(g);

      on('cy:fit',        ()  => _cy?.fit(undefined, 60));
      on('graph:refresh', ()  => { if (_cy) runLayout(_cy, 'TB'); });

      on('graph:full',  (g: GraphModel) => { if (!_cy) return; syncGraph(_cy, g, isDark()); statsBar.update(g); });
      on('graph:update',(g: GraphModel) => { if (!_cy) return; syncGraph(_cy, g, isDark()); statsBar.update(g); });

      on('theme:changed', (dark: boolean) => { if (_cy) updateTheme(_cy, dark); });

      on('dataflow:toggle', (active: boolean) => toolbar.setDataflow(active));
      on('dataflow:next',   (idx: 0|1|2)      => toolbar.syncDataflowPath(idx));

      on('sidebar:filter', (ids: Set<string>) => {
        if (!_cy) return;
        _cy.nodes().forEach(n => {
          const hidden = ids.size > 0 && !ids.has(n.id());
          hidden ? n.addClass('hidden-node') : n.removeClass('hidden-node');
        });
      });

      on('zoom:in',    () => _cy?.animate({ zoom: { level: _cy.zoom() * 1.25, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
      on('zoom:out',   () => _cy?.animate({ zoom: { level: _cy.zoom() * 0.80, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
      on('zoom:reset', () => _cy?.fit(undefined, 60));

      zoom.bind(_cy);
    });
  },

  destroy(): void {
    if (_cy) { _cy.destroy(); _cy = null; }
  },
};
