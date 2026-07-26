# Canvas

Главная область приложения — граф Cytoscape + вспомогательные оверлеи.

## Структура
```
Canvas
├── #cy              — контейнер Cytoscape (инициализируется через cytoscapeInit.ts)
├── StatsBar         — счётчики: сервисов / связей / роутов
├── CanvasToolbar    — Pan / DataFlow / Re-layout
├── ZoomControls     — + / − / Fit
└── Legend           — легенда: Service / Database / Cache
```

## Файлы
| Файл | Назначение |
|------|------------|
| `index.ts` | Класс Canvas, оркестрация |
| `CanvasToolbar.ts` | Тулбар инструментов |
| `ZoomControls.ts` | Кнопки зума |
| `Legend.ts` | Статическая легенда |
| `StatsBar.ts` | Счётчики из store.graph |

## События (CustomEvent)
| Событие | Когда | Данные |
|---------|-------|--------|
| `spm:refresh` | Клик Refresh / Layout | — |
| `spm:fit` | Клик Fit | — |
| `spm:selectNode` | Клик узла в Sidebar | `{ id }` |
| `spm:dataflow` | Тогл DataFlow | `{ active: boolean }` |
| `spm:filter` | Поиск/фильтр в Sidebar | `{ q?, type? }` |
