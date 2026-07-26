# src/ — Layer 4 UI

Основная папка исходного кода браузерного интерфейса.

## Структура

```
src/
├── main.ts           — точка входа, монтирует AppShell в #app
├── store.ts          — реактивное состояние (GraphModel, выбранный узел, тема)
├── styles/           — дизайн-система: токены, reset, индекс
├── components/       — UI-компоненты (AppShell, Header, Sidebar, Canvas, DetailPanel, EdgeTooltip)
├── graph/            — работа с Cytoscape: инициализация, nodeData
└── lib/              — утилиты: WebSocket-клиент, eventBus
```

## Принципы

- Ванильный TypeScript без фреймворков — намеренно, чтобы минимизировать bundle и сохранить контроль над DOM
- Состояние в `store.ts` — единственный источник правды; компоненты подписываются через `eventBus`
- Каждый компонент — класс или функция, возвращающая `HTMLElement`
- Связь с Layer 3 только через `lib/wsClient.ts`
