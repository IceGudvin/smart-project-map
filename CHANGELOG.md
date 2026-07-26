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
