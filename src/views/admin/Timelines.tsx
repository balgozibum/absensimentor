// ───────────────────────────────────────────────────────────────
// Admin · Timeline Aktivitas — inspect any active employee's day,
// hour-by-hour, or scan a whole week at a glance. Long idle gaps are
// flagged so an admin spots problems across the team quickly.
// ───────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type { ActivityBlock, Employee } from '../../types'
import { useStore } from '../../lib/store'
import {
  addDays,
  buildTimeline,
  coveredMinutes,
  formatDateLong,
  formatDayMonth,
  formatDuration,
  gapMinutes,
  isWeekend,
  todayISO,
  weekDates,
  weekdayLong,
  weekdayShort,
} from '../../lib/time'
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Segmented,
  Select,
  cx,
} from '../../components/ui'
import {
  IconActivity,
  IconAlert,
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconUsers,
} from '../../components/icons'
import { Timeline, TimelineLegend } from '../../components/Timeline'

const LONG_GAP = 60

type Mode = 'hari' | 'minggu'

/** activity blocks for an employee on a single ISO date, time-ordered */
function blocksFor(all: ActivityBlock[], employeeId: string, date: string): ActivityBlock[] {
  return all
    .filter((b) => b.employeeId === employeeId && b.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function TimelinesView() {
  const { data, settings, employeeById } = useStore()

  const activeStaff = useMemo(
    () => data.employees.filter((e) => e.active && e.role === 'karyawan'),
    [data.employees],
  )

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(() => activeStaff[0]?.id ?? '')
  const [mode, setMode] = useState<Mode>('hari')
  const [selectedDate, setSelectedDate] = useState(() => todayISO())

  const employee = employeeById(selectedEmployeeId) ?? activeStaff[0]

  if (!employee) {
    return (
      <div>
        <PageHeader
          eyebrow="Pemantauan"
          title="Timeline Aktivitas"
          subtitle="Telusuri aktivitas harian setiap karyawan, jam demi jam."
        />
        <Card>
          <EmptyState
            icon={<IconUsers className="h-6 w-6" />}
            title="Belum ada karyawan aktif"
            description="Aktifkan minimal satu karyawan untuk melihat timeline aktivitasnya."
          />
        </Card>
      </div>
    )
  }

  // few staff → segmented picker; many → a compact select
  const usePills = activeStaff.length <= 4

  return (
    <div>
      <PageHeader
        eyebrow="Pemantauan"
        title="Timeline Aktivitas"
        subtitle="Telusuri aktivitas harian setiap karyawan, jam demi jam — atau pindai satu minggu penuh sekaligus."
        actions={
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'hari', label: 'Hari' },
              { value: 'minggu', label: 'Minggu' },
            ]}
          />
        }
      />

      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          {/* employee picker */}
          <div className="flex min-w-0 items-center gap-3">
            <Avatar employee={employee} size={44} ring />
            <div className="min-w-0">
              <div className="font-display text-[16px] font-semibold leading-tight text-ink">
                {employee.name}
              </div>
              <div className="truncate text-[12.5px] text-ink-mute">{employee.title}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {usePills ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {activeStaff.map((e) => (
                  <StaffPill
                    key={e.id}
                    employee={e}
                    active={e.id === employee.id}
                    onClick={() => setSelectedEmployeeId(e.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="w-full sm:w-64">
                <Select
                  value={employee.id}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  aria-label="Pilih karyawan"
                >
                  {activeStaff.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <DateNavigator
              mode={mode}
              date={selectedDate}
              onChange={setSelectedDate}
            />
          </div>
        </div>
      </Card>

      {mode === 'hari' ? (
        <DayView employee={employee} date={selectedDate} blocks={data.activities} settings={settings} />
      ) : (
        <WeekView employee={employee} date={selectedDate} blocks={data.activities} settings={settings} />
      )}
    </div>
  )
}

// ── Staff pill ───────────────────────────────────────────────────

function StaffPill({
  employee,
  active,
  onClick,
}: {
  employee: Employee
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-[13px] font-medium transition-all',
        active
          ? 'border-brand/30 bg-brand-soft text-brand shadow-sm'
          : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-2',
      )}
    >
      <Avatar employee={employee} size={24} />
      <span className="max-w-[8rem] truncate">{employee.name.split(' ')[0]}</span>
    </button>
  )
}

// ── Date navigator ───────────────────────────────────────────────

function DateNavigator({
  mode,
  date,
  onChange,
}: {
  mode: Mode
  date: string
  onChange: (d: string) => void
}) {
  const step = mode === 'minggu' ? 7 : 1
  const week = weekDates(date)
  const label =
    mode === 'minggu'
      ? `${formatDayMonth(week[0])} – ${formatDayMonth(week[6])}`
      : formatDateLong(date)
  const isToday = date === todayISO()

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -step))}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface hover:text-ink"
        aria-label={mode === 'minggu' ? 'Minggu sebelumnya' : 'Hari sebelumnya'}
      >
        <IconChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex min-w-[10rem] items-center justify-center gap-2 px-2 text-center">
        <IconCalendar className="h-3.5 w-3.5 shrink-0 text-ink-mute" />
        <span className="text-[13px] font-medium text-ink">{label}</span>
      </div>

      <button
        type="button"
        onClick={() => onChange(addDays(date, step))}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface hover:text-ink"
        aria-label={mode === 'minggu' ? 'Minggu berikutnya' : 'Hari berikutnya'}
      >
        <IconChevronRight className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onChange(todayISO())}
        disabled={isToday}
        className={cx(
          'ml-0.5 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors',
          isToday
            ? 'cursor-default text-ink-mute/60'
            : 'text-copper hover:bg-copper-soft',
        )}
      >
        Hari ini
      </button>
    </div>
  )
}

