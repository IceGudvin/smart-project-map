/**
 * Divider — горизонтальный разделитель.
 *
 * Используется между секциями в панелях и sidebar.
 */

export function createDivider(): HTMLElement {
  const hr = document.createElement('div')
  hr.className = 'divider'
  hr.setAttribute('role', 'separator')
  hr.setAttribute('aria-hidden', 'true')
  return hr
}
