## [2026-07-26] — Layer 4: Canvas + оверлеи — полная реализация (Issue #6)

### Добавлено
- `Canvas/index.ts` — **полная реализация**:
  - `mount(container)` — создаёт `.canvas-wrap` + `#cy`, монтирует все оверлеи
  - `requestAnimationFrame` — дождём DOM, затем вызываем `cytoscapeInit()`
  - `emit('cy:ready', cy)` после инициализации — AppShell сохраняет Core-инстанс
  - `cy:fit` → `cy.fit(undefined, 60)`
  - `graph:full` / `graph:update` → `syncGraph` + `statsBar.update`
  - `theme:changed` → `updateTheme(cy, isDark)`
  - `dataflow:toggle` → `toolbar.setDataflow(active)`
  - `dataflow:next` → `toolbar.syncDataflowPath(idx)`
  - `graph:refresh` → `runLayout(cy, 'TB')`
  - CSS: `#cy` — dot-grid `radial-gradient` + `::after` радиальный фейд по краям
- `StatsBar.ts` — `N сервисов · N связей · N роутов`; `tabular-nums`; glassmorphism pill; авто-плюрализация чисел
- `CanvasToolbar.ts` — glassmorphism pill центр сверху; Pan (псевдо-активный), DataFlow + имя пути + ⋳ Next, Layout; `aria-pressed` + `toolbar-btn--active`
- `ZoomControls.ts` — glassmorphism pill правый ниж; `+`/`−`/`⊡`; с `cy.animate` (200ms плавно)
- `Legend.ts` — glassmorphism левый ниж; 3 чипса (закруглённый прямоугольник Service, круг Database, CSS-hexagon Cache)

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🖼 Canvas + оверлеи отмечены ✅
- Коммит: `a6d8ee5`

---

## [2026-07-26] — Layer 4: Sidebar — полная реализация (Issue #6)

### Добавлено
- `Sidebar/index.ts`, `FilterBar.ts`, `ServiceItem.ts` — collapse, поиск, фильтр, секции, badges
- `eventBus.ts` — `sidebar:filter`, `sidebar:collapsed`

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 📋 Sidebar отмечены ✅
- Коммит: `7cb543d`

---

## [2026-07-26] — Layer 4: Header — полная реализация (Issue #6)

### Добавлено
- `Header/index.ts` — SVG-лого, WS-индикатор (4 состояния), Refresh/Fit/Theme
- `eventBus.ts` — `cy:fit`

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🔧 Header отмечены ✅

---

## [2026-07-26] — Layer 4: AppShell — полная реализация (Issue #6)

### Добавлено
- `AppShell/index.ts` — layout 100dvh, wsClient, cy:ready, оркестрация

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🏗 AppShell отмечены ✅

---

## [2026-07-26] — Layer 4: cytoscapeInit + nodeData (Issue #6)

### Зафиксировано в репо
- Roadmap: Issue #6, коммит: `e0d0d95`

---

## [2026-07-26] — Layer 4: стили — dot-grid + glassmorphism (Issue #6)

### Зафиксировано в репо
- Roadmap: Issue #6, коммит: `e96896c`

---

## [2026-07-26] — layer-4-ui: структура + дизайн-система

### Зафиксировано в репо
- Roadmap: Issue #7

---

## [2026-07-26] — Layer 0: CLI + File Watcher

### Зафиксировано в репо
- Roadmap: Issue #5

---

## [2026-07-26] — Layer 3: Fastify Server + WebSocket

### Зафиксировано в репо
- Roadmap: Issue #4

---

## [2026-07-26] — Layer 2: Graph Builder

### Зафиксировано в репо
- Roadmap: Issue #3

---

## [2026-07-26] — Старт реализации: shared/ + monorepo

### Зафиксировано в репо
- Roadmap: Issue #1, Issue #2
