# Changelog

> Лог всех изменений по сессиям. Новые записи добавляются **сверху**.
> Файл только дополняется — старые записи не удаляются.
> При превышении ~300 строк создаётся CHANGELOG-v2.md.

---

## [2026-07-26] — Старт реализации: monorepo + shared/ + layer-1-parser скелет

Ссылка на Roadmap: [Issue #1](https://github.com/IceGudvin/smart-project-map/issues/1)

### Добавлено
- `pnpm-workspace.yaml` — явный список 7 пакетов monorepo
- `tsconfig.base.json` — strict TypeScript для всех слоёв (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`)
- `.gitignore` — `node_modules`, `dist`, `.env`, IDE-файлы
- **`shared/`** — полный набор TypeScript-типов:
  - `graph.ts` — `ServiceNode`, `Edge`, `GraphModel`, `GraphDiff`, `Schema`, `Route`, `SchemaRef`
  - `events.ts` — `WsEvent` (union: `graph:full`, `graph:update`, `graph:error`, `ping`)
  - `parser.ts` — `RawParserOutput`, `RawRoute`, `RawHttpCall`, `RawSchema`, `EnvEntry`
  - `index.ts` — реэкспорт всего публичного API
- **`layer-1-parser/`** — скелет из 8 файлов-заглушек с правильными импортами из `@smart-map/shared`:
  - `src/index.ts`, `languages/typescript.ts`, `languages/python.ts`
  - `extractors/routes.ts`, `extractors/schemas.ts`, `extractors/http-calls.ts`, `extractors/env-config.ts`
- `SPACE_INSTRUCTIONS.md` — добавлен раздел про Roadmap-issue: формат названия, шаблон, правила

### Изменено
- `package.json` (корень) — обновлён: добавлены скрипты `typecheck`, `clean`; порядок workspaces исправлен (`shared` первым)

### Проблемы и фиксы в ходе сессии
- `ast-grep-napi` → `@ast-grep/napi` — неверное имя пакета
- `rootDir` ошибка в `layer-1-parser` — `paths` переключён с `shared/src/` на `shared/dist/index.d.ts`
- `composite: true` поломал `tsup` — убран из `shared/tsconfig.json`
- Порядок `exports` в `shared/package.json` — `"types"` перемещён первым
- Отсутствие `"type": "module"` — добавлено в `shared/package.json` и `layer-1-parser/package.json`

### Зафиксировано в репо
- Основной коммит: [`cdd8053`](https://github.com/IceGudvin/smart-project-map/commit/cdd8053a7244b32e6db2b12c022c4e78adbe4e4e) — 19 файлов
- Фиксы: [`9e1f23e`](https://github.com/IceGudvin/smart-project-map/commit/9e1f23e2be3f2a7c65495f82422ced82ca61965a), [`6192ba3`](https://github.com/IceGudvin/smart-project-map/commit/6192ba392c10075c43c753a07e0640f5db9d574c), [`a4d181d`](https://github.com/IceGudvin/smart-project-map/commit/a4d181df59f9743fbc7a72fb43eef991140f79dd)

### Результаты проверки
- `pnpm install` — ✅
- `shared/` `pnpm typecheck` — ✅ 0 errors
- `shared/` `pnpm build` — ✅ `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`
- `layer-1-parser/` `pnpm typecheck` — ✅ 0 errors
- `layer-1-parser/` `pnpm build` — ✅ `dist/index.js`, `dist/index.d.ts`

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
- **shared/ — тип `ServiceNode`** — добавлены поля `framework` и `nodeType`
- **Roadmap** — MVP теперь явно включает Python/FastAPI парсер наравне с TypeScript парсером

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
