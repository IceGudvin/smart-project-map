# Smart Project Map — Концепция проекта

> Интерактивная карта архитектуры проекта в реальном времени. Анализирует локальный репозиторий, строит граф зависимостей между сервисами, показывает data-flow и payload на каждой связи.

---

## Обзор

Smart Project Map решает конкретную проблему: при работе с большим проектом из множества сервисов разработчик не имеет живой, актуальной картины того, кто с кем общается и что именно передаётся. Существующие инструменты либо требуют запущенного окружения (runtime-агенты), либо показывают только топологию без данных, либо требуют ручного ввода схем. Smart Project Map работает статически — читает код как есть, строит граф и обновляет его в реальном времени при изменении файлов.

---

## Референсный проект: Leadway

Leadway — основной тест-кейс для разработки и проверки всех слоёв Smart Project Map. Это реальный production-проект с монорепозиторием, состоящий из двух сервисов.

### Стек Leadway

| Часть | Технологии |
|---|---|
| **Backend** | Python 3.11, FastAPI 0.111, Uvicorn, SQLAlchemy 2.0, Alembic |
| **База данных** | PostgreSQL (asyncpg + psycopg2-binary) |
| **Кэш / очереди** | Redis (aioredis 2.0) |
| **Аутентификация** | PyJWT, passlib/bcrypt |
| **Файловое хранилище** | MinIO (S3-совместимое), boto3 |
| **Фоновые задачи** | APScheduler |
| **Frontend** | Next.js (App Router), TypeScript, Tailwind CSS |
| **Стейт** | Zustand |
| **Инфраструктура** | Docker, docker-compose |

### Структура backend (FastAPI)

```
backend/app/
├── main.py           ← FastAPI app, регистрация роутеров
├── config.py         ← pydantic-settings конфигурация
├── database.py       ← SQLAlchemy async engine
├── routers/          ← @router.post("/auth/login") и т.д.
├── services/         ← бизнес-логика
├── models/           ← SQLAlchemy ORM модели
├── schemas/          ← Pydantic v2 схемы (входные/выходные)
├── core/             ← security, dependencies
└── integrations/     ← внешние сервисы (MinIO, внешние API)
```

### Пример data-flow в Leadway (цель для Layer 5)

```
POST /auth/login
  INPUT:  LoginRequest { email: str, password: str }   ← schemas/auth.py
       ↓  routers/auth.py → services/auth_service.py
  CHECK:  models/user.py (PostgreSQL) — bcrypt verify
  OUTPUT: TokenResponse { access_token: str, token_type: str }
       ↓  JWT payload { userId: UUID, roles: list[str], exp: int }
       ↓  Redis — сессия/токен кэш
       ↓  frontend middleware.ts — Bearer header → все последующие запросы
```

---

## Архитектура: 6 слоёв + shared

```
CLI / Watcher (Layer 0)
        ↓
   Parser (Layer 1)  ←── исходники репо
        ↓
 Graph Builder (Layer 2)  ←── .env, OpenAPI
        ↓
   Server (Layer 3)  ──── WebSocket ──→  UI (Layer 4)
                                              ↓
                                    DataFlow Visualizer (Layer 5)

shared/ ← общие типы для всех слоёв
```

Каждый слой имеет единственную ответственность и может быть заменён независимо. Контракт между слоями — типы из `shared/`.

---

## Layer 0 — CLI / Entry Point

### Назначение

Единственная точка запуска. Принимает аргументы, читает конфиг, запускает оркестрацию остальных слоёв и открывает браузер. После запуска уходит в фон — пользователь работает с браузерным интерфейсом, а не с консолью.

### Поведение

```
$ npx smart-map ./my-project

  🗺  Smart Project Map
  📂  Анализирую: /Users/ice/projects/my-project
  🔍  Найдено сервисов: 6
  🚀  Сервер запущен: http://localhost:3847
  ✅  Открываю браузер...
  👁  Слежу за изменениями...
```

### Мультиплатформенность (MVP)

Целевые платформы: Windows, macOS, Linux. Проблемы платформенности возникают в трёх местах — file watching, открытие браузера, пути к файлам. Решения:

