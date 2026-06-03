import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LeaveRequest, OvertimeRequest } from '../../types'
import { useStore } from '../../lib/store'
import {
  durationBetween,
  formatDateShort,
  formatDuration,
  parseISODate,
  todayISO,
} from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  RequestBadge,
  Segmented,
  Textarea,
  cx,
} from '../../components/ui'
import {
  IconCheck,
  IconClock,
  IconHourglass,
  IconLeave,
  IconOvertime,
  IconSparkle,
  IconX,
} from '../../components/icons'
import { LeaveTypeBadge, PersonLine } from '../shared'

// ── Tab type ─────────────────────────────────────────────────────

type Tab = 'cuti' | 'lembur'

// ── Relative aging helper (createdAt is ISO 'YYYY-MM-DDTHH:MM') ───

function agingLabel(createdAt: string): string {
  const created = parseISODate(createdAt.slice(0, 10))
  const today = parseISODate(todayISO())
  const days = Math.round((today.getTime() - created.getTime()) / 86_400_000)
  if (days <= 0) return 'diajukan hari ini'
  if (days === 1) return 'diajukan kemarin'
  return `diajukan ${days} hari lalu`
}

/** A request is "needs attention" when it has been pending for a while. */
function isAging(createdAt: string): boolean {
  const created = parseISODate(createdAt.slice(0, 10))
  const today = parseISODate(todayISO())
  const days = Math.round((today.getTime() - created.getTime()) / 86_400_000)
  return days >= 2
}

function decidedLabel(decidedAt?: string): string {
  if (!decidedAt) return ''
  return `Diputuskan ${formatDateShort(decidedAt.slice(0, 10))}`
}

// ── Reject modal payload ─────────────────────────────────────────

type RejectTarget =
  | { kind: 'leave'; id: string; name: string }
  | { kind: 'overtime'; id: string; name: string }

// ── Metadata chip ────────────────────────────────────────────────

function MetaChip({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-mute">
      {icon}
      {children}
    </span>
  )
}

// ── A pending card shell with the "needs attention" flag ─────────

