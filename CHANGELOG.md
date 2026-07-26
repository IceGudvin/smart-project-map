# Changelog

> Лог всех изменений по сессиям. Новые записи добавляются **сверху**.
> Файл только дополняется — старые записи не удаляются.
> При превышении ~300 строк создаётся CHANGELOG-v2.md.

---

## [2026-07-26] — Реализация Layer 1: парсеры TypeScript + Python

Ссылка на Roadmap: [Issue #2](https://github.com/IceGudvin/smart-project-map/issues/2)

### Добавлено
- **`layer-1-parser/src/languages/typescript.ts`** — полноценная реализация на `ts-morph`:
  - `extractRoutes` — Express/Fastify (`app.get/post/...`) и NestJS (`@Get/@Post/...`) декораторы
  - `extractHttpCalls` — `fetch()` (с парсингом `options.method`), `axios.*`, `got.*`
  - `extractSchemas` — TypeScript `interface` и `type` алиасы (с `TypeLiteral`)
  - `extractEnvConfig` — `process.env.KEY` и `process.env['KEY']`
  - `try/catch` вокруг каждого файла во всех экстракторах — один битый файл не роняет весь парсинг
- **`layer-1-parser/src/languages/python.ts`** — полноценная реализация на regex:
  - `extractRoutes` — `@router.post/get/put/patch/delete`, `@app.post/get`
  - `extractHttpCalls` — `httpx.*`, `requests.*`
  - `extractSchemas` — Pydantic v2 `BaseModel` классы, поля с `Optional[T]` детекцией
  - `extractEnvConfig` — `os.environ`, `os.getenv`, парсинг `.env` файла
  - `try/catch` по каждому файлу
- **`layer-1-parser/src/index.ts`** — оркестратор:
  - `parseProject(rootDir)` — автоопределение языка по `tsconfig.json` / `package.json` / `pyproject.toml` / `requirements.txt`
  - Маршрутизация на TypeScript или Python экстрактор

### Изменено
- **`shared/src/parser.ts`** — `RawHttpCall.method` переведён из `method?: HttpMethod` в `method: HttpMethod` (дефолт `'GET'`)
  - Причина: `exactOptionalPropertyTypes: true` не позволяет присваивать `T | undefined` в `field?: T`

### Проблемы и фиксы в ходе сессии
- `exactOptionalPropertyTypes` с `method?: HttpMethod` — 3 цикла исправлений, решено через изменение типа в `shared/`

### TODO (следующая сессия)
- Python extractor: перейти с regex на `ast-grep` (более точный парсинг)
- TypeScript extractor: добавить распознавание Zod/TypeBox схем
- Ручная проверка на Leadway-проекте

### Зафиксировано в репо
- Фикс `RawHttpCall.method`: [`68a8dba`](https://github.com/IceGudvin/smart-project-map/commit/68a8dbad59d49c73364c6be2a3afcbbb94c216d7)
- Парсеры TypeScript + Python: [`f88b149`](https://github.com/IceGudvin/smart-project-map/commit/f88b149a16d11fba998c19b68eb8b9eed0148025)
- `try/catch` + CHANGELOG: этот коммит

### Результаты проверки
- `layer-1-parser/` `pnpm typecheck` — ✅ 0 errors
- `layer-1-parser/` `pnpm build` — ✅ 12.05 KB dist/index.js
- `shared/` `pnpm build` — ✅

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
- **`layer-1-parser/`** — скелет из 8 файлов-заглушек с правильными импортами из `@smart-map/shared`
- `SPACE_INSTRUCTIONS.md` — добавлен раздел про Roadmap-issue

### Изменено
- `package.json` (корень) — обновлён: добавлены скрипты `typecheck`, `clean`

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
- `shared/` `pnpm build` — ✅
- `layer-1-parser/` `pnpm typecheck` — ✅ 0 errors
- `layer-1-parser/` `pnpm build` — ✅

---

## [2026-07-26] — Референсный проект Leadway, детализация Python/FastAPI слоя

### Добавлено
- **Раздел «Референсный проект: Leadway»** в `CONCEPT.md`
- Таблица стека Leadway: FastAPI 0.111, SQLAlchemy 2.0, PostgreSQL, Redis, MinIO, PyJWT, Next.js
- Data-flow пример `POST /auth/login` для Layer 5

### Изменено
- Layer 1 — детализирован Python/FastAPI extractor
- Layer 2 — Resolver расширен: инфраструктурные узлы из `.env`
- Layer 4 — визуальное различие узлов по `nodeType`
- `shared/` — добавлены поля `framework` и `nodeType` в `ServiceNode`

### Зафиксировано в репо
- `CONCEPT.md` — коммит `02b6992`

---

## [2026-07-26] — Инициализация проекта, концепция и архитектура

### Добавлено
- `README.md`, `CONCEPT.md`, `SPACE_INSTRUCTIONS.md`, `CHANGELOG.md`
- `package.json` — npm workspaces
- Каталоги слоёв и README в каждом

### Зафиксировано в репо
- Инициализация репозитория
