# Layer 4 — UI

Фронтенд: интерактивный граф сервисов с предпросмотром деталей.

## Ответственность
- Рендер графа с узлами (сервисами) и рёбрами (вызовами)
- Интерактивность: zoom, pan, click по узлу/ребру
- Панель деталей: роуты, схемы, входящие/исходящие вызовы
- Tooltip на стрелке: что передаётся (payload preview)
- Live-обновление через WebSocket

## Планируемые файлы
```
layer-4-ui/
├── index.html
├── app.ts
├── components/
│   ├── Graph.tsx         ← основной канвас
│   ├── NodeCard.tsx      ← popup: роуты, схемы, связи
│   ├── EdgeTooltip.tsx   ← payload на стрелке
│   └── Sidebar.tsx       ← список сервисов + поиск
├── graph/
│   ├── renderer.ts       ← D3 / Cytoscape.js
│   ├── layout.ts         ← dagre (иерархический layout)
│   └── interactions.ts   ← zoom, pan, select
└── store.ts              ← Zustand / Jotai
```

## Варианты рендера
- **D3.js** — максимум контроля, SVG, кастомные анимации стрелок
- **Cytoscape.js** — граф из коробки, встроенные layout'ы
- **React Flow** — React-нативный, красивый UI, тяжелее
