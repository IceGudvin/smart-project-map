/**
 * Button — атомарная кнопка.
 *
 * variant: 'primary' | 'secondary' | 'ghost'
 * size: 'sm' | 'md'
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md'

export interface ButtonOptions {
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string
  ariaLabel?: string
  onClick?: () => void
}

export function createButton(opts: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.className = `btn btn-${opts.variant ?? 'secondary'} btn-${opts.size ?? 'sm'}`
  btn.setAttribute('aria-label', opts.ariaLabel ?? opts.label)
  if (opts.icon) {
    btn.innerHTML = `${opts.icon} ${opts.label}`
  } else {
    btn.textContent = opts.label
  }
  if (opts.onClick) btn.addEventListener('click', opts.onClick)
  return btn
}
