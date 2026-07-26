# Layer 2 — Graph Builder

Получает сырые данные из парсера, строит нормализованный граф сервисов.

## Ответственность
- Сборка `ServiceNode[]` и `Edge[]` из результатов парсера
- Резолюция URL-паттернов в реальные сервисы
- Построение data-flow цепочек
- Кэширование графа

## Планируемые файлы
```
layer-2-graph/
├── builder.ts        ← ServiceNode[] + Edge[] → GraphModel
├── resolver.ts       ← URL → ServiceNode (по env, hostname)
├── data-flow.ts      ← что входит → что выходит → куда
├── cache.ts          ← мемоизация / инвалидация по файлу
└── types.ts
```

## Типы
```ts
type ServiceNode = {
  id: string
  name: string
  path: string          // путь к каталогу сервиса
  routes: Route[]
  dependencies: string[]
  schemas: Schema[]
}

type Edge = {
  from: string
  to: string
  method: string
  path: string
  inputPayload?: SchemaRef
  outputPayload?: SchemaRef
}
```

## Варианты хранения
- **in-memory JSON** — для MVP, пересобирается при изменении файла
- **SQLite (better-sqlite3)** — кэш между сессиями
