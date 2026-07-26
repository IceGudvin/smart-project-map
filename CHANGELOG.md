## [2026-07-26] — Layer 4: AppShell — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/AppShell/index.ts` — **полная реализация**:
  - `injectLayoutStyles()` — однократная инжекция CSS: `.app-shell` (flex column, 100dvh, overflow:hidden), `.app-header` (48px, glassmorphism), `.app-main` (flex row, overflow:hidden), `.app-sidebar` (260px fixed, collapse до 48px), `.app-canvas-wrap` (flex:1, position:relative), `.app-detail-panel` (absolute overlay), `.app-edge-tooltip` (fixed, pointer-events:none)
  - `mount()`: строит DOM (header/aside/canvas-wrap), монтирует все дочерние компоненты, вызывает `connectWs()`, подписывается на все eventBus-события, вешает `Escape → node:deselect`
  - `destroy()`: отписки + `disconnectWs()`
  - `_bindEvents()` — полная оркестрация:
    - `cy:ready` → сохраняет `Core`-инстанс
    - `graph:full` → `syncGraph(cy, graph, isDark)` + sidebar/header update
    - `graph:update` → `syncGraph(cy, store.graph, isDark)` + sidebar/header update
    - `graph:refresh` → `fetch('/graph')` HTTP fallback
    - `node:select` → `store.selectNode`, `highlightSelected(cy)`, `detailPanel.show`, `sidebar.setActive`
    - `node:deselect` → `store.selectNode(null)`, `clearDataflowHighlight(cy)`, `detailPanel.hide`, `sidebar.setActive(null)`
    - `dataflow:toggle` → `store.setDataflowMode`, `applyDataflowHighlight/clearDataflowHighlight`, `startDashAnimation/stopDashAnimation`
    - `dataflow:next` → `store.nextDataflowPath`, `applyDataflowHighlight(cy, newIndex)`
    - `theme:changed` → `store.setTheme`, `updateTheme(cy, isDark)`
- `layer-4-ui/src/main.ts` — упрощён: только `new AppShell(appEl).mount()`, `window.__shell` для DevTools; вся оркестрация перенесена в AppShell

### Изменено
- `AppShell` больше не принимает `store` в конструктор — использует singleton `store` напрямую (согласовано с `store.ts`)
- `main.ts` не содержит прямых вызовов `wsClient.connect` и ручных подписок `eventBus` — всё внутри AppShell

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🏗 AppShell отмечены ✅
- Коммит: `1676593`

---

## [2026-07-26] — Layer 4: cytoscapeInit + nodeData — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/graph/cytoscapeInit.ts` — **полная реализация**:
  - Dagre layout: `rankDir: TB`, `nodeSep: 80`, `rankSep: 100`, `padding: 60`
  - Формы узлов по `nodeType`: `service` → `roundrectangle`, DB-инфра → `ellipse`, Cache/Queue-инфра → `hexagon`
  - Фоновые иконки: `background-image: url(https://cdn.simpleicons.org/{slug}/ffffff)` с `background-fit: contain`, `background-clip: none`; маппинг `ICON_SLUG` для nextdotjs, fastapi, postgresql, redis, minio и других
  - Состояния `highlighted` / `dimmed` с `transition-property` + `transition-duration: 200ms`
  - Дополнительно: `hover` класс, `node:selected`, сброс иконок у `dimmed`-узлов
  - DataFlow анимация: `line-dash-pattern: [10, 6]` + JS-таймер `setInterval 40ms`, обновляющий `line-dash-offset` (≈25fps)
  - `startDashAnimation` / `stopDashAnimation` — запуск/остановка таймера
  - `DATAFLOW_PATHS[3]` — три предустановленных пути: Login Flow, File Upload, Auth Check
  - `applyDataflowHighlight(cy, 0|1|2)` — highlighted/dimmed через `cy.batch()`
  - `clearDataflowHighlight(cy)` — сброс классов
  - `highlightSelected(cy, nodeId)` — подсветка узла + соседей
  - `syncGraph(cy, graph, isDark)` — инкрементальный diff (add/remove) без пересоздания
  - `updateTheme(cy, isDark)` — пересборка stylesheet при смене темы
  - `runLayout(cy, direction)` — повторный запуск layout
  - Обработчики событий: `tap node` → `emit('node:select')`, `tap background` → `emit('node:deselect')`, `mouseover/mouseout node` → `hover`-класс + cursor, `mouseover/mousemove/mouseout edge` → `emit('edge:mouseover|mousemove|mouseout')` для EdgeTooltip
  - `emit('cy:ready', cy)` после инициализации

