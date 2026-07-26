# EdgeTooltip

Tooltip, появляющийся при наведении на ребро графа.

## Содержимое
- Метод (POST / GET / SQL / SET / PUT)
- Путь (endpoint или ключ)
- INPUT-схема → OUTPUT-схема (flow-диаграмма)

## API
```ts
tooltip.show(data: { method, path, input, output }, pos: { x, y })
tooltip.hide()
```

## Особенности
- Позиционируется через `style.left/top` (абсолютно внутри `.canvas-wrap`)
- Видимость переключается классом `.visible` (CSS transition opacity)
- Вызывается из `Canvas` через колбэки `cytoscapeInit`
