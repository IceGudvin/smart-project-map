/**
 * Canvas — монтирует #cy, все оверлеи и связывает eventBus.
 *
 * FIX: race condition — подписки на graph:full / graph:update регистрируются
 * ДО requestAnimationFrame, чтобы не пропустить события которые могут прийти
 * от wsClient раньше чем rAF выполнится.
 * _cy при этом может быть null — syncGraph вызывается через pending-очередь
 * если _cy ещё не готов.
 */
import { initCytoscape, runLayout, syncGraph, updateTheme } from '../../graph/cytoscapeInit.js';
import { on } from '../../lib/eventBus.js';
import { store } from '../../store.js';
import { StatsBar } from './StatsBar.js';
import { CanvasToolbar } from './CanvasToolbar.js';
import { ZoomControls } from './ZoomControls.js';
import { Legend } from './Legend.js';

let _cy = null;
// Если graph:full пришёл до инициализации cy — ставим в очередь
let _pendingGraph = null;

function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

export const Canvas = {
    mount(container) {
        _cy = null;
        _pendingGraph = null;

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

        // ── Подписки регистрируем ДО rAF чтобы не пропустить ранние события ──
        on('graph:full', (g) => {
            if (_cy) {
                syncGraph(_cy, g, isDark());
                statsBar.update(g);
            } else {
                // cy ещё не готов — запомним граф, применим после инициализации
                _pendingGraph = g;
            }
        });

        on('graph:update', (g) => {
            if (!_cy) return;
            syncGraph(_cy, g, isDark());
            statsBar.update(g);
        });

        on('theme:changed', (dark) => {
            if (_cy) updateTheme(_cy, dark);
        });

        on('cy:fit',         () => _cy?.fit(undefined, 60));
        on('graph:refresh',  () => { if (_cy) runLayout(_cy, 'TB'); });
        on('dataflow:toggle',(active) => toolbar.setDataflow(active));
        on('dataflow:next',  (idx)    => toolbar.syncDataflowPath(idx));

        on('sidebar:filter', (ids) => {
            if (!_cy) return;
            _cy.nodes().forEach(n => {
                const hidden = ids.size > 0 && !ids.has(n.id());
                hidden ? n.addClass('hidden-node') : n.removeClass('hidden-node');
            });
        });

        on('zoom:in',    () => _cy?.animate({ zoom: { level: _cy.zoom() * 1.25, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
        on('zoom:out',   () => _cy?.animate({ zoom: { level: _cy.zoom() * 0.80, renderedPosition: { x: _cy.width() / 2, y: _cy.height() / 2 } }, duration: 200 }));
        on('zoom:reset', () => _cy?.fit(undefined, 60));

        // ── Инициализируем Cytoscape в rAF (DOM должен быть смонтирован) ──
        requestAnimationFrame(() => {
            const g = store.graph;
            _cy = initCytoscape({
                container: cyEl,
                graph:     g ?? null,
                isDark:    isDark(),
            });

            if (g) statsBar.update(g);

            // Применяем граф который пришёл пока cy инициализировался
            if (_pendingGraph) {
                syncGraph(_cy, _pendingGraph, isDark());
                statsBar.update(_pendingGraph);
                _pendingGraph = null;
            }

            zoom.bind(_cy);
        });
    },

    destroy() {
        if (_cy) {
            _cy.destroy();
            _cy = null;
        }
        _pendingGraph = null;
    },
};
