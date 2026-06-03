// ───────────────────────────────────────────────────────────────
// Admin · Ringkasan — the daily operations almanac for the whole team.
// One glance answers: who's in, who's late, who's missing, what needs
// a decision, and where someone's day has a worrying gap.
// ───────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import type { AttendanceRecord, Employee, LeaveRequest, OvertimeRequest } from '../../types'
import { useStore } from '../../lib/store'
import {
  buildTimeline,
  formatDateLong,
  formatDateShort,
  formatDuration,
  gapMinutes,
  todayISO,
} from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  cx,
  EmptyState,
  PageHeader,
  RequestBadge,
} from '../../components/ui'
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconClockOut,
  IconHourglass,
  IconLeave,
  IconOvertime,
  IconSparkle,
} from '../../components/icons'
import { AttendancePill, PersonLine, StatCard } from '../shared'

// ── Live ticking clock (HH:MM:SS) ────────────────────────────────

function useNow(): Date {
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

// ── Derived per-person attendance for today ──────────────────────

type AttRow = {
  employee: Employee
  inTime?: string
  outTime?: string
  late: boolean
  /** 0 = late, 1 = absent, 2 = present — sort so problems float up */
  rank: number
  record?: AttendanceRecord
}

// ── Sub-component: a single attendance row ───────────────────────

function AttendanceRow({ row }: { row: AttRow }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <PersonLine employee={row.employee} size={36} />
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end leading-tight">
          {row.inTime ? (
            <span className="font-mono text-[13.5px] font-semibold text-ink tnum">
              {row.inTime}
              {row.outTime && (
                <span className="text-ink-mute">
                  {' → '}
                  {row.outTime}
                </span>
              )}
            </span>
          ) : (
            <span className="font-mono text-[13.5px] text-ink-mute tnum">—</span>
          )}
          {row.inTime && !row.outTime && (
            <span className="text-[11.5px] text-ink-mute">belum pulang</span>
          )}
        </div>
        <AttendancePill record={row.record} />
      </div>
    </div>
  )
}

