# Sidebar

Левая панель со списком всех сервисов проекта.

## Структура
```
Sidebar
├── FilterBar     — поиск + чипы All / Service / Infra
└── sidebar-list
    ├── section   — «Application»
    │   └── ServiceItem × N
    └── section   — «Infrastructure»
        └── ServiceItem × N
```

## Файлы
| Файл | Назначение |
|------|------------|
| `index.ts` | Класс Sidebar, компоновка |
| `ServiceItem.ts` | Один элемент списка (имя, бейдж, статус) |
| `FilterBar.ts` | Input поиска + чипы фильтра |

## Взаимодействие
- Клик на ServiceItem → `store.selectNode(id)` + `spm:selectNode` event
- Input поиска → `store.setFilter(q)` + `spm:filter` event
- `update()` — перерисовывает список при смене `store.graph`
