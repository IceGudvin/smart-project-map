# src/styles — Дизайн-система

## Файлы

| Файл | Назначение |
|---|---|
| `tokens.css` | CSS-переменные: тип, отступы, цвета (light/dark), радиусы, тени, переходы |
| `base.css` | Reset + базовые стили тела, скроллбаров, фокус-кольца, фона канваса |
| `index.css` | Точка входа: импортирует tokens → base → компоненты |

## Дизайн-токены

### Типографика
- `--font-body` — Geist (UI, навигация, метаданные)
- `--font-mono` — JetBrains Mono (пути, методы, схемы)
- `--text-xs / sm / base / lg` — fluid type scale через `clamp()`

### Цвета
Двойной режим (light/dark) через `[data-theme]` на `<html>`.

- **Поверхности**: `--bg → --surface → --surface-2 → --surface-off` (глубина слоёв)
- **Акцент**: `--primary` (Hydra Teal) — только для интерактивных элементов, активных состояний
- **Семантика**: `--success / --warning / --error` — для статусов
- **DataViz**: `--viz-blue / purple / gold / green / red` — для типов узлов и рёбер на графе

### Отступы
4px-система: `--space-1` (4px) → `--space-12` (48px).

### Радиусы
`--radius-sm` (4px) для тегов → `--radius-2xl` (16px) для плавающих панелей.

### Анимация
- `--ease-out` — большинство transitions (hover, появление)
- `--ease-spring` — pop-анимации (появление tooltip, панели)
- `--duration-fast/base/slow` — 120 / 180 / 280ms

## Фон канваса

Класс `.canvas-bg` на `#cy` создаёт dot-grid с виньеткой через CSS `mask-image`.
