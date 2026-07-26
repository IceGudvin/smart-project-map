# src/

Исходный код `layer-4-ui` — браузерного интерфейса Smart Project Map.

## Структура

```
src/
├── main.ts              # Точка входа: инициализация, подключение WS
├── store.ts             # Реактивное состояние приложения
├── styles/              # Дизайн-система: токены, reset, imports
├── components/          # UI-компоненты
│   ├── AppShell/        # Корневая оболочка (header + sidebar + canvas)
│   ├── Header/          # Шапка с логотипом, путём, кнопками
│   ├── Sidebar/         # Список сервисов с поиском и фильтрами
│   ├── Canvas/          # Cytoscape-граф + тулбар + зум + легенда
│   ├── DetailPanel/     # Панель деталей узла (роуты, схемы, связи)
│   ├── EdgeTooltip/     # Тултип при наведении на ребро
│   └── ui/              # Атомарные компоненты (Badge, Button, Divider)
├── graph/               # Cytoscape-инициализация и статические данные
│   ├── cytoscapeInit.ts # initCytoscape(), rerunLayout()
│   └── nodeData.ts      # getNodeData(id) → NodeDetailData
└── lib/                 # Вспомогательные модули
    ├── wsClient.ts      # WebSocket с автореконнектом
    └── eventBus.ts      # Типизированный pub/sub
```

## Точка входа

`main.ts` выполняет:
1. Читает тему из `prefers-color-scheme`
2. Создаёт `AppShell` и монтирует в `#app`
3. Подключается к WS через `wsClient.connectWs()`
4. Подписывается на `graph:update` → передаёт данные в `store` → Canvas перерисовывает граф

## Зависимости

| Пакет | Версия | Назначение |
|---|---|---|
| `cytoscape` | ^3.28 | Граф-движок |
| `cytoscape-dagre` | ^2.5 | Иерархический layout |
| `dagre` | ^0.8 | Алгоритм dagre для cytoscape-dagre |

## Связь с другими слоями

- **layer-3-server** → WS на `ws://localhost:3000`, принимает `GraphData`
- **shared/** → типы `ServiceNode`, `ServiceEdge`, `GraphData`