// ── Day view ─────────────────────────────────────────────────────

function DayView({
  employee,
  date,
  blocks,
  settings,
}: {
  employee: Employee
  date: string
  blocks: ActivityBlock[]
  settings: { clockIn: string; clockOut: string }
}) {
  const dayBlocks = useMemo(() => blocksFor(blocks, employee.id, date), [blocks, employee.id, date])
  const segments = useMemo(
    () => buildTimeline(dayBlocks, settings.clockIn, settings.clockOut, LONG_GAP),
    [dayBlocks, settings.clockIn, settings.clockOut],
  )

  const worked = coveredMinutes(segments)
  const gaps = gapMinutes(segments)
  const longGaps = segments.filter((s) => s.kind === 'gap' && s.long).length
  const weekend = isWeekend(date)

  return (
    <div className="stagger space-y-6">
      {/* metrics strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" style={{ ['--i' as string]: 0 }}>
        <MetricTile label="Aktivitas" value={String(dayBlocks.length)} sub="blok tercatat" tone="brand" />
        <MetricTile label="Tercatat" value={formatDuration(worked)} sub="dalam jam kerja" tone="ok" />
        <MetricTile label="Celah" value={formatDuration(gaps)} sub="ruang kosong" tone="warn" />
        <MetricTile
          label="Celah panjang"
          value={String(longGaps)}
          sub={`≥ ${formatDuration(LONG_GAP)}`}
          tone={longGaps > 0 ? 'danger' : 'brand'}
        />
      </div>

      {/* timeline */}
      <Card className="animate-rise" style={{ ['--i' as string]: 1 }}>
        <CardHeader
          title={formatDateLong(date)}
          subtitle={`Jam kerja ${settings.clockIn}–${settings.clockOut}`}
          icon={<IconActivity className="h-4.5 w-4.5" />}
          action={
            weekend ? (
              <Badge tone="ink">Akhir pekan</Badge>
            ) : longGaps > 0 ? (
              <Badge tone="danger" dot>
                {longGaps} celah panjang
              </Badge>
            ) : dayBlocks.length > 0 ? (
              <Badge tone="ok" dot>
                Padat
              </Badge>
            ) : null
          }
        />
        <div className="p-5">
          {dayBlocks.length === 0 ? (
            <EmptyState
              icon={<IconClock className="h-6 w-6" />}
              title="Tidak ada aktivitas"
              description={
                weekend
                  ? `${employee.name.split(' ')[0]} tidak mencatat aktivitas pada akhir pekan ini.`
                  : `${employee.name.split(' ')[0]} belum mencatat aktivitas apa pun pada tanggal ini.`
              }
            />
          ) : (
            <>
              <Timeline
                blocks={dayBlocks}
                workStart={settings.clockIn}
                workEnd={settings.clockOut}
                variant="detailed"
                longGapMinutes={LONG_GAP}
              />
              <div className="mt-5 border-t border-line pt-4">
                <TimelineLegend />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* block list */}
      {dayBlocks.length > 0 && (
        <Card className="animate-rise" style={{ ['--i' as string]: 2 }}>
          <CardHeader
            title="Rincian blok"
            subtitle={`${dayBlocks.length} aktivitas urut waktu`}
            icon={<IconClock className="h-4.5 w-4.5" />}
          />
          <ul className="divide-y divide-line">
            {dayBlocks.map((b) => (
              <BlockRow key={b.id} block={b} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function BlockRow({ block }: { block: ActivityBlock }) {
  const minutes = Math.max(
    0,
    Number(block.endTime.slice(0, 2)) * 60 +
      Number(block.endTime.slice(3)) -
      (Number(block.startTime.slice(0, 2)) * 60 + Number(block.startTime.slice(3))),
  )
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <div className="w-28 shrink-0 font-mono text-[13px] text-ink tnum">
        {block.startTime}<span className="text-ink-mute">–</span>{block.endTime}
      </div>
      <div className="min-w-0 flex-1 text-[13.5px] text-ink-soft">{block.description}</div>
      <Badge tone="ink">{formatDuration(minutes)}</Badge>
    </li>
  )
}

// ── Week view ────────────────────────────────────────────────────

function WeekView({
  employee,
  date,
  blocks,
  settings,
}: {
  employee: Employee
  date: string
  blocks: ActivityBlock[]
  settings: { clockIn: string; clockOut: string }
}) {
  const week = useMemo(() => weekDates(date), [date])

  const rows = useMemo(
    () =>
      week.map((d) => {
        const dayBlocks = blocksFor(blocks, employee.id, d)
        const segments = buildTimeline(dayBlocks, settings.clockIn, settings.clockOut, LONG_GAP)
        const longGaps = segments.filter((s) => s.kind === 'gap' && s.long).length
        return {
          date: d,
          blocks: dayBlocks,
          worked: coveredMinutes(segments),
          longGaps,
        }
      }),
    [week, blocks, employee.id, settings.clockIn, settings.clockOut],
  )

  const totalWorked = rows.reduce((s, r) => s + r.worked, 0)
  const daysWithActivity = rows.filter((r) => r.blocks.length > 0).length
  const flagged = rows.filter((r) => r.longGaps > 0).length
  const today = todayISO()

  return (
    <div className="stagger space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" style={{ ['--i' as string]: 0 }}>
        <MetricTile label="Total tercatat" value={formatDuration(totalWorked)} sub="sepanjang minggu" tone="brand" />
        <MetricTile label="Hari aktif" value={`${daysWithActivity} / 7`} sub="ada aktivitas" tone="ok" />
        <MetricTile
          label="Hari ditandai"
          value={String(flagged)}
          sub="ada celah panjang"
          tone={flagged > 0 ? 'danger' : 'brand'}
        />
      </div>

      <Card className="animate-rise overflow-hidden" style={{ ['--i' as string]: 1 }}>
        <CardHeader
          title="Pekan ini"
          subtitle={`${formatDayMonth(week[0])} – ${formatDayMonth(week[6])} · ${employee.name}`}
          icon={<IconCalendar className="h-4.5 w-4.5" />}
          action={
            flagged > 0 ? (
              <Badge tone="danger" dot>
                {flagged} hari ditandai
              </Badge>
            ) : (
              <Badge tone="ok" dot>
                Bersih
              </Badge>
            )
          }
        />
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <WeekRow
              key={row.date}
              row={row}
              isToday={row.date === today}
              settings={settings}
            />
          ))}
        </ul>
      </Card>
    </div>
  )
}

function WeekRow({
  row,
  isToday,
  settings,
}: {
  row: { date: string; blocks: ActivityBlock[]; worked: number; longGaps: number }
  isToday: boolean
  settings: { clockIn: string; clockOut: string }
}) {
  const weekend = isWeekend(row.date)
  const empty = row.blocks.length === 0
  const flagged = row.longGaps > 0

  return (
    <li
      className={cx(
        'flex items-center gap-4 px-5 py-4 transition-colors',
        flagged && 'bg-danger-soft/30',
        isToday && !flagged && 'bg-brand-soft/30',
      )}
    >
      {/* day label */}
      <div className="w-24 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cx(
              'text-[13px] font-semibold',
              weekend ? 'text-ink-mute' : 'text-ink',
            )}
          >
            {weekdayShort(row.date)}
          </span>
          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-copper" title="Hari ini" />}
        </div>
        <div className="mt-0.5 font-mono text-[12px] text-ink-mute tnum" title={weekdayLong(row.date)}>
          {formatDayMonth(row.date)}
        </div>
      </div>

      {/* compact timeline */}
      <div className="min-w-0 flex-1">
        {empty ? (
          <div
            className={cx(
              'flex h-12 items-center rounded-xl border border-dashed border-line px-3 text-[12.5px]',
              weekend ? 'bg-surface-2/50 text-ink-mute/70' : 'text-ink-mute',
            )}
          >
            {weekend ? 'Akhir pekan — tidak ada aktivitas' : 'Tidak ada aktivitas'}
          </div>
        ) : (
          <Timeline
            blocks={row.blocks}
            workStart={settings.clockIn}
            workEnd={settings.clockOut}
            variant="compact"
            longGapMinutes={LONG_GAP}
          />
        )}
      </div>

      {/* right meta */}
      <div className="flex w-32 shrink-0 items-center justify-end gap-2">
        {flagged && (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-danger">
            <IconAlert className="h-3.5 w-3.5" />
            {row.longGaps}
          </span>
        )}
        {!empty && (
          <span className="font-mono text-[12.5px] text-ink-soft tnum">{formatDuration(row.worked)}</span>
        )}
      </div>
    </li>
  )
}

// ── Metric tile ──────────────────────────────────────────────────

const METRIC_DOT: Record<'brand' | 'ok' | 'warn' | 'danger', string> = {
  brand: 'bg-brand',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
}

function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone: 'brand' | 'ok' | 'warn' | 'danger'
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={cx('h-2 w-2 rounded-full', METRIC_DOT[tone])} />
        <span className="text-[12px] font-medium text-ink-mute">{label}</span>
      </div>
      <div className="mt-2 font-display text-[26px] font-semibold leading-none tracking-tight text-ink tnum">
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-mute">{sub}</div>
    </Card>
  )
}
