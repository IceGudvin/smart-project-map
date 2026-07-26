/**
 * SchemaBlock — вкладка Schemas: разворачиваемые блоки с полями
 */
import type { Schema, SchemaField } from '../../../../shared/src/graph.js';

export const SchemaBlock = {
  render(container: HTMLElement, schemas: Schema[]): void {
    if (!schemas.length) {
      container.innerHTML = `<p class="dp-empty">Нет схем</p>`;
      return;
    }
    schemas.forEach(schema => {
      const wrap = document.createElement('details');
      wrap.className = 'schema-block';
      wrap.open = schemas.length === 1; // единственная схема — сразу раскрыта

      const summary = document.createElement('summary');
      summary.className = 'schema-summary';
      summary.innerHTML = `
        <span class="schema-name">${_esc(schema.name)}</span>
        <span class="schema-count">${schema.fields.length} полей</span>
        <svg class="schema-chevron" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      `;
      wrap.appendChild(summary);

      const table = document.createElement('table');
      table.className = 'schema-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Поле</th>
            <th>Тип</th>
            <th title="Required">✱</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement('tbody');
      schema.fields.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="schema-field-name">${_esc(f.name)}</td>
          <td class="schema-field-type">${_esc(f.type)}</td>
          <td class="schema-field-req">${f.required
            ? `<span class="req-dot req-dot--yes" title="required"></span>`
            : `<span class="req-dot req-dot--no"  title="optional"></span>`
          }</td>
        `;
        if (f.description) {
          tr.title = f.description;
        }
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);

      if (schema.sourceFile) {
        const src = document.createElement('div');
        src.className = 'schema-src';
        src.textContent = `${_basename(schema.sourceFile)}${schema.sourceLine ? `:${schema.sourceLine}` : ''}`;
        src.title = schema.sourceFile;
        wrap.appendChild(src);
      }

      container.appendChild(wrap);
    });
  },
};

function _esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}
