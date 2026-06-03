// ───────────────────────────────────────────────────────────────
// Employee · Aktivitas — daily activity timeline editor.
// Browse a day, see work blocks on the work-hours axis, and add /
// edit / delete activities. Gaps are allowed and read as breaks.
// ───────────────────────────────────────────────────────────────

import { useMemo, useState, type CSSProperties } from 'react'
import type { ActivityBlock } from '../../types'
import { useStore } from '../../lib/store'
import {
  addDays,
  durationBetween,
  formatDayMonth,
  formatDuration,
  fromMinutes,
  toMinutes,
  todayISO,
  weekdayLong,
} from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Textarea,
  cx,
} from '../../components/ui'
import {
  IconActivity,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCoffee,
  IconEdit,
  IconPlus,
  IconTrash,
} from '../../components/icons'
import { Timeline, TimelineLegend } from '../../components/Timeline'

type Draft = { startTime: string; endTime: string; description: string }

// ── Day navigator (lives in the PageHeader actions) ──────────────

function DayNavigator({
  date,
  onChange,
}: {
  date: string
  onChange: (iso: string) => void
}) {
  const isToday = date === todayISO()
  const label = isToday ? 'Hari ini' : `${weekdayLong(date)}, ${formatDayMonth(date)}`

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-line-strong bg-surface p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange(addDays(date, -1))}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Hari sebelumnya"
      >
        <IconChevronLeft className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange(todayISO())}
        disabled={isToday}
        className={cx(
          'min-w-[150px] rounded-lg px-3 py-1 text-center text-[13px] font-medium transition-colors',
          isToday ? 'text-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink',
        )}
        title={isToday ? undefined : 'Kembali ke hari ini'}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => onChange(addDays(date, 1))}
        className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Hari berikutnya"
      >
        <IconChevronRight className="h-4.5 w-4.5" />
      </button>
    </div>
  )
}

// ── Add / edit modal ─────────────────────────────────────────────