| Проблема | Решение | Обоснование |
|---|---|---|
| File watching | `chokidar` | Абстрагирует `inotify` / `FSEvents` / `ReadDirectoryChangesW` |
| Открытие браузера | `open` (npm) | Единый API для `open` / `start` / `xdg-open` |
| Пути к файлам | `path.normalize()` | Стандартная Node.js библиотека |
| Установка | `npx` | Нулевой порог, нет глобальной установки |

### Зависимости

```json
{
  "dependencies": {
    "chokidar": "^3.6.0",
    "open": "^10.1.0",
    "commander": "^12.0.0",
    "chalk": "^5.3.0"
  }
}
```

### Файловая структура

```
layer-0-cli/
├── index.ts          ← main entrypoint, точка входа
├── config.ts         ← чтение smart-map.config.ts / аргументов CLI
└── watcher.ts        ← chokidar → emit FileChangeEvent в Layer 3
```

### Переход к v1.0 (VS Code Extension)

Layer 0 заменяется на VS Code Extension. Слои 1–5 остаются без изменений. Вместо CLI-запуска — `extensionContext.activate()`, вместо браузера — `WebviewPanel`. `chokidar` убирается — VS Code предоставляет `workspace.onDidChangeTextDocument`.

---

## Layer 1 — Parser

### Назначение

Самый сложный и ценный слой. Читает файлы репозитория и извлекает семантику: какие HTTP-роуты объявлены, какие исходящие запросы делает сервис, какие схемы данных используются на входе и выходе.

### Почему статический анализ, а не runtime

Runtime-подход требует запущенного приложения — это создаёт зависимость от окружения, требует Docker/k8s, небезопасно для чужого кода и не работает на этапе разработки. Статический анализ работает с любым кодом в любом состоянии — даже если сервисы никогда не запускались.

### Почему Tree-sitter, а не регулярные выражения

Регулярные выражения на исходном коде — ненадёжный подход: они ломаются при многострочных выражениях, комментариях, строковых литералах с похожим синтаксисом. Tree-sitter строит полноценное AST-дерево, работает через WASM в Node.js и поддерживает десятки языков через единый API.

### Extractors

Каждый extractor отвечает за один тип данных:

**routes.ts** — находит объявления HTTP-роутов:
- Express/Fastify: `app.get('/path', handler)`
- NestJS: `@Get('/path')` декораторы
- FastAPI: `@router.post('/auth/login')` декораторы
- Gin: `router.GET("/path", handler)`
- Результат: `{ method: 'GET', path: '/users/:id', handler: 'getUser', file, line }`

**http-calls.ts** — находит исходящие HTTP-запросы:
- `axios.get(url)`, `fetch(url)`, `got(url)`, `httpx.get(url)`
- Раскрывает переменные окружения: `process.env.AUTH_URL + '/validate'` → реальный адрес
- Результат: `{ url, method, targetServiceHint, file, line }`

**schemas.ts** — извлекает схемы данных:
- TypeScript DTO-классы и интерфейсы
- Zod-схемы: `z.object({ email: z.string(), password: z.string() })`
- **Pydantic v2-модели (Python)** — основной формат для Leadway
- OpenAPI/Swagger если есть файл спецификации
- Результат: `{ name, fields: [{ name, type, required }] }`

**env-config.ts** — читает `.env` и конфиг-файлы:
- `AUTH_SERVICE_URL=http://auth:3001` → знаем, что `auth` — это отдельный сервис
- Для Leadway: `DATABASE_URL`, `REDIS_URL`, `MINIO_ENDPOINT` из `backend/.env`
- Результат: `{ key, value, resolvedService? }`

### Python / FastAPI парсер (Leadway-специфика)

Python-парсер реализован через `ast-grep` с Python grammar и работает по следующим паттернам:

**Поиск роутов FastAPI:**
```python
# Паттерны для ast-grep
@router.post("$PATH")        # → method: POST, path: $PATH
@router.get("$PATH")         # → method: GET, path: $PATH
@app.post("$PATH")           # → аналогично для прямой регистрации на app
```

**Извлечение Pydantic v2 схем из `schemas/`:**
```python
# Исходный код Leadway
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Результат парсера:
# { name: "LoginRequest", fields: [
#     { name: "email", type: "EmailStr", required: true },
#     { name: "password", type: "str", required: true }
#   ]
# }
```

**Связывание роута со схемой:**
```python
@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    ...
# Парсер извлекает: inputSchema → LoginRequest, outputSchema → TokenResponse
```

