# ui/ — Атомарные компоненты

Атомы UI — переиспользуемые примитивы без бизнес-логики.

## Файлы
| Файл | Экспорт | Использование |
|------|---------|---------------|
| `Badge.ts` | `createBadge(text, variant)` | ServiceItem, DetailPanel |
| `Button.ts` | `createButton(opts)` | Header, тулбары |
| `Divider.ts` | `createDivider()` | Sidebar, DetailPanel |

## Badge variants
`py` — Python/FastAPI · `ts` — TypeScript/Next.js · `infra` — БД/кэш · `ext` — внешние сервисы

## Button variants
`primary` — основное действие · `secondary` — второстепенное · `ghost` — минимальный стиль
