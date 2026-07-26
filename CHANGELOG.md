## [2026-07-26] — Layer 4: Интеграция layer-3-server — финализация (Issue #6)

### Добавлено
- `eventBus.ts` — два новых события:
  - `graph:rebuild:start` — эмитится Header при нажатии Refresh (блокирует кнопку)
  - `graph:rebuild:done(updatedAt: number)` — эмитится после завершения `POST /graph/rebuild`;
    payload — миллисекундный timestamp из заголовка `X-Updated-At` сервера
- `AppShell/index.ts` — хелпер `parseUpdatedAt(res)`: читает `X-Updated-At` из HTTP-ответа;
  использует его если `data.updatedAt === 0`; обработчик `graph:rebuild:done` обновляет Header
- `Header/index.ts`:
  - `_doRebuild()`: читает `X-Updated-At` из response headers + `body.updatedAt` (приоритет);
    fallback → `Date.now()`; эмитит `graph:rebuild:start` / `graph:rebuild:done`
  - `_setUpdatedAt(ts, flash)`: flash=true → анимирует `.hdr-updated` зелёным на 1.5 с после rebuild
  - CSS `.hdr-updated.flash-ok` — `transition: color 300ms`
  - `destroy()` — очищает `_flashTimer`

### Исправлено
- `vite.config.ts` — proxy исправлен:
  - `/ws` → `ws://localhost:3001` (порт сервера, было 3000)
  - `/graph` → `http://localhost:3001` (новый маршрут; было `/api`)
- Все три подзадачи 🛠 Интеграция layer-3-server отмечены ✅ в Issue #6

### Зафиксировано в репо
- Коммит: `e1b655d`
- Roadmap Issue #6 — чекбоксы 🛠 Интеграция layer-3-server закрыты ✅

---

## [2026-07-26] — Layer 4: Интеграция layer-3-server — graphClient + updatedAt (Issue #6)

### Добавлено
- `layer-4-ui/src/lib/graphClient.ts` — HTTP-слой поверх WS:
  - `initGraphClient()` — подписывается на `graph:refresh` (эмитится `wsClient` если `graph:full` не пришёл за 2 с) → `GET /graph` → `store.setGraph()` → `emit('graph:full')`
  - `rebuildGraph()` — `POST /graph/rebuild` с индикатором загрузки и обработкой ошибок
  - `fetchGraph()` — чистый `GET /graph` для ручного вызова (например при HMR)
  - Все ошибки логируются с префиксом `[graphClient]`, не бросают наружу
- `layer-4-ui/src/components/AppShell/index.ts` — при `mount()` вызывается `initGraphClient()` после `connectWs()`

### Обновлено
- `Header/index.ts` — `_doRefresh()` теперь вызывает `rebuildGraph()` из `graphClient` вместо прямого `fetch`; `_syncUpdatedAt()` форматирует `store.graph.updatedAt` в `ЧЧ:ММ:СС`
- `store.ts` — `applyDiff()` обновляет `updatedAt: Date.now()` при каждом инкрементальном diff

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🛠 Интеграция layer-3-server частично отмечены ✅
- Файл: `layer-4-ui/src/lib/graphClient.ts` (новый)

---

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
