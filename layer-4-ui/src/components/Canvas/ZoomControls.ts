import type cytoscape from 'cytoscape'

/**
 * ZoomControls — кнопки масштабирования (правый нижний угол канваса).
 *
 * Кнопки: + (zoom in), − (zoom out), ⊡ (fit).
 * Получает геттер cy: () => cytoscape.Core | null для вызова методов.
 */

export class ZoomControls {
  private getCy: () => cytoscape.Core | null

  constructor(getCy: () => cytoscape.Core | null) {
    this.getCy = getCy
  }

  render(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'zoom-controls'
    wrap.innerHTML = `
      <button class="zoom-btn" aria-label="Zoom in" title="Zoom in">+</button>
      <button class="zoom-btn" aria-label="Zoom out" title="Zoom out">−</button>
      <button class="zoom-btn" aria-label="Fit graph" title="Fit" style="font-size:12px">⊡</button>
    `
    const [btnIn, btnOut, btnFit] = wrap.querySelectorAll('.zoom-btn')
    btnIn.addEventListener('click', () => { const cy = this.getCy(); if (cy) cy.zoom(cy.zoom() * 1.2) })
    btnOut.addEventListener('click', () => { const cy = this.getCy(); if (cy) cy.zoom(cy.zoom() * 0.8) })
    btnFit.addEventListener('click', () => this.getCy()?.fit(undefined, 60))
    return wrap
  }
}
