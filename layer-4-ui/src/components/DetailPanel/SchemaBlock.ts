/**
 * SchemaBlock — секция схем данных в DetailPanel.
 *
 * Отображает Pydantic / TypeScript-типы: имя схемы + поля (name: type *).
 */

interface SchemaField { n: string; t: string; r: boolean }
interface Schema { name: string; fields: SchemaField[] }

export class SchemaBlock {
  private schemas: Schema[]

  constructor(schemas: Schema[]) {
    this.schemas = schemas
  }

  render(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'panel-section'
    section.innerHTML = '<div class="ps-title">Схемы данных</div>'
    this.schemas.forEach(s => {
      const block = document.createElement('div')
      block.className = 'schema-block'
      block.style.marginBottom = '6px'
      block.innerHTML = `<div class="schema-name">${s.name}</div>` +
        s.fields.map(f =>
          `<div class="schema-field"><span class="sf-name">${f.n}</span><span style="color:var(--text-faint)">:</span><span class="sf-type">${f.t}</span>${f.r ? '<span class="sf-req">*</span>' : ''}</div>`
        ).join('')
      section.appendChild(block)
    })
    return section
  }
}