export function AdminDashboard({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { data, settings, attendanceFor, employeeById } = useStore()
  const today = todayISO()
  const now = useNow()

  // Active staff = real employees (not the admin), still active.
  const activeStaff = useMemo(
    () => data.employees.filter((e) => e.role === 'karyawan' && e.active),
    [data.employees],
  )

  // Resolve each active staff member's attendance for today, then sort so
  // late + absent surface first (problems before the happy path).
  const rows = useMemo<AttRow[]>(() => {
    const list = activeStaff.map((employee) => {
      const att = attendanceFor(employee.id, today)
      const late = att.in?.status === 'late'
      const present = Boolean(att.in)
      const rank = late ? 0 : !present ? 1 : 2
      return {
        employee,
        inTime: att.in?.time,
        outTime: att.out?.time,
        late,
        rank,
        record: att.in,
      }
    })
    return list.sort((a, b) => a.rank - b.rank || (a.inTime ?? '~').localeCompare(b.inTime ?? '~'))
  }, [activeStaff, attendanceFor, today])

  const presentCount = rows.filter((r) => r.inTime).length
  const lateCount = rows.filter((r) => r.late).length
  const absentCount = rows.filter((r) => !r.inTime).length

  // Pending queue — leave + overtime awaiting a decision.
  const pendingLeave = useMemo(
    () => data.leave.filter((l) => l.status === 'pending'),
    [data.leave],
  )
  const pendingOvertime = useMemo(
    () => data.overtime.filter((o) => o.status === 'pending'),
    [data.overtime],
  )
  const pendingCount = pendingLeave.length + pendingOvertime.length

  // Long-gap scan: for every active staff member, build today's timeline and
  // flag anyone whose day contains a long (idle) gap.
  const longGaps = useMemo(() => {
    const out: Array<{ employee: Employee; gap: number }> = []
    for (const employee of activeStaff) {
      const blocks = data.activities.filter(
        (a) => a.employeeId === employee.id && a.date === today,
      )
      if (blocks.length === 0) continue
      const segments = buildTimeline(blocks, settings.clockIn, settings.clockOut)
      const hasLong = segments.some((s) => s.kind === 'gap' && s.long)
      if (hasLong) out.push({ employee, gap: gapMinutes(segments) })
    }
    return out.sort((a, b) => b.gap - a.gap)
  }, [activeStaff, data.activities, settings.clockIn, settings.clockOut, today])

  // Unified pending feed (newest first), capped to 4 for the preview card.
  const pendingFeed = useMemo(() => {
    const leaveItems = pendingLeave.map((l) => ({ kind: 'leave' as const, item: l }))
    const otItems = pendingOvertime.map((o) => ({ kind: 'overtime' as const, item: o }))
    return [...leaveItems, ...otItems]
      .sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt))
      .slice(0, 4)
  }, [pendingLeave, pendingOvertime])

  // Live status pill for the hero.
  const heroStatus = useMemo(() => {
    if (presentCount === 0) {
      return { label: 'Belum ada yang hadir', tone: 'ink' as const }
    }
    if (lateCount > 0) {
      return { label: `${lateCount} terlambat`, tone: 'warn' as const }
    }
    if (absentCount > 0) {
      return { label: `${absentCount} belum absen`, tone: 'info' as const }
    }
    return { label: 'Tim lengkap & tepat waktu', tone: 'ok' as const }
  }, [presentCount, lateCount, absentCount])

  return (
    <div>
      <PageHeader eyebrow="Operasi harian" title="Ringkasan" subtitle={formatDateLong(today)} />

      <div className="stagger space-y-6">
        {/* ── Hero: live clock + team pulse ───────────────────────── */}
        <Card className="overflow-hidden" style={{ ['--i' as string]: 0 }}>
          <div className="grid gap-px bg-line sm:grid-cols-[1.1fr_1fr]">
            <div className="bg-gradient-to-br from-surface to-surface-2 px-6 py-6 sm:px-7">
              <div className="flex items-center gap-2 text-copper">
                <IconClock className="h-4 w-4" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Waktu kantor
                </span>
              </div>
              <div className="mt-3 font-display text-[52px] font-semibold leading-none tracking-tight text-ink tnum sm:text-[60px]">
                {pad(now.getHours())}
                <span className="text-ink-mute">:</span>
                {pad(now.getMinutes())}
                <span className="text-[0.5em] text-ink-mute">:{pad(now.getSeconds())}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="text-[13px] text-ink-soft">{formatDateShort(today)}</span>
                <Badge tone={heroStatus.tone} dot>
                  {heroStatus.label}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 bg-surface">
              <HeroMetric
                label="Hadir"
                value={`${presentCount}/${activeStaff.length}`}
                tone="ok"
              />
              <HeroMetric label="Terlambat" value={lateCount} tone="warn" divider />
              <HeroMetric label="Menunggu" value={pendingCount} tone="copper" divider />
            </div>
          </div>
        </Card>

        {/* ── Stat row ─────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" style={{ ['--i' as string]: 1 }}>
          <StatCard
            label="Hadir hari ini"
            value={presentCount}
            sub={`dari ${activeStaff.length} karyawan aktif`}
            icon={<IconCheck className="h-4 w-4" />}
            tone="ok"
          />
          <StatCard
            label="Terlambat"
            value={lateCount}
            sub={lateCount === 0 ? 'tidak ada keterlambatan' : 'lewat batas toleransi'}
            icon={<IconClock className="h-4 w-4" />}
            tone="warn"
          />
          <StatCard
            label="Belum absen"
            value={absentCount}
            sub={absentCount === 0 ? 'semua sudah masuk' : 'belum melapor masuk'}
            icon={<IconClockOut className="h-4 w-4" />}
            tone="danger"
          />
          <button
            type="button"
            onClick={() => onNavigate('approvals')}
            className="rounded-2xl text-left transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-brand-ring)] active:scale-[0.99]"
            aria-label="Buka pengajuan yang menunggu persetujuan"
          >
            <StatCard
              label="Pengajuan menunggu"
              value={pendingCount}
              sub={
                <span className="inline-flex items-center gap-1 text-copper">
                  Tinjau sekarang <IconArrowRight className="h-3 w-3" />
                </span>
              }
              icon={<IconHourglass className="h-4 w-4" />}
              tone="copper"
              accent
            />
          </button>
        </div>

        {/* ── Today's attendance + long-gap watch ──────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" style={{ ['--i' as string]: 2 }}>
          <Card>
            <CardHeader
              title="Kehadiran hari ini"
              subtitle={`${presentCount} hadir · ${absentCount} belum absen`}
              icon={<IconClock className="h-4.5 w-4.5" />}
            />
            {rows.length === 0 ? (
              <EmptyState
                icon={<IconSparkle className="h-5 w-5" />}
                title="Belum ada karyawan aktif"
                description="Tambahkan karyawan dari halaman pengaturan untuk mulai memantau kehadiran."
              />
            ) : (
              <div className="divide-y divide-line">
                {rows.map((row) => (
                  <AttendanceRow key={row.employee.id} row={row} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Perlu perhatian"
              subtitle="Celah panjang pada aktivitas hari ini"
              icon={<IconAlert className="h-4.5 w-4.5" />}
            />
            {longGaps.length === 0 ? (
              <EmptyState
                icon={<IconCheck className="h-5 w-5" />}
                title="Tidak ada celah panjang"
                description="Aktivitas tim hari ini terisi rapat — tidak ada jeda idle yang menonjol."
              />
            ) : (
              <div className="divide-y divide-line">
                {longGaps.map(({ employee, gap }) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <PersonLine
                      employee={employee}
                      size={36}
                      subtitle={
                        <span className="inline-flex items-center gap-1.5 text-warn">
                          <IconHourglass className="h-3.5 w-3.5" />
                          Celah {formatDuration(gap)}
                        </span>
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('timelines')}
                      className="shrink-0"
                    >
                      Lihat timeline
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Pending approvals preview ────────────────────────────── */}
        <Card style={{ ['--i' as string]: 3 }}>
          <CardHeader
            title="Menunggu persetujuan"
            subtitle={
              pendingCount === 0
                ? 'Antrean kosong'
                : `${pendingCount} pengajuan dalam antrean`
            }
            icon={<IconHourglass className="h-4.5 w-4.5" />}
            action={
              pendingCount > 0 ? (
                <Badge tone="warn" dot>
                  {pendingCount}
                </Badge>
              ) : undefined
            }
          />
          {pendingFeed.length === 0 ? (
            <EmptyState
              icon={<IconSparkle className="h-5 w-5" />}
              title="Semua sudah diputuskan"
              description="Tidak ada cuti atau lembur yang menunggu keputusanmu saat ini."
            />
          ) : (
            <>
              <div className="divide-y divide-line">
                {pendingFeed.map((entry) =>
                  entry.kind === 'leave' ? (
                    <LeaveFeedRow
                      key={entry.item.id}
                      request={entry.item}
                      name={employeeById(entry.item.employeeId)?.name ?? 'Karyawan'}
                    />
                  ) : (
                    <OvertimeFeedRow
                      key={entry.item.id}
                      request={entry.item}
                      name={employeeById(entry.item.employeeId)?.name ?? 'Karyawan'}
                    />
                  ),
                )}
              </div>
              <div className="border-t border-line px-5 py-3.5">
                <Button variant="secondary" size="sm" onClick={() => onNavigate('approvals')}>
                  Tinjau semua pengajuan
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Hero metric tile ─────────────────────────────────────────────

function HeroMetric({
  label,
  value,
  tone,
  divider,
}: {
  label: string
  value: number | string
  tone: 'ok' | 'warn' | 'copper'
  divider?: boolean
}) {
  const toneText: Record<string, string> = {
    ok: 'text-ok',
    warn: 'text-warn',
    copper: 'text-copper-strong',
  }
  return (
    <div
      className={cx(
        'flex flex-col justify-center px-4 py-5',
        divider && 'border-l border-line',
      )}
    >
      <span
        className={cx(
          'font-display text-[26px] font-semibold leading-none tnum',
          Number(value) === 0 ? 'text-ink-mute' : toneText[tone],
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[12px] font-medium text-ink-mute">{label}</span>
    </div>
  )
}

// ── Pending feed rows ────────────────────────────────────────────

function LeaveFeedRow({ request, name }: { request: LeaveRequest; name: string }) {
  const range =
    request.startDate === request.endDate
      ? formatDateShort(request.startDate)
      : `${formatDateShort(request.startDate)} – ${formatDateShort(request.endDate)}`
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <IconLeave className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-mute">
            <span className="font-mono tnum">{range}</span>
            {request.reason ? ` · ${request.reason}` : ''}
          </p>
        </div>
      </div>
      <RequestBadge status={request.status} />
    </div>
  )
}

function OvertimeFeedRow({ request, name }: { request: OvertimeRequest; name: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-copper-soft text-copper-strong">
          <IconOvertime className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-mute">
            <span className="font-mono tnum">
              {formatDateShort(request.date)} · {request.startTime}–{request.endTime}
            </span>
            {request.reason ? ` · ${request.reason}` : ''}
          </p>
        </div>
      </div>
      <RequestBadge status={request.status} />
    </div>
  )
}
