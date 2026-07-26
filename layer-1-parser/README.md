# Layer 1 — Parser

Статический анализ исходников. Извлекает роуты, HTTP-вызовы, DTO-схемы.

## Ответственность
- Определение языка по расширению файла
- Парсинг роутов (Express, Fastify, NestJS, FastAPI, Gin)
- Поиск исходящих HTTP-вызовов (fetch, axios, got, httpx)
- Извлечение схем данных (DTO, Zod, Pydantic, OpenAPI)
- Чтение env-конфигов для определения адресов сервисов

## Планируемые файлы
```
layer-1-parser/
├── index.ts
├── languages/
│   ├── typescript.ts   ← Tree-sitter + ts-morph
│   ├── python.ts       ← ast-grep / libcst
│   └── go.ts           ← go/ast через WASM
├── extractors/
│   ├── routes.ts       ← { method, path, handler }
│   ├── http-calls.ts   ← { url, method, targetService }
│   ├── schemas.ts      ← { fields, types }
│   └── env-config.ts   ← SERVICE_URL → адрес сервиса
└── types.ts
```

## Варианты реализации
- **Tree-sitter** — универсальный, быстрый, WASM
- **ts-morph** — глубокий TypeScript type-aware анализ
- **OpenAPI/Swagger** — если есть spec, взять готовое
- **ast-grep** — паттерн-матчинг без написания парсера вручную
