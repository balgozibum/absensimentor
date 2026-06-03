// ───────────────────────────────────────────────────────────────
// Shared UI primitives. The whole app is composed from these so the
// editorial navy/copper/ivory identity stays consistent.
// ───────────────────────────────────────────────────────────────

import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import type { Employee, RequestStatus } from '../types'
import { IconChevronDown, IconX } from './icons'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

// ── Avatar ───────────────────────────────────────────────────────

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function Avatar({
  employee,
  size = 40,
  ring = false,
}: {
  employee: Pick<Employee, 'name' | 'hue'>
  size?: number
  ring?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        ring && 'ring-2 ring-white',
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(145deg, hsl(${employee.hue} 46% 46%), hsl(${employee.hue + 18} 52% 34%))`,
        boxShadow: ring ? '0 0 0 1px rgba(0,0,0,0.04)' : undefined,
      }}
    >
      {initials(employee.name)}
    </span>
  )
}

// ── Button ───────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'copper'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white border border-brand-strong/40 hover:bg-brand-strong shadow-sm',
  copper:
    'bg-copper text-white border border-copper-strong/40 hover:bg-copper-strong shadow-sm',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-2 hover:border-ink-mute/50',
  ghost:
    'bg-transparent text-ink-soft border border-transparent hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-danger-soft text-danger border border-danger/25 hover:bg-danger hover:text-white',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-lg',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Card ─────────────────────────────────────────────────────────

export function Card({
  className,
  children,
  as: Tag = 'div',
  ...rest
}: {
  className?: string
  children: ReactNode
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cx(
        'rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
            {icon}
          </span>
        )}
        <div>
          <h3 className="font-display text-[17px] leading-tight font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-mute">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

// ── Page header (uses serif display) ─────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-copper">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[30px] leading-[1.05] font-semibold tracking-tight text-ink sm:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

// ── Form fields ──────────────────────────────────────────────────

export function Field({
  label,
  hint,
  htmlFor,
  children,
  required,
}: {
  label: string
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
        {label}
        {required && <span className="text-copper">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-ink-mute">{hint}</span>}
    </label>
  )
}

const controlBase =
  'w-full rounded-lg border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-mute transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-[var(--color-brand-ring)]'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlBase, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlBase, 'min-h-[88px] resize-y py-2.5 leading-relaxed', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cx(controlBase, 'h-11 appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
    </div>
  )
}

// ── Badges & status ──────────────────────────────────────────────

type Tone = 'ink' | 'brand' | 'copper' | 'ok' | 'warn' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  ink: 'bg-surface-2 text-ink-soft border-line-strong',
  brand: 'bg-brand-soft text-brand border-brand/15',
  copper: 'bg-copper-soft text-copper-strong border-copper/20',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/20',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
}

export function Badge({
  tone = 'ink',
  className,
  children,
  dot,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
  dot?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap',
        TONE[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export const REQUEST_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Menunggu', tone: 'warn' },
  approved: { label: 'Disetujui', tone: 'ok' },
  rejected: { label: 'Ditolak', tone: 'danger' },
}

export function RequestBadge({ status }: { status: RequestStatus }) {
  const m = REQUEST_META[status]
  return <Badge tone={m.tone} dot>{m.label}</Badge>
}

// ── Empty state ──────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-ink-mute">
          {icon}
        </span>
      )}
      <p className="font-display text-[16px] font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-ink-mute">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Segmented control ────────────────────────────────────────────

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: ReactNode }>
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cx(
        'inline-flex items-center rounded-xl border border-line bg-surface-2 p-1',
        size === 'sm' ? 'gap-0.5' : 'gap-1',
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cx(
              'rounded-lg font-medium transition-all',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3.5 text-[13px]',
              active
                ? 'bg-surface text-ink shadow-sm'
                : 'text-ink-mute hover:text-ink-soft',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'animate-scale relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[var(--shadow-pop)] sm:rounded-xl',
          width,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[19px] font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-mute">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Tutup"
          >
            <IconX className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-surface-2/60 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}

// ── Misc ─────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-line', className)} />
}

export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}
