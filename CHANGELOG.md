# Changelog

> Лог всех изменений по сессиям. Новые записи добавляются **сверху**.
> Файл только дополняется — старые записи не удаляются.
> При превышении ~300 строк создаётся CHANGELOG-v2.md.

---

## [2026-07-26] — Инициализация проекта, концепция и архитектура

### Добавлено
- `README.md` — описание проекта, таблица слоёв, roadmap
- `CONCEPT.md` — полное описание всех 6 слоёв: назначение, обоснование технологий, файловые структуры, типы данных, примеры
- `SPACE_INSTRUCTIONS.md` — правила работы с репозиторием для AI-сессий
- `CHANGELOG.md` — этот файл
- `package.json` — npm workspaces (каждый слой — отдельный пакет)
- Каталоги слоёв: `layer-0-cli/`, `layer-1-parser/`, `layer-2-graph/`, `layer-3-server/`, `layer-4-ui/`, `layer-5-dataflow/`, `shared/`
- README.md в каждом слое с описанием ответственности и планируемых файлов

### Зафиксировано в концепте
- **Layer 0**: CLI через `npx`, мультиплатформенность (chokidar + open + path.normalize), переход к VS Code Extension в v1.0
- **Layer 1**: статический анализ (Tree-sitter, ts-morph, ast-grep), 4 extractors (routes, http-calls, schemas, env-config)
- **Layer 2**: Graph Builder, Resolver (URL → ServiceNode), кэш in-memory
- **Layer 3**: Fastify + WebSocket, REST API (`/api/graph`, `/api/node/:id`, `/api/preview`, `/ws`)
- **Layer 4**: Cytoscape.js + dagre-layout для MVP, компоненты Graph/NodeCard/EdgeTooltip/Sidebar
- **Layer 5**: DataFlow Visualizer — killer feature, два подхода (консервативный MVP + продвинутый AST-анализ)
- **shared/**: типы ServiceNode, Edge, GraphModel, WsEvent, GraphDiff

### Аналитика
- Проведён анализ рынка: существующие инструменты (Datadog, vizOps, TADIS, Kiali, Coordimap) не покрывают связку "статический анализ + видимость payload + реальное время без агентов"
- Уникальное преимущество: показывает не только топологию, но и что именно передаётся между сервисами
