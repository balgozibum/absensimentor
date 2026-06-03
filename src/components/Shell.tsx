// ───────────────────────────────────────────────────────────────
// Shell — app chrome. Left sidebar on desktop, sticky bottom tab bar
// on mobile. Hosts the role switch (Karyawan / Admin) and, in the
// employee portal, the "acting as" staff picker (there's no auth — this
// is how the demo moves between people; HANDOVER §8).
// ───────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { useStore } from '../lib/store'
import { Avatar, Segmented, cx } from './ui'
import { IconChevronDown, IconRefresh } from './icons'
import type { Role } from '../types'

export interface NavItem {
  key: string
  label: string
  icon: ReactNode
  badge?: number
}

export function Shell({
  navItems,
  page,
  onNavigate,
  children,
}: {
  navItems: NavItem[]
  page: string
  onNavigate: (key: string) => void
  children: ReactNode
}) {
  const { session, setRole, currentEmployee, setActingEmployee, data, resetData } = useStore()
  const staff = data.employees.filter((e) => e.role === 'karyawan')

  return (
    <div className="min-h-screen lg:flex">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-5 backdrop-blur-sm lg:flex">
        <Brand />

        <div className="mt-7 mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">
          {session.role === 'admin' ? 'Admin' : 'Portal Karyawan'}
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavButton key={item.key} item={item} active={item.key === page} onClick={() => onNavigate(item.key)} />
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-4">
          <RoleSwitch role={session.role} onChange={setRole} />
          <UserCard />
          <button
            onClick={resetData}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink-soft"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Atur ulang data demo
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Brand compact />
          <RoleSwitch role={session.role} onChange={setRole} size="sm" />
        </header>

        {/* Employee "acting as" picker */}
        {session.role === 'karyawan' && (
          <div className="flex items-center gap-2.5 border-b border-line bg-brand-soft/40 px-4 py-2.5 sm:px-8">
            <span className="text-[12.5px] text-ink-mute">Masuk sebagai</span>
            <div className="relative">
              <select
                value={currentEmployee.id}
                onChange={(e) => setActingEmployee(e.target.value)}
                className="h-8 appearance-none rounded-lg border border-line-strong bg-surface pl-3 pr-8 text-[13px] font-medium text-ink focus:border-brand focus:outline-none"
              >
                {staff.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.active ? '' : ' (nonaktif)'}
                  </option>
                ))}
              </select>
              <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-mute" />
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-8 sm:pt-9 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-line bg-surface/90 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {navItems.map((item) => {
          const active = item.key === page
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors',
                active ? 'text-brand' : 'text-ink-mute',
              )}
            >
              <span className="relative">
                {item.icon}
                {item.badge ? (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-copper px-1 text-[9px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12.5l3.5 3.5L18 8" />
        </svg>
      </span>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-[17px] font-semibold tracking-tight text-ink">AbsensiMentor</div>
          <div className="text-[11px] text-ink-mute">Absensi internal</div>
        </div>
      )}
      {compact && <span className="font-display text-[16px] font-semibold tracking-tight text-ink">AbsensiMentor</span>}
    </div>
  )
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all',
        active ? 'bg-brand text-white shadow-sm' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
      )}
    >
      <span className={cx('transition-colors', active ? 'text-white' : 'text-ink-mute group-hover:text-ink-soft')}>
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge ? (
        <span
          className={cx(
            'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
            active ? 'bg-white/20 text-white' : 'bg-copper-soft text-copper-strong',
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </button>
  )
}

function RoleSwitch({ role, onChange, size = 'md' }: { role: Role; onChange: (r: Role) => void; size?: 'sm' | 'md' }) {
  return (
    <Segmented<Role>
      value={role}
      onChange={onChange}
      size={size}
      options={[
        { value: 'karyawan', label: 'Karyawan' },
        { value: 'admin', label: 'Admin' },
      ]}
    />
  )
}

function UserCard() {
  const { currentEmployee } = useStore()
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3 py-2.5">
      <Avatar employee={currentEmployee} size={36} />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[13.5px] font-semibold text-ink">{currentEmployee.name}</div>
        <div className="truncate text-[11.5px] text-ink-mute">{currentEmployee.title}</div>
      </div>
    </div>
  )
}
