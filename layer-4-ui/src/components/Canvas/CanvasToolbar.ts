/**
 * CanvasToolbar — панель инструментов поверх канваса (центр сверху).
 *
 * Кнопки:
 *   Pan mode    — стандартный режим перемещения (активен по умолчанию)
 *   DataFlow    — режим подсветки потока данных (диспатчит 'spm:dataflow')
 *   Layout      — пересчёт расположения узлов (диспатчит 'spm:refresh')
 */

export class CanvasToolbar {
  render(): HTMLElement {
    const toolbar = document.createElement('div')
    toolbar.className = 'canvas-toolbar'
    toolbar.setAttribute('role', 'toolbar')
    toolbar.setAttribute('aria-label', 'Инструменты канваса')
    toolbar.innerHTML = `
      <button class="tool-btn active" title="Pan" aria-label="Pan mode" aria-pressed="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>
      </button>
      <button class="tool-btn" title="DataFlow mode" aria-label="DataFlow mode" aria-pressed="false" id="tool-dataflow">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </button>
      <div class="tool-sep" aria-hidden="true"></div>
      <button class="tool-btn" title="Re-layout" aria-label="Re-layout graph" id="tool-layout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="8" y="14" width="8" height="7"/></svg>
      </button>
    `
    toolbar.querySelector('#tool-dataflow')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement
      const active = btn.classList.toggle('active')
      btn.setAttribute('aria-pressed', String(active))
      document.dispatchEvent(new CustomEvent('spm:dataflow', { detail: { active } }))
    })
    toolbar.querySelector('#tool-layout')?.addEventListener('click', () =>
      document.dispatchEvent(new CustomEvent('spm:refresh'))
    )
    return toolbar
  }
}
