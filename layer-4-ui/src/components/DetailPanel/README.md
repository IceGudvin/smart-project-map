# DetailPanel

Правая панель с детальной информацией о выбранном узле графа.

## Структура
```
DetailPanel
├── panel-header  — иконка, имя, тех-стек, кнопка закрытия
└── panel-body
    ├── RouteList   — HTTP-роуты (GET, POST, PUT, DELETE)
    ├── SchemaBlock — схемы данных (поля, типы, required)
    └── DepList     — зависимости (входящие ← / исходящие →)
```

## Файлы
| Файл | Назначение |
|------|------------|
| `index.ts` | Класс DetailPanel, show/hide |
| `RouteList.ts` | Список HTTP роутов |
| `SchemaBlock.ts` | Блок схем данных |
| `DepList.ts` | Список зависимостей (кликабельные) |

## API
```ts
panel.show(nodeId: string) // открыть для узла
panel.hide()               // закрыть
```
