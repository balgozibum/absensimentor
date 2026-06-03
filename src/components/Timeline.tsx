// ───────────────────────────────────────────────────────────────
// Timeline — a day's activity rendered on the work-hours axis
// (HANDOVER §3.5). Activities are blocks; empty space reads as a gap;
// long gaps are flagged (amber/red + icon) so admins spot idle time.
// Shared by the employee Activity editor and the admin Timelines view.
// ───────────────────────────────────────────────────────────────

import type { ActivityBlock } from '../types'
import {
  buildTimeline,
  coveredMinutes,
  formatDuration,
  fromMinutes,
  gapMinutes,
  toMinutes,
  type TimelineSegment,
} from '../lib/time'
import { IconAlert, IconCoffee, IconTrash } from './icons'
import { cx } from './ui'

/** gentle cool hue per description so adjacent blocks read as distinct work sessions */
function blockHue(desc: string): number {
  let h = 0
  for (let i = 0; i < desc.length; i++) h = (h * 31 + desc.charCodeAt(i)) % 360
  // constrain to a cool teal→indigo band (180–250)
  return 180 + (h % 70)
}

function hourTicks(startMin: number, endMin: number): number[] {
  const ticks: number[] = []
  const first = Math.ceil(startMin / 60) * 60
  for (let m = first; m <= endMin; m += 60) ticks.push(m)
  return ticks
}

export interface TimelineProps {
  blocks: ActivityBlock[]
  workStart: string
  workEnd: string
  /** detailed: tall, labelled blocks + hour axis. compact: short row for week views */
  variant?: 'detailed' | 'compact'
  longGapMinutes?: number
  onBlockClick?: (block: ActivityBlock) => void
  onBlockDelete?: (block: ActivityBlock) => void
  className?: string
}

export function Timeline({
  blocks,
  workStart,
  workEnd,
  variant = 'detailed',
  longGapMinutes = 45,
  onBlockClick,
  onBlockDelete,
  className,
}: TimelineProps) {
  const startMin = toMinutes(workStart)
  const endMin = toMinutes(workEnd)
  const span = Math.max(1, endMin - startMin)
  const segments = buildTimeline(blocks, workStart, workEnd, longGapMinutes)
  const detailed = variant === 'detailed'

  const pct = (min: number) => ((min - startMin) / span) * 100
  const trackH = detailed ? 'h-[88px]' : 'h-12'

  return (
    <div className={className}>
      {/* hour axis (detailed only) */}
      {detailed && (
        <div className="relative mb-1 h-4">
          {hourTicks(startMin, endMin).map((m) => (
            <span
              key={m}
              className="absolute -translate-x-1/2 font-mono text-[10.5px] text-ink-mute tnum"
              style={{ left: `${pct(m)}%` }}
            >
              {fromMinutes(m)}
            </span>
          ))}
        </div>
      )}

      {/* track */}
      <div
        className={cx(
          'relative w-full overflow-hidden rounded-xl border border-line bg-surface-2',
          trackH,
        )}
      >
        {/* hour gridlines */}
        {hourTicks(startMin, endMin).map((m) => (
          <div
            key={m}
            className="absolute top-0 bottom-0 w-px bg-line"
            style={{ left: `${pct(m)}%` }}
          />
        ))}

        {segments.map((seg, i) => {
          const left = pct(seg.startMin)
          const width = ((seg.endMin - seg.startMin) / span) * 100
          if (seg.kind === 'gap') return <GapSeg key={i} seg={seg} left={left} width={width} detailed={detailed} />
          return (
            <ActivitySeg
              key={i}
              seg={seg}
              left={left}
              width={width}
              detailed={detailed}
              onClick={onBlockClick}
              onDelete={onBlockDelete}
            />
          )
        })}
      </div>

      {/* summary (detailed only) */}
      {detailed && <TimelineSummary segments={segments} />}
    </div>
  )
}

