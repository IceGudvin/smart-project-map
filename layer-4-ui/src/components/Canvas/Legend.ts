/**
 * Legend — легенда типов узлов (левый нижний угол канваса).
 *
 * Отображает: Service (прямоугольник), Database (эллипс), Cache/Storage (шестиугольник).
 * Статический компонент, не зависит от store.
 */

export class Legend {
  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'legend'
    el.setAttribute('aria-label', 'Легенда типов узлов')
    el.innerHTML = `
      <div class="legend-title">Типы узлов</div>
      <div class="legend-row"><div class="lg-sq" style="background:var(--primary);opacity:.7" aria-hidden="true"></div> Service</div>
      <div class="legend-row"><div class="lg-cy" style="background:var(--success);opacity:.7" aria-hidden="true"></div> Database</div>
      <div class="legend-row"><div class="lg-hex" style="background:var(--warning);opacity:.7" aria-hidden="true"></div> Cache / Storage</div>
    `
    return el
  }
}
