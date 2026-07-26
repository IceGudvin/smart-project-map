# graph/

Модули для работы с Cytoscape-графом.

## Файлы

| Файл | Назначение |
|---|---|
| `cytoscapeInit.ts` | Инициализация Cytoscape, регистрация dagre, стили, layout |
| `nodeData.ts` | Статические данные для Detail Panel (роуты, схемы, зависимости по `id`) |

## Использование

```ts
import { initCytoscape, rerunLayout } from './graph/cytoscapeInit';
import { getNodeData } from './graph/nodeData';

const cy = initCytoscape({ container, data, isDark: true });

cy.on('tap', 'node', e => {
  const info = getNodeData(e.target.id());
  if (info) detailPanel.show(info);
});
```

## Зависимости
- `cytoscape` — граф-движок
- `cytoscape-dagre` — иерархический layout
- `shared/types` — `ServiceNode`, `ServiceEdge`, `GraphData`
