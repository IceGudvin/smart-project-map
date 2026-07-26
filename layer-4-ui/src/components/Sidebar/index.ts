/**
 * Sidebar/index.ts — Левая панель со списком сервисов.
 *
 * Структура:
 *   .sidebar
 *     ├── .sb-header
 *     │     ├── .sb-title  (заголовок + счётчик)
 *     │     └── кнопка collapse  (⟨/⟩)
 *     ├── .sb-search  (поиск)
 *     ├── FilterBar   (чипы All/Service/Infra)
 *     └── .sb-list
 *           ├── .sb-section  Application
 *           │     └── ServiceItem[]
 *           └── .sb-section  Infrastructure
 *                 └── ServiceItem[]
 *
 * collapse → sidebar схлопывается до 48px (CSS .collapsed)
 * поиск: фильтрует DOM-элементы + эмитит 'sidebar:filter' для cy
 * обновление: update(graph) — diff-патч (не пересоздаёт DOM полностью)
 */

import type { GraphModel } from '../../../../shared/src/graph.js'
import { store }    from '../../store.js'
import { on, emit } from '../../lib/eventBus.js'
import { FilterBar, type FilterType } from './FilterBar.js'
import { ServiceItem }                from './ServiceItem.js'

// ================================================================ CSS

function injectSidebarStyles(): void {
  if (document.getElementById('sidebar-styles')) return
  const s = document.createElement('style')
  s.id = 'sidebar-styles'
  s.textContent = `
    /* ---- Обёртка ---- */
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 260px;
      min-width: 260px;
      max-width: 260px;
      height: 100%;
      background: var(--glass-bg, oklch(from var(--color-surface, #f9f8f5) l c h / 0.85));
      backdrop-filter: blur(var(--glass-blur, 12px)) saturate(var(--glass-saturate, 1.6));
      border-right: 1px solid var(--color-border);
      overflow: hidden;
      transition: width 220ms cubic-bezier(0.4, 0, 0.2, 1),
                  min-width 220ms cubic-bezier(0.4, 0, 0.2, 1),
                  max-width 220ms cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }
    .sidebar.collapsed {
      width: 48px;
      min-width: 48px;
      max-width: 48px;
    }
    /* Скрываем всё кроме кнопки collapse при collapsed */
    .sidebar.collapsed .sb-search,
    .sidebar.collapsed .sb-filter-bar,
    .sidebar.collapsed .sb-list,
    .sidebar.collapsed .sb-title {
      opacity: 0;
      pointer-events: none;
    }
    .sidebar.collapsed .sb-header {
      justify-content: center;
    }

    /* ---- Header панели ---- */
    .sb-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-3, 0.75rem);
      height: 44px;
      border-bottom: 1px solid var(--color-divider);
      flex-shrink: 0;
      gap: var(--space-2, 0.5rem);
    }
    .sb-title {
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: opacity 150ms;
    }
    .sb-count {
      font-weight: 400;
      color: var(--color-text-faint);
      margin-left: var(--space-1, 0.25rem);
    }

    /* ---- Collapse-кнопка ---- */
    .sb-collapse {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm, 0.375rem);
      border: 1px solid transparent;
      color: var(--color-text-faint);
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
      font-size: 12px;
      line-height: 1;
      transition:
        color 150ms,
        background 150ms,
        border-color 150ms,
        transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sb-collapse:hover {
      color: var(--color-text);
      background: var(--color-surface-offset);
      border-color: var(--color-border);
    }
    .sb-collapse:active { transform: scale(0.9); }
    .sidebar.collapsed .sb-collapse { transform: rotate(180deg); }

    /* ---- Поиск ---- */
    .sb-search {
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--color-divider);
      flex-shrink: 0;
      transition: opacity 150ms;
    }
    .sb-search-input {
      width: 100%;
      padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
      height: 28px;
      border-radius: var(--radius-md, 0.5rem);
      border: 1px solid var(--color-border);
      background: var(--color-surface-offset);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text);
      font-family: var(--font-body, sans-serif);
      outline: none;
      transition:
        border-color 150ms,
        background 150ms,
        box-shadow 150ms;
    }
    .sb-search-input::placeholder { color: var(--color-text-faint); }
    .sb-search-input:focus {
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 2px oklch(from var(--color-primary, #01696f) l c h / 0.15);
    }

    /* ---- FilterBar (чипы) ---- */
    .sb-filter-bar {
      display: flex;
      gap: var(--space-1, 0.25rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      border-bottom: 1px solid var(--color-divider);
      flex-shrink: 0;
      transition: opacity 150ms;
    }
    .sb-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--space-2, 0.5rem);
      border-radius: var(--radius-full, 9999px);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-muted);
      transition:
        color 150ms,
        background 150ms,
        border-color 150ms;
      user-select: none;
      white-space: nowrap;
    }
    .sb-chip:hover {
      color: var(--color-text);
      background: var(--color-surface-offset);
    }
    .sb-chip.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: #fff;
    }

    /* ---- Список ---- */
    .sb-list {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--space-2, 0.5rem) 0;
      scroll-behavior: smooth;
      transition: opacity 150ms;
    }
    .sb-list::-webkit-scrollbar { width: 4px; }
    .sb-list::-webkit-scrollbar-track { background: transparent; }
    .sb-list::-webkit-scrollbar-thumb {
      background: var(--color-surface-dynamic);
      border-radius: 2px;
    }

    /* ---- Секция ---- */
    .sb-section-label {
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem) var(--space-1, 0.25rem);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--color-text-faint);
      user-select: none;
    }
    .sb-section-label:not(:first-child) {
      border-top: 1px solid var(--color-divider);
      margin-top: var(--space-1, 0.25rem);
      padding-top: var(--space-3, 0.75rem);
    }

    /* ---- ServiceItem ---- */
    .si {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      cursor: pointer;
      border-radius: 0;
      border-left: 2px solid transparent;
      transition:
        background 150ms,
        border-color 150ms;
      outline: none;
    }
    .si:hover {
      background: var(--color-surface-offset);
    }
    .si:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
    .si.active {
      background: oklch(from var(--color-primary, #01696f) l c h / 0.08);
      border-left-color: var(--color-primary);
    }
    .si-row {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      min-width: 0;
    }
    .si-name {
      font-size: var(--text-sm, 0.875rem);
      font-weight: 500;
      color: var(--color-text);
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .si-meta {
      display: flex;
      align-items: center;
      gap: var(--space-1, 0.25rem);
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-text-faint);
      font-family: var(--font-mono, monospace);
      min-width: 0;
    }
    .si-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-success, #437a22);
      flex-shrink: 0;
    }
    .si-dot.offline { background: var(--color-text-faint); }
    .si-dot.error   { background: var(--color-error, #a12c7b); }

    /* ---- Badge ---- */
    .si-badge {
      display: inline-flex;
      align-items: center;
      padding: 0 5px;
      height: 16px;
      border-radius: var(--radius-sm, 0.375rem);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.02em;
      white-space: nowrap;
      flex-shrink: 0;
    }
    /* Next.js — dark */
    .si-badge-nextjs {
      background: oklch(0.2 0 0 / 0.9);
      color: #fff;
    }
    /* FastAPI — teal */
    .si-badge-fastapi {
      background: oklch(from var(--color-primary, #01696f) l c h / 0.15);
      color: var(--color-primary);
    }
    /* PostgreSQL — blue */
    .si-badge-postgres {
      background: oklch(from var(--color-blue, #006494) l c h / 0.15);
      color: var(--color-blue);
    }
    /* Redis — red-orange */
    .si-badge-redis {
      background: oklch(from var(--color-notification, #a13544) l c h / 0.15);
      color: var(--color-notification);
    }
    /* MinIO / S3 — gold */
    .si-badge-s3 {
      background: oklch(from var(--color-gold, #d19900) l c h / 0.15);
      color: var(--color-gold);
    }
    /* Queue / RabbitMQ / Kafka */
    .si-badge-queue {
      background: oklch(from var(--color-purple, #7a39bb) l c h / 0.15);
      color: var(--color-purple);
    }
    /* External / unknown */
    .si-badge-ext {
      background: var(--color-surface-offset);
      color: var(--color-text-muted);
    }

    /* hidden by search/filter */
    .si[hidden] { display: none !important; }
    .sb-section-wrap[hidden] { display: none !important; }
  `
  document.head.appendChild(s)
}

