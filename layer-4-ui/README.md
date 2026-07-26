# layer-4-ui

Браузерный интерфейс Smart Project Map.

## Стек

- **Vite** — сборка и dev-сервер (порт `4000`)
- **TypeScript** — строгая типизация
- **Cytoscape.js + dagre** — рендер графа зависимостей
- `@smart-project-map/shared` — общие типы (ServiceNode, Edge, GraphModel)

## Запуск

```bash
pnpm install
pnpm dev
```

UI ожидает, что `layer-3-server` запущен на порту `3000`.
WebSocket проксируется через Vite: `/ws` → `ws://localhost:3000`.

## Структура

```
src/
  main.ts          — точка входа
  store.ts         — реактивное состояние приложения
  styles/          — дизайн-система (токены, reset, компоненты)
  components/      — UI-компоненты
  graph/           — инициализация и конфигурация Cytoscape
  lib/             — вспомогательные модули (WS, EventBus)
```
