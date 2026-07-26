# Smart Project Map — Концепция проекта

> Интерактивная карта архитектуры проекта в реальном времени. Анализирует локальный репозиторий, строит граф зависимостей между сервисами, показывает data-flow и payload на каждой связи.

---

## Обзор

Smart Project Map решает конкретную проблему: при работе с большим проектом из множества сервисов разработчик не имеет живой, актуальной картины того, кто с кем общается и что именно передаётся. Существующие инструменты либо требуют запущенного окружения (runtime-агенты), либо показывают только топологию без данных, либо требуют ручного ввода схем. Smart Project Map работает статически — читает код как есть, строит граф и обновляет его в реальном времени при изменении файлов.

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
- FastAPI: `@app.get('/path')`
- Gin: `router.GET("/path", handler)`
- Результат: `{ method: 'GET', path: '/users/:id', handler: 'getUser', file, line }`

**http-calls.ts** — находит исходящие HTTP-запросы:
- `axios.get(url)`, `fetch(url)`, `got(url)`, `httpx.get(url)`
- Раскрывает переменные окружения: `process.env.AUTH_URL + '/validate'` → реальный адрес
- Результат: `{ url, method, targetServiceHint, file, line }`

**schemas.ts** — извлекает схемы данных:
- TypeScript DTO-классы и интерфейсы
- Zod-схемы: `z.object({ email: z.string(), password: z.string() })`
- Pydantic-модели (Python)
- OpenAPI/Swagger если есть файл спецификации
- Результат: `{ name, fields: [{ name, type, required }] }`

**env-config.ts** — читает `.env` и конфиг-файлы:
- `AUTH_SERVICE_URL=http://auth:3001` → знаем, что `auth` — это отдельный сервис
- Результат: `{ key, value, resolvedService? }`

### Инструменты по задачам

| Задача | Инструмент | Когда использовать |
|---|---|---|
| TypeScript type-aware анализ | `ts-morph` | Главный инструмент для TS/JS |
| Универсальный парсинг | `tree-sitter` + WASM | Go, Python, Ruby и др. |
| Паттерн-поиск по AST | `ast-grep` | Быстро найти паттерн без написания парсера |
| Готовая спецификация | `@apidevtools/swagger-parser` | Если есть OpenAPI YAML/JSON |
| Python | `libcst` | Сохраняет форматирование, полный AST |

### Файловая структура

```
layer-1-parser/
├── index.ts
├── languages/
│   ├── typescript.ts   ← ts-morph + tree-sitter
│   ├── python.ts       ← ast-grep / libcst
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
├── resolver.ts       ← URL → ServiceNode
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
frontend → api-gateway → auth-service
                       → user-service → database
                       → order-service → database
```

Force-directed лейаут хуже подходит для сервисов — там нет физического смысла в «притяжении».

### Компоненты

- **Graph.tsx** — основной канвас, подписывается на WebSocket, перерисовывает граф при обновлении
- **NodeCard.tsx** — popup при клике на узел: имя сервиса, список роутов, входящие и исходящие вызовы, схемы данных
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

### Пример

```
POST /auth/login
  INPUT:  { email: string, password: string }
       ↓
  AuthService.validateCredentials()
  OUTPUT: JWT { userId: string, roles: string[], exp: number }
       ↓
  UserService.getProfile()
  INPUT:  { userId: string }        ← берётся из JWT
  OUTPUT: { id, name, email, avatar }
       ↓
  OrderService.getUserOrders()
  INPUT:  { userId: string, roles: string[] }   ← из JWT
  OUTPUT: { orders: Order[] }
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
| **MVP** | Layer 0 (CLI) + Layer 1 (TS parser) + Layer 2 + Cytoscape граф | Видны связи между сервисами |
| **v0.2** | Schemas extractor + EdgeTooltip с payload | Видно что передаётся |
| **v0.3** | File watcher + WebSocket live updates | Реальное время |
| **v0.4** | DataFlow tracer + подсветка пути | Killer feature |
| **v1.0** | VS Code Extension, Python + Go парсеры | Широкая аудитория |

---

## Технологический стек

| Слой | Технологии |
|---|---|
| Layer 0 | Node.js, commander, chokidar, open, chalk |
| Layer 1 | ts-morph, tree-sitter (WASM), ast-grep |
| Layer 2 | TypeScript, in-memory / better-sqlite3 |
| Layer 3 | Fastify, ws / SSE |
| Layer 4 | React, Cytoscape.js, dagre, Zustand |
| Layer 5 | TypeScript, custom AST traversal |
| Shared | TypeScript strict mode |
| Tooling | pnpm workspaces, tsup, Vite (UI) |
