/**
 * ServiceItem.js — Одна строка в списке сервисов Sidebar.
 */
import { emit } from '../../lib/eventBus.js';

const BADGE_MAP = {
    'next.js':    { label: 'Next.js',  variant: 'nextjs' },
    'nextjs':     { label: 'Next.js',  variant: 'nextjs' },
    'react':      { label: 'React',    variant: 'nextjs' },
    'nuxt':       { label: 'Nuxt',     variant: 'nextjs' },
    'vue':        { label: 'Vue',      variant: 'fastapi' },
    'svelte':     { label: 'Svelte',   variant: 'ext' },
    'fastapi':    { label: 'FastAPI',  variant: 'fastapi' },
    'django':     { label: 'Django',   variant: 'fastapi' },
    'flask':      { label: 'Flask',    variant: 'fastapi' },
    'express':    { label: 'Express',  variant: 'nextjs' },
    'fastify':    { label: 'Fastify',  variant: 'nextjs' },
    'nestjs':     { label: 'NestJS',   variant: 'nextjs' },
    'postgresql': { label: 'Postgres', variant: 'postgres' },
    'postgres':   { label: 'Postgres', variant: 'postgres' },
    'mysql':      { label: 'MySQL',    variant: 'postgres' },
    'sqlite':     { label: 'SQLite',   variant: 'postgres' },
    'mongodb':    { label: 'Mongo',    variant: 'postgres' },
    'redis':      { label: 'Redis',    variant: 'redis' },
    'memcached':  { label: 'Memcache', variant: 'redis' },
    'minio':      { label: 'MinIO',    variant: 's3' },
    's3':         { label: 'S3',       variant: 's3' },
    'rabbitmq':   { label: 'Rabbit',   variant: 'queue' },
    'kafka':      { label: 'Kafka',    variant: 'queue' },
    'celery':     { label: 'Celery',   variant: 'queue' },
    'external':   { label: 'external', variant: 'ext' },
};

function resolveBadge(node) {
    // Приоритет: framework > tech > id узла > nodeType
    const candidates = [
        node.framework,
        node.tech,
        node.id,
        node.nodeType,
        node.type,
    ];
    for (const c of candidates) {
        if (!c) continue;
        const key = c.toLowerCase();
        if (BADGE_MAP[key]) return BADGE_MAP[key];
    }
    // Для инфра-узлов без маппинга — не показываем badge вообще
    if (node.nodeType !== 'service' && node.type !== 'service') return null;
    return { label: node.framework ?? node.tech ?? '?', variant: 'ext' };
}

function buildMeta(node) {
    const parts = [];
    const routeCount = node.routes?.length ?? node.routeCount;
    if (routeCount) parts.push(`${routeCount} routes`);
    if (node.language) parts.push(node.language);
    return parts.join(' · ');
}

// Цвет dot по статусу
function dotClass(node) {
    const s = node.status;
    if (s === 'offline' || s === 'down')  return 'offline';
    if (s === 'error'   || s === 'err')   return 'error';
    // Для инфра без статуса — нейтральный серый
    if (!s && node.nodeType !== 'service' && node.type !== 'service') return 'offline';
    return ''; // online (зелёный)
}

export class ServiceItem {
    node;
    el = null;
    _active = false;

    constructor(node) {
        this.node = node;
    }

    render() {
        const badge   = resolveBadge(this.node);
        const meta    = buildMeta(this.node);
        const dotCls  = dotClass(this.node);
        const el      = document.createElement('div');

        el.className = 'si' + (this._active ? ' active' : '');
        el.id        = `si-${this.node.id}`;
        el.setAttribute('role',         'listitem');
        el.setAttribute('tabindex',     '0');
        el.setAttribute('aria-label',   this.node.name);
        el.setAttribute('aria-selected', String(this._active));
        el.dataset['nodeId'] = this.node.id;

        const badgeHtml = badge
            ? `<span class="si-badge si-badge-${badge.variant}">${escHtml(badge.label)}</span>`
            : '';

        // meta строку показываем только если есть что показать
        const metaHtml = meta
            ? `<div class="si-meta">
                 <span class="si-dot ${dotCls}" aria-hidden="true"></span>
                 <span>${escHtml(meta)}</span>
               </div>`
            : '';

        el.innerHTML = `
      <div class="si-row">
        <span class="si-name">${escHtml(this.node.name)}</span>
        ${badgeHtml}
      </div>
      ${metaHtml}
    `;

        el.addEventListener('click',   () => this._select());
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._select();
            }
        });
        this.el = el;
        return el;
    }

    setActive(active) {
        this._active = active;
        if (!this.el) return;
        this.el.classList.toggle('active', active);
        this.el.setAttribute('aria-selected', String(active));
        if (active) this.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    _select() {
        emit('node:select', this.node.id);
    }
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
