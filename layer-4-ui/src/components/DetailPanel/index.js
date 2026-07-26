import { emit, on } from '../../lib/eventBus.js';
import { store } from '../../store.js';
import { RouteList } from './RouteList.js';
import { SchemaBlock } from './SchemaBlock.js';
import { DepList } from './DepList.js';
import { injectDetailStyles } from './styles.js';
export const DetailPanel = {
    _el: null,
    _inner: null,
    _body: null,
    _activeTab: 'routes',
    _node: null,
    _escHandler: null,
    mount(container) {
        injectDetailStyles();
        // Обёртка (backdrop click)
        const backdrop = document.createElement('div');
        backdrop.className = 'dp-backdrop';
        backdrop.setAttribute('aria-hidden', 'true');
        backdrop.addEventListener('click', () => this.close());
        container.appendChild(backdrop);
        // Панель
        const panel = document.createElement('aside');
        panel.className = 'detail-panel';
        panel.setAttribute('role', 'complementary');
        panel.setAttribute('aria-label', 'Детали сервиса');
        panel.setAttribute('aria-hidden', 'true');
        container.appendChild(panel);
        this._el = panel;
        // --- шапка
        const header = document.createElement('div');
        header.className = 'dp-header';
        panel.appendChild(header);
        const headerLeft = document.createElement('div');
        headerLeft.className = 'dp-header-left';
        header.appendChild(headerLeft);
        const iconWrap = document.createElement('div');
        iconWrap.className = 'dp-icon-wrap';
        iconWrap.setAttribute('aria-hidden', 'true');
        headerLeft.appendChild(iconWrap);
        const meta = document.createElement('div');
        meta.className = 'dp-meta';
        headerLeft.appendChild(meta);
        const nameEl = document.createElement('h2');
        nameEl.className = 'dp-name';
        meta.appendChild(nameEl);
        const stackEl = document.createElement('div');
        stackEl.className = 'dp-stack';
        meta.appendChild(stackEl);
        const statsEl = document.createElement('div');
        statsEl.className = 'dp-stats';
        header.appendChild(statsEl);
        // кнопка ×
        const closeBtn = document.createElement('button');
        closeBtn.className = 'dp-close';
        closeBtn.setAttribute('aria-label', 'Закрыть');
        closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M18 6 6 18M6 6l12 12"/></svg>`;
        closeBtn.addEventListener('click', () => this.close());
        panel.appendChild(closeBtn);
        // --- вкладки
        const tabs = document.createElement('div');
        tabs.className = 'dp-tabs';
        tabs.setAttribute('role', 'tablist');
        panel.appendChild(tabs);
        const TAB_LABELS = [
            { id: 'routes', label: 'Routes' },
            { id: 'schemas', label: 'Schemas' },
            { id: 'deps', label: 'Deps' },
        ];
        TAB_LABELS.forEach(({ id, label }) => {
            const btn = document.createElement('button');
            btn.className = 'dp-tab-btn';
            btn.dataset['tab'] = id;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', id === this._activeTab ? 'true' : 'false');
            btn.setAttribute('aria-controls', `dp-panel-${id}`);
            btn.textContent = label;
            btn.addEventListener('click', () => this._switchTab(id));
            tabs.appendChild(btn);
        });
        // --- тело
        const body = document.createElement('div');
        body.className = 'dp-body';
        panel.appendChild(body);
        this._body = body;
        this._inner = panel;
        // сохраняем ссылки для update
        ;
        panel._dpRefs = { iconWrap, nameEl, stackEl, statsEl, tabs, body, backdrop };
        // --- eventBus
        on('node:select', (id) => this._openById(id));
        on('node:deselect', () => this.close());
        // Esc
        this._escHandler = (e) => { if (e.key === 'Escape')
            this.close(); };
        document.addEventListener('keydown', this._escHandler);
    },
    // --- открыть по id узла из store ----------------------------------------
    _openById(nodeId) {
        const graph = store.graph;
        const node = graph?.nodes.find(n => n.id === nodeId) ?? null;
        if (!node) {
            this.close();
            return;
        }
        this._node = node;
        this._activeTab = 'routes';
        this._render();
        this._open();
    },
    _render() {
        const node = this._node;
        if (!node || !this._inner)
            return;
        const refs = this._inner._dpRefs;
        // иконка (Simple Icons CDN)
        refs.iconWrap.innerHTML = '';
        const techIcon = _techIcon(node.framework, node.language);
        refs.iconWrap.appendChild(techIcon);
        // имя
        refs.nameEl.textContent = node.name;
        // стек
        refs.stackEl.innerHTML = '';
        const chips = _stackChips(node);
        chips.forEach(c => refs.stackEl.appendChild(c));
        // статистика
        refs.statsEl.innerHTML = `
      <span class="dp-stat"><b>${node.routes.length}</b> routes</span>
      <span class="dp-dot"></span>
      <span class="dp-stat"><b>${node.schemas.length}</b> schemas</span>
      <span class="dp-dot"></span>
      <span class="dp-stat"><b>${node.dependencies.length}</b> deps</span>
    `;
        // обновить badge цифр на вкладках
        refs.tabs.querySelectorAll('.dp-tab-btn').forEach(btn => {
            const t = btn.dataset['tab'];
            const counts = {
                routes: node.routes.length,
                schemas: node.schemas.length,
                deps: node.dependencies.length,
            };
            btn.textContent = `${{ routes: 'Routes', schemas: 'Schemas', deps: 'Deps' }[t]} ${counts[t] > 0 ? `(${counts[t]})` : ''}`.trim();
            btn.setAttribute('aria-selected', t === this._activeTab ? 'true' : 'false');
            btn.classList.toggle('dp-tab-btn--active', t === this._activeTab);
        });
        this._renderBody();
    },
    _renderBody() {
        const body = this._body;
        const node = this._node;
        if (!body || !node)
            return;
        body.innerHTML = '';
        const panel = document.createElement('div');
        panel.setAttribute('role', 'tabpanel');
        panel.id = `dp-panel-${this._activeTab}`;
        switch (this._activeTab) {
            case 'routes':
                RouteList.render(panel, node.routes);
                break;
            case 'schemas':
                SchemaBlock.render(panel, node.schemas);
                break;
            case 'deps':
                DepList.render(panel, node.dependencies, store.graph);
                break;
        }
        body.appendChild(panel);
    },
    _switchTab(tab) {
        this._activeTab = tab;
        if (!this._inner)
            return;
        const refs = this._inner._dpRefs;
        refs.tabs.querySelectorAll('.dp-tab-btn').forEach(btn => {
            const t = btn.dataset['tab'];
            btn.setAttribute('aria-selected', t === tab ? 'true' : 'false');
            btn.classList.toggle('dp-tab-btn--active', t === tab);
        });
        this._renderBody();
    },
    // --- open / close ---------------------------------------------------------
    _open() {
        const el = this._el;
        if (!el)
            return;
        const refs = el._dpRefs;
        el.setAttribute('aria-hidden', 'false');
        el.classList.add('detail-panel--open');
        refs?.backdrop.classList.add('dp-backdrop--visible');
        // фокус на панель
        requestAnimationFrame(() => el.querySelector('.dp-close')?.focus());
    },
    close() {
        const el = this._el;
        if (!el)
            return;
        const refs = el._dpRefs;
        el.classList.remove('detail-panel--open');
        el.setAttribute('aria-hidden', 'true');
        refs?.backdrop.classList.remove('dp-backdrop--visible');
        this._node = null;
        emit('node:deselect', undefined);
    },
    destroy() {
        if (this._escHandler)
            document.removeEventListener('keydown', this._escHandler);
        this._el?.remove();
    },
};
// ─── helpers ─────────────────────────────────────────────────────────────────
function _techIcon(framework, language) {
    const ICON_MAP = {
        fastapi: 'fastapi', express: 'express', fastify: 'fastify',
        nestjs: 'nestjs', nextjs: 'nextdotjs', gin: 'go',
    };
    const slug = ICON_MAP[framework] ?? (language === 'python' ? 'python' : language === 'go' ? 'go' : 'typescript');
    const img = document.createElement('img');
    img.src = `https://cdn.simpleicons.org/${slug}/808080`;
    img.width = 28;
    img.height = 28;
    img.alt = framework !== 'unknown' ? framework : language;
    img.loading = 'lazy';
    img.onerror = () => { img.style.display = 'none'; };
    return img;
}
function _stackChips(node) {
    const chips = [];
    const add = (label, color) => {
        const c = document.createElement('span');
        c.className = 'dp-chip';
        if (color)
            c.style.setProperty('--chip-color', color);
        c.textContent = label;
        chips.push(c);
    };
    if (node.framework !== 'unknown')
        add(node.framework);
    if (node.language !== 'unknown')
        add(node.language);
    const ntype = node.nodeType;
    add(ntype, ntype === 'service' ? 'var(--color-primary)' : ntype === 'infrastructure' ? 'var(--color-gold)' : 'var(--color-text-muted)');
    return chips;
}
