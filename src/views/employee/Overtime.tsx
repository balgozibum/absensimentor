// ───────────────────────────────────────────────────────────────
// Pengajuan lembur — employee self-service.
// Aturan inti: lembur HARUS diajukan & disetujui SEBELUM dikerjakan.
// Hanya lembur yang disetujui yang sah (HANDOVER §3.4).
// ───────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { OvertimeRequest } from '../../types'
import { useStore } from '../../lib/store'
import { durationBetween, formatDateShort, formatDuration, todayISO } from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  cx,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  RequestBadge,
  Textarea,
} from '../../components/ui'
import {
  IconAlert,
  IconCheck,
  IconHourglass,
  IconOvertime,
  IconPlus,
} from '../../components/icons'

// ── Draft form state ─────────────────────────────────────────────

interface Draft {
  date: string
  startTime: string
  endTime: string
  reason: string
}

const emptyDraft = (): Draft => ({
  date: todayISO(),
  startTime: '18:00',
  endTime: '20:00',
  reason: '',
})

// ── Live duration preview inside the form ────────────────────────

function DurationPreview({ valid, minutes }: { valid: boolean; minutes: number }) {
  return (
    <div
      className={cx(
        'flex items-center justify-between rounded-xl border px-3.5 py-3 transition-colors',
        valid ? 'border-copper-soft bg-copper-soft/50' : 'border-line bg-surface-2',
      )}
    >
      <span className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
        <IconHourglass className={cx('h-4 w-4', valid ? 'text-copper' : 'text-ink-mute')} />
        Estimasi durasi
      </span>
      <span
        className={cx(
          'font-mono text-[15px] font-semibold tnum',
          valid ? 'text-copper-strong' : 'text-ink-mute',
        )}
      >
        {valid ? formatDuration(minutes) : '—'}
      </span>
    </div>
  )
}

// ── A single request row in the history list ─────────────────────

