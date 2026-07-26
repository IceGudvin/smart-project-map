/**
 * EdgeTooltip — tooltip при hover на ребро графа.
 *
 * Показывает: метод, путь, INPUT-схему → OUTPUT-схему.
 * Позиционируется абсолютно по координатам мыши.
 * show(data, pos) / hide() вызываются из Canvas через колбэки cytoscapeInit.
 */

interface EdgeTooltipData {
  method: string
  path: string
  input: string
  output: string
}

export class EdgeTooltip {
  private el: HTMLElement | null = null

  render(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'edge-tooltip'
    el.id = 'edgeTooltip'
    el.setAttribute('role', 'tooltip')
    el.setAttribute('aria-live', 'polite')
    el.innerHTML = `
      <div class="et-method" id="etMethod">POST</div>
      <div class="et-path" id="etPath">/</div>
      <div class="et-flow">
        <div class="et-row"><span class="et-label">INPUT</span><span class="et-schema" id="etInput">—</span></div>
        <div class="et-row" style="padding-left:50px"><span class="et-arr">↓</span></div>
        <div class="et-row"><span class="et-label">OUTPUT</span><span class="et-schema" id="etOutput">—</span></div>
      </div>
    `
    this.el = el
    return el
  }

  show(data: EdgeTooltipData, pos: { x: number; y: number }): void {
    if (!this.el) return
    const m = this.el.querySelector('#etMethod'); if (m) m.textContent = data.method
    const p = this.el.querySelector('#etPath'); if (p) p.textContent = data.path
    const i = this.el.querySelector('#etInput'); if (i) i.textContent = data.input
    const o = this.el.querySelector('#etOutput'); if (o) o.textContent = data.output
    this.el.style.left = `${pos.x + 12}px`
    this.el.style.top = `${pos.y - 20}px`
    this.el.classList.add('visible')
  }

  hide(): void {
    this.el?.classList.remove('visible')
  }
}