function ActivityModal({
  open,
  mode,
  draft,
  workStart,
  workEnd,
  onClose,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  draft: Draft
  workStart: string
  workEnd: string
  onClose: () => void
  onSubmit: (next: Draft) => void
}) {
  const [form, setForm] = useState<Draft>(draft)

  // re-seed the form whenever a new draft is opened
  const [seed, setSeed] = useState(draft)
  if (seed !== draft) {
    setSeed(draft)
    setForm(draft)
  }

  const description = form.description.trim()
  const startMin = toMinutes(form.startTime)
  const endMin = toMinutes(form.endTime)
  const orderOk = endMin > startMin
  const valid = description.length > 0 && orderOk
  const span = orderOk ? durationBetween(form.startTime, form.endTime) : 0

  function submit() {
    if (!valid) return
    onSubmit({ startTime: form.startTime, endTime: form.endTime, description })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Tambah aktivitas' : 'Ubah aktivitas'}
      subtitle={
        mode === 'create'
          ? 'Catat apa yang kamu kerjakan pada rentang waktu ini.'
          : 'Perbarui rentang waktu atau deskripsi aktivitas.'
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-mute">
            {orderOk ? (
              <>
                Durasi{' '}
                <strong className="font-mono font-semibold text-ink-soft tnum">
                  {formatDuration(span)}
                </strong>
              </>
            ) : (
              <span className="text-danger">Jam selesai harus setelah jam mulai</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button variant="primary" disabled={!valid} onClick={submit}>
              {mode === 'create' ? 'Simpan aktivitas' : 'Simpan perubahan'}
            </Button>
          </div>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Deskripsi" htmlFor="act-desc" required>
          <Textarea
            id="act-desc"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="mis. Menyiapkan materi onboarding mentee baru"
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mulai" htmlFor="act-start" required>
            <Input
              id="act-start"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="font-mono tnum"
            />
          </Field>
          <Field label="Selesai" htmlFor="act-end" required>
            <Input
              id="act-end"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              className="font-mono tnum"
            />
          </Field>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-mute">
          <IconCoffee className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
          <span>
            Jam kerja {workStart}–{workEnd} wajib diisi, tetapi boleh ada celah — celah dihitung
            sebagai istirahat atau waktu tidak bekerja.
          </span>
        </p>
      </form>
    </Modal>
  )
}

// ── Accessible list row ──────────────────────────────────────────

function ActivityRow({
  block,
  onEdit,
  onDelete,
  style,
}: {
  block: ActivityBlock
  onEdit: () => void
  onDelete: () => void
  style?: CSSProperties
}) {
  const span = durationBetween(block.startTime, block.endTime)
  return (
    <li
      style={style}
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors hover:border-line-strong"
    >
      <div className="w-[112px] shrink-0">
        <span className="block font-mono text-[13px] font-medium text-ink tnum">
          {block.startTime}–{block.endTime}
        </span>
        <span className="mt-0.5 block font-mono text-[11px] text-ink-mute tnum">
          {formatDuration(span)}
        </span>
      </div>
      <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-ink-soft">
        {block.description}
      </p>
      <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-surface-2 hover:text-brand"
          aria-label={`Ubah aktivitas ${block.startTime}`}
        >
          <IconEdit className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="grid h-8 w-8 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-danger-soft hover:text-danger"
          aria-label={`Hapus aktivitas ${block.startTime}`}
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}

// ── View ─────────────────────────────────────────────────────────

export function ActivityView() {
  const { data, settings, currentEmployee, addActivity, updateActivity, deleteActivity } =
    useStore()

  const [selectedDate, setSelectedDate] = useState<string>(todayISO())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({ startTime: '', endTime: '', description: '' })

  const dayBlocks = useMemo(
    () =>
      data.activities
        .filter((a) => a.employeeId === currentEmployee.id && a.date === selectedDate)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [data.activities, currentEmployee.id, selectedDate],
  )

  const totalMin = useMemo(
    () => dayBlocks.reduce((sum, b) => sum + durationBetween(b.startTime, b.endTime), 0),
    [dayBlocks],
  )

  // sensible default: continue after the last block, else open at clock-in
  function nextDefaultDraft(): Draft {
    const startWork = toMinutes(settings.clockIn)
    const endWork = toMinutes(settings.clockOut)
    const lastEnd = dayBlocks.length
      ? Math.max(...dayBlocks.map((b) => toMinutes(b.endTime)))
      : startWork
    const start = Math.min(Math.max(lastEnd, startWork), endWork - 60)
    const end = Math.min(start + 60, endWork)
    return { startTime: fromMinutes(start), endTime: fromMinutes(end), description: '' }
  }

  function openCreate() {
    setEditingId(null)
    setDraft(nextDefaultDraft())
    setModalOpen(true)
  }

  function openEdit(block: ActivityBlock) {
    setEditingId(block.id)
    setDraft({
      startTime: block.startTime,
      endTime: block.endTime,
      description: block.description,
    })
    setModalOpen(true)
  }

  function handleSubmit(next: Draft) {
    if (editingId) {
      updateActivity(editingId, next)
    } else {
      addActivity({ employeeId: currentEmployee.id, date: selectedDate, ...next })
    }
    setModalOpen(false)
    setEditingId(null)
  }

  const hasBlocks = dayBlocks.length > 0

  return (
    <div className="animate-fade">
      <PageHeader
        eyebrow="Catatan harian"
        title="Aktivitas"
        subtitle="Susun lini masa pekerjaanmu hari ini. Celah dibiarkan — itu waktu istirahat."
        actions={<DayNavigator date={selectedDate} onChange={setSelectedDate} />}
      />

      <div className="stagger space-y-5">
        {/* Timeline card */}
        <Card style={{ ['--i' as string]: 0 } as CSSProperties}>
          <CardHeader
            title="Lini masa"
            subtitle={`Sumbu jam kerja ${settings.clockIn}–${settings.clockOut}`}
            icon={<IconActivity className="h-5 w-5" />}
            action={
              <div className="hidden items-center gap-2 sm:flex">
                <Badge tone="brand" dot>
                  <span className="font-mono tnum">{formatDuration(totalMin)}</span> tercatat
                </Badge>
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <IconPlus className="h-4 w-4" />
                  Tambah aktivitas
                </Button>
              </div>
            }
          />
          <div className="p-5">
            {hasBlocks ? (
              <>
                <Timeline
                  blocks={dayBlocks}
                  workStart={settings.clockIn}
                  workEnd={settings.clockOut}
                  onBlockClick={openEdit}
                  onBlockDelete={(b) => deleteActivity(b.id)}
                />
                <div className="mt-4 border-t border-line pt-3.5">
                  <TimelineLegend />
                </div>
              </>
            ) : (
              <EmptyState
                icon={<IconCoffee className="h-6 w-6" />}
                title="Belum ada aktivitas"
                description={
                  selectedDate === todayISO()
                    ? 'Belum ada yang tercatat hari ini. Tambahkan aktivitas pertamamu — boleh menyisakan celah untuk istirahat.'
                    : 'Tidak ada aktivitas tercatat pada hari ini.'
                }
                action={
                  <Button variant="primary" onClick={openCreate}>
                    <IconPlus className="h-4 w-4" />
                    Tambah aktivitas
                  </Button>
                }
              />
            )}
          </div>
          {/* mobile CTA */}
          <div className="border-t border-line p-4 sm:hidden">
            <Button variant="primary" className="w-full" onClick={openCreate}>
              <IconPlus className="h-4 w-4" />
              Tambah aktivitas
            </Button>
          </div>
        </Card>

        {/* Accessible list of the day's blocks */}
        {hasBlocks && (
          <Card style={{ ['--i' as string]: 1 } as CSSProperties}>
            <CardHeader
              title="Rincian aktivitas"
              subtitle={`${dayBlocks.length} entri · ${formatDuration(totalMin)} total`}
              icon={<IconClock className="h-5 w-5" />}
            />
            <ul className="stagger space-y-2 p-4">
              {dayBlocks.map((block, i) => (
                <ActivityRow
                  key={block.id}
                  block={block}
                  style={{ ['--i' as string]: i } as CSSProperties}
                  onEdit={() => openEdit(block)}
                  onDelete={() => deleteActivity(block.id)}
                />
              ))}
            </ul>
          </Card>
        )}
      </div>

      <ActivityModal
        open={modalOpen}
        mode={editingId ? 'edit' : 'create'}
        draft={draft}
        workStart={settings.clockIn}
        workEnd={settings.clockOut}
        onClose={() => {
          setModalOpen(false)
          setEditingId(null)
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
