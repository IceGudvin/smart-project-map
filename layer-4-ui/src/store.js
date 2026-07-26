/**
 * store.ts — Реактивное состояние layer-4-ui.
 *
 * Хранит:
 *   graph          — текущий GraphModel (узлы + рёбра + updatedAt)
 *   selectedNodeId — выбранный узел (null = ничего не выбрано)
 *   dataflowMode   — включён ли DataFlow-режим
 *   activeDataflowPath — 0=LoginFlow / 1=FileUpload / 2=AuthCheck
 *   wsStatus       — состояние WebSocket-соединения
 *   filter         — строка поиска/фильтрации
 *   theme          — 'dark' | 'light'
 *
 * Не использует localStorage (sandbox-ограничение).
 * Используется: AppShell, Header, Sidebar, Canvas, DetailPanel.
 */
export const DATAFLOW_PATHS = {
    0: 'Login Flow',
    1: 'File Upload',
    2: 'Auth Check',
};
// ----------------------------------------------------------------- factory
export function initStore() {
    let state = {
        graph: { nodes: [], edges: [], updatedAt: 0 },
        selectedNodeId: null,
        dataflowMode: false,
        activeDataflowPath: 0,
        wsStatus: 'disconnected',
        filter: '',
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light',
    };
    const listeners = new Set();
    function notify() {
        for (const cb of listeners)
            cb(state);
    }
    function patch(partial) {
        state = { ...state, ...partial };
        notify();
    }
    return {
        // ---------------------------------------------------------------- getters
        get graph() { return state.graph; },
        get selectedNodeId() { return state.selectedNodeId; },
        get dataflowMode() { return state.dataflowMode; },
        get activeDataflowPath() { return state.activeDataflowPath; },
        get wsStatus() { return state.wsStatus; },
        get filter() { return state.filter; },
        get theme() { return state.theme; },
        // --------------------------------------------------------------- mutations
        setGraph(data) {
            patch({ graph: data });
        },
        /**
         * Применяет инкрементальный diff от graph:update.
         * addedNodes   — добавляются в конец массива
         * removedNodeIds — удаляются по id
         * updatedNodes — заменяют существующие узлы с тем же id
         * addedEdges   — добавляются
         * removedEdgeIds — удаляются (формат id = `${from}->${to}->${method}-${path}`)
         */
        applyDiff(diff) {
            const { addedNodes, removedNodeIds, updatedNodes, addedEdges, removedEdgeIds } = diff;
            let nodes = state.graph.nodes
                .filter(n => !removedNodeIds.includes(n.id))
                .map(n => {
                const upd = updatedNodes.find(u => u.id === n.id);
                return upd ?? n;
            });
            nodes = nodes.concat(addedNodes);
            const edgeId = (e) => `${e.from}->${e.to}->${e.method}-${e.path}`;
            let edges = state.graph.edges.filter(e => !removedEdgeIds.includes(edgeId(e)));
            edges = edges.concat(addedEdges);
            patch({
                graph: {
                    nodes,
                    edges,
                    updatedAt: Date.now(),
                },
                // Если выбранный узел удалён — сбрасываем выбор
                selectedNodeId: state.selectedNodeId && removedNodeIds.includes(state.selectedNodeId)
                    ? null
                    : state.selectedNodeId,
            });
        },
        selectNode(id) {
            patch({ selectedNodeId: id });
        },
        setDataflowMode(enabled) {
            patch({ dataflowMode: enabled });
        },
        setActiveDataflowPath(index) {
            patch({ activeDataflowPath: index });
        },
        /** Циклически переключает путь: 0 → 1 → 2 → 0 */
        nextDataflowPath() {
            const next = ((state.activeDataflowPath + 1) % 3);
            patch({ activeDataflowPath: next });
        },
        setWsStatus(status) {
            patch({ wsStatus: status });
        },
        setFilter(q) {
            patch({ filter: q });
        },
        setTheme(t) {
            document.documentElement.setAttribute('data-theme', t);
            patch({ theme: t });
        },
        // --------------------------------------------------------------- readers
        getNode(id) {
            return state.graph.nodes.find(n => n.id === id);
        },
        getEdgesFor(nodeId) {
            return state.graph.edges.filter(e => e.from === nodeId || e.to === nodeId);
        },
        getActivePathName() {
            return DATAFLOW_PATHS[state.activeDataflowPath];
        },
        // ------------------------------------------------------------- subscribe
        subscribe(cb) {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
    };
}
/**
 * Глобальный singleton стора.
 * Импортируется всеми компонентами напрямую.
 */
export const store = initStore();
