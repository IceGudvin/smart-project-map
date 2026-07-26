## [2026-07-26] — Bugfix: DetailPanel — рекурсия close(), show()/hide(), edge-дубли

### Исправлено
- **Баг 1 — `Maximum call stack size exceeded` (рекурсия)**
  - `DetailPanel.close()` вызывал `emit('node:deselect')` → подписчик `on('node:deselect', () => this.close())` снова вызывал `close()` → stack overflow
  - Введён флаг `_closing: boolean` — повторный вход в `close()` прерывается сразу
  - Подписка в `mount()` изменена: `on('node:deselect', () => this.hide())` — `hide()` → `_closeOnly()` без emit
- **Баг 2 — `DetailPanel.show is not a function` / `DetailPanel.hide is not a function`**
  - `AppShell/index.ts` вызывал `DetailPanel.show(id)` / `DetailPanel.hide()` — методов не было
  - Добавлены публичные алиасы: `show(id)` → `_openById(id)`, `hide()` → `_closeOnly()`
- **Архитектура close/hide**
  - `close()` — для пользователя (кнопка ×, Esc, backdrop) → скрыть + `emit('node:deselect')`
  - `hide()` — для AppShell (ответ на событие) → только скрыть DOM, без emit
  - `_closeOnly()` — примитив без побочных эффектов

### Зафиксировано в репо
- Коммит: `9fa8bb9`
- Файлы: `layer-4-ui/src/components/DetailPanel/index.ts`, `index.js`

---

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
- `Legend.ts` — SVG-иконки для всех трёх типов узлов
- `Sidebar/index.ts` — кнопка collapse: SVG double-chevron, поворот 180°

### Исправлено
- `Legend.ts` — удалён несуществующий `import { injectOnce }`
- `CanvasToolbar.ts` и `Legend.ts` — возвращён экспорт `export const X = { mount() }`

### Русифицировано
- Header, CanvasToolbar, FilterBar, Legend

### Зафиксировано в репо
- Коммиты: `e000458`, `f508cbe`, `77e4cb2`, `ce4f7d3`, `ff926df`

---

## [2026-07-26] — Bugfix: AppShell — TypeError: X is not a constructor (Issue #6)

### Исправлено
- `AppShell/index.ts` — `new Canvas/DetailPanel/EdgeTooltip` → `.mount()` на singleton-объектах
- `new Sidebar(el)` → `new Sidebar()` + `mount(el)`
- `this.sidebar.update()` → `this.sidebar.update(store.graph)`
- `this.canvas.update()` — удалён
- `theme:changed`, `sidebar:collapsed` — добавлены обработчики

### Зафиксировано в репо
- Коммит: `5e88c6c`

---

## [2026-07-26] — Layer 4: Интеграция layer-3-server — финализация (Issue #6)

### Добавлено
- `graph:rebuild:start` / `graph:rebuild:done(updatedAt)` в eventBus
- `parseUpdatedAt(res)` в AppShell
- `_doRebuild()` + `_setUpdatedAt(ts, flash)` в Header

### Исправлено
- `vite.config.ts` — proxy: `/ws` → `ws://localhost:3001`

### Зафиксировано в репо
- Коммит: `e1b655d`

---

## [2026-07-26] — Layer 4: Интеграция layer-3-server — graphClient + updatedAt (Issue #6)

### Добавлено
- `layer-4-ui/src/lib/graphClient.ts`

---

## [2026-07-26] — Layer 4: DataFlow режим (Issue #6)
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
