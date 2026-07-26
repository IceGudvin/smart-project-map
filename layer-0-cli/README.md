# Layer 0 — CLI / Entry Point

Точка входа. Принимает путь к репозиторию, запускает парсинг, поднимает сервер.

## Ответственность
- Разбор аргументов CLI (`npx smart-map ./my-project`)
- Чтение конфигурации (`smart-map.config.ts`)
- Запуск file watcher (chokidar) → триггер перепарсинга при изменениях
- Оркестрация остальных слоёв

## Планируемые файлы
```
layer-0-cli/
├── index.ts          ← main entrypoint
├── config.ts         ← конфиг: пути, язык, порт dev-сервера
└── watcher.ts        ← chokidar watcher → emit events
```

## Зависимости
- `commander` — CLI аргументы
- `chokidar` — file watching
- `chalk` — цветной вывод