// ================================================================ Sidebar

export class Sidebar {
  private el!: HTMLElement
  private listEl!: HTMLElement
  private searchInput!: HTMLInputElement
  private filterBar!: FilterBar
  private items: Map<string, ServiceItem> = new Map()
  private unsubs: Array<() => void> = []
  private collapsed = false
  private activeFilter: FilterType = 'all'
  private searchQuery = ''

  // ============================================================ mount

  mount(el: HTMLElement): void {
    injectSidebarStyles()
    this.el = el
    this._render()
    this._bindEvents()
    this._renderList(store.graph)
  }

  // ============================================================ update (AppShell вызывает по graph:full/update)

  update(graph: GraphModel): void {
    this._renderList(graph)
    this._syncCount(graph)
  }

  // ============================================================ setActive — подсветка активного узла

  setActive(nodeId: string | null): void {
    this.items.forEach((item, id) => item.setActive(id === nodeId))
  }

  // ============================================================ destroy

  destroy(): void {
    for (const u of this.unsubs) u()
    this.unsubs = []
  }

  // ============================================================ private — render

  private _render(): void {
    this.el.innerHTML = ''

    // ---- Header
    const header = document.createElement('div')
    header.className = 'sb-header'

    const title = document.createElement('div')
    title.className = 'sb-title'
    title.innerHTML = `Сервисы <span class="sb-count" id="sb-count"></span>`
    header.appendChild(title)

    const collapseBtn = document.createElement('button')
    collapseBtn.className = 'sb-collapse'
    collapseBtn.setAttribute('aria-label', 'Collapse sidebar')
    collapseBtn.innerHTML = '⟨'
    collapseBtn.addEventListener('click', () => this._toggleCollapse())
    header.appendChild(collapseBtn)

    this.el.appendChild(header)

    // ---- Поиск
    const searchWrap = document.createElement('div')
    searchWrap.className = 'sb-search'
    this.searchInput = document.createElement('input')
    this.searchInput.type = 'search'
    this.searchInput.className = 'sb-search-input'
    this.searchInput.placeholder = 'Поиск сервиса…'
    this.searchInput.setAttribute('aria-label', 'Поиск сервиса')
    searchWrap.appendChild(this.searchInput)
    this.el.appendChild(searchWrap)

    // ---- FilterBar (чипы)
    const filterWrap = document.createElement('div')
    filterWrap.className = 'sb-filter-bar'
    this.filterBar = new FilterBar(filterWrap, (f) => {
      this.activeFilter = f
      this._applyFilter()
    })
    this.el.appendChild(filterWrap)

    // ---- Список
    this.listEl = document.createElement('div')
    this.listEl.className = 'sb-list'
    this.listEl.setAttribute('role', 'list')
    this.el.appendChild(this.listEl)
  }

