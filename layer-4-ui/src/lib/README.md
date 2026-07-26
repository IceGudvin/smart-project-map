# lib/

Вспомогательные модули: WebSocket-клиент и event bus.

## Файлы

| Файл | Назначение |
|---|---|
| `wsClient.ts` | WS-клиент с автореконнектом, подключается к layer-3-server |
| `eventBus.ts` | Типизированный pub/sub для внутренней коммуникации компонентов |

## Поток данных

```
layer-3-server (WS :3000)
       │
       ▼
  wsClient.ts
       │  emit('graph:update', GraphData)
       ▼
  eventBus.ts
       │  on('graph:update', handler)
       ▼
  Canvas/index.ts → обновляет Cytoscape
  StatsBar.ts     → обновляет счётчики
  Sidebar/index.ts → обновляет список сервисов
```

## События (WsEventMap)

| Событие | Payload | Описание |
|---|---|---|
| `graph:update` | `GraphData` | Новые данные графа от сервера |
| `ws:connected` | `undefined` | WS-соединение установлено |
| `ws:disconnected` | `undefined` | WS-соединение разорвано |
| `ws:error` | `Event` | Ошибка WS |
| `node:selected` | `string` | Пользователь кликнул на узел (id) |
| `node:deselected` | `undefined` | Сброс выделения |
| `theme:changed` | `'dark'\|'light'` | Смена темы |
| `layout:changed` | `'TB'\|'LR'` | Смена направления layout |
| `dataflow:toggled` | `boolean` | Включение/выключение DataFlow режима |
