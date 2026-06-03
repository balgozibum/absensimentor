// ───────────────────────────────────────────────────────────────
// Admin · Pengaturan — the two levers that shape the whole operation:
// the company work-hours (which drive late detection for everyone) and
// the roster of people. Deliberately calm and form-like, not dense.
// ───────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import type { Employee, Settings } from '../../types'
import { useStore } from '../../lib/store'
import { fromMinutes, toMinutes } from '../../lib/time'
import {
  Badge,
  Button,
  Card,
  CardHeader,
  cx,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
} from '../../components/ui'
import {
  IconBuilding,
  IconCheck,
  IconClock,
  IconMail,
  IconPlus,
  IconSunrise,
  IconUser,
  IconUsers,
} from '../../components/icons'
import { PersonLine } from '../shared'

// ── Work-hours draft form ────────────────────────────────────────

type WorkDraft = Pick<Settings, 'clockIn' | 'clockOut' | 'graceMinutes'>

function sameDraft(a: WorkDraft, b: WorkDraft): boolean {
  return (
    a.clockIn === b.clockIn &&
    a.clockOut === b.clockOut &&
    a.graceMinutes === b.graceMinutes
  )
}

function WorkHoursCard() {
  const { settings, updateSettings } = useStore()

  const seeded: WorkDraft = {
    clockIn: settings.clockIn,
    clockOut: settings.clockOut,
    graceMinutes: settings.graceMinutes,
  }
  const [draft, setDraft] = useState<WorkDraft>(seeded)

  // Re-seed local draft if the stored settings change underneath us
  // (e.g. a data reset) and the form hasn't been touched.
  const [baseline, setBaseline] = useState<WorkDraft>(seeded)
  if (!sameDraft(baseline, seeded) && sameDraft(draft, baseline)) {
    setBaseline(seeded)
    setDraft(seeded)
  }

  const orderInvalid = toMinutes(draft.clockOut) <= toMinutes(draft.clockIn)
  const graceInvalid = draft.graceMinutes < 0 || Number.isNaN(draft.graceMinutes)
  const unchanged = sameDraft(draft, seeded)
  const canSave = !unchanged && !orderInvalid && !graceInvalid

  // Live preview of the latest still-on-time clock-in moment.
  const cutoff = useMemo(() => {
    if (orderInvalid || graceInvalid) return null
    return fromMinutes(toMinutes(draft.clockIn) + Math.max(0, draft.graceMinutes))
  }, [draft.clockIn, draft.graceMinutes, orderInvalid, graceInvalid])

  function save() {
    if (!canSave) return
    updateSettings({
      clockIn: draft.clockIn,
      clockOut: draft.clockOut,
      graceMinutes: Math.max(0, Math.round(draft.graceMinutes)),
    })
    setBaseline(draft)
  }

  function reset() {
    setDraft(seeded)
  }

  return (
    <Card style={{ ['--i' as string]: 0 }}>
      <CardHeader
        title="Jam kerja perusahaan"
        subtitle="Berlaku untuk semua karyawan & menjadi dasar deteksi keterlambatan"
        icon={<IconClock className="h-4.5 w-4.5" />}
      />

      <div className="px-5 py-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Jam masuk"
            htmlFor="set-clock-in"
            required
            hint="Awal hari kerja"
          >
            <Input
              id="set-clock-in"
              type="time"
              className="font-mono tnum"
              value={draft.clockIn}
              onChange={(e) => setDraft((d) => ({ ...d, clockIn: e.target.value }))}
            />
          </Field>

          <Field
            label="Jam pulang"
            htmlFor="set-clock-out"
            required
            hint="Akhir hari kerja"
          >
            <Input
              id="set-clock-out"
              type="time"
              className={cx('font-mono tnum', orderInvalid && 'border-danger focus:border-danger')}
              value={draft.clockOut}
              onChange={(e) => setDraft((d) => ({ ...d, clockOut: e.target.value }))}
            />
          </Field>

          <Field
            label="Toleransi keterlambatan"
            htmlFor="set-grace"
            required
            hint="Dalam menit"
          >
            <Input
              id="set-grace"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className={cx('font-mono tnum', graceInvalid && 'border-danger focus:border-danger')}
              value={Number.isNaN(draft.graceMinutes) ? '' : draft.graceMinutes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, graceMinutes: e.target.valueAsNumber }))
              }
            />
          </Field>
        </div>

        {/* Explanatory rail — why these fields matter, with a live cutoff. */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-line bg-surface-2/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-copper-soft text-copper-strong">
              <IconSunrise className="h-4 w-4" />
            </span>
            <p className="max-w-md text-[13px] leading-relaxed text-ink-soft">
              {orderInvalid ? (
                <span className="text-danger">
                  Jam pulang harus lebih lambat dari jam masuk.
                </span>
              ) : (
                <>
                  Karyawan yang melapor masuk setelah{' '}
                  <span className="font-mono font-semibold text-ink tnum">{cutoff}</span>{' '}
                  ditandai <span className="font-medium text-warn">terlambat</span>. Perubahan
                  ini langsung berlaku untuk seluruh tim.
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">
              Batas tepat waktu
            </span>
            <span
              className={cx(
                'font-display text-[22px] font-semibold leading-none tnum',
                cutoff ? 'text-ink' : 'text-ink-mute',
              )}
            >
              {cutoff ?? '—'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {!unchanged && (
            <Button variant="ghost" size="md" onClick={reset}>
              Batalkan
            </Button>
          )}
          <Button variant="primary" size="md" onClick={save} disabled={!canSave}>
            <IconCheck className="h-4 w-4" />
            Simpan
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ── Add-employee modal ───────────────────────────────────────────

function AddEmployeeModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { addEmployee, data } = useStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
  const emailTaken = data.employees.some(
    (e) => e.email.toLowerCase() === trimmedEmail.toLowerCase(),
  )
  const canSubmit = trimmedName.length > 0 && emailLooksValid && !emailTaken && birthDate !== ''

  function close() {
    setName('')
    setEmail('')
    setTitle('')
    setBirthDate('')
    onClose()
  }

  function submit() {
    if (!canSubmit) return
    addEmployee({ name: trimmedName, email: trimmedEmail, title: title.trim(), birthDate })
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Tambah karyawan"
      subtitle="Karyawan baru langsung aktif dan dapat mulai melapor kehadiran."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Nama lengkap" htmlFor="emp-name" required>
          <Input
            id="emp-name"
            autoFocus
            placeholder="mis. Sari Wulandari"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field
          label="Email"
          htmlFor="emp-email"
          required
          hint={
            trimmedEmail.length > 0 && emailTaken
              ? undefined
              : 'Digunakan sebagai identitas karyawan'
          }
        >
          <Input
            id="emp-email"
            type="email"
            placeholder="nama@perusahaan.id"
            className={cx(
              (trimmedEmail.length > 0 && !emailLooksValid) || emailTaken
                ? 'border-danger focus:border-danger'
                : undefined,
            )}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {trimmedEmail.length > 0 && emailTaken && (
            <span className="mt-1 block text-[12px] text-danger">
              Email ini sudah terdaftar.
            </span>
          )}
        </Field>

        <Field label="Jabatan" htmlFor="emp-title" hint="Opsional">
          <Input
            id="emp-title"
            placeholder="mis. Desainer Produk"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field
          label="Tanggal lahir"
          htmlFor="emp-birth"
          required
          hint="Menjadi kata sandi login karyawan (format DDMMYYYY)"
        >
          <Input
            id="emp-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </Field>

        {/* actions live inside the scrollable form so the save button is always reachable */}
        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={close}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            <IconPlus className="h-4 w-4" />
            Simpan karyawan
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Single roster row ────────────────────────────────────────────

function RosterRow({ employee }: { employee: Employee }) {
  const { setEmployeeActive } = useStore()
  const isAdmin = employee.role === 'admin'

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <PersonLine
        employee={employee}
        size={40}
        subtitle={
          <span className="flex items-center gap-1.5">
            <IconMail className="h-3.5 w-3.5 text-ink-mute" />
            <span className="truncate font-mono text-[12px] text-ink-mute">{employee.email}</span>
          </span>
        }
      />

      <div className="flex shrink-0 items-center gap-3">
        {isAdmin ? (
          <Badge tone="brand" dot>
            Admin
          </Badge>
        ) : (
          <Badge tone="ink">Karyawan</Badge>
        )}

        {isAdmin ? (
          // The admin can't be deactivated — they own this very screen.
          <span className="hidden text-[12px] text-ink-mute sm:inline">Akun pemilik</span>
        ) : (
          <Button
            size="sm"
            variant={employee.active ? 'secondary' : 'primary'}
            onClick={() => setEmployeeActive(employee.id, !employee.active)}
          >
            {employee.active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Roster card ──────────────────────────────────────────────────

function RosterCard() {
  const { data } = useStore()
  const [adding, setAdding] = useState(false)

  // Admin first, then active staff, then inactive staff — alphabetised within.
  const ordered = useMemo(() => {
    const rank = (e: Employee) => (e.role === 'admin' ? 0 : e.active ? 1 : 2)
    return [...data.employees].sort(
      (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
    )
  }, [data.employees])

  const staffCount = data.employees.filter((e) => e.role === 'karyawan').length
  const activeStaff = data.employees.filter((e) => e.role === 'karyawan' && e.active).length

  return (
    <Card style={{ ['--i' as string]: 1 }}>
      <CardHeader
        title="Karyawan"
        subtitle={
          staffCount === 0
            ? 'Belum ada karyawan'
            : `${activeStaff} aktif dari ${staffCount} karyawan`
        }
        icon={<IconUsers className="h-4.5 w-4.5" />}
        action={
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            <IconPlus className="h-4 w-4" />
            Tambah karyawan
          </Button>
        }
      />

      {staffCount === 0 ? (
        <EmptyState
          icon={<IconUser className="h-5 w-5" />}
          title="Belum ada karyawan"
          description="Tambahkan karyawan pertama agar mereka dapat mulai melapor kehadiran."
          action={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              <IconPlus className="h-4 w-4" />
              Tambah karyawan
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-line">
          {ordered.map((employee) => (
            <RosterRow key={employee.id} employee={employee} />
          ))}
        </div>
      )}

      <AddEmployeeModal open={adding} onClose={() => setAdding(false)} />
    </Card>
  )
}

// ── View ─────────────────────────────────────────────────────────

export function SettingsView() {
  return (
    <div>
      <PageHeader
        eyebrow="Konfigurasi"
        title="Pengaturan"
        subtitle={
          <span className="flex items-center gap-2">
            <IconBuilding className="h-4 w-4 text-ink-mute" />
            Atur jam kerja perusahaan dan kelola daftar karyawan.
          </span>
        }
      />

      <div className="stagger space-y-6">
        <WorkHoursCard />
        <RosterCard />
      </div>
    </div>
  )
}
