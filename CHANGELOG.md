## [2026-07-26] — ProjectPicker: выбор проекта через UI (Issue #6)

### Добавлено
- `layer-4-ui/src/components/ProjectPicker/index.ts` — модальный экран выбора проекта:
  - Поле ввода пути с placeholder для Windows/Unix
  - Кнопка «Открыть» → `POST /server/start { projectDir }`
  - Список недавних проектов (до 5, localStorage)
  - Анимированное появление/скрытие
  - Закрытие по Escape / кнопке «Пропустить»
  - Статусы: подключение / ошибка / успех
- `layer-3-server/src/routes/project.ts` — два новых маршрута:
  - `POST /server/start` — принимает `{ projectDir }`, валидирует путь, переключает scanner, запускает сканирование, рассылает `graph:full` по WS
  - `GET /server/status` — текущий `projectDir` + краткая статистика графа
- `layer-3-server/src/scanner.ts` — рефакторинг: `setProjectDir()`, `getCachedGraph()`, `runScan()` как отдельный модуль
- `layer-3-server/src/index.ts` — `--project` теперь необязательный; без него сервер стартует и ждёт `POST /server/start`

### Изменено
- `eventBus.ts` — добавлены события:
  - `ws:status: 'connecting' | 'connected' | 'disconnected'`
  - `project:pick:show` — wsClient эмитит при первом неудачном подключении
  - `project:changed(path)` — после успешного выбора проекта в UI
- `wsClient.ts` — после первого неудачного `connect` эмитит `project:pick:show`
- `AppShell/index.ts` — монтирует `ProjectPicker`; при `project:changed` перепедключает WS через 1с

### Зафиксировано в репо
- Коммит: `44aba46` — ProjectPicker + routes/project.ts + scanner.ts + index.ts + wsClient.ts
- Коммит: `1e126d5` — wire ProjectPicker в AppShell + eventBus
- Roadmap Issue #6 — чекбокс 📂 ProjectPicker отмечен ✅

---

## [2026-07-26] — Русификация UI + фиксы экспортов + SVG-иконки Legend (Issue #6)

### Добавлено
- `Legend.ts` — SVG-иконки для всех трёх типов узлов:
  - Сервис — 2×2 сетка блоков (micro-schema)
  - БД — цилиндр с двумя кольцами
  - Кэш — гексагон с внутренним вырезом
- `Sidebar/index.ts` — кнопка collapse: заменен символ `⟨` на анимированный SVG double-chevron `«`;
  поворот 180° через `.sb-chevron` + CSS `.collapsed`; видимая рамка + hover-подсветка

### Исправлено
- `Legend.ts` — удалён несуществующий `import { injectOnce }` — Vite бросал `import-analysis` error
- `CanvasToolbar.ts` и `Legend.ts` — возвращён экспорт в формате `export const X = { mount() }` —
  предыдущий патч переименовал экспорт в функцию, что вызвало `SyntaxError` белый экран

### Русифицировано
- `Header` — `live`→`активен`, `Refresh`→`Обновить`, `Fit`→`Вписать`, статусы `подключение`/`отключён`/`ошибка`
- `CanvasToolbar` — `Pan`→`Пан`, `DataFlow`→`Поток`, `Layout`→`Раскладка`, разметки `Дерево`/`Граф`/`Сетка`
- `FilterBar` — `All`→`Все`, `Service`→`Сервисы`, `Infra`→`Инфра`
- `Legend` — `Service`→`Сервис`, `Database`→`БД`, `Cache`→`Кэш`

### Зафиксировано в репо
- Коммит: `e000458` — русификация Header
- Коммит: `f508cbe` — русификация CanvasToolbar + FilterBar + Legend
- Коммит: `77e4cb2` — fix Legend.ts import
- Коммит: `ce4f7d3` — fix export формата CanvasToolbar + Legend
- Коммит: `ff926df` — SVG-иконки Legend + animated collapse chevron

---

## [2026-07-26] — Bugfix: AppShell — TypeError: X is not a constructor (Issue #6)

### Исправлено
- `AppShell/index.ts` — критический баг: `Canvas`, `DetailPanel`, `EdgeTooltip` экспортируются как singleton-объекты (`export const X = {}`), а AppShell вызывал `new X()` — это бросало `TypeError: X is not a constructor` и завешивало старт приложения
- `new Canvas(canvasWrapEl)` → `Canvas.mount(canvasWrapEl)`
- `new DetailPanel()` → `DetailPanel.mount(dpEl)`
- `new EdgeTooltip()` → `EdgeTooltip.mount()` (сам монтируется в body)
- `new Sidebar(sidebarEl)` → `new Sidebar()` + `sidebar.mount(sidebarEl)`
- `this.sidebar.update()` → `this.sidebar.update(store.graph)` (метод требует `GraphModel`)
- `this.canvas.update()` — удалён (метод не существует, Canvas реагирует через eventBus)
- `theme:changed` — добавлен `document.documentElement.setAttribute('data-theme', theme)`
- `sidebar:collapsed` — AppShell теперь синхронизирует `.app-sidebar.collapsed` класс

### Зафиксировано в репо
- Коммит: `5e88c6c`
- Roadmap Issue #6 — чекбокс 🐛 Bugfix — все отмечены ✅

---

## [2026-07-26] — Layer 4: Интеграция layer-3-server — финализация (Issue #6)

### Добавлено
- `eventBus.ts` — два новых события:
  - `graph:rebuild:start` — эмитится Header при нажатии Refresh (блокирует кнопку)
  - `graph:rebuild:done(updatedAt: number)` — эмитится после завершения `POST /graph/rebuild`
- `AppShell/index.ts` — хелпер `parseUpdatedAt(res)`: читает `X-Updated-At` из HTTP-ответа
- `Header/index.ts`:
  - `_doRebuild()`: читает `X-Updated-At` из response headers
  - `_setUpdatedAt(ts, flash)`: flash=true → анимация зелёным

### Исправлено
- `vite.config.ts` — proxy исправлен: `/ws` → `ws://localhost:3001`, `/graph` → `http://localhost:3001`

### Зафиксировано в репо
- Коммит: `e1b655d`
- Roadmap Issue #6 — чекбоксы 🛠 Интеграция layer-3-server закрыты ✅

---

## [2026-07-26] — Layer 4: Интеграция layer-3-server — graphClient + updatedAt (Issue #6)

### Добавлено
- `layer-4-ui/src/lib/graphClient.ts` — HTTP-слой поверх WS:
  - `initGraphClient()` — подписывается на `graph:refresh` → `GET /graph`
  - `rebuildGraph()` — `POST /graph/rebuild`
  - `fetchGraph()` — чистый `GET /graph`
- `AppShell/index.ts` — `initGraphClient()` вызывается после `connectWs()`

### Зафиксировано в репо
- Roadmap Issue #6 — чекбоксы 🛠 Интеграция layer-3-server частично ✅
- Файл: `layer-4-ui/src/lib/graphClient.ts` (новый)

---

## [2026-07-26] — Layer 4: DataFlow режим — 3 пути + dash + dimmed (Issue #6)

### Добавлено
- `Canvas/DataFlowMode.ts` — оркестратор режима: 3 пути, `applyHighlight`, `_startDash`, `PathSelector`
- `styles/dataflow.css` — `@keyframes df-dash`, `@keyframes df-pulse`, `.dimmed`, `.df-active`
- `Canvas/CanvasToolbar.ts` — `emit('dataflow:next')`, `on('dataflow:toggle')`

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