function RequestRow({ req }: { req: OvertimeRequest }) {
  const minutes = durationBetween(req.startTime, req.endTime)
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[16px] font-semibold text-ink">
              {formatDateShort(req.date)}
            </span>
            <RequestBadge status={req.status} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
            <span className="font-mono tnum text-ink">
              {req.startTime}–{req.endTime}
            </span>
            <span className="text-ink-mute">·</span>
            <span className="inline-flex items-center gap-1.5">
              <IconHourglass className="h-3.5 w-3.5 text-copper" />
              <span className="font-mono tnum">{formatDuration(minutes)}</span>
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{req.reason}</p>

      {req.status === 'rejected' && req.decisionNote && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger-soft bg-danger-soft/50 px-3.5 py-2.5">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-danger">
              Catatan penolakan
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{req.decisionNote}</p>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Main view ────────────────────────────────────────────────────

export function OvertimeView() {
  const { currentEmployee, data, submitOvertime } = useStore()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  const requests = useMemo(
    () =>
      data.overtime
        .filter((o) => o.employeeId === currentEmployee.id)
        .slice()
        .sort((a, b) => {
          if (a.date !== b.date) return a.date < b.date ? 1 : -1
          return a.createdAt < b.createdAt ? 1 : -1
        }),
    [data.overtime, currentEmployee.id],
  )

  // ── Validation ──────────────────────────────────────────────────
  const minutes =
    draft.startTime && draft.endTime ? durationBetween(draft.startTime, draft.endTime) : 0
  const timesOrdered = Boolean(draft.startTime && draft.endTime) && minutes > 0
  const reasonOk = draft.reason.trim().length > 0
  const valid = Boolean(draft.date) && timesOrdered && reasonOk

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const close = () => setOpen(false)

  const submit = () => {
    if (!valid) return
    submitOvertime({
      employeeId: currentEmployee.id,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      reason: draft.reason.trim(),
    })
    setDraft(emptyDraft())
    setOpen(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Self-service"
        title="Lembur"
        subtitle="Ajukan jam kerja tambahan lebih awal — pengajuan diproses sebelum hari pelaksanaan."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <IconPlus className="h-4 w-4" />
            Ajukan Lembur
          </Button>
        }
      />

      {/* Aturan pra-persetujuan — callout brand */}
      <Card className="mb-7 overflow-hidden border-brand/15 bg-brand-soft p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-surface">
            <IconHourglass className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[18px] font-semibold leading-tight text-brand">
                Lembur wajib disetujui lebih dulu
              </h2>
              <Badge tone="brand" dot>Pra-persetujuan</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              Lembur <strong className="font-semibold text-ink">harus diajukan dan disetujui
              sebelum dikerjakan</strong>. Jam tambahan yang dijalankan tanpa persetujuan tidak
              dapat diakui — hanya lembur berstatus disetujui yang dianggap sah dan dihitung.
            </p>
            <ul className="mt-3.5 grid gap-2 text-[13px] text-ink-soft sm:grid-cols-2">
              {[
                'Ajukan paling lambat sebelum hari pelaksanaan.',
                'Tunggu status berubah menjadi disetujui.',
                'Tanpa persetujuan = lembur tidak sah.',
                'Pengajuan tercatat untuk audit & rekap.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Riwayat pengajuan */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-[18px] font-semibold text-ink">
            <IconOvertime className="h-[18px] w-[18px] text-copper" />
            Riwayat Pengajuan
          </h2>
          {requests.length > 0 && (
            <span className="text-[12.5px] font-medium text-ink-mute tnum">
              {requests.length} pengajuan
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={<IconHourglass className="h-6 w-6" />}
            title="Belum ada pengajuan lembur"
            description="Saat kamu butuh jam kerja tambahan, ajukan lebih awal agar bisa disetujui sebelum dikerjakan."
            action={
              <Button variant="primary" onClick={() => setOpen(true)}>
                <IconPlus className="h-4 w-4" />
                Ajukan Lembur
              </Button>
            }
          />
        ) : (
          <div className="stagger grid gap-3">
            {requests.map((req, i) => (
              <div key={req.id} style={{ ['--i' as keyof CSSProperties]: i } as CSSProperties}>
                <RequestRow req={req} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal pengajuan */}
      <Modal
        open={open}
        onClose={close}
        title="Ajukan Lembur"
        subtitle="Isi tanggal dan rentang waktu lembur yang direncanakan."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              Batal
            </Button>
            <Button variant="primary" onClick={submit} disabled={!valid}>
              <IconCheck className="h-4 w-4" />
              Kirim Pengajuan
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Field label="Tanggal lembur" htmlFor="ot-date" required>
            <Input
              id="ot-date"
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mulai" htmlFor="ot-start" required>
              <Input
                id="ot-start"
                type="time"
                value={draft.startTime}
                onChange={(e) => set('startTime', e.target.value)}
              />
            </Field>
            <Field label="Selesai" htmlFor="ot-end" required>
              <Input
                id="ot-end"
                type="time"
                value={draft.endTime}
                onChange={(e) => set('endTime', e.target.value)}
              />
            </Field>
          </div>

          {draft.startTime && draft.endTime && !timesOrdered && (
            <p className="-mt-1 flex items-center gap-1.5 text-[12.5px] text-danger">
              <IconAlert className="h-3.5 w-3.5" />
              Jam selesai harus setelah jam mulai.
            </p>
          )}

          <DurationPreview valid={timesOrdered} minutes={minutes} />

          <Field
            label="Alasan lembur"
            htmlFor="ot-reason"
            required
            hint="Jelaskan pekerjaan yang membutuhkan jam tambahan."
          >
            <Textarea
              id="ot-reason"
              value={draft.reason}
              onChange={(e) => set('reason', e.target.value)}
              placeholder="Mis. menyelesaikan laporan bulanan sebelum tenggat klien…"
            />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
