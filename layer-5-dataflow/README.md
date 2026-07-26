# Layer 5 — DataFlow Visualizer

Killer feature: визуализация того, что именно передаётся между сервисами.

## Ответственность
- Построение цепочки вызовов от точки входа (напр. POST /login)
- Трассировка трансформации данных на каждом шаге
- Подсветка выбранного пути на графе
- Diff-просмотр: что изменилось в payload при переходе между сервисами

## Пример
```
POST /auth/login
  { email, password }
       ↓
  AuthService → валидирует → JWT { userId, roles, exp }
       ↓
  UserService  → { userId } → { id, name, email, avatar }
       ↓
  OrderService → { userId, roles } → { orders[] }
```

## Планируемые файлы
```
layer-5-dataflow/
├── tracer.ts           ← строит цепочку по стартовому роуту
├── payload-diff.ts     ← сравнивает схемы input/output на каждом шаге
└── path-highlight.ts   ← события для UI: подсветить путь
```

## Варианты реализации
- Статический трейс по схемам из layer-1-parser
- В будущем: интеграция с OpenTelemetry для runtime-трейсов