**Распознавание внешних зависимостей из `backend/.env`:**
```
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/leadway   → ServiceNode "PostgreSQL"
REDIS_URL=redis://redis:6379/0                                 → ServiceNode "Redis"
MINIO_ENDPOINT=minio:9000                                      → ServiceNode "MinIO"
```

### Инструменты по задачам

| Задача | Инструмент | Когда использовать |
|---|---|---|
| TypeScript type-aware анализ | `ts-morph` | Главный инструмент для TS/JS |
| Универсальный парсинг | `tree-sitter` + WASM | Go, Python, Ruby и др. |
| Паттерн-поиск по AST | `ast-grep` | Быстро найти паттерн без написания парсера |
| Готовая спецификация | `@apidevtools/swagger-parser` | Если есть OpenAPI YAML/JSON |
| Python | `ast-grep` (Python grammar) | Основной для FastAPI/Pydantic |
| Python (сложный анализ) | `libcst` | Сохраняет форматирование, полный AST |

### Файловая структура

```
layer-1-parser/
├── index.ts
├── languages/
│   ├── typescript.ts   ← ts-morph + tree-sitter
│   ├── python.ts       ← ast-grep (FastAPI, Pydantic v2)
│   └── go.ts           ← tree-sitter WASM
├── extractors/
│   ├── routes.ts
│   ├── http-calls.ts
│   ├── schemas.ts
│   └── env-config.ts
└── types.ts            ← RawParserOutput
```

### Output контракт

```typescript
type RawParserOutput = {
  servicePath: string
  language: 'typescript' | 'python' | 'go' | 'unknown'
  framework: 'fastapi' | 'express' | 'fastify' | 'nestjs' | 'gin' | 'unknown'
  routes: RawRoute[]
  httpCalls: RawHttpCall[]
  schemas: RawSchema[]
  envConfig: EnvEntry[]
}
```

---

## Layer 2 — Graph Builder

### Назначение

Получает `RawParserOutput[]` от Layer 1 и строит нормализованный граф: список узлов-сервисов и список рёбер-вызовов между ними с привязанными схемами данных.

### Ключевая задача — Resolver

Парсер может извлечь URL вида `http://auth:3001/validate`, но не знает, что это сервис `auth-service` из каталога `./services/auth`. Resolver выполняет это сопоставление:

1. Собирает все известные адреса из `.env` файлов всех сервисов
2. Сопоставляет hostname/port с каталогами сервисов
3. Разрешает переменные окружения в URL-строках

Для Leadway Resolver также распознаёт **инфраструктурные сервисы** (не только сервисы приложения):
- `db:5432` → узел `PostgreSQL` (тип: `infrastructure`)
- `redis:6379` → узел `Redis` (тип: `infrastructure`)
- `minio:9000` → узел `MinIO` (тип: `infrastructure`)

### Data Flow построение

На основе схем строится предварительная карта трансформации данных:
- Сервис А принимает `{ email, password }` на роут `POST /login`
- Возвращает `{ token: JWT }`
- Сервис Б принимает `Authorization: Bearer <token>` → извлекает `userId, roles`

### Кэш

При первом запуске граф строится полностью. При изменении файла — инвалидируется только затронутый сервис, пересобирается частично. Для MVP — in-memory Map, ключ — путь к файлу.

### Файловая структура

```
layer-2-graph/
├── builder.ts        ← RawParserOutput[] → GraphModel
├── resolver.ts       ← URL → ServiceNode (включая infrastructure nodes)
├── data-flow.ts      ← строит DataFlow цепочки
├── cache.ts          ← инвалидация по файлу
└── types.ts
```

### Типы (из shared/)

```typescript
type ServiceNode = {
  id: string
  name: string
  path: string
  language: 'typescript' | 'python' | 'go' | 'unknown'
  framework: 'fastapi' | 'express' | 'fastify' | 'nestjs' | 'nextjs' | 'gin' | 'unknown'
  nodeType: 'service' | 'infrastructure' | 'external'  // новое поле
  routes: Route[]
  dependencies: string[]   // id других сервисов
  schemas: Schema[]
}

type Edge = {
  from: string             // id сервиса-источника
  to: string               // id сервиса-назначения
  method: string
  path: string
  inputPayload?: SchemaRef
  outputPayload?: SchemaRef
}

type GraphModel = {
  nodes: ServiceNode[]
  edges: Edge[]
  updatedAt: number
}
```

