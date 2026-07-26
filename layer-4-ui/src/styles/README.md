# `src/styles/` — Дизайн-система

Вся глобальная стилизация Smart Project Map. Подключается через `index.css`.

## Файлы

### `tokens.css`
CSS-переменные — единственный источник правды для визуальных решений.

| Группа | Переменные | Примечания |
|---|---|---|
| Шрифты | `--font-body`, `--font-mono` | Geist + JetBrains Mono |
| Типографика | `--text-xs` … `--text-xl` | Fluid clamp(), 12px floor |
| Отступы | `--space-1` … `--space-16` | 4px grid |
| Радиусы | `--radius-sm` … `--radius-full` | 4 / 8 / 12 / 16 / ∞ px |
| Переходы | `--ease-*`, `--duration-*`, `--transition` | Goldener ease-out |
| Поверхности | `--bg`, `--surface`, `--surface-2`, `--surface-off`, `--surface-dyn` | 5 уровней глубины |
| Текст | `--text`, `--text-muted`, `--text-faint`, `--text-inverse` | 3 уровня + инверсия |
| Акцент | `--primary`, `--primary-h`, `--primary-hl`, `--primary-subtle` | Hydra Teal |
| Семантика | `--success`, `--warning`, `--error` + `*-hl` | + highlight-варианты |
| Граф | `--node-service`, `--node-infra`, `--node-cache`, `--node-external` | Цвета узлов |
| Рёбра | `--edge-default`, `--edge-active` | |
| HTTP-методы | `--method-get/post/put/patch/delete` | |
| Тени | `--shadow-sm/md/lg/xl` | Двухслойные, тон-matched |
| Канвас | `--canvas-bg`, `--canvas-dot`, `--canvas-dot-size`, `--canvas-dot-gap` | Dot-grid |

**Темизация:** `[data-theme="dark"]` на `<html>`. По умолчанию — `prefers-color-scheme`.

### `base.css`
Reset + базовые стили. Не содержит цветов — только структуру.
- Box-sizing, font smoothing, scroll behavior
- Убирает лишние margin/padding у кнопок, ссылок, инпутов
- Задаёт `overflow: hidden` на `body` — скролл только внутри scroll-регионов
- Глобальные scrollbar-стили (6px, закруглённые)
- `:focus-visible` ring через `--primary`
- `.sr-only`, `.truncate`, `.font-mono` — базовые утилиты

### `index.css`
Точка входа. Порядок импорта: `tokens.css` → `base.css`.
Содержит глобальные overrides для Cytoscape:
- `.cy-container` — dot-grid background + radial vignette
- `.cy-tooltip` — glassmorphism tooltip

## Принципы

- Никаких магических чисел вне `tokens.css`
- Компонентные стили — CSS Modules рядом с `.tsx`
- Никаких `!important` кроме `prefers-reduced-motion`
- Цвета — только через переменные, никаких hex в компонентах
