/**
 * Badge — атомарный бейдж-тег.
 *
 * Используется в ServiceItem и DetailPanel.
 * variant: 'py' | 'ts' | 'infra' | 'ext'
 */
export function createBadge(text, variant) {
    const span = document.createElement('span');
    span.className = `badge badge-${variant}`;
    span.textContent = text;
    return span;
}
