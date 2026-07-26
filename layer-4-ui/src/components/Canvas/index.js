/**
 * Canvas — монтирует #cy, все оверлеи и связывает eventBus
 */
import { initCytoscape, runLayout, syncGraph, updateTheme } from '../../graph/cytoscapeInit.js';
import { on } from '../../lib/eventBus.js';
import { store } from '../../store.js';
import { StatsBar } from './StatsBar.js';
import { CanvasToolbar } from './CanvasToolbar.js';
import { ZoomControls } from './ZoomControls.js';
import { Legend } from './Legend.js';
let _cy = null;
function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}
export const Canvas = {
    mount(container) {
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
        const toolbar = CanvasToolbar.mount(wrap);
        const zoom = ZoomControls.mount(wrap);
        Legend.mount(wrap);
        requestAnimationFrame(() => {
            const g = store.graph;
            const emptyGraph = { nodes: [], edges: [], updatedAt: 0 };
            _cy = initCytoscape({
                container: cyEl,
                graph: g ?? emptyGraph,
                isDark: isDark(),
            });
            // emit cy:ready уже вызывается внутри initCytoscape — не дублируем
            if (g)
                statsBar.update(g);
            on('cy:fit', () => _cy?.fit(undefined, 60));
            on('graph:refresh', () => { if (_cy)
                runLayout(_cy, 'TB'); });
            on('graph:full', (g) => { if (!_cy)
                return; syncGraph(_cy, g, isDark()); statsBar.update(g); });
            on('graph:update', (g) => { if (!_cy)
                return; syncGraph(_cy, g, isDark()); statsBar.update(g); });
            on('theme:changed', (dark) => { if (_cy)
                updateTheme(_cy, dark); });
            on('dataflow:toggle', (active) => toolbar.setDataflow(active));
            on('dataflow:next', (idx) => toolbar.syncDataflowPath(idx));
            on('sidebar:filter', (ids) => {
                if (!_cy)
                    return;
                _cy.nodes().forEach(n => {
                    const hidden = ids.size > 0 && !ids.has(n.id());
                    hidden ? n.addClass('hidden-node') : n.removeClass('hidden-node');
                });
            });
            on('zoom:in', () => _cy?.animate({ zoom: { level: _cy.zoom() * 1.25, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
            on('zoom:out', () => _cy?.animate({ zoom: { level: _cy.zoom() * 0.80, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
            on('zoom:reset', () => _cy?.fit(undefined, 60));
            zoom.bind(_cy);
        });
    },
    destroy() {
        if (_cy) {
            _cy.destroy();
            _cy = null;
        }
    },
};
