/**
 * Canvas — монтирует #cy, все оверлеи и связывает eventBus
 */
import { cytoscapeInit, runLayout, syncGraph, updateTheme } from '../../graph/cytoscapeInit';
import { emit, on } from '../../lib/eventBus';
import { store } from '../../store';
import { StatsBar } from './StatsBar';
import { CanvasToolbar } from './CanvasToolbar';
import { ZoomControls } from './ZoomControls';
import { Legend } from './Legend';

let _cy: cytoscape.Core | null = null;

export const Canvas = {
  mount(container: HTMLElement): void {
    // --- разметка ---------------------------------------------------------
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

    // оверлеи
    const statsBar = StatsBar.mount(wrap);
    const toolbar  = CanvasToolbar.mount(wrap);
    const zoom     = ZoomControls.mount(wrap);
    Legend.mount(wrap);

    // --- cytoscape --------------------------------------------------------
    requestAnimationFrame(() => {
      _cy = cytoscapeInit(cyEl);
      emit('cy:ready', _cy);

      // синхронизируем, если граф уже загружен
      const g = store.graph;
      if (g) {
        syncGraph(_cy, g);
        statsBar.update(g);
      }

      // --- события ----------------------------------------------------------
      on('cy:fit',         ()  => _cy && _cy.fit(undefined, 60));
      on('graph:refresh',  ()  => _cy && runLayout(_cy, 'TB'));

      on('graph:full',     (g) => { if (!_cy) return; syncGraph(_cy, g); statsBar.update(g); });
      on('graph:update',   (g) => { if (!_cy) return; syncGraph(_cy, g); statsBar.update(g); });

      on('theme:changed',  (d) => { if (!_cy) return; updateTheme(_cy, d); });

      on('dataflow:toggle', (active) => toolbar.setDataflow(active));
      on('dataflow:next',   (idx)    => toolbar.syncDataflowPath(idx));

      // sidebar filter — показываем/скрываем узлы
      on('sidebar:filter', (ids: Set<string>) => {
        if (!_cy) return;
        _cy.nodes().forEach(n => {
          const hidden = ids.size > 0 && !ids.has(n.id());
          hidden ? n.addClass('hidden-node') : n.removeClass('hidden-node');
        });
      });

      // zoom buttons
      on('zoom:in',    () => _cy && _cy.animate({ zoom: { level: _cy.zoom() * 1.25, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
      on('zoom:out',   () => _cy && _cy.animate({ zoom: { level: _cy.zoom() * 0.8,  renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
      on('zoom:reset', () => _cy && _cy.fit(undefined, 60));

      zoom.bind(_cy);
    });
  },

  destroy(): void {
    if (_cy) { _cy.destroy(); _cy = null; }
  },
};
