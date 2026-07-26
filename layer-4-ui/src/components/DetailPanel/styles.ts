/**
 * styles.ts — инжекция CSS для DetailPanel
 */
const CSS = `
/* ======================================================
   DetailPanel — slide-in справа
   ====================================================== */

.dp-backdrop {
  position: absolute;
  inset: 0;
  z-index: 29;
  background: transparent;
  pointer-events: none;
  transition: background 220ms ease;
}
.dp-backdrop--visible {
  pointer-events: auto;
}

.detail-panel {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: clamp(320px, 36vw, 480px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  background: var(--glass-bg);
  border-left: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));

  /* slide-in — исходное состояние — за правым краем */
  transform: translateX(100%);
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.detail-panel--open {
  transform: translateX(0);
}

/* Шапка */
.dp-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) var(--space-3);
  flex-shrink: 0;
  border-bottom: 1px solid var(--glass-border);
}
.dp-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}
.dp-icon-wrap {
  flex-shrink: 0;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--color-primary) 10%, var(--color-surface));
}
.dp-meta {
  min-width: 0;
}
.dp-name {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.dp-stack {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}
.dp-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-family: var(--font-body);
  font-weight: 500;
  background: color-mix(in oklab, var(--chip-color, var(--color-text-faint)) 15%, var(--color-surface));
  color: var(--chip-color, var(--color-text-muted));
  border: 1px solid color-mix(in oklab, var(--chip-color, var(--color-text-faint)) 30%, transparent);
  text-transform: capitalize;
}
.dp-stats {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dp-stat b { color: var(--color-text); font-weight: 600; }
.dp-dot {
  display: inline-block;
  width: 3px; height: 3px;
  border-radius: 50%;
  background: var(--color-text-faint);
}

/* Закрыть */
.dp-close {
  position: absolute;
  top: var(--space-3); right: var(--space-3);
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition-interactive), color var(--transition-interactive);
}
.dp-close:hover { background: color-mix(in oklab, var(--color-error) 12%, transparent); color: var(--color-error); }
.dp-close:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

/* Вкладки */
.dp-tabs {
  display: flex;
  gap: 2px;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.dp-tab-btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition-interactive), color var(--transition-interactive);
}
.dp-tab-btn:hover { background: color-mix(in oklab, var(--color-primary) 8%, transparent); color: var(--color-text); }
.dp-tab-btn--active {
  background: color-mix(in oklab, var(--color-primary) 14%, transparent);
  color: var(--color-primary);
  font-weight: 600;
}
.dp-tab-btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }

/* Тело панели */
.dp-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;
}
.dp-body::-webkit-scrollbar { width: 4px; }
.dp-body::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px; }

.dp-empty {
  text-align: center;
  padding: var(--space-8) 0;
  font-size: var(--text-sm);
  color: var(--color-text-faint);
}

/* ======================================================
   RouteList
   ====================================================== */
.route-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-1); }
.route-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: border-color 150ms, background 150ms;
}
.route-item:hover {
  background: color-mix(in oklab, var(--color-primary) 5%, transparent);
  border-color: var(--glass-border);
}
.route-top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.route-method {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  font-weight: 700;
  min-width: 52px;
  text-transform: uppercase;
}
.route-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  color: var(--color-text);
  word-break: break-all;
}
.route-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-top: 2px;
}
.route-schema {
  font-size: var(--text-xs);
  font-family: var(--font-body);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  border: 1px solid var(--glass-border);
  color: var(--color-text-muted);
  white-space: nowrap;
}
.route-schema--in  { border-color: color-mix(in oklab, var(--color-primary) 35%, transparent); color: var(--color-primary); }
.route-schema--out { border-color: color-mix(in oklab, var(--color-gold,#d19900) 35%, transparent); color: var(--color-gold,#d19900); }
.route-src {
  font-size: var(--text-xs);
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-faint);
  text-decoration: none;
  margin-left: auto;
}
.route-src:hover { color: var(--color-primary); text-decoration: underline; }

/* ======================================================
   SchemaBlock
   ====================================================== */
.schema-block {
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.schema-summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  user-select: none;
  list-style: none;
  background: color-mix(in oklab, var(--color-primary) 5%, transparent);
}
.schema-summary::-webkit-details-marker { display: none; }
.schema-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}
.schema-count {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}
.schema-chevron {
  color: var(--color-text-faint);
  transition: transform 180ms;
  flex-shrink: 0;
}
details[open] .schema-chevron { transform: rotate(180deg); }

.schema-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
  font-family: var(--font-body);
}
.schema-table th {
  text-align: left;
  padding: var(--space-1) var(--space-3);
  color: var(--color-text-faint);
  font-weight: 500;
  border-bottom: 1px solid var(--glass-border);
  background: transparent;
}
.schema-table td {
  padding: var(--space-1) var(--space-3);
  border-bottom: 1px solid color-mix(in oklab, var(--glass-border) 60%, transparent);
}
.schema-table tr:last-child td { border-bottom: none; }
.schema-field-name { font-family: 'JetBrains Mono', monospace; color: var(--color-text); }
.schema-field-type { color: var(--color-primary); }
.schema-field-req  { width: 28px; text-align: center; }
.req-dot {
  display: inline-block;
  width: 6px; height: 6px;
  border-radius: 50%;
}
.req-dot--yes { background: var(--color-success, #437a22); }
.req-dot--no  { background: var(--color-border); }
.schema-src {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-xs);
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-text-faint);
  border-top: 1px solid var(--glass-border);
}

/* ======================================================
   DepList
   ====================================================== */
.dep-list { list-style: none; display: flex; flex-direction: column; gap: var(--space-1); }
.dep-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  transition: border-color 150ms, background 150ms;
}
.dep-item:hover {
  background: color-mix(in oklab, var(--color-primary) 5%, transparent);
  border-color: var(--glass-border);
}
.dep-icon { color: var(--color-text-faint); flex-shrink: 0; }
.dep-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dep-name { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dep-sub  { font-size: var(--text-xs); color: var(--color-text-faint); }
.dep-go {
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background var(--transition-interactive), color var(--transition-interactive);
}
.dep-go:hover { background: color-mix(in oklab, var(--color-primary) 12%, transparent); color: var(--color-primary); }
.dep-go:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 1px; }
`;

export function injectDetailStyles(): void {
  if (document.getElementById('detail-panel-css')) return;
  const s = document.createElement('style');
  s.id = 'detail-panel-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
