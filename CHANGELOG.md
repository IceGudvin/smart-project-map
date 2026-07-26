# Changelog

> Лог всех изменений по сессиям. Новые записи добавляются **сверху**.
> Файл только дополняется — старые записи не удаляются.
> При превышении ~300 строк создаётся CHANGELOG-v2.md.

---

## [2026-07-26] — Референсный проект Leadway, детализация Python/FastAPI слоя

### Добавлено
- **Раздел «Референсный проект: Leadway»** в `CONCEPT.md` — реальный production-проект как основной тест-кейс для всех слоёв
- Таблица стека Leadway: FastAPI 0.111, SQLAlchemy 2.0, PostgreSQL (asyncpg), Redis (aioredis), MinIO, PyJWT, Next.js, Zustand, Docker
- Структура `backend/app/` с пояснением каждой папки (routers → services → models → schemas → core → integrations)
- Конкретный data-flow пример `POST /auth/login` для Layer 5: LoginRequest → bcrypt verify → JWT → Redis cache → frontend Bearer header

### Изменено
- **Layer 1 (Parser)** — детализирован Python/FastAPI extractor:
  - Паттерны `ast-grep` для `@router.post(...)`, `@router.get(...)`, `@app.post(...)`
  - Парсинг Pydantic v2 моделей из `schemas/` (поля, типы, required)
  - Автосвязка роута с `response_model` → `inputSchema` + `outputSchema`
  - Распознавание инфраструктурных сервисов из `backend/.env`: `DATABASE_URL` → PostgreSQL, `REDIS_URL` → Redis, `MINIO_ENDPOINT` → MinIO
  - Инструменты: `ast-grep` (Python grammar) как основной, `libcst` для сложного анализа
- **Layer 1** — обновлён `RawParserOutput`: добавлены поля `language` и `framework`
- **Layer 2 (Graph Builder)** — Resolver расширен: теперь распознаёт инфраструктурные узлы (PostgreSQL, Redis, MinIO) из `.env`, не только сервисы приложения
- **Layer 4 (UI)** — добавлена логика визуального различия узлов по `nodeType`: service (прямоугольник), infrastructure (цилиндр/шестиугольник), external (пунктирная граница)
- **shared/ — тип `ServiceNode`** — добавлены два новых поля:
  - `framework: 'fastapi' | 'express' | 'fastify' | 'nestjs' | 'nextjs' | 'gin' | 'unknown'`
  - `nodeType: 'service' | 'infrastructure' | 'external'`
- **Roadmap** — MVP теперь явно включает Python/FastAPI парсер наравне с TypeScript парсером
- **Layer 4, пример dagre-лейаута** — обновлён под Leadway: `frontend (Next.js) → FastAPI backend → PostgreSQL / Redis / MinIO`

### Зафиксировано в репо
- `CONCEPT.md` — коммит `02b6992` (точечные правки, старые разделы не тронуты)

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
