# smart-project-map
🗺️ Smart Project Map — интерактивная карта архитектуры проекта в реальном времени. Анализирует локальный репозиторий, строит граф зависимостей между сервисами, показывает data-flow и payload на каждой связи.

## Структура проекта

```
smart-project-map/
├── layer-0-cli/        ← Точка входа, CLI, file watcher
├── layer-1-parser/     ← Статический анализ кода (Tree-sitter, ts-morph)
├── layer-2-graph/      ← Построение графа зависимостей
├── layer-3-server/     ← API сервер + WebSocket
├── layer-4-ui/         ← Фронтенд, визуализация графа
├── layer-5-dataflow/   ← Data Flow Visualizer (killer feature)
└── shared/             ← Общие типы, утилиты
```

## Слои

| Слой | Название | Технологии | Статус |
|------|----------|------------|--------|
| 0 | CLI / Entry Point | Node.js, commander, chokidar | 🔲 planned |
| 1 | Parser | Tree-sitter, ts-morph, ast-grep | 🔲 planned |
| 2 | Graph Builder | in-memory / SQLite | 🔲 planned |
| 3 | Server | Fastify, WebSocket (ws) | 🔲 planned |
| 4 | UI | React, D3.js / Cytoscape.js, dagre | 🔲 planned |
| 5 | DataFlow | custom tracer, payload-diff | 🔲 planned |

## Roadmap

- **MVP** — Parser (TS роуты + HTTP-calls) + Graph Builder + D3 граф
- **v0.2** — Schemas extractor + EdgeTooltip с payload
- **v0.3** — File watcher + WebSocket live updates
- **v0.4** — DataFlow tracer + highlight path
- **v1.0** — Multi-language, VS Code extension