---

## Layer 3 — Server

### Назначение

Тонкий API-слой между Graph Builder и UI. Отдаёт граф по REST и пушит дифф-обновления по WebSocket при изменении файлов. Не содержит бизнес-логики — только транспорт.

### Почему Fastify, а не Express

Fastify в 2–3 раза быстрее Express на JSON-сериализации, имеет встроенную валидацию через JSON Schema, TypeScript из коробки без дополнительных типов. Для нового проекта в 2025+ нет причин выбирать Express.

### Почему WebSocket, а не polling

Polling создаёт задержку (равную интервалу опроса) и лишнюю нагрузку. WebSocket даёт push в момент изменения файла — граф обновляется в браузере в реальном времени без перезагрузки страницы. Альтернатива: SSE (Server-Sent Events) — проще WebSocket для одностороннего push, достаточно для MVP.

### API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/graph` | Полный граф (все узлы + рёбра) |
| GET | `/api/node/:id` | Детали сервиса: роуты, схемы, связи |
| GET | `/api/preview` | Фрагмент кода `?file=...&line=...` |
| WS | `/ws` | Push-канал: `{ type: 'graph:update', diff }` |

### Файловая структура

```
layer-3-server/
├── index.ts
├── routes/
│   ├── graph.ts
│   ├── node.ts
│   └── preview.ts
├── ws/
│   └── socket.ts     ← broadcast GraphDiff при FileChangeEvent
└── cache.ts
```

---

## Layer 4 — UI

### Назначение

Браузерное приложение: интерактивный граф сервисов с деталями по клику, tooltip на стрелках с payload и live-обновлениями через WebSocket.

### Почему граф, а не список или таблица

Граф — единственное представление, которое сохраняет топологическую информацию: кто с кем связан транзитивно, есть ли циклические зависимости, каков «вес» каждого сервиса. Список и таблица теряют эти связи.

### Выбор рендерера

| Библиотека | Плюсы | Минусы | Рекомендация |
|---|---|---|---|
| **Cytoscape.js** | Граф из коробки, 10+ лейаутов, быстрый | Кастомизация сложнее | ✅ MVP |
| **D3.js** | Полный контроль, SVG, кастомные анимации | Много кода, крутая кривая | v0.3+ для специфичных элементов |
| **React Flow** | React-native, красивый UI | Тяжелее, лицензия pro для ряда фич | Альтернатива если стек на React |

**Рекомендация**: Cytoscape.js + dagre-layout на старте. При необходимости кастомных анимаций стрелок — D3 поверх для конкретных элементов.

### Лейаут графа

Dagre (направленный граф сверху вниз) — оптимален для сервисной архитектуры с иерархией:
```
frontend (Next.js) → FastAPI backend → PostgreSQL
                                     → Redis
                                     → MinIO
```

Force-directed лейаут хуже подходит для сервисов — там нет физического смысла в «притяжении».

### Визуальное различие типов узлов

Узлы `nodeType: 'infrastructure'` (PostgreSQL, Redis, MinIO) отображаются иначе, чем `'service'`:
- **service** — прямоугольник с именем, языком/фреймворком, количеством роутов
- **infrastructure** — цилиндр (БД) или шестиугольник (кэш/хранилище) с именем и технологией
- **external** — пунктирная граница, курсив

### Компоненты

- **Graph.tsx** — основной канвас, подписывается на WebSocket, перерисовывает граф при обновлении
- **NodeCard.tsx** — popup при клике на узел: имя сервиса, фреймворк, список роутов, входящие и исходящие вызовы, схемы данных
- **EdgeTooltip.tsx** — tooltip при hover на стрелке: метод, путь, inputPayload → outputPayload
- **Sidebar.tsx** — список всех сервисов с поиском, фильтрация по слою/технологии

### Файловая структура

```
layer-4-ui/
├── index.html
├── app.ts
├── components/
│   ├── Graph.tsx
│   ├── NodeCard.tsx
│   ├── EdgeTooltip.tsx
│   └── Sidebar.tsx
├── graph/
│   ├── renderer.ts       ← Cytoscape.js инициализация
│   ├── layout.ts         ← dagre конфигурация
│   └── interactions.ts   ← zoom, pan, click, hover
└── store.ts              ← Zustand состояние графа
```

