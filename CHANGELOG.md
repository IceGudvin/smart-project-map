## [2026-07-26] — Layer 4: Sidebar — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/Sidebar/index.ts` — **полная реализация**:
  - `mount(el)` / `update(graph)` / `setActive(nodeId|null)` / `destroy()` API
  - CSS `injectSidebarStyles()` — одноразовая инжекция: обёртка, header, search, chips, sb-list, sb-section-label, .si, badges, dot, scrollbar
  - **Collapse**: кнопка ⟨ — схлопывает до 48px, `transition: width 220ms`, иконка вращается 180° (класс `.collapsed`), `emit('sidebar:collapsed', bool)`
  - **Поиск**: debounce 200ms, фильтр по `node.name` + `emit('sidebar:filter', Set<nodeId>)` — Canvas скрывает/показывает узлы cy
  - **FilterBar чипы**: All/Service/Infra, комбинируются с поиском
  - **Секции**: Application (фильтр `node.nodeType === 'service'`) и Infrastructure с разделителями; пустые секции авто-скрываются
  - **Обновление**: `_applyDiff()` добавляет/удаляет элементы без полного пересоздания DOM
  - Счётчик `(N)` рядом с заголовком, обновляется по `graph:full` / после фильтра

- `layer-4-ui/src/components/Sidebar/FilterBar.ts` — **полная реализация**:
  - 3 чипа: All / Service / Infra, `aria-pressed`, активный чип — `--color-primary` фон
  - callback `onChange(FilterType)` — вызывает Sidebar._applyFilter()

- `layer-4-ui/src/components/Sidebar/ServiceItem.ts` — **полная реализация**:
  - Badge-мапинг для 20+ технологий: Next.js, FastAPI, Django, Express, Postgres, Redis, MinIO, RabbitMQ, Kafka и др.
  - Мета-строка: `N routes · язык`
  - Статус-точка: `--color-success` (зелёная)
  - `setActive(bool)` + `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`
  - Клик → `emit('node:select', nodeId)` (не DOM CustomEvent)
  - `escHtml()` — защита от XSS

- `layer-4-ui/src/lib/eventBus.ts` — добавлены события:
  - `sidebar:filter: Set<string>` — Sidebar эмитит, Canvas слушает
  - `sidebar:collapsed: boolean` — Sidebar эмитит, AppShell может реагировать

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 📋 Sidebar отмечены ✅
- Коммит: `7cb543d`

---

## [2026-07-26] — Layer 4: Header — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/Header/index.ts` — SVG-лого, WS-индикатор (4 состояния), Refresh/Fit/Theme
- `layer-4-ui/src/lib/eventBus.ts` — `cy:fit` event

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🔧 Header отмечены ✅
- Коммиты: `14166159`, `b747259`

---

## [2026-07-26] — Layer 4: AppShell — полная реализация (Issue #6)

### Добавлено
- `layer-4-ui/src/components/AppShell/index.ts` — layout 100dvh, wsClient connect, cy:ready, полная оркестрация событий
- `layer-4-ui/src/main.ts` — упрощён

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🏗 AppShell отмечены ✅
- Коммит: `1676593`

---

## [2026-07-26] — Layer 4: cytoscapeInit + nodeData (Issue #6)

### Зафиксировано в репо
- Roadmap: Issue #6, коммит: `e0d0d95`

---

## [2026-07-26] — Layer 4: стили — dot-grid + glassmorphism (Issue #6)

### Зафиксировано в репо
- Roadmap: Issue #6, коммит: `e96896c`

---

## [2026-07-26] — layer-4-ui: структура компонентов + дизайн-система

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
