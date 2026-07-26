## [2026-07-26] — Layer 4: EdgeTooltip — полная реализация (Issue #6)

### Добавлено
- `EdgeTooltip/index.ts` — переписан с нуля:
  - `position: fixed`, следует за курсором через `edge:mousemove` + `window.mousemove`
  - Glassmorphism: `backdrop-filter: blur(8px)`, `var(--glass-bg/border/shadow/saturate)`
  - `opacity: 0 → 1` fade `0.15s ease` через `.edge-tooltip--visible`
  - `calcPos()`: автопереключение влево если не влезает за `vw/vh`
  - Шапка: `et-method` (`JetBrains Mono`, 700) + `et-path` (`break-all`)
  - Цвет метода: GET=success, POST=primary, PUT=gold, PATCH=orange, DELETE=error
  - Секция: `INPUT → [схема]`, SVG-стрелка вниз, `OUTPUT → [схема]`
  - `et-schema--defined`: выделяет названные схемы, серый текст если схема не указана
  - `_esc()`: XSS-эскейп всех данных ребра
  - `pointer-events: none` — не перехватывает события канваса
- `lib/eventBus.ts`:
  - Добавлены `edge:mouseover`, `edge:mousemove`, `edge:mouseout` в `EventMap`
  - Експортированы `EdgeHoverPayload`, `EdgeMovePayload`

### Зафиксировано в репо
- Roadmap Issue #6 — чекбокс 💬 EdgeTooltip отмечен ✅
- Коммит: `e750028`

---

## [2026-07-26] — Layer 4: DetailPanel + вкладки (Issue #6)

### Добавлено
- `DetailPanel/index.ts`, `RouteList.ts`, `SchemaBlock.ts`, `DepList.ts`, `styles.ts`

### Зафиксировано в репо
- Roadmap Issue #6 — коммит: `6aa5abd`

---

## [2026-07-26] — Layer 4: Canvas + оверлеи (Issue #6)

### Добавлено
- `Canvas/index.ts`, `StatsBar.ts`, `CanvasToolbar.ts`, `ZoomControls.ts`, `Legend.ts`

### Зафиксировано в репо
- Roadmap Issue #6 — коммит: `1e6f709`

---

## [2026-07-26] — Layer 4: Sidebar (Issue #6)

### Добавлено
- `Sidebar/index.ts`, `FilterBar.ts`, `ServiceItem.ts`

### Зафиксировано в репо
- Roadmap Issue #6 — коммит: `7cb543d`

---

## [2026-07-26] — Layer 4: Header (Issue #6)

### Зафиксировано в репо
- Roadmap Issue #6 — коммиты: `14166159`, `b747259`

---

## [2026-07-26] — Layer 4: Стили dot-grid + glassmorphism (Issue #6)

### Зафиксировано в репо
- Roadmap Issue #6 — коммит: `e96896c`

---

## [2026-07-26] — Старт реализации: shared/ + monorepo

### Зафиксировано в репо
- Roadmap: Issue #1, Issue #2