---

## Layer 5 — DataFlow Visualizer

### Назначение

Killer feature проекта. Берёт конкретный маршрут (например `POST /auth/login`) и строит полную цепочку: что пришло на вход, как трансформировалось, что передаётся дальше в каждый последующий сервис. Результат — подсветка выбранного пути на графе с визуализацией изменений payload на каждом шаге.

### Пример для Leadway

```
POST /auth/login
  INPUT:  LoginRequest { email: EmailStr, password: str }
       ↓  routers/auth.py → services/auth_service.py
  CHECK:  PostgreSQL → models/user.py (bcrypt.verify)
  OUTPUT: TokenResponse { access_token: str, token_type: "bearer" }
       ↓  JWT payload { userId: UUID, roles: list[str], exp: int }
       ↓  Redis → кэш токена (TTL из settings.ACCESS_TOKEN_EXPIRE)
       ↓  frontend middleware.ts → Authorization: Bearer header
              → все последующие запросы к FastAPI
```

### Два подхода к реализации

**Консервативный (MVP)**: показывать схемы input/output каждого сервиса рядом со стрелкой. Пользователь видит данные, сам сопоставляет трансформацию. Реализуется на основе данных из Layer 1.

**Продвинутый (v0.4+)**: AST-анализ трансформаций — отследить, какие поля из ответа сервиса А явно передаются в запрос сервиса Б.

**Будущее (v1.0+)**: интеграция с OpenTelemetry — наложение runtime trace поверх статического графа.

### Файловая структура

```
layer-5-dataflow/
├── tracer.ts           ← обход графа от входной точки
├── payload-diff.ts     ← сравнение input/output схем на каждом шаге
└── path-highlight.ts   ← события для UI: какие узлы/рёбра подсветить
```

---

## shared/ — Общие типы

### Назначение

Контракт между всеми слоями. Типы фиксируются здесь и меняются только через осознанное решение — изменение в `shared/` затрагивает все слои одновременно.

### Ключевые типы

```typescript
// graph.ts
type ServiceNode = {
  id: string
  name: string
  path: string
  language: 'typescript' | 'python' | 'go' | 'unknown'
  framework: 'fastapi' | 'express' | 'fastify' | 'nestjs' | 'nextjs' | 'gin' | 'unknown'
  nodeType: 'service' | 'infrastructure' | 'external'
  routes: Route[]
  dependencies: string[]
  schemas: Schema[]
}

type Edge = {
  from: string
  to: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  inputPayload?: SchemaRef
  outputPayload?: SchemaRef
}

type GraphModel = {
  nodes: ServiceNode[]
  edges: Edge[]
  updatedAt: number
}

// events.ts
type WsEvent =
  | { type: 'graph:full'; data: GraphModel }
  | { type: 'graph:update'; diff: GraphDiff }
  | { type: 'graph:error'; message: string }

type GraphDiff = {
  addedNodes: ServiceNode[]
  removedNodeIds: string[]
  updatedNodes: ServiceNode[]
  addedEdges: Edge[]
  removedEdgeIds: string[]
}
```

---

## Roadmap

| Этап | Что реализуется | Ценность |
|---|---|---|
| **MVP** | Layer 0 (CLI) + Layer 1 (TS + Python/FastAPI parser) + Layer 2 + Cytoscape граф | Видны связи между сервисами |
| **v0.2** | Schemas extractor + EdgeTooltip с payload | Видно что передаётся |
| **v0.3** | File watcher + WebSocket live updates | Реальное время |
| **v0.4** | DataFlow tracer + подсветка пути | Killer feature |
| **v1.0** | VS Code Extension, Go парсер | Широкая аудитория |

---

## Технологический стек

| Слой | Технологии |
|---|---|
| Layer 0 | Node.js, commander, chokidar, open, chalk |
| Layer 1 | ts-morph, tree-sitter (WASM), ast-grep (Python grammar) |
| Layer 2 | TypeScript, in-memory / better-sqlite3 |
| Layer 3 | Fastify, ws / SSE |
| Layer 4 | React, Cytoscape.js, dagre, Zustand |
| Layer 5 | TypeScript, custom AST traversal |
| Shared | TypeScript strict mode |
| Tooling | pnpm workspaces, tsup, Vite (UI) |