function ActivitySeg({
  seg,
  left,
  width,
  detailed,
  onClick,
  onDelete,
}: {
  seg: TimelineSegment
  left: number
  width: number
  detailed: boolean
  onClick?: (b: ActivityBlock) => void
  onDelete?: (b: ActivityBlock) => void
}) {
  const block = seg.block!
  const hue = blockHue(block.description)
  const wide = width > 13
  const interactive = Boolean(onClick)

  return (
    <div
      className="group absolute top-1 bottom-1 px-px"
      style={{ left: `${left}%`, width: `${width}%` }}
    >
      <button
        type="button"
        disabled={!interactive}
        onClick={() => onClick?.(block)}
        title={`${block.startTime}–${block.endTime} · ${block.description}`}
        className={cx(
          'relative h-full w-full overflow-hidden rounded-lg border text-left transition-all',
          interactive && 'hover:-translate-y-px hover:shadow-md',
          'disabled:cursor-default',
        )}
        style={{
          background: `linear-gradient(160deg, hsl(${hue} 42% 96%), hsl(${hue} 38% 92%))`,
          borderColor: `hsl(${hue} 34% 80%)`,
        }}
      >
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: `hsl(${hue} 45% 48%)` }}
        />
        {detailed && wide && (
          <span className="block h-full overflow-hidden px-2.5 py-1.5 pl-3.5">
            <span className="block font-mono text-[10px] tnum" style={{ color: `hsl(${hue} 40% 38%)` }}>
              {block.startTime}–{block.endTime}
            </span>
            <span className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-tight text-ink">
              {block.description}
            </span>
          </span>
        )}
      </button>
      {detailed && wide && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(block)
          }}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-surface/80 text-ink-mute opacity-0 backdrop-blur-sm transition-opacity hover:text-danger group-hover:opacity-100"
          aria-label="Hapus aktivitas"
        >
          <IconTrash className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function GapSeg({
  seg,
  left,
  width,
  detailed,
}: {
  seg: TimelineSegment
  left: number
  width: number
  detailed: boolean
}) {
  const minutes = seg.endMin - seg.startMin
  const wide = width > 9
  return (
    <div
      className="absolute top-1 bottom-1 px-px"
      style={{ left: `${left}%`, width: `${width}%` }}
      title={
        seg.long
          ? `Celah panjang ${formatDuration(minutes)} — kemungkinan tidak bekerja`
          : `Celah ${formatDuration(minutes)}`
      }
    >
      <div
        className={cx(
          'flex h-full w-full items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed',
          seg.long
            ? 'border-danger/40 bg-danger-soft/60 text-danger'
            : 'border-line-strong bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,var(--color-line)_5px,var(--color-line)_6px)] text-ink-mute',
        )}
      >
        {seg.long ? (
          <>
            <IconAlert className="h-3.5 w-3.5 shrink-0" />
            {detailed && wide && (
              <span className="text-[11px] font-semibold">{formatDuration(minutes)}</span>
            )}
          </>
        ) : (
          detailed && wide && <IconCoffee className="h-3.5 w-3.5 shrink-0 opacity-60" />
        )}
      </div>
    </div>
  )
}

function TimelineSummary({ segments }: { segments: TimelineSegment[] }) {
  const worked = coveredMinutes(segments)
  const gaps = gapMinutes(segments)
  const longGaps = segments.filter((s) => s.kind === 'gap' && s.long)
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-mute">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-brand" />
        Tercatat <strong className="font-semibold text-ink-soft">{formatDuration(worked)}</strong>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        Celah <strong className="font-semibold text-ink-soft">{formatDuration(gaps)}</strong>
      </span>
      {longGaps.length > 0 && (
        <span className="inline-flex items-center gap-1.5 text-danger">
          <IconAlert className="h-3.5 w-3.5" />
          {longGaps.length} celah panjang
        </span>
      )}
    </div>
  )
}

export function TimelineLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-mute">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-[hsl(210_42%_92%)] ring-1 ring-inset ring-[hsl(210_34%_80%)]" />
        Aktivitas
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border border-dashed border-line-strong bg-surface-2" />
        Celah singkat
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="grid h-3 w-3 place-items-center rounded border border-dashed border-danger/40 bg-danger-soft" />
        <span className="text-danger">Celah panjang</span>
      </span>
    </div>
  )
}
