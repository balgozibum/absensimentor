// ───────────────────────────────────────────────────────────────
// Pusat absensi karyawan — live clock, satu CTA yang berubah sesuai
// keadaan (Masuk → Pulang → selesai), selfie wajib, dan riwayat ~8 hari.
// ───────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import type { AttendanceRecord, AttendanceType } from '../../types'
import { useStore } from '../../lib/store'
import {
  durationBetween,
  formatDateLong,
  formatDateShort,
  formatDuration,
  todayISO,
  weekdayLong,
} from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  cx,
} from '../../components/ui'
import {
  IconCalendar,
  IconCamera,
  IconCheck,
  IconClock,
  IconClockIn,
  IconClockOut,
  IconHourglass,
} from '../../components/icons'
import { SelfieCapture } from '../../components/SelfieCapture'
import { AttendancePill } from '../shared'

// ── Live ticking clock (HH:MM:SS) ───────────────────────────────

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function clockParts(d: Date): { hms: string } {
  const p = (n: number) => String(n).padStart(2, '0')
  return { hms: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }
}

function hhmm(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}`
}

// ── Realtime status pill driving the hero anchor ─────────────────

type DayState = 'idle' | 'working' | 'done'

function statusBadge(state: DayState) {
  if (state === 'working') return <Badge tone="ok" dot>Sedang bekerja</Badge>
  if (state === 'done') return <Badge tone="brand" dot>Sudah pulang</Badge>
  return <Badge tone="warn" dot>Belum absen masuk</Badge>
}

// ── A single selfie thumbnail with graceful placeholder ──────────

function SelfieThumb({
  selfie,
  size = 44,
  alt,
}: {
  selfie?: string
  size?: number
  alt: string
}) {
  const has = typeof selfie === 'string' && selfie.startsWith('data:')
  if (has) {
    return (
      <img
        src={selfie}
        alt={alt}
        className="shrink-0 rounded-xl object-cover ring-1 ring-line"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-mute ring-1 ring-line"
      style={{ width: size, height: size }}
      aria-label="Tanpa foto"
    >
      <IconCamera className="h-4.5 w-4.5" />
    </span>
  )
}

// ── Grouped history day ─────────────────────────────────────────

interface HistoryDay {
  date: string
  in?: AttendanceRecord
  out?: AttendanceRecord
}

export function AttendanceView() {
  const { settings, currentEmployee, attendanceFor, clockIn, clockOut, data } = useStore()

  const now = useNow()
  const { hms } = clockParts(now)
  const today = todayISO()

  const todays = attendanceFor(currentEmployee.id, today)
  const hasIn = Boolean(todays.in)
  const hasOut = Boolean(todays.out)

  const state: DayState = hasOut ? 'done' : hasIn ? 'working' : 'idle'

  // running session counter once clocked in (and not yet out)
  const liveWorked = useMemo(() => {
    if (!todays.in || hasOut) return null
    return durationBetween(todays.in.time, hhmm(now))
  }, [todays.in, hasOut, now])

  const finalWorked = useMemo(() => {
    if (!todays.in || !todays.out) return null
    return durationBetween(todays.in.time, todays.out.time)
  }, [todays.in, todays.out])

  // ── selfie modal ──────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false)
  const action: AttendanceType | null = !hasIn ? 'in' : !hasOut ? 'out' : null

  function handleConfirm(dataUrl: string) {
    if (action === 'in') clockIn(currentEmployee.id, dataUrl)
    else if (action === 'out') clockOut(currentEmployee.id, dataUrl)
    setModalOpen(false)
  }

  // ── history: group this employee's attendance by date desc, ~8 ─
  const history = useMemo<HistoryDay[]>(() => {
    const mine = data.attendance.filter((a) => a.employeeId === currentEmployee.id)
    const byDate = new Map<string, HistoryDay>()
    for (const rec of mine) {
      let day = byDate.get(rec.date)
      if (!day) {
        day = { date: rec.date }
        byDate.set(rec.date, day)
      }
      if (rec.type === 'in') day.in = rec
      else day.out = rec
    }
    return Array.from(byDate.values())
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8)
  }, [data.attendance, currentEmployee.id])

  return (
    <div>
      <PageHeader
        eyebrow="Portal Karyawan"
        title="Absensi"
        subtitle={`Catat kehadiranmu hari ini, ${currentEmployee.name.split(' ')[0]}. Foto selfie wajib di setiap absensi.`}
      />

      <div className="stagger grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ── HERO: live clock + morphing CTA ───────────────────── */}
        <Card
          className="animate-rise relative overflow-hidden p-0"
          style={{ ['--i' as string]: 0 }}
        >
          <div className="relative flex flex-col gap-6 p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[12.5px] font-medium text-ink-mute">
                  <IconCalendar className="h-4 w-4" />
                  {formatDateLong(today)}
                </p>
                <div className="mt-2 font-mono text-[clamp(2.75rem,9vw,4.25rem)] font-semibold leading-none tracking-tight text-ink tnum">
                  {hms}
                </div>
              </div>
              <div className="pt-1">{statusBadge(state)}</div>
            </div>

            {/* running / final session line */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
              {state === 'idle' && (
                <span className="text-ink-mute">
                  Jam masuk perusahaan{' '}
                  <span className="font-mono font-medium text-ink-soft tnum">{settings.clockIn}</span>
                  {' · '}toleransi {settings.graceMinutes} menit
                </span>
              )}
              {state === 'working' && todays.in && (
                <>
                  <span className="inline-flex items-center gap-1.5 text-ink-soft">
                    <IconHourglass className="h-4 w-4 text-ok" />
                    <span className="font-mono font-semibold text-ink tnum">
                      {liveWorked != null ? formatDuration(liveWorked) : '0m'}
                    </span>{' '}
                    bekerja
                  </span>
                  <span className="text-ink-mute">
                    sejak <span className="font-mono text-ink-soft tnum">{todays.in.time}</span>
                  </span>
                </>
              )}
              {state === 'done' && finalWorked != null && (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <IconCheck className="h-4 w-4 text-brand" />
                  Total hari ini{' '}
                  <span className="font-mono font-semibold text-ink tnum">
                    {formatDuration(finalWorked)}
                  </span>
                </span>
              )}
            </div>

            {/* ── morphing CTA ──────────────────────────────────── */}
            {action === 'in' && (
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setModalOpen(true)}
              >
                <IconClockIn className="h-5 w-5" />
                Absen Masuk
              </Button>
            )}
            {action === 'out' && (
              <Button
                variant="copper"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() => setModalOpen(true)}
              >
                <IconClockOut className="h-5 w-5" />
                Absen Pulang
              </Button>
            )}
            {action === null && (
              <div className="flex items-center gap-3 rounded-xl border border-ok/20 bg-ok-soft px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-ok/15 text-ok">
                  <IconCheck className="h-5 w-5" />
                </span>
                <div className="leading-tight">
                  <p className="text-[14px] font-semibold text-ink">Kehadiran hari ini lengkap</p>
                  <p className="text-[12.5px] text-ink-mute">
                    Masuk {todays.in?.time} · Pulang {todays.out?.time}. Sampai jumpa besok!
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* ── TODAY DETAIL: selfie + late transparency ──────────── */}
        <Card className="animate-rise flex flex-col p-0" style={{ ['--i' as string]: 1 }}>
          <CardHeader
            title="Detail hari ini"
            subtitle={weekdayLong(today)}
            icon={<IconClock className="h-4.5 w-4.5" />}
          />
          <div className="flex-1 p-5">
            {todays.in ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3.5">
                  <SelfieThumb selfie={todays.in.selfie} size={56} alt="Selfie absen masuk" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">
                      Absen masuk
                    </p>
                    <p className="font-mono text-[22px] font-semibold leading-none text-ink tnum">
                      {todays.in.time}
                    </p>
                    <div className="mt-1.5">
                      <AttendancePill record={todays.in} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                  <KeyStat label="Jam masuk wajib" value={settings.clockIn} hint={`+${settings.graceMinutes}m toleransi`} />
                  <KeyStat
                    label="Absen pulang"
                    value={todays.out ? todays.out.time : '—'}
                    hint={todays.out ? 'Selesai' : 'Belum pulang'}
                    muted={!todays.out}
                  />
                </div>

                {todays.out && (
                  <div className="flex items-center gap-3.5 border-t border-line pt-4">
                    <SelfieThumb selfie={todays.out.selfie} size={44} alt="Selfie absen pulang" />
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">
                        Foto pulang
                      </p>
                      <p className="text-[13px] text-ink-soft">
                        Tercatat pukul{' '}
                        <span className="font-mono text-ink tnum">{todays.out.time}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<IconClockIn className="h-5 w-5" />}
                title="Belum ada absensi"
                description={`Tekan "Absen Masuk" dan ambil selfie untuk memulai hari. Jam masuk ${settings.clockIn}.`}
              />
            )}
          </div>
        </Card>
      </div>

      {/* ── HISTORY ───────────────────────────────────────────── */}
      <Card className="animate-rise mt-5 p-0" style={{ ['--i' as string]: 2 }}>
        <CardHeader
          title="Riwayat absensi"
          subtitle="8 hari kehadiran terakhir"
          icon={<IconCalendar className="h-4.5 w-4.5" />}
        />
        {history.length === 0 ? (
          <EmptyState
            icon={<IconCalendar className="h-5 w-5" />}
            title="Riwayat masih kosong"
            description="Absensi yang kamu catat akan muncul di sini."
          />
        ) : (
          <ul className="divide-y divide-line">
            {history.map((day) => {
              const isToday = day.date === today
              return (
                <li
                  key={day.date}
                  className={cx(
                    'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/50',
                    isToday && 'bg-brand-soft/30',
                  )}
                >
                  <SelfieThumb selfie={day.in?.selfie} size={42} alt={`Selfie ${day.date}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">
                        {formatDateShort(day.date)}
                      </span>
                      {isToday && <Badge tone="copper">Hari ini</Badge>}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-ink-mute">{weekdayLong(day.date)}</div>
                  </div>

                  <div className="hidden sm:block">
                    {day.in ? (
                      <AttendancePill record={day.in} />
                    ) : (
                      <Badge tone="ink">Tanpa data</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <TimeCell label="Masuk" time={day.in?.time} tone="in" />
                    <TimeCell label="Pulang" time={day.out?.time} tone="out" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* ── SELFIE MODAL (selfie WAJIB) ───────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={action === 'out' ? 'Absen Pulang' : 'Absen Masuk'}
        subtitle="Ambil selfie untuk memverifikasi kehadiran — wajib diisi."
        size="md"
      >
        <SelfieCapture
          onConfirm={handleConfirm}
          onCancel={() => setModalOpen(false)}
          confirmLabel={action === 'out' ? 'Catat absen pulang' : 'Catat absen masuk'}
        />
      </Modal>
    </div>
  )
}

export default AttendanceView

// ── Small presentational helpers (local) ─────────────────────────

function KeyStat({
  label,
  value,
  hint,
  muted,
}: {
  label: string
  value: string
  hint?: string
  muted?: boolean
}) {
  return (
    <div>
      <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-mute">{label}</p>
      <p
        className={cx(
          'mt-0.5 font-mono text-[18px] font-semibold leading-none tnum',
          muted ? 'text-ink-mute' : 'text-ink',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[11.5px] text-ink-mute">{hint}</p>}
    </div>
  )
}

function TimeCell({
  label,
  time,
  tone,
}: {
  label: string
  time?: string
  tone: 'in' | 'out'
}) {
  return (
    <div className="leading-tight">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-mute">{label}</p>
      <p
        className={cx(
          'mt-0.5 font-mono text-[15px] font-semibold tnum',
          time ? (tone === 'in' ? 'text-ink' : 'text-copper-strong') : 'text-ink-mute',
        )}
      >
        {time ?? '—'}
      </p>
    </div>
  )
}
