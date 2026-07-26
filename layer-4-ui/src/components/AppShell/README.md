# AppShell

Корневой компонент-оболочка, компонует весь UI приложения.

## Ответственность
- Создаёт и соединяет `Header`, `Sidebar`, `Canvas`, `DetailPanel`, `EdgeTooltip`
- Управляет DOM-структурой: `header + .main( sidebar + canvas-wrap )`
- Вызывает `canvas.init()` после монтирования (нужна DOM-нода `#cy`)
- Метод `refresh()` вызывается при `graph:update` из eventBus

## Зависимости
- `Store` — реактивное состояние
- Все дочерние компоненты

## Файлы
| Файл | Назначение |
|------|------------|
| `index.ts` | Класс AppShell |