- `layer-4-ui/src/graph/nodeData.ts` — **полная реализация**:
  - `mapNodeToDetail(node, allNodes)` — маппинг живого `ServiceNode` из `GraphModel` → `NodeDetailData` для Detail Panel
  - `resolveNodeData(node, allNodes)` — приоритет live-данных (routes/schemas от парсера), фоллбэк на статику
  - `getNodeData(id)` — статический фоллбэк по id
  - `STATIC_FALLBACK` — демо-данные для frontend/backend/postgres/redis/minio
  - `iconSlug` (Simple Icons CDN) + `iconEmoji` (UTF-8 фоллбэк)
  - `depNodeIds[]` — id целевых узлов для `node:select` при клике на dep-item
  - `frameworkSub()` — подзаголовок: `FastAPI · Python` из live-данных

### Зафиксировано в репо
- Roadmap: Issue #6 (чекбоксы 🎯 Cytoscape + граф отмечены ✅)
- Коммит: `e0d0d95`

---

## [2026-07-26] — Layer 4: стили — dot-grid + glassmorphism (Issue #6)

### Добавлено
- `src/styles/tokens.css`:
  - `--font-body` — явный алиас на `'Satoshi', 'Inter', system-ui, sans-serif`
  - Dot-grid переменные: `--dot-color`, `--dot-size` (1.5px), `--dot-spacing` (24px) — для обоих тем и system-fallback
  - Glassmorphism-переменные: `--glass-bg`, `--glass-border`, `--glass-shadow` (двухслойная + inset top-glare), `--glass-blur` (12px), `--glass-saturate` — для light-темы (72% opacity), dark-темы (70%) и system-fallback
- `src/styles/index.css`:
  - `#cy` — dot-grid фон через `radial-gradient` + `background-size: var(--dot-spacing)`
  - `.glass-panel` — утилитарный класс: `backdrop-filter: blur + saturate`, `background: var(--glass-bg)`, `border`, `box-shadow`, `@supports`-фоллбэк для браузеров без `backdrop-filter`

### Зафиксировано в репо
- Roadmap: Issue #6 (чекбоксы 🎨 Стили отмечены ✅)
- Коммит: `e96896c`

---

## [2026-07-26] — layer-4-ui: структура компонентов + дизайн-система

### Добавлено
- `layer-4-ui/` — полная файловая структура UI-слоя
- `src/styles/tokens.css` — CSS-переменные: цвета (light/dark), шрифты (Inter + JetBrains Mono), отступы, радиусы, тени, анимации
- `src/styles/base.css` — reset + базовые стили (box-sizing, антиалиасинг, body, scrollbar)
- `src/styles/index.css` — точка входа стилей, импорт tokens + base
- `src/styles/README.md` — описание дизайн-системы: слои поверхностей, токены, light/dark, шрифты
- `package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/store.ts` — корневые файлы layer-4-ui
- `src/README.md` — описание архитектуры слоя: компоненты, store, граф, WebSocket
- Компоненты с README:
  - `AppShell` — корневая оболочка, layout header+sidebar+canvas
  - `Header` — лого, путь проекта, WS-индикатор, кнопки управления
  - `Sidebar` + `ServiceItem`, `FilterBar` — список сервисов, поиск, фильтрация по типу
  - `Canvas` + `CanvasToolbar`, `ZoomControls`, `Legend`, `StatsBar` — cytoscape-контейнер и оверлеи
  - `DetailPanel` + `RouteList`, `SchemaBlock`, `DepList` — панель деталей выбранного узла
  - `EdgeTooltip` — тултип при наведении на ребро графа
  - `ui/Badge`, `ui/Button`, `ui/Divider` — атомарные UI-компоненты
- Вспомогательные модули с README:
  - `graph/cytoscapeInit.ts` — инициализация cytoscape + dagre, стили узлов и рёбер
  - `graph/nodeData.ts` — статичные данные панелей для каждого узла
  - `lib/wsClient.ts` — WebSocket-клиент, reconnect, обработка `graph:full` / `graph:update`
  - `lib/eventBus.ts` — простой event bus для межкомпонентного общения

### Зафиксировано в репо
- Roadmap: Issue #7
- Все файлы структуры layer-4-ui созданы в репозитории
- Каждый компонент и модуль покрыт `README.md`

---

## [2026-07-26] — Layer 0: CLI + File Watcher

