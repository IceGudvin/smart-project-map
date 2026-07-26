# Header

Верхняя панель приложения (48px высота).

## Содержимое
| Элемент | Описание |
|---------|----------|
| Логотип | SVG-иконка + название |
| `header-path` | Путь к проекту из `store.graph.meta` |
| `ws-indicator` | Зелёный/серый индикатор WebSocket-соединения |
| Refresh | Диспатчит `spm:refresh` (Canvas слушает) |
| Fit | Диспатчит `spm:fit` (Canvas центрирует граф) |
| Theme toggle | Переключает `store.theme` dark ↔ light |

## API
```ts
header.setWsStatus('live' | 'offline')
header.setPath('~/projects/leadway')
```
