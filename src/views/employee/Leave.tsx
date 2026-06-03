// ───────────────────────────────────────────────────────────────
// Employee · Pengajuan Cuti
// Lets the acting employee file a leave request and review their own
// history. Single source of truth is the store; no local persistence.
// ───────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type { LeaveRequest, LeaveType } from '../../types'
import { useStore } from '../../lib/store'
import { formatDateShort, todayISO } from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  RequestBadge,
  Select,
  Textarea,
} from '../../components/ui'
import { IconAlert, IconCalendar, IconLeave, IconPlus } from '../../components/icons'
import { LEAVE_META, LeaveTypeBadge } from '../shared'

const LEAVE_TYPES: LeaveType[] = ['tahunan', 'izin', 'sakit']

// Inclusive day count between two ISO dates.
function dayCount(start: string, end: string): number {
  const ms = Date.parse(end) - Date.parse(start)
  return Math.max(0, Math.round(ms / 86_400_000)) + 1
}

export function LeaveView() {
  const { data, currentEmployee, submitLeave } = useStore()

  const [open, setOpen] = useState(false)
  const [leaveType, setLeaveType] = useState<LeaveType>('tahunan')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  // This employee's requests, newest first.
  const requests = useMemo(
    () =>
      data.leave
        .filter((r) => r.employeeId === currentEmployee.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.leave, currentEmployee.id],
  )

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  )

  const datesValid = startDate !== '' && endDate !== '' && endDate >= startDate
  const reasonValid = reason.trim().length > 0
  const valid = datesValid && reasonValid

  function reset() {
    setLeaveType('tahunan')
    setStartDate('')
    setEndDate('')
    setReason('')
  }

  function handleSubmit() {
    if (!valid) return
    submitLeave({
      employeeId: currentEmployee.id,
      leaveType,
      startDate,
      endDate,
      reason: reason.trim(),
    })
    setOpen(false)
    reset()
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  return (
    <>
      <PageHeaderBlock
        pendingCount={pendingCount}
        onAjukan={() => setOpen(true)}
      />

      {requests.length === 0 ? (
        <Card className="p-2">
          <EmptyState
            icon={<IconLeave className="h-6 w-6" />}
            title="Belum ada pengajuan cuti"
            description="Saat kamu butuh libur, ajukan cuti di sini. Riwayat dan status persetujuannya akan tampil pada halaman ini."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Ajukan Cuti
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="stagger space-y-3">
          {requests.map((req, i) => (
            <LeaveCard key={req.id} req={req} index={i} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={handleClose}
        title="Ajukan Cuti"
        subtitle="Isi detail di bawah. Pengajuan dikirim ke admin untuk persetujuan."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!valid}>
              <IconPlus className="h-4 w-4" />
              Kirim Pengajuan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Jenis cuti" htmlFor="leave-type" required>
            <Select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_META[t].label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tanggal mulai" htmlFor="leave-start" required>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                min={todayISO()}
                onChange={(e) => {
                  const v = e.target.value
                  setStartDate(v)
                  if (endDate !== '' && endDate < v) setEndDate(v)
                }}
              />
            </Field>
            <Field
              label="Tanggal selesai"
              htmlFor="leave-end"
              required
              hint={
                endDate !== '' && startDate !== '' && endDate < startDate
                  ? 'Tanggal selesai harus setelah tanggal mulai.'
                  : undefined
              }
            >
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                min={startDate || todayISO()}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </div>

          {datesValid && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-soft">
              <IconCalendar className="h-4 w-4 text-brand" />
              <span>
                Total{' '}
                <span className="font-mono font-semibold tnum text-ink">
                  {dayCount(startDate, endDate)}
                </span>{' '}
                hari cuti.
              </span>
            </div>
          )}

          <Field label="Alasan" htmlFor="leave-reason" required>
            <Textarea
              id="leave-reason"
              value={reason}
              placeholder="Jelaskan keperluan cuti kamu…"
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </>
  )
}

// ── Page header ──────────────────────────────────────────────────

function PageHeaderBlock({
  pendingCount,
  onAjukan,
}: {
  pendingCount: number
  onAjukan: () => void
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-copper">
          Pengajuan
        </p>
        <h1 className="font-display text-[30px] leading-[1.05] font-semibold tracking-tight text-ink sm:text-[34px]">
          Cuti
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-soft">
          Ajukan cuti tahunan, izin, atau sakit — lalu pantau status persetujuannya.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <Badge tone="warn" dot>
            {pendingCount} menunggu
          </Badge>
        )}
        <Button variant="primary" onClick={onAjukan}>
          <IconPlus className="h-4 w-4" />
          Ajukan Cuti
        </Button>
      </div>
    </header>
  )
}

// ── Request card ─────────────────────────────────────────────────

function LeaveCard({ req, index }: { req: LeaveRequest; index: number }) {
  const single = req.startDate === req.endDate
  const days = dayCount(req.startDate, req.endDate)

  return (
    <Card
      className="animate-rise p-4 sm:p-5"
      style={{ ['--i' as string]: index } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LeaveTypeBadge type={req.leaveType} />
            <span className="font-mono text-[13px] font-medium tnum text-ink">
              {single
                ? formatDateShort(req.startDate)
                : `${formatDateShort(req.startDate)} – ${formatDateShort(req.endDate)}`}
            </span>
            <span className="text-[12.5px] text-ink-mute">
              · {days} hari
            </span>
          </div>
          <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-soft">
            {req.reason}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <RequestBadge status={req.status} />
          <span className="text-[11.5px] text-ink-mute">
            Diajukan {formatDateShort(req.createdAt.slice(0, 10))}
          </span>
        </div>
      </div>

      {req.status === 'rejected' && req.decisionNote && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div className="text-[13px] leading-relaxed text-danger">
            <span className="font-semibold">Catatan penolakan: </span>
            {req.decisionNote}
          </div>
        </div>
      )}
    </Card>
  )
}