### Добавлено
- `layer-0-cli/` — полная реализация Layer 0
- `layer-0-cli/src/index.ts` — CLI точка входа: парсинг аргументов, валидация путей, запуск сервера + watcher
- `chokidar` file watcher: следит за `**/*.ts`, `**/*.py`, `**/*.js`
- Debounce 500ms — исключает лишние rebuild при массовых сохранениях
- Игнор: `node_modules`, `__pycache__`, `.git`, `dist`, `build`, `venv`, `*.pyc`
- При изменении файла → `store.rebuild()` напрямую → broadcast WS `graph:update`
- `--port=XXXX` флаг для кастомизации порта
- Грациозное завершение по SIGINT (Ctrl+C)

### Изменено
- `layer-3-server/src/index.ts` — рефактор: вынесен `startServer()`, экспорт `store` и `broadcast` для layer-0-cli
- `layer-3-server/package.json` — убран `private: true`, добавлен `exports` для workspace-импорта
- `layer-3-server/src/ws/handler.ts` — `broadcast` экспортирован отдельно
- `host` сменён `0.0.0.0` → `127.0.0.1` по умолчанию — фикс EADDRINUSE при запуске через layer-0-cli

### Исправлено
- `layer-2-graph/tsconfig.json` — добавлен `"DOM"` в `lib` (фикс `Cannot find name 'URL'`)
- `layer-2-graph/src/resolver.ts` — фикс `exactOptionalPropertyTypes` для `Route[]`
- `layer-1-parser/src/index.ts` — `realpathSync` для нормализации путей с кириллицей на Windows
- PowerShell encoding: `UTF8.GetBytes()` — правильная передача UTF-8 JSON

### Проверено на Leadway
- `pnpm dev C:/Users/Кирилл/Desktop/leadway/backend C:/Users/Кирилл/Desktop/leadway/agent` — запуск без ошибок ✅
- ✅ Graph built: 5 nodes, 27 edges
- При сохранении `test_watcher.py` — автоматический rebuild ✅
- WebSocket клиент подключился и принимает события ✅

### Зафиксировано в репо
- Roadmap: Issue #5
- Коммиты: `6ba511f`, `922e356`, `bc196769`, `5e58267`, `ed9d6f6`

---

## [2026-07-26] — Layer 3: Fastify Server + WebSocket

### Добавлено
- `layer-3-server/` — полная реализация Layer 3
- `GET /health` — healthcheck
- `GET /graph` — возвращает текущий GraphModel, 503 если граф не готов
- `POST /graph/rebuild` — принимает `projectPath` или `projectPaths[]`, запускает parser+buildGraph, броадкастит WS-дифф
- WebSocket `/ws` — `graph:full` при подключении, `graph:update` при rebuild, ping/pong 30s
- `GraphStore` singleton — хранит текущий `GraphModel` в памяти

### Изменено
- `store.rebuild()` теперь принимает `string | string[]` — поддержка нескольких сервисов в одном запросе
- Убран `pino-pretty` transport (requires install), заменён на `logger: true`
- `@fastify/websocket` обновлён до `^11` для совместимости с Fastify 5

### Проверено на Leadway
- `GET /health` → `{status:'ok'}` ✅
- `GET /graph` до rebuild → 503 ✅
- `POST /graph/rebuild` с `projectPaths` → `{nodesCount:5, edgesCount:27}` ✅
- `GET /graph` после rebuild → полный GraphModel ✅

### Зафиксировано в репо
- Roadmap: Issue #4
- Commits: feat layer-3-server, fix websocket compat, fix pino-pretty, fix projectPaths[]

---

## [2026-07-26] — Layer 2: Graph Builder

### Добавлено
- `layer-2-graph/` — полная реализация Layer 2
- `buildGraph(outputs[])` → `GraphModel` с узлами, рёбрами, инфра-узлами
- `buildGraphDiff(prev, next)` → `GraphDiff` для WebSocket инкрементальных обновлений
- `src/resolver.ts` — URL → ServiceNode резолвер, инфра-узлы
- `src/edges.ts` — HTTP + Redis queue рёбра
- `src/infrastructure.ts` — автодетекция Postgres/Redis/MinIO из `.env`

### Проверено на Leadway
- 5 узлов (backend, agent, postgres, redis, external)
- 27 рёбер (18 HTTP + 9 queue)

### Зафиксировано в репо
- Roadmap: Issue #3

---

## [2026-07-26] — Старт реализации: shared/ + monorepo

### Добавлено
- npm workspaces monorepo (корневой `package.json`, `tsconfig.base.json`)
- `shared/` — типы `GraphModel`, `ServiceNode`, `Edge`, `RawParserOutput`, `WsEvent`
- `layer-1-parser/` — парсер TypeScript/Python сервисов
- `layer-2-graph/` — построение графа зависимостей

### Зафиксировано в репо
- Roadmap: Issue #1, Issue #2
