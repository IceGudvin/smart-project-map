# Changelog

> Лог всех изменений по сессиям. Новые записи добавляются **сверху**.
> Файл только дополняется — старые записи не удаляются.
> При превышении ~300 строк создаётся CHANGELOG-v2.md.

---

## [2026-07-26] — Довыливка и закрытие Layer 1: Redis-экстрактор + фикс типов

Ссылка на Roadmap: [Issue #2](https://github.com/IceGudvin/smart-project-map/issues/2)

### Добавлено
- **`layer-1-parser/src/languages/variable-resolver.ts`** — мини data-flow анализатор:
  - `buildVariableMap` — собирает прямые присваивания, `UPPER_CASE` константы, dict-пары, `settings.X` через `.env`
  - `resolveToken` — разрешает любой аргумент функции: строка, переменная, f-строка, `settings.X`
- **`layer-1-parser/src/languages/python.ts`** — полный Redis-экстрактор:
  - `REDIS_CMD_RE` — универсальный паттерн для 8 команд: `rpush`, `lpush`, `xadd`, `publish`, `blpop`, `brpop`, `subscribe`, `xread`
  - `isUnresolvedVariable` — фильтр неразрешённых переменных (`queue`, `dlq_name`, `logs_key`)
  - Двухпроходный оркестратор: сначала `.env` + `os.environ`, затем парсинг с известными значениями
  - HTTP: поддержка многострочных `await client.post(\n f"..."`

### Изменено
- **`shared/src/index.ts`** — исправлены экспорты: удалены несуществующие `EdgeKind`, `WsEventKind`; добавлены `NodeType`, `SchemaField`, `Schema`, `SchemaRef`, `Route`, `WsEvent*`
- **`layer-1-parser/src/languages/typescript.ts`** — добавлено `redisCalls: []` в выходной объект (TypeScript Redis-экстрактор — следующая сессия)
- **`SPACE_INSTRUCTIONS.md`** — добавлен раздел с шаблоном и правилами Roadmap-issue

### Результаты проверки на Leadway

| Сервис | language | routes | httpCalls | redis | schemas | envConfig |
|--------|----------|--------|-----------|-------|---------|----------|
| backend | python | 134 | 14 | 8 | 84 | 35 |
| agent | python | 1 | 4 | 7 | 0 | 9 |

### Зафиксировано в репо
- `variable-resolver.ts` + Python Redis: [`0eedcd3`](https://github.com/IceGudvin/smart-project-map/commit/0eedcd39465536fb313356cfa28315f3d4e11d25)
- Фильтр неразрешённых переменных: [`4a404f1`](https://github.com/IceGudvin/smart-project-map/commit/4a404f1cfeb82f5dc4b3bab2d69d81c6b791e842)
- Фикс экспортов shared/index.ts: [`f51d713`](https://github.com/IceGudvin/smart-project-map/commit/f51d71363fee685b3ec5a515e5d2fea9c0a1942a)
- redisCalls: [] в TS-экстракторе: [`b41c3bd`](https://github.com/IceGudvin/smart-project-map/commit/b41c3bdda1e307ce1dd59e4c70e537d0fd3adb7a)

### В следующей сессии
- **Layer 2: Graph Builder** — `RawParserOutput[]` → `GraphModel`, URL → ServiceNode, инфраструктурные узлы, Redis-ребра как Edge

---

## [2026-07-26] — Реализация Layer 1: парсеры TypeScript + Python

Ссылка на Roadmap: [Issue #2](https://github.com/IceGudvin/smart-project-map/issues/2)

### Добавлено
- **`layer-1-parser/src/languages/typescript.ts`** — полноценная реализация на `ts-morph`:
  - `extractRoutes` — Express/Fastify (`app.get/post/...`) и NestJS (`@Get/@Post/...`) декораторы
  - `extractHttpCalls` — `fetch()` (с парсингом `options.method`), `axios.*`, `got.*`
  - `extractSchemas` — TypeScript `interface` и `type` алиасы (с `TypeLiteral`)
  - `extractEnvConfig` — `process.env.KEY` и `process.env['KEY']`
- **`layer-1-parser/src/languages/python.ts`** — полноценная реализация на regex:
  - `extractRoutes` — `@router.post/get/put/patch/delete`, `@app.post/get`
  - `extractHttpCalls` — `httpx.*`, `requests.*`
  - `extractSchemas` — Pydantic v2 `BaseModel` классы
  - `extractEnvConfig` — `os.environ`, `os.getenv`, парсинг `.env` файла
- **`layer-1-parser/src/index.ts`** — оркестратор `parseProject(rootDir)`

### Изменено
- `shared/src/parser.ts` — `RawHttpCall.method` переведён в обязательный

### Зафиксировано в репо
- [`f88b149`](https://github.com/IceGudvin/smart-project-map/commit/f88b149a16d11fba998c19b68eb8b9eed0148025)

---

## [2026-07-26] — Старт реализации: monorepo + shared/ + layer-1-parser скелет

Ссылка на Roadmap: [Issue #1](https://github.com/IceGudvin/smart-project-map/issues/1)

### Добавлено
- `pnpm-workspace.yaml` — явный список 7 пакетов monorepo
- `tsconfig.base.json` — strict TypeScript для всех слоёв
- `.gitignore`
- **`shared/`** — полный набор TypeScript-типов
- **`layer-1-parser/`** — скелет
- `SPACE_INSTRUCTIONS.md`

### Зафиксировано в репо
- [`cdd8053`](https://github.com/IceGudvin/smart-project-map/commit/cdd8053a7244b32e6db2b12c022c4e78adbe4e4e)

---

## [2026-07-26] — Референсный проект Leadway, детализация Python/FastAPI слоя

### Добавлено
- Раздел «Референсный проект: Leadway» в `CONCEPT.md`
- Таблица стека Leadway: FastAPI 0.111, SQLAlchemy 2.0, PostgreSQL, Redis, MinIO, PyJWT, Next.js
- Data-flow пример `POST /auth/login` для Layer 5

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
