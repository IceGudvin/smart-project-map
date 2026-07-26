import type { Schema } from '@smart-map/shared'

export function renderSchemaBlock(schema: Schema): string {
  if (!schema.fields?.length) return '<p class="schema-empty">No fields</p>'

  const rows = schema.fields.map(f => {
    const req = f.required ? '<span class="field-req">*</span>' : ''
    return `<tr>
      <td class="field-name">${f.name}${req}</td>
      <td class="field-type">${f.type}</td>
    </tr>`
  }).join('')

  return `
    <div class="schema-block">
      <div class="schema-name">${schema.name}</div>
      <table class="schema-table"><tbody>${rows}</tbody></table>
    </div>
  `
}
