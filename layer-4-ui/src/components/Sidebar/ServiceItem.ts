import type { ServiceNode } from '@smart-map/shared'

export interface ServiceItemOptions {
  node:     ServiceNode
  onClick:  (id: string) => void
}

export interface ServiceItem {
  el:      HTMLElement
  update:  (node: ServiceNode, selected: boolean) => void
  destroy: () => void
}

function getBadge(node: ServiceNode): { label: string; variant: string } {
  const key = (node.language ?? node.nodeType ?? '').toLowerCase()
  if (key === 'typescript' || key === 'javascript') return { label: 'TS/JS', variant: 'ts' }
  if (key === 'python')                              return { label: 'Python', variant: 'py' }
  if (key === 'go')                                  return { label: 'Go', variant: 'go' }
  return { label: node.framework ?? node.nodeType ?? '?', variant: 'ext' }
}

export function createServiceItem({ node, onClick }: ServiceItemOptions): ServiceItem {
  const el = document.createElement('div')
  el.className = 'service-item'
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')

  function render(n: ServiceNode, selected: boolean) {
    el.classList.toggle('selected', selected)
    const badge = getBadge(n)
    el.innerHTML = `
      <span class="service-item__name">${n.name}</span>
      <span class="service-item__badge badge--${badge.variant}">${badge.label}</span>
    `
  }

  render(node, false)

  el.addEventListener('click',  () => onClick(node.id))
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(node.id) })

  return {
    el,
    update:  (n, sel) => render(n, sel),
    destroy: () => el.remove(),
  }
}
