// ───────────────────────────────────────────────────────────────
// Employee dashboard (Beranda) — the daily landing for the acting
// staff member. A live "status hari ini" hero anchors the page, a
// stat strip summarises the week, and two cards surface today's
// timeline and the most recent requests. Read-only against the store
// except the single "Absen Masuk" CTA, which routes to the attendance
// flow rather than clocking in inline (selfie capture lives there).
// ───────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import type { LeaveRequest, OvertimeRequest } from '../../types'
import { useStore } from '../../lib/store'
import {
  buildTimeline,
  coveredMinutes,
  formatDateLong,
  formatDateShort,
  formatDuration,
  toMinutes,
  todayISO,
  weekDates,
} from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  RequestBadge,
  cx,
} from '../../components/ui'
import {
  IconActivity,
  IconArrowRight,
  IconClock,
  IconClockIn,
  IconClockOut,
  IconHourglass,
  IconLeave,
  IconOvertime,
  IconSparkle,
} from '../../components/icons'
import { Timeline } from '../../components/Timeline'
import { AttendancePill, LEAVE_META, StatCard } from '../shared'

// ── Greeting by hour ─────────────────────────────────────────────

function greetingFor(hour: number): string {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

/** live HH:MM:SS ticking every second */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// ── Unified request row model ────────────────────────────────────

type RequestRow =
  | { kind: 'leave'; req: LeaveRequest; sortKey: string }
  | { kind: 'overtime'; req: OvertimeRequest; sortKey: string }

// ───────────────────────────────────────────────────────────────

export function EmployeeDashboard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { data, settings, currentEmployee, attendanceFor } = useStore()
  const now = useClock()
  const today = todayISO()

  const emp = currentEmployee
  const att = attendanceFor(emp.id, today)
  const clockedIn = Boolean(att.in)
  const clockedOut = Boolean(att.out)

  // ── Today's activities + timeline coverage ─────────────────────
  const todayActivities = useMemo(
    () => data.activities.filter((a) => a.employeeId === emp.id && a.date === today),
    [data.activities, emp.id, today],
  )
  const segments = useMemo(
    () => buildTimeline(todayActivities, settings.clockIn, settings.clockOut),
    [todayActivities, settings.clockIn, settings.clockOut],
  )
  const trackedToday = coveredMinutes(segments)

  // ── This week stats ────────────────────────────────────────────
  const week = useMemo(() => weekDates(today), [today])
  const weekStats = useMemo(() => {
    const present = new Set<string>()
    let ontime = 0
    let total = 0
    for (const d of week) {
      const rec = attendanceFor(emp.id, d).in
      if (!rec) continue
      present.add(d)
      total += 1
      if (rec.status !== 'late') ontime += 1
    }
    return { presentDays: present.size, ontime, total }
  }, [week, attendanceFor, emp.id])

  // ── Pending requests count ─────────────────────────────────────
  const pendingCount = useMemo(() => {
    const lv = data.leave.filter((l) => l.employeeId === emp.id && l.status === 'pending').length
    const ot = data.overtime.filter((o) => o.employeeId === emp.id && o.status === 'pending').length
    return lv + ot
  }, [data.leave, data.overtime, emp.id])

  // ── Most recent requests (leave + overtime combined) ───────────
  const recentRequests = useMemo<RequestRow[]>(() => {
    const rows: RequestRow[] = [
      ...data.leave
        .filter((l) => l.employeeId === emp.id)
        .map<RequestRow>((req) => ({ kind: 'leave', req, sortKey: req.createdAt })),
      ...data.overtime
        .filter((o) => o.employeeId === emp.id)
        .map<RequestRow>((req) => ({ kind: 'overtime', req, sortKey: req.createdAt })),
    ]
    rows.sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
    return rows.slice(0, 4)
  }, [data.leave, data.overtime, emp.id])

  // ── Greeting (derived from the live clock so it stays honest) ──
  const greeting = greetingFor(now.getHours())
  const firstName = emp.name.split(/\s+/)[0]

  // elapsed since clock-in (only while clocked in, not yet out)
  const elapsedLabel = useMemo(() => {
    if (!att.in) return null
    const startMin = toMinutes(att.in.time)
    const endMin = att.out ? toMinutes(att.out.time) : now.getHours() * 60 + now.getMinutes()
    const mins = Math.max(0, endMin - startMin)
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}j ${m}m` : `${m}m`
  }, [att.in, att.out, now])

  const statusTone: 'ink' | 'ok' | 'brand' = clockedOut ? 'ink' : clockedIn ? 'brand' : 'ink'
  const statusLabel = clockedOut ? 'Selesai bekerja' : clockedIn ? 'Sedang bekerja' : 'Belum absen'

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={greeting}
        title={`${greeting}, ${firstName}`}
        subtitle={formatDateLong(today)}
      />

      <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Hero: status hari ini ─────────────────────────────── */}
        <Card
          className="overflow-hidden lg:col-span-2"
          style={{ '--i': 0 } as CSSProperties}
        >
          <div className="relative grid grid-cols-1 gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
            {/* live clock column */}
            <div className="flex flex-col justify-center sm:border-r sm:border-line sm:pr-7">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-copper">
                Waktu sekarang
              </span>
              <div className="mt-1 font-mono text-[42px] font-semibold leading-none tracking-tight text-ink tnum sm:text-[48px]">
                {pad(now.getHours())}:{pad(now.getMinutes())}
                <span className="text-[24px] text-ink-mute sm:text-[26px]">:{pad(now.getSeconds())}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={statusTone} dot>{statusLabel}</Badge>
                <span className="text-[12.5px] text-ink-mute">
                  Jam masuk {settings.clockIn}
                </span>
              </div>
            </div>

            {/* state-aware body */}
            <div className="flex flex-col justify-center">
              {clockedIn ? (
                <div className="stagger space-y-4">
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4" style={{ '--i': 0 } as CSSProperties}>
                    <HeroStat
                      icon={<IconClockIn className="h-4 w-4" />}
                      tone="ok"
                      label="Absen masuk"
                      value={att.in!.time}
                      meta={<AttendancePill record={att.in} />}
                    />
                    <HeroStat
                      icon={<IconClockOut className="h-4 w-4" />}
                      tone={clockedOut ? 'brand' : 'ink'}
                      label="Absen pulang"
                      value={clockedOut ? att.out!.time : '—'}
                      meta={
                        clockedOut ? (
                          <span className="text-[12.5px] text-ink-mute">Tercatat</span>
                        ) : (
                          <Badge tone="warn">Belum pulang</Badge>
                        )
                      }
                    />
                  </div>
                  {elapsedLabel && (
                    <div
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5"
                      style={{ '--i': 1 } as CSSProperties}
                    >
                      <IconHourglass className="h-4 w-4 text-brand" />
                      <span className="text-[13px] text-ink-soft">
                        {clockedOut ? 'Total bekerja' : 'Sudah bekerja'}{' '}
                        <strong className="font-mono font-semibold text-ink tnum">{elapsedLabel}</strong>
                        <span className="text-ink-mute"> · sejak </span>
                        <span className="font-mono text-ink-soft tnum">{att.in!.time}</span>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-center">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand">
                    <IconSparkle className="h-5 w-5" />
                  </span>
                  <h2 className="mt-3 font-display text-[22px] font-semibold leading-tight text-ink">
                    Mulai hari Anda
                  </h2>
                  <p className="mt-1 max-w-sm text-[13.5px] text-ink-soft">
                    Anda belum absen masuk hari ini. Jam masuk perusahaan{' '}
                    <span className="font-mono text-ink tnum">{settings.clockIn}</span>.
                  </p>
                  <Button
                    variant="primary"
                    size="lg"
                    className="mt-4"
                    onClick={() => onNavigate('attendance')}
                  >
                    <IconClockIn className="h-4.5 w-4.5" />
                    Absen Masuk
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Pengajuan terakhir ────────────────────────────────── */}
        <Card className="flex flex-col" style={{ '--i': 1 } as CSSProperties}>
          <CardHeader title="Pengajuan terakhir" icon={<IconLeave className="h-4.5 w-4.5" />} />
          <div className="flex-1">
            {recentRequests.length === 0 ? (
              <EmptyState
                icon={<IconLeave className="h-5 w-5" />}
                title="Belum ada pengajuan"
                description="Ajukan cuti atau lembur kapan saja."
              />
            ) : (
              <ul className="divide-y divide-line">
                {recentRequests.map((row) => (
                  <RequestRowItem key={`${row.kind}-${row.req.id}`} row={row} />
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-line px-4 py-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('leave')}>
              <IconLeave className="h-4 w-4" />
              Cuti
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('overtime')}>
              <IconOvertime className="h-4 w-4" />
              Lembur
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────── */}
      <div className="stagger mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div style={{ '--i': 0 } as CSSProperties}>
          <StatCard
            label="Hadir minggu ini"
            value={weekStats.presentDays}
            sub="dari 5 hari kerja"
            icon={<IconClockIn className="h-4 w-4" />}
            tone="brand"
          />
        </div>
        <div style={{ '--i': 1 } as CSSProperties}>
          <StatCard
            label="Tepat waktu"
            value={weekStats.total === 0 ? '—' : `${weekStats.ontime}/${weekStats.total}`}
            sub={weekStats.total === 0 ? 'belum ada absensi' : 'absen masuk minggu ini'}
            icon={<IconClock className="h-4 w-4" />}
            tone="ok"
          />
        </div>
        <div style={{ '--i': 2 } as CSSProperties}>
          <StatCard
            label="Pengajuan menunggu"
            value={pendingCount}
            sub="cuti + lembur"
            icon={<IconHourglass className="h-4 w-4" />}
            tone={pendingCount > 0 ? 'warn' : 'brand'}
          />
        </div>
        <div style={{ '--i': 3 } as CSSProperties}>
          <StatCard
            label="Tercatat hari ini"
            value={trackedToday === 0 ? '—' : formatDuration(trackedToday)}
            sub="dari timeline aktivitas"
            icon={<IconActivity className="h-4 w-4" />}
            tone="copper"
          />
        </div>
      </div>

      {/* ── Timeline hari ini ───────────────────────────────────── */}
      <Card className="stagger mt-5" style={{ '--i': 0 } as CSSProperties}>
        <CardHeader
          title="Timeline hari ini"
          subtitle={`Jam kerja ${settings.clockIn}–${settings.clockOut}`}
          icon={<IconActivity className="h-4.5 w-4.5" />}
          action={
            todayActivities.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => onNavigate('activity')}>
                Buka aktivitas
                <IconArrowRight className="h-4 w-4" />
              </Button>
            ) : undefined
          }
        />
        <div className="p-5">
          {todayActivities.length === 0 ? (
            <EmptyState
              icon={<IconActivity className="h-5 w-5" />}
              title="Belum ada aktivitas tercatat"
              description="Catat apa yang Anda kerjakan hari ini agar timeline terisi."
              action={
                <Button variant="primary" size="md" onClick={() => onNavigate('activity')}>
                  <IconActivity className="h-4 w-4" />
                  Catat aktivitas
                </Button>
              }
            />
          ) : (
            <Timeline
              blocks={todayActivities}
              workStart={settings.clockIn}
              workEnd={settings.clockOut}
              variant="detailed"
            />
          )}
        </div>
      </Card>
    </div>
  )
}

// ── Hero stat (clock-in / clock-out pair) ────────────────────────

function HeroStat({
  icon,
  tone,
  label,
  value,
  meta,
}: {
  icon: ReactNode
  tone: 'ok' | 'brand' | 'ink'
  label: string
  value: string
  meta: ReactNode
}) {
  const toneCls: Record<string, string> = {
    ok: 'text-ok bg-ok-soft',
    brand: 'text-brand bg-brand-soft',
    ink: 'text-ink-mute bg-surface-2',
  }
  return (
    <div className="flex items-center gap-3">
      <span className={cx('grid h-9 w-9 place-items-center rounded-xl', toneCls[tone])}>{icon}</span>
      <div className="leading-tight">
        <div className="text-[12px] font-medium text-ink-mute">{label}</div>
        <div className="font-mono text-[22px] font-semibold leading-none text-ink tnum">{value}</div>
        <div className="mt-1.5">{meta}</div>
      </div>
    </div>
  )
}

// ── Request row ──────────────────────────────────────────────────

function RequestRowItem({ row }: { row: RequestRow }) {
  if (row.kind === 'leave') {
    const meta = LEAVE_META[row.req.leaveType]
    const range =
      row.req.startDate === row.req.endDate
        ? formatDateShort(row.req.startDate)
        : `${formatDateShort(row.req.startDate)} – ${formatDateShort(row.req.endDate)}`
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-soft text-brand">
              <IconLeave className="h-3.5 w-3.5" />
            </span>
            <span className="truncate text-[13.5px] font-semibold text-ink">{meta.label}</span>
          </div>
          <div className="mt-1 pl-9 font-mono text-[12px] text-ink-mute tnum">{range}</div>
        </div>
        <RequestBadge status={row.req.status} />
      </li>
    )
  }

  const range = `${formatDateShort(row.req.date)} · ${row.req.startTime}–${row.req.endTime}`
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-copper-soft text-copper-strong">
            <IconOvertime className="h-3.5 w-3.5" />
          </span>
          <span className="truncate text-[13.5px] font-semibold text-ink">Lembur</span>
        </div>
        <div className="mt-1 pl-9 font-mono text-[12px] text-ink-mute tnum">{range}</div>
      </div>
      <RequestBadge status={row.req.status} />
    </li>
  )
}
