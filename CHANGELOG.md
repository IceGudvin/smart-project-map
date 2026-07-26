## [2026-07-26] — Layer 4: Header — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/Header/index.ts` — **полная реализация**:
  - SVG-логотип: треугольный граф (3 круга + рёбра-линии), `currentColor`, работает на любом размере
  - Путь проекта из `store.graph.meta?.projectPath` (или авто-заголовок по количеству сервисов + языку)
  - WS-индикатор: пульсирующая точка + текст `live`/`offline`/`connecting`/`error`; цвета из `--color-success/gold/error/text-faint`; подписка на `ws:connected` / `ws:disconnected` / `ws:error`
  - **Refresh** → `POST /graph/rebuild`, спиннер во время загрузки, обработка ошибок
  - **Fit** → `emit('cy:fit')` → Canvas вызывает `cy.fit(60)`
  - **Theme toggle**: moon/sun SVG-икона, `emit('theme:changed')`, авто-синх артефакта по `theme:changed`
  - `updatedAt` таймстамп, обновляется по `graph:full` / `graph:update`
  - `mount(el)` / `update()` / `destroy()` API, полная чистка подписок
  - CSS инжектируется одинразово через `injectHeaderStyles()`
- `layer-4-ui/src/lib/eventBus.ts` — добавлено событие `cy:fit: undefined` в `EventMap`

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🔧 Header отмечены ✅
- Коммит: `14166159`, `b747259`

---

## [2026-07-26] — Layer 4: AppShell — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/AppShell/index.ts` — **полная реализация**:
  - `injectLayoutStyles()` — однократная инжекция CSS: `.app-shell` (flex column, 100dvh, overflow:hidden), `.app-header` (48px, glassmorphism), `.app-main` (flex row, overflow:hidden), `.app-sidebar` (260px fixed, collapse до 48px), `.app-canvas-wrap` (flex:1, position:relative), `.app-detail-panel` (absolute overlay), `.app-edge-tooltip` (fixed, pointer-events:none)
  - `mount()`: строит DOM (header/aside/canvas-wrap), монтирует все дочерние компоненты, вызывает `connectWs()`, подписывается на все eventBus-события, вешает `Escape → node:deselect`
  - `destroy()`: отписки + `disconnectWs()`
  - `_bindEvents()` — полная оркестрация
- `layer-4-ui/src/main.ts` — упрощён: только `new AppShell(appEl).mount()`, `window.__shell` для DevTools

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🏗 AppShell отмечены ✅
- Коммит: `1676593`

---

## [2026-07-26] — Layer 4: cytoscapeInit + nodeData — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/graph/cytoscapeInit.ts` — **полная реализация**
- `layer-4-ui/src/graph/nodeData.ts` — **полная реализация**

### Зафиксировано в репо
- Roadmap: Issue #6 (чекбоксы 🎯 Cytoscape + граф отмечены ✅)
- Коммит: `e0d0d95`

---

## [2026-07-26] — Layer 4: стили — dot-grid + glassmorphism (Issue #6)

### Добавлено
- `src/styles/tokens.css` — `--font-body`, dot-grid, glassmorphism переменные
- `src/styles/index.css` — `#cy` dot-grid фон, `.glass-panel` утилитарный класс

### Зафиксировано в репо
- Roadmap: Issue #6 (чекбоксы 🎨 Стили отмечены ✅)
- Коммит: `e96896c`

---

## [2026-07-26] — layer-4-ui: структура компонентов + дизайн-система

### Добавлено
- `layer-4-ui/` — полная файловая структура UI-слоя
- Дизайн-система, структура компонентов, README

### Зафиксировано в репо
- Roadmap: Issue #7

---

## [2026-07-26] — Layer 0: CLI + File Watcher

### Добавлено
- `layer-0-cli/` — полная реализация Layer 0
- CLI, chokidar watcher, debounce 500ms, `--port` флаг

### Зафиксировано в репо
- Roadmap: Issue #5

---

## [2026-07-26] — Layer 3: Fastify Server + WebSocket

### Добавлено
- `layer-3-server/` — полная реализация Layer 3
- `GET /health`, `GET /graph`, `POST /graph/rebuild`, WebSocket `/ws`

### Зафиксировано в репо
- Roadmap: Issue #4

---

## [2026-07-26] — Layer 2: Graph Builder

### Добавлено
- `layer-2-graph/` — полная реализация Layer 2

### Зафиксировано в репо
- Roadmap: Issue #3

---

## [2026-07-26] — Старт реализации: shared/ + monorepo

### Добавлено
- npm workspaces monorepo, `shared/` типы, `layer-1-parser/`, `layer-2-graph/`

### Зафиксировано в репо
- Roadmap: Issue #1, Issue #2
