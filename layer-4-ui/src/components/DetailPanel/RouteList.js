const METHOD_COLOR = {
    GET: 'var(--color-success)',
    POST: 'var(--color-primary)',
    PUT: 'var(--color-gold)',
    PATCH: 'var(--color-orange)',
    DELETE: 'var(--color-error)',
    HEAD: 'var(--color-text-muted)',
    OPTIONS: 'var(--color-text-muted)',
};
export const RouteList = {
    render(container, routes) {
        if (!routes.length) {
            container.innerHTML = `<p class="dp-empty">Нет роутов</p>`;
            return;
        }
        const list = document.createElement('ul');
        list.className = 'route-list';
        routes.forEach(r => {
            const li = document.createElement('li');
            li.className = 'route-item';
            const badge = document.createElement('span');
            badge.className = 'route-method';
            badge.style.color = METHOD_COLOR[r.method] ?? 'var(--color-text-muted)';
            badge.textContent = r.method;
            const path = document.createElement('span');
            path.className = 'route-path';
            path.textContent = r.path;
            const right = document.createElement('div');
            right.className = 'route-right';
            if (r.inputPayload?.schemaName) {
                const inp = document.createElement('span');
                inp.className = 'route-schema route-schema--in';
                inp.title = `Input: ${r.inputPayload.schemaName}`;
                inp.textContent = `→ ${r.inputPayload.schemaName}`;
                right.appendChild(inp);
            }
            if (r.outputPayload?.schemaName) {
                const out = document.createElement('span');
                out.className = 'route-schema route-schema--out';
                out.title = `Output: ${r.outputPayload.schemaName}`;
                out.textContent = `← ${r.outputPayload.schemaName}`;
                right.appendChild(out);
            }
            // ссылка на исходник
            const src = document.createElement('a');
            src.className = 'route-src';
            src.textContent = `${_basename(r.sourceFile)}:${r.sourceLine}`;
            src.title = `${r.sourceFile}:${r.sourceLine}`;
            src.setAttribute('href', '#');
            src.setAttribute('tabindex', '0');
            right.appendChild(src);
            const top = document.createElement('div');
            top.className = 'route-top';
            top.appendChild(badge);
            top.appendChild(path);
            li.appendChild(top);
            li.appendChild(right);
            list.appendChild(li);
        });
        container.appendChild(list);
    },
};
function _basename(p) {
    return p.split(/[\\/]/).pop() ?? p;
}
