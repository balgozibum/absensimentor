// ───────────────────────────────────────────────────────────────
// Cross-view building blocks. Keeping these here means every view —
// employee and admin — renders stats, people, and statuses the same way.
// ───────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import type { AttendanceRecord, Employee, LeaveType } from '../types'
import { Avatar, Badge, Card, cx } from '../components/ui'

// ── Stat card ────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'brand',
  accent,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ReactNode
  tone?: 'brand' | 'copper' | 'ok' | 'warn' | 'danger'
  accent?: boolean
}) {
  const toneText: Record<string, string> = {
    brand: 'text-brand bg-brand-soft',
    copper: 'text-copper-strong bg-copper-soft',
    ok: 'text-ok bg-ok-soft',
    warn: 'text-warn bg-warn-soft',
    danger: 'text-danger bg-danger-soft',
  }
  return (
    <Card className={cx('p-4', accent && 'bg-gradient-to-br from-surface to-surface-2')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-mute">{label}</span>
        {icon && (
          <span className={cx('grid h-8 w-8 place-items-center rounded-lg', toneText[tone])}>{icon}</span>
        )}
      </div>
      <div className="mt-2 font-display text-[28px] font-semibold leading-none tracking-tight text-ink tnum">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[12.5px] text-ink-mute">{sub}</div>}
    </Card>
  )
}

// ── Person line ──────────────────────────────────────────────────

export function PersonLine({
  employee,
  size = 38,
  subtitle,
  right,
}: {
  employee: Employee
  size?: number
  subtitle?: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar employee={employee} size={size} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-ink">{employee.name}</span>
          {!employee.active && <Badge tone="ink">Nonaktif</Badge>}
        </div>
        <div className="truncate text-[12.5px] text-ink-mute">{subtitle ?? employee.title}</div>
      </div>
      {right}
    </div>
  )
}

// ── Leave type metadata ──────────────────────────────────────────

export const LEAVE_META: Record<LeaveType, { label: string; tone: 'brand' | 'copper' | 'info' }> = {
  tahunan: { label: 'Cuti Tahunan', tone: 'brand' },
  izin: { label: 'Izin', tone: 'copper' },
  sakit: { label: 'Sakit', tone: 'info' },
}

export function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const m = LEAVE_META[type]
  return <Badge tone={m.tone}>{m.label}</Badge>
}

// ── Attendance status ────────────────────────────────────────────

export function AttendancePill({ record }: { record?: AttendanceRecord }) {
  if (!record) return <Badge tone="ink">Belum absen</Badge>
  if (record.status === 'late')
    return <Badge tone="warn" dot>Terlambat {record.lateMinutes}m</Badge>
  return <Badge tone="ok" dot>Tepat waktu</Badge>
}