  // ============================================================ private — events

  private _bindEvents(): void {
    // Debounced search
    let timer: ReturnType<typeof setTimeout>
    this.searchInput.addEventListener('input', () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        this.searchQuery = this.searchInput.value.trim().toLowerCase()
        this._applyFilter()
      }, 200)
    })

    // Обновление графа
    this.unsubs.push(
      on('graph:full',   ({ nodes }) => this._renderList({ nodes } as GraphModel)),
      on('graph:update', ({ diff })  => this._applyDiff(diff.nodes ?? { added: [], removed: [] } as any)),
      on('node:deselect', () => this.setActive(null)),
      on('node:select',   (id) => this.setActive(id)),
    )
  }

  // ============================================================ private — list

  private _renderList(graph: GraphModel): void {
    this.listEl.innerHTML = ''
    this.items.clear()

    const nodes = graph.nodes ?? []
    const appNodes   = nodes.filter(n => n.nodeType === 'service' || n.type === 'service')
    const infraNodes = nodes.filter(n => n.nodeType !== 'service' && n.type !== 'service')

    if (appNodes.length)   this._renderSection('Application', appNodes)
    if (infraNodes.length) this._renderSection('Infrastructure', infraNodes)

    this._syncCount(graph)
    this._applyFilter()
  }

  private _renderSection(label: string, nodes: GraphModel['nodes']): void {
    const wrap = document.createElement('div')
    wrap.className = 'sb-section-wrap'
    wrap.dataset['section'] = label

    const sec = document.createElement('div')
    sec.className = 'sb-section-label'
    sec.textContent = label
    sec.setAttribute('aria-hidden', 'true')
    wrap.appendChild(sec)

    for (const node of nodes) {
      const item = new ServiceItem(node)
      this.items.set(node.id, item)
      const itemEl = item.render()
      wrap.appendChild(itemEl)
    }

    this.listEl.appendChild(wrap)
  }

  private _applyDiff(diff: { added?: GraphModel['nodes']; removed?: string[] }): void {
    // Удаляем удалённые
    for (const id of diff.removed ?? []) {
      const item = this.items.get(id)
      if (item) { item.el?.remove(); this.items.delete(id) }
    }
    // Добавляем новые
    for (const node of diff.added ?? []) {
      const label = (node.nodeType === 'service' || node.type === 'service') ? 'Application' : 'Infrastructure'
      let wrap = this.listEl.querySelector<HTMLElement>(`.sb-section-wrap[data-section="${label}"]`)
      if (!wrap) {
        wrap = document.createElement('div')
        wrap.className = 'sb-section-wrap'
        wrap.dataset['section'] = label
        const sec = document.createElement('div')
        sec.className = 'sb-section-label'
        sec.textContent = label
        wrap.appendChild(sec)
        this.listEl.appendChild(wrap)
      }
      const item = new ServiceItem(node)
      this.items.set(node.id, item)
      wrap.appendChild(item.render())
    }
    this._syncCount(store.graph)
    this._applyFilter()
  }

  // ============================================================ private — filter

  private _applyFilter(): void {
    const q = this.searchQuery
    let visibleCount = 0

    this.items.forEach((item, _id) => {
      const el = item.el
      if (!el) return

      const node     = item.node
      const isService = node.nodeType === 'service' || node.type === 'service'
      const passType = this.activeFilter === 'all'
        || (this.activeFilter === 'service' && isService)
        || (this.activeFilter === 'infra'   && !isService)
      const passSearch = !q || node.name.toLowerCase().includes(q)

      const visible = passType && passSearch
      el.hidden = !visible
      if (visible) visibleCount++
    })

    // Скрываем пустые секции
    this.listEl.querySelectorAll<HTMLElement>('.sb-section-wrap').forEach(wrap => {
      const anyVisible = [...wrap.querySelectorAll<HTMLElement>('.si')].some(el => !el.hidden)
      wrap.hidden = !anyVisible
    })

    // Информируем Canvas через eventBus — он скроет/показывает узлы cy
    const visibleIds = new Set<string>()
    this.items.forEach((item, id) => { if (!item.el?.hidden) visibleIds.add(id) })
    emit('sidebar:filter', visibleIds as any)

    // Обновляем счётчик
    const countEl = this.el.querySelector('#sb-count')
    if (countEl) countEl.textContent = `(${visibleCount})`
  }

  // ============================================================ private — helpers

  private _syncCount(graph: GraphModel): void {
    const countEl = this.el?.querySelector('#sb-count')
    if (countEl) countEl.textContent = `(${graph.nodes?.length ?? 0})`
  }

  private _toggleCollapse(): void {
    this.collapsed = !this.collapsed
    this.el.classList.toggle('collapsed', this.collapsed)
    const btn = this.el.querySelector('.sb-collapse')
    if (btn) btn.setAttribute('aria-label', this.collapsed ? 'Expand sidebar' : 'Collapse sidebar')
    emit('sidebar:collapsed', this.collapsed as any)
  }
}
