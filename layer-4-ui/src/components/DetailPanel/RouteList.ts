/**
 * RouteList — секция HTTP-роутов в DetailPanel.
 *
 * Принимает массив роутов из ServiceNode.routes.
 * Отображает метод (GET/POST/PUT/DELETE) + путь в стиле code.
 */

interface Route { method: string; path: string }

export class RouteList {
  private routes: Route[]

  constructor(routes: Route[]) {
    this.routes = routes
  }

  render(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'panel-section'
    section.innerHTML = '<div class="ps-title">HTTP роуты</div>'
    this.routes.forEach(r => {
      const row = document.createElement('div')
      row.className = 'route-item'
      row.innerHTML = `<span class="method ${r.method.toLowerCase()}">${r.method}</span><span class="route-path">${r.path}</span>`
      section.appendChild(row)
    })
    return section
  }
}
