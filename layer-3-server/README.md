# Layer 3 — Server

API-сервер и WebSocket для отдачи графа фронту и live-обновлений.

## Ответственность
- REST API для получения графа и деталей узлов
- WebSocket push при изменении файлов (от watcher'а)
- Стриминг фрагментов кода для предпросмотра

## Планируемые файлы
```
layer-3-server/
├── index.ts
├── routes/
│   ├── graph.ts        ← GET /api/graph
│   ├── node.ts         ← GET /api/node/:id
│   └── preview.ts      ← GET /api/preview?file=&line=
├── ws/
│   └── socket.ts       ← WebSocket, broadcast graph diff
└── cache.ts
```

## Варианты реализации
- **Fastify** — быстрый, TypeScript-friendly
- **ws** — минималистичный WebSocket
- **SSE** — проще WebSocket для односторонних обновлений (альтернатива)
