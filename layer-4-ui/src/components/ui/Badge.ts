/**
 * Badge — атомарный бейдж-тег.
 *
 * Используется в ServiceItem и DetailPanel.
 * variant: 'py' | 'ts' | 'infra' | 'ext'
 */

export type BadgeVariant = 'py' | 'ts' | 'infra' | 'ext'

export function createBadge(text: string, variant: BadgeVariant): HTMLElement {
  const span = document.createElement('span')
  span.className = `badge badge-${variant}`
  span.textContent = text
  return span
}
