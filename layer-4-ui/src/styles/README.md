# styles/ — Дизайн-система

## Файлы

| Файл | Назначение |
|---|---|
| `tokens.css` | Все CSS-переменные (light + dark). Импортирует шрифты через `@import`. |
| `base.css` | CSS reset + базовые стили (`body`, `button`, `::selection`, scrollbars). |
| `index.css` | Точка входа. Импортируется в `main.ts` одной строкой. |

## Порядок импорта в компонентах

Компоненты **не импортируют** `index.css` повторно. Каждый компонент может импортировать свой `.css`-файл рядом с тайпскриптом. Все токены доступны глобально через CSS-переменные.

## Токены быстрого доступа

### Цвета
- **Поверхности:** `--bg`, `--surface`, `--surface-2`, `--surface-off`, `--surface-dyn`
- **Текст:** `--text`, `--text-muted`, `--text-faint`, `--text-inv`
- **Акцент:** `--primary`, `--primary-h`, `--primary-hl`, `--primary-bg`
- **Семантические:** `--success`, `--warning`, `--error` (у каждого есть `-bg`)
- **DataViz:** `--blue`, `--purple`, `--gold` (только для графа и бейджей)

### Типографика
- `--font-body` — Satoshi (весь UI)
- `--font-mono` — JetBrains Mono (пути, методы, код)

### Тени
- `--shadow-sm` — контактная (карточки)
- `--shadow-md` — всплывающая (панели)
- `--shadow-lg` — глубокая (модали)
- `--shadow-glow` — primary glow (активный узел)
