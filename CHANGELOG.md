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