function PendingShell({
  flagged,
  index,
  children,
}: {
  flagged: boolean
  index: number
  children: ReactNode
}) {
  return (
    <Card
      className={cx(
        'animate-rise overflow-hidden',
        flagged && 'ring-1 ring-warn-soft',
      )}
      style={{ ['--i' as string]: index }}
    >
      <div className="flex">
        <span
          className={cx(
            'w-1 shrink-0 self-stretch',
            flagged ? 'bg-warn' : 'bg-brand-soft',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 p-5">{children}</div>
      </div>
    </Card>
  )
}

// ── Reason block ─────────────────────────────────────────────────

function Reason({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-soft">
      <span className="text-ink-mute">Alasan — </span>
      {children}
    </p>
  )
}

// ── Decision action row ──────────────────────────────────────────

function ActionRow({
  onApprove,
  onReject,
}: {
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button variant="primary" size="sm" onClick={onApprove}>
        <IconCheck className="h-4 w-4" />
        Setujui
      </Button>
      <Button variant="danger" size="sm" onClick={onReject}>
        <IconX className="h-4 w-4" />
        Tolak
      </Button>
      <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-ink-mute">
        <IconSparkle className="h-3.5 w-3.5 text-copper" />
        Pra-persetujuan terpusat
      </span>
    </div>
  )
}

// ── History row (read-only) ──────────────────────────────────────

function HistoryRow({
  person,
  badge,
  meta,
  status,
  decidedAt,
  note,
}: {
  person: ReactNode
  badge: ReactNode
  meta: ReactNode
  status: 'approved' | 'rejected'
  decidedAt?: string
  note?: string
}) {
  return (
    <div className="px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">{person}</div>
        <RequestBadge status={status} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-[50px]">
        {badge}
        {meta}
        {decidedAt && <MetaChip icon={<IconClock className="h-3.5 w-3.5" />}>{decidedLabel(decidedAt)}</MetaChip>}
      </div>
      {note && (
        <p className="mt-2 pl-[50px] text-[12.5px] italic text-ink-mute">“{note}”</p>
      )}
    </div>
  )
}

// ── Section heading ──────────────────────────────────────────────

function SectionTitle({ icon, children, count }: { icon: ReactNode; children: ReactNode; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-ink-mute">{icon}</span>
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">{children}</h2>
      {typeof count === 'number' && count > 0 && (
        <Badge tone="ink">{count}</Badge>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Main view
// ───────────────────────────────────────────────────────────────

export function ApprovalsView() {
  const { data, employeeById, decideLeave, decideOvertime } = useStore()
  const [tab, setTab] = useState<Tab>('cuti')
  const [reject, setReject] = useState<RejectTarget | null>(null)
  const [note, setNote] = useState('')

  // Partition leave + overtime by status, newest-first for history.
  const leave = useMemo(() => {
    const pending = data.leave
      .filter((l) => l.status === 'pending')
      .sort((a, b) => Number(isAging(b.createdAt)) - Number(isAging(a.createdAt)) || a.createdAt.localeCompare(b.createdAt))
    const history = data.leave
      .filter((l) => l.status !== 'pending')
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
    return { pending, history }
  }, [data.leave])

  const overtime = useMemo(() => {
    const pending = data.overtime
      .filter((o) => o.status === 'pending')
      .sort((a, b) => Number(isAging(b.createdAt)) - Number(isAging(a.createdAt)) || a.createdAt.localeCompare(b.createdAt))
    const history = data.overtime
      .filter((o) => o.status !== 'pending')
      .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
    return { pending, history }
  }, [data.overtime])

  const counts = { cuti: leave.pending.length, lembur: overtime.pending.length }

  function openReject(target: RejectTarget) {
    setReject(target)
    setNote('')
  }

  function confirmReject() {
    if (!reject) return
    const trimmed = note.trim()
    if (reject.kind === 'leave') decideLeave(reject.id, 'rejected', trimmed || undefined)
    else decideOvertime(reject.id, 'rejected', trimmed || undefined)
    setReject(null)
    setNote('')
  }

  const segOptions: Array<{ value: Tab; label: ReactNode }> = [
    {
      value: 'cuti',
      label: (
        <span className="inline-flex items-center gap-2">
          Cuti
          {counts.cuti > 0 && <Badge tone="warn">{counts.cuti}</Badge>}
        </span>
      ),
    },
    {
      value: 'lembur',
      label: (
        <span className="inline-flex items-center gap-2">
          Lembur
          {counts.lembur > 0 && <Badge tone="warn">{counts.lembur}</Badge>}
        </span>
      ),
    },
  ]

  const totalPending = counts.cuti + counts.lembur

  return (
    <div>
      <PageHeader
        eyebrow="Pusat Persetujuan"
        title="Persetujuan"
        subtitle="Semua permohonan cuti dan lembur terpusat di sini. Setiap keputusan tercatat sebagai jejak audit untuk pra-persetujuan."
        actions={
          <Badge tone={totalPending > 0 ? 'warn' : 'ok'} dot>
            {totalPending > 0 ? `${totalPending} menunggu` : 'Semua beres'}
          </Badge>
        }
      />

      <div className="mb-6">
        <Segmented value={tab} onChange={setTab} options={segOptions} />
      </div>

      {tab === 'cuti' ? (
        <div className="space-y-8">
          <section>
            <SectionTitle icon={<IconHourglass className="h-4 w-4" />} count={leave.pending.length}>
              Menunggu persetujuan
            </SectionTitle>
            {leave.pending.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<IconLeave className="h-6 w-6" />}
                  title="Tidak ada yang menunggu persetujuan"
                  description="Semua permohonan cuti sudah diputuskan. Permohonan baru akan muncul di sini."
                />
              </Card>
            ) : (
              <div className="stagger space-y-3">
                {leave.pending.map((l, i) => (
                  <LeavePendingCard
                    key={l.id}
                    request={l}
                    index={i}
                    name={employeeById(l.employeeId)?.name ?? 'Karyawan'}
                    person={<LeavePerson request={l} employeeById={employeeById} />}
                    onApprove={() => decideLeave(l.id, 'approved')}
                    onReject={(name) => openReject({ kind: 'leave', id: l.id, name })}
                  />
                ))}
              </div>
            )}
          </section>

          {leave.history.length > 0 && (
            <section>
              <SectionTitle icon={<IconClock className="h-4 w-4" />}>Riwayat</SectionTitle>
              <Card className="divide-y divide-line overflow-hidden">
                {leave.history.map((l) => {
                  const emp = employeeById(l.employeeId)
                  return (
                    <HistoryRow
                      key={l.id}
                      person={emp ? <PersonLine employee={emp} size={36} /> : <span className="text-ink-mute">Karyawan</span>}
                      badge={<LeaveTypeBadge type={l.leaveType} />}
                      meta={
                        <MetaChip icon={<IconLeave className="h-3.5 w-3.5" />}>
                          {dateRange(l.startDate, l.endDate)}
                        </MetaChip>
                      }
                      status={l.status as 'approved' | 'rejected'}
                      decidedAt={l.decidedAt}
                      note={l.decisionNote}
                    />
                  )
                })}
              </Card>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <SectionTitle icon={<IconHourglass className="h-4 w-4" />} count={overtime.pending.length}>
              Menunggu persetujuan
            </SectionTitle>
            {overtime.pending.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<IconOvertime className="h-6 w-6" />}
                  title="Tidak ada yang menunggu persetujuan"
                  description="Semua permohonan lembur sudah diputuskan. Lembur wajib diajukan sebelum dikerjakan."
                />
              </Card>
            ) : (
              <div className="stagger space-y-3">
                {overtime.pending.map((o, i) => (
                  <OvertimePendingCard
                    key={o.id}
                    request={o}
                    index={i}
                    name={employeeById(o.employeeId)?.name ?? 'Karyawan'}
                    person={<OvertimePerson request={o} employeeById={employeeById} />}
                    onApprove={() => decideOvertime(o.id, 'approved')}
                    onReject={(name) => openReject({ kind: 'overtime', id: o.id, name })}
                  />
                ))}
              </div>
            )}
          </section>

          {overtime.history.length > 0 && (
            <section>
              <SectionTitle icon={<IconClock className="h-4 w-4" />}>Riwayat</SectionTitle>
              <Card className="divide-y divide-line overflow-hidden">
                {overtime.history.map((o) => {
                  const emp = employeeById(o.employeeId)
                  return (
                    <HistoryRow
                      key={o.id}
                      person={emp ? <PersonLine employee={emp} size={36} /> : <span className="text-ink-mute">Karyawan</span>}
                      badge={<Badge tone="copper">{formatDateShort(o.date)}</Badge>}
                      meta={
                        <MetaChip icon={<IconClock className="h-3.5 w-3.5" />}>
                          <span className="font-mono tnum">
                            {o.startTime}–{o.endTime}
                          </span>
                          <span className="text-ink-mute"> · {formatDuration(durationBetween(o.startTime, o.endTime))}</span>
                        </MetaChip>
                      }
                      status={o.status as 'approved' | 'rejected'}
                      decidedAt={o.decidedAt}
                      note={o.decisionNote}
                    />
                  )
                })}
              </Card>
            </section>
          )}
        </div>
      )}

      {/* Reject modal — captures an optional rejection note */}
      <Modal
        open={reject !== null}
        onClose={() => setReject(null)}
        title="Tolak permohonan"
        subtitle={reject ? `${reject.name} · ${reject.kind === 'leave' ? 'Cuti' : 'Lembur'}` : undefined}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReject(null)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={confirmReject}>
              <IconX className="h-4 w-4" />
              Tolak permohonan
            </Button>
          </div>
        }
      >
        <Field label="Alasan penolakan" hint="Opsional — akan tercatat dalam riwayat keputusan.">
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="mis. Beban kerja tim sedang tinggi pada periode ini…"
            autoFocus
          />
        </Field>
      </Modal>
    </div>
  )
}

// ── Date range formatter ─────────────────────────────────────────

function dateRange(start: string, end: string): string {
  if (start === end) return formatDateShort(start)
  return `${formatDateShort(start)} → ${formatDateShort(end)}`
}

function leaveDays(start: string, end: string): number {
  const a = parseISODate(start).getTime()
  const b = parseISODate(end).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

// ── Pending people lines (need store accessor for active flag) ───

function LeavePerson({
  request,
  employeeById,
}: {
  request: LeaveRequest
  employeeById: (id: string) => ReturnType<ReturnType<typeof useStore>['employeeById']>
}) {
  const emp = employeeById(request.employeeId)
  if (!emp) return <span className="text-[14px] font-semibold text-ink">Karyawan</span>
  return (
    <PersonLine
      employee={emp}
      right={<Badge tone={isAging(request.createdAt) ? 'warn' : 'ink'} dot={isAging(request.createdAt)}>{agingLabel(request.createdAt)}</Badge>}
    />
  )
}

function OvertimePerson({
  request,
  employeeById,
}: {
  request: OvertimeRequest
  employeeById: (id: string) => ReturnType<ReturnType<typeof useStore>['employeeById']>
}) {
  const emp = employeeById(request.employeeId)
  if (!emp) return <span className="text-[14px] font-semibold text-ink">Karyawan</span>
  return (
    <PersonLine
      employee={emp}
      right={<Badge tone={isAging(request.createdAt) ? 'warn' : 'ink'} dot={isAging(request.createdAt)}>{agingLabel(request.createdAt)}</Badge>}
    />
  )
}

// ── Pending leave card ───────────────────────────────────────────

function LeavePendingCard({
  request,
  index,
  name,
  person,
  onApprove,
  onReject,
}: {
  request: LeaveRequest
  index: number
  name: string
  person: ReactNode
  onApprove: () => void
  onReject: (name: string) => void
}) {
  const days = leaveDays(request.startDate, request.endDate)
  return (
    <PendingShell flagged={isAging(request.createdAt)} index={index}>
      {person}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <LeaveTypeBadge type={request.leaveType} />
        <MetaChip icon={<IconLeave className="h-3.5 w-3.5" />}>
          {dateRange(request.startDate, request.endDate)}
        </MetaChip>
        <MetaChip icon={<IconHourglass className="h-3.5 w-3.5" />}>
          <span className="font-mono tnum">{days}</span> hari
        </MetaChip>
      </div>
      <Reason>{request.reason}</Reason>
      <Divider className="mt-4" />
      <ActionRow onApprove={onApprove} onReject={() => onReject(name)} />
    </PendingShell>
  )
}

// ── Pending overtime card ────────────────────────────────────────

function OvertimePendingCard({
  request,
  index,
  name,
  person,
  onApprove,
  onReject,
}: {
  request: OvertimeRequest
  index: number
  name: string
  person: ReactNode
  onApprove: () => void
  onReject: (name: string) => void
}) {
  const mins = durationBetween(request.startTime, request.endTime)
  return (
    <PendingShell flagged={isAging(request.createdAt)} index={index}>
      {person}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge tone="copper" dot>
          {formatDateShort(request.date)}
        </Badge>
        <MetaChip icon={<IconClock className="h-3.5 w-3.5" />}>
          <span className="font-mono tnum text-ink">
            {request.startTime}–{request.endTime}
          </span>
        </MetaChip>
        <MetaChip icon={<IconHourglass className="h-3.5 w-3.5" />}>
          <span className="font-mono tnum">{formatDuration(mins)}</span>
        </MetaChip>
      </div>
      <Reason>{request.reason}</Reason>
      <Divider className="mt-4" />
      <ActionRow onApprove={onApprove} onReject={() => onReject(name)} />
    </PendingShell>
  )
}
