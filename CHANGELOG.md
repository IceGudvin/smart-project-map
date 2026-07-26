## [2026-07-26] — Layer 4: DataFlow режим — 3 пути + dash + dimmed (Issue #6)

### Добавлено
- `Canvas/DataFlowMode.ts` — оркестратор режима:
  - Три пути: `DATAFLOW_NODE_IDS[0..2]` — Login Flow / File Upload / Auth Check
  - `applyHighlight(cy, idx)` — `.df-active` на узлах/рёбрах пути, `.dimmed` на остальных
  - `_startDash()` / `_stopDash()` — setInterval ~25fps — `line-dash-offset` на `.df-active` рёбрах
  - `PathSelector` — glassmorphism pill в низу канваса: 3 кнопки + badge `(N узлов)`
  - `_activate()` / `_deactivate()`: fade-in / fade-out (`opacity 0.2s`), `store.setDataflowMode()`
  - `on('dataflow:next')` — `store.nextDataflowPath()` → циклическая смена 0→1→2→0
  - `on('cy:ready')` — сохраняет `Core` для применения стилей

- `styles/dataflow.css`:
  - `@keyframes df-dash` (`stroke-dashoffset: -24`)
  - `@keyframes df-pulse` — анимированная зелёная точка в `.df-path-name`
  - `.df-path-name` — pill-бейдж активного пути в StatsBar/Header
  - `.df-mode-active .service-item` — `opacity: 0.35` для выключенных Sidebar-элементов

- `Canvas/CanvasToolbar.ts` — обновлён:
  - `emit('dataflow:next', undefined)` вместо прямого переключения индекса
  - `on('dataflow:toggle')` — синхронизация UI активного пути в label
  - Убран `store.dataflowPaths` (phantom field, не существовал)

### Зафиксировано в репо
- Roadmap Issue #6 — чекбокс ⚡ DataFlow отмечен ✅
- Коммит: `d4bd8e8`

---

## [2026-07-26] — Layer 4: EdgeTooltip (Issue #6)
- Коммит: `e750028`

---

## [2026-07-26] — Layer 4: DetailPanel + вкладки (Issue #6)
- Коммит: `6aa5abd`

---

## [2026-07-26] — Layer 4: Canvas + Sidebar + Header (Issue #6)
- Коммиты: `1e6f709`, `7cb543d`, `b747259`, `14166159`

---

## [2026-07-26] — Layer 4: Стили + AppShell + cytoscapeInit (Issue #6)
- Коммиты: `e96896c`, `1676593`, `e0d0d95`

---

## [2026-07-26] — Старт реализации: shared/ + monorepo
- Roadmap: Issue #1, Issue #2
