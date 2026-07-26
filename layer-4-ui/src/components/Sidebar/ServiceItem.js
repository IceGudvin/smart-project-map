/**
 * ServiceItem.ts — Одна строка в списке сервисов Sidebar.
 *
 * Показывает:
 *   - имя сервиса
 *   - badge технологии (Next.js / FastAPI / DB / Cache / S3 / Queue / External)
 *   - статус-точка (online/offline/error)
 *   - мета-строка: N routes · язык
 *   - активное состояние (класс .active)
 *
 * При клике → emit('node:select', nodeId)
 */
import { emit } from '../../lib/eventBus.js';
const BADGE_MAP = {
    // Frontend
    'next.js': { label: 'Next.js', variant: 'nextjs' },
    'nextjs': { label: 'Next.js', variant: 'nextjs' },
    'react': { label: 'React', variant: 'nextjs' },
    'nuxt': { label: 'Nuxt', variant: 'nextjs' },
    'vue': { label: 'Vue', variant: 'fastapi' },
    'svelte': { label: 'Svelte', variant: 'ext' },
    // Backend Python
    'fastapi': { label: 'FastAPI', variant: 'fastapi' },
    'django': { label: 'Django', variant: 'fastapi' },
    'flask': { label: 'Flask', variant: 'fastapi' },
    // Backend Node
    'express': { label: 'Express', variant: 'nextjs' },
    'fastify': { label: 'Fastify', variant: 'nextjs' },
    'nestjs': { label: 'NestJS', variant: 'nextjs' },
    // DB
    'postgresql': { label: 'Postgres', variant: 'postgres' },
    'postgres': { label: 'Postgres', variant: 'postgres' },
    'mysql': { label: 'MySQL', variant: 'postgres' },
    'sqlite': { label: 'SQLite', variant: 'postgres' },
    'mongodb': { label: 'Mongo', variant: 'postgres' },
    // Cache
    'redis': { label: 'Redis', variant: 'redis' },
    'memcached': { label: 'Memcache', variant: 'redis' },
    // Storage
    'minio': { label: 'MinIO', variant: 's3' },
    's3': { label: 'S3', variant: 's3' },
    // Queue
    'rabbitmq': { label: 'Rabbit', variant: 'queue' },
    'kafka': { label: 'Kafka', variant: 'queue' },
    'celery': { label: 'Celery', variant: 'queue' },
};
function resolveBadge(node) {
    const key = (node.tech ?? node.language ?? node.nodeType ?? node.type ?? '').toLowerCase();
    return (BADGE_MAP[key] ??
        BADGE_MAP[node.name?.toLowerCase()] ??
        { label: node.tech ?? node.nodeType ?? node.type ?? '?', variant: 'ext' });
}
// ----------------------------------------------------------------- meta line
function buildMeta(node) {
    const parts = [];
    const routeCount = node.routes?.length;
    if (routeCount)
        parts.push(`${routeCount} routes`);
    if (node.language)
        parts.push(node.language);
    return parts.join(' · ');
}
// ================================================================ ServiceItem
export class ServiceItem {
    node;
    el = null;
    _active = false;
    constructor(node) {
        this.node = node;
    }
    // ---- render ------------------------------------------------
    render() {
        const badge = resolveBadge(this.node);
        const meta = buildMeta(this.node);
        const el = document.createElement('div');
        el.className = 'si' + (this._active ? ' active' : '');
        el.id = `si-${this.node.id}`;
        el.setAttribute('role', 'listitem');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', this.node.name);
        el.setAttribute('aria-selected', String(this._active));
        el.dataset['nodeId'] = this.node.id;
        el.innerHTML = `
      <div class="si-row">
        <span class="si-name">${escHtml(this.node.name)}</span>
        <span class="si-badge si-badge-${badge.variant}">${escHtml(badge.label)}</span>
      </div>
      <div class="si-meta">
        <span class="si-dot" aria-hidden="true"></span>
        <span>${escHtml(meta)}</span>
      </div>
    `;
        el.addEventListener('click', () => this._select());
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._select();
            }
        });
        this.el = el;
        return el;
    }
    // ---- setActive ----------------------------------------
    setActive(active) {
        this._active = active;
        if (!this.el)
            return;
        this.el.classList.toggle('active', active);
        this.el.setAttribute('aria-selected', String(active));
        if (active)
            this.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    // ---- private -------------------------------------------
    _select() {
        emit('node:select', this.node.id);
    }
}
// ----------------------------------------------------------------- utils
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
