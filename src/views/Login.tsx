// ───────────────────────────────────────────────────────────────
// Employee login gate. A karyawan can only enter their OWN portal —
// they pick their name, then authenticate with a password equal to
// their birth date (DDMMYYYY). No cross-employee access. Admin enters
// through a separate switch. (There is no backend; this is a
// front-end-only simulation of authentication.)
// ───────────────────────────────────────────────────────────────

import { useState } from 'react'
import type { Employee } from '../types'
import { useStore } from '../lib/store'
import { birthdatePassword } from '../lib/time'
import { Avatar, Button, Input, cx } from '../components/ui'
import { IconArrowRight, IconChevronLeft, IconAlert, IconUser, IconSettings } from '../components/icons'

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12.5l3.5 3.5L18 8" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="font-display text-[20px] font-semibold tracking-tight text-ink">AbsensiMentor</div>
        <div className="text-[12px] text-ink-mute">Absensi karyawan internal</div>
      </div>
    </div>
  )
}

export function Login() {
  const { data, login, setRole } = useStore()
  const staff = data.employees.filter((e) => e.role === 'karyawan' && e.active)
  const admin = data.employees.find((e) => e.role === 'admin')
  const [selected, setSelected] = useState<Employee | null>(null)
  const [adminMode, setAdminMode] = useState(false)

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-6 flex justify-center sm:justify-start">
          <BrandMark />
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {adminMode && admin ? (
            <PasswordStep employee={admin} onBack={() => setAdminMode(false)} onSuccess={() => setRole('admin')} />
          ) : selected ? (
            <PasswordStep employee={selected} onBack={() => setSelected(null)} onSuccess={() => login(selected.id)} />
          ) : (
            <SelectStep staff={staff} onPick={setSelected} />
          )}
        </div>

        {/* Admin entry — also requires a password (admin's birth date) */}
        {!adminMode && !selected && (
          <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-ink-mute">
            <span>Anda admin/pemilik?</span>
            <button
              onClick={() => setAdminMode(true)}
              className="inline-flex items-center gap-1.5 font-medium text-brand transition-colors hover:text-brand-strong"
            >
              <IconSettings className="h-4 w-4" />
              Masuk sebagai Admin
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SelectStep({ staff, onPick }: { staff: Employee[]; onPick: (e: Employee) => void }) {
  return (
    <div>
      <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight text-ink">
        Masuk ke portal karyawan
      </h1>
      <p className="mt-1.5 text-[14px] text-ink-soft">
        Pilih nama Anda, lalu masukkan kata sandi untuk membuka dashboard Anda sendiri.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {staff.map((e) => (
          <button
            key={e.id}
            onClick={() => onPick(e)}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-left transition-all hover:border-brand/40 hover:bg-brand-soft/40"
          >
            <Avatar employee={e} size={42} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[14.5px] font-semibold text-ink">{e.name}</div>
              <div className="truncate text-[12.5px] text-ink-mute">{e.title}</div>
            </div>
            <IconArrowRight className="h-4.5 w-4.5 text-ink-mute transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
          </button>
        ))}
      </div>
    </div>
  )
}

function PasswordStep({
  employee,
  onBack,
  onSuccess,
}: {
  employee: Employee
  onBack: () => void
  onSuccess: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const expected = birthdatePassword(employee.birthDate)

  function submit() {
    if (value === expected) {
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-ink-mute transition-colors hover:text-ink"
      >
        <IconChevronLeft className="h-4 w-4" />
        Ganti akun
      </button>

      <div className="flex items-center gap-3">
        <Avatar employee={employee} size={48} />
        <div className="leading-tight">
          <div className="text-[16px] font-semibold text-ink">{employee.name}</div>
          <div className="text-[12.5px] text-ink-mute">{employee.title}</div>
        </div>
      </div>

      <div className="mt-5">
        <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
          Kata sandi
          <span className="text-ink-mute">— tanggal lahir (DDMMYYYY)</span>
        </span>
        <Input
          autoFocus
          type="password"
          inputMode="numeric"
          maxLength={8}
          placeholder="••••••••"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ''))
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          className={cx('tracking-[0.3em]', error && 'border-danger focus:border-danger focus:ring-danger/20')}
        />
        {error && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-danger">
            <IconAlert className="h-3.5 w-3.5" />
            Kata sandi salah. Gunakan tanggal lahir Anda (DDMMYYYY).
          </span>
        )}
      </div>

      <Button variant="primary" size="lg" onClick={submit} disabled={value.length < 8} className="mt-4 w-full">
        <IconUser className="h-4.5 w-4.5" />
        Masuk
      </Button>
    </div>
  )
}
