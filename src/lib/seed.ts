// ───────────────────────────────────────────────────────────────
// Deterministic seed data. Built relative to "today" so the demo
// always shows a populated current week. No randomness at runtime —
// a tiny string hash drives the per-person/day variation so reloads
// stay stable.
// ───────────────────────────────────────────────────────────────

import type {
  ActivityBlock,
  AppData,
  AttendanceRecord,
  Employee,
  LeaveRequest,
  OvertimeRequest,
  Settings,
} from '../types'
import { addDays, evaluateClockIn, fromMinutes, isWeekend, toISODate } from './time'

let counter = 0
const uid = (p: string) => `${p}_${(counter++).toString(36)}`

/** stable 0..1 pseudo-random from a string key */
function hash01(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

const SETTINGS: Settings = { clockIn: '08:00', clockOut: '17:00', graceMinutes: 5 }

const EMPLOYEES: Employee[] = [
  { id: 'u_admin', name: 'Sari Wibowo', email: 'sari@k270.id', role: 'admin', active: true, hue: 212, title: 'Pemilik · Admin' },
  { id: 'u_andi', name: 'Andi Pratama', email: 'andi@k270.id', role: 'karyawan', active: true, hue: 26, title: 'Frontend Engineer' },
  { id: 'u_dewi', name: 'Dewi Lestari', email: 'dewi@k270.id', role: 'karyawan', active: true, hue: 158, title: 'Product Designer' },
  { id: 'u_budi', name: 'Budi Santoso', email: 'budi@k270.id', role: 'karyawan', active: true, hue: 286, title: 'Backend Engineer' },
  { id: 'u_rina', name: 'Rina Marlina', email: 'rina@k270.id', role: 'karyawan', active: true, hue: 340, title: 'QA & Support' },
  { id: 'u_fajar', name: 'Fajar Nugroho', email: 'fajar@k270.id', role: 'karyawan', active: false, hue: 196, title: 'Content (nonaktif)' },
]

const ACTIVE_STAFF = EMPLOYEES.filter((e) => e.role === 'karyawan' && e.active)

function buildAttendance(today: string): AttendanceRecord[] {
  const rows: AttendanceRecord[] = []
  // last 10 calendar days up to today; skip weekends
  const days: string[] = []
  for (let i = 9; i >= 0; i--) {
    const d = addDays(today, -i)
    if (!isWeekend(d)) days.push(d)
  }

  for (const emp of ACTIVE_STAFF) {
    for (const date of days) {
      const isToday = date === today
      const k = `${emp.id}:${date}`
      const r = hash01(k)
      // base clock-in 07:48..08:18, with occasional later arrivals
      let inMin = 468 + Math.round((r - 0.45) * 44) // ~07:53..08:18
      if (hash01(k + 'late') > 0.78) inMin += 18 + Math.round(hash01(k + 'x') * 35) // late spike
      // one person is sick today — no record
      if (isToday && emp.id === 'u_rina') continue
      const inTime = fromMinutes(inMin)
      const evalIn = evaluateClockIn(inTime, SETTINGS)
      rows.push({
        id: uid('att'),
        employeeId: emp.id,
        date,
        type: 'in',
        time: inTime,
        selfie: '',
        status: evalIn.status,
        lateMinutes: evalIn.lateMinutes,
      })
      // clock-out only for past days (today still in progress for some)
      const clockedOutToday = isToday ? hash01(k + 'out') > 0.5 : true
      if (clockedOutToday) {
        const outMin = 1020 + Math.round(hash01(k + 'o') * 95) // 17:00..18:35
        rows.push({
          id: uid('att'),
          employeeId: emp.id,
          date,
          type: 'out',
          time: fromMinutes(outMin),
          selfie: '',
        })
      }
    }
  }
  return rows
}

function buildLeave(today: string): LeaveRequest[] {
  return [
    {
      id: uid('lv'), employeeId: 'u_rina', leaveType: 'sakit',
      startDate: today, endDate: today, reason: 'Demam, surat dokter menyusul.',
      status: 'pending', createdAt: `${today}T07:10`,
    },
    {
      id: uid('lv'), employeeId: 'u_andi', leaveType: 'tahunan',
      startDate: addDays(today, 6), endDate: addDays(today, 8), reason: 'Acara keluarga di luar kota.',
      status: 'pending', createdAt: `${addDays(today, -1)}T16:24`,
    },
    {
      id: uid('lv'), employeeId: 'u_dewi', leaveType: 'izin',
      startDate: addDays(today, 2), endDate: addDays(today, 2), reason: 'Mengurus dokumen di kelurahan, setengah hari.',
      status: 'pending', createdAt: `${today}T08:02`,
    },
    {
      id: uid('lv'), employeeId: 'u_budi', leaveType: 'tahunan',
      startDate: addDays(today, -5), endDate: addDays(today, -4), reason: 'Liburan singkat.',
      status: 'approved', createdAt: `${addDays(today, -9)}T10:00`, decidedAt: `${addDays(today, -8)}T09:12`,
    },
    {
      id: uid('lv'), employeeId: 'u_andi', leaveType: 'izin',
      startDate: addDays(today, -2), endDate: addDays(today, -2), reason: 'Ada keperluan mendadak.',
      status: 'rejected', createdAt: `${addDays(today, -3)}T14:30`, decidedAt: `${addDays(today, -3)}T15:01`,
      decisionNote: 'Deadline rilis, mohon dijadwalkan ulang.',
    },
  ]
}

function buildOvertime(today: string): OvertimeRequest[] {
  return [
    {
      id: uid('ot'), employeeId: 'u_budi', date: today,
      startTime: '17:30', endTime: '20:00', reason: 'Migrasi database produksi setelah jam kerja.',
      status: 'pending', createdAt: `${today}T09:40`,
    },
    {
      id: uid('ot'), employeeId: 'u_dewi', date: addDays(today, 1),
      startTime: '17:00', endTime: '19:30', reason: 'Finalisasi handoff desain sebelum sprint review.',
      status: 'pending', createdAt: `${today}T11:15`,
    },
    {
      id: uid('ot'), employeeId: 'u_andi', date: addDays(today, -1),
      startTime: '17:00', endTime: '19:00', reason: 'Perbaikan bug kritikal pada checkout.',
      status: 'approved', createdAt: `${addDays(today, -2)}T13:00`, decidedAt: `${addDays(today, -2)}T13:20`,
    },
    {
      id: uid('ot'), employeeId: 'u_rina', date: addDays(today, -3),
      startTime: '18:00', endTime: '21:00', reason: 'Regression test rilis.',
      status: 'rejected', createdAt: `${addDays(today, -3)}T16:50`, decidedAt: `${addDays(today, -3)}T17:10`,
      decisionNote: 'Diajukan terlalu mepet; lembur harus disetujui sebelum dikerjakan.',
    },
  ]
}

function block(employeeId: string, date: string, startTime: string, endTime: string, description: string): ActivityBlock {
  return { id: uid('act'), employeeId, date, startTime, endTime, description }
}

function buildActivities(today: string): ActivityBlock[] {
  const yesterday = addDays(today, -1)
  const rows: ActivityBlock[] = []

  // Andi — today, nicely filled with a short lunch gap
  rows.push(
    block('u_andi', today, '08:05', '10:00', 'Standup & review PR tim frontend'),
    block('u_andi', today, '10:00', '12:00', 'Implementasi komponen kalender absensi'),
    block('u_andi', today, '13:00', '15:30', 'Integrasi API mock + perbaikan state'),
    block('u_andi', today, '15:30', '17:00', 'Polish UI timeline & dokumentasi'),
  )

  // Dewi — today, has a LONG unexplained gap in the afternoon (flagged)
  rows.push(
    block('u_dewi', today, '08:10', '11:30', 'Eksplorasi desain dashboard admin'),
    // 11:30 → 14:30 large gap (3 jam) — should be flagged for admin
    block('u_dewi', today, '14:30', '17:00', 'Prototyping flow pengajuan cuti di Figma'),
  )

  // Budi — today, partially filled (still working)
  rows.push(
    block('u_budi', today, '08:20', '12:00', 'Refactor modul autentikasi'),
    block('u_budi', today, '13:00', '16:00', 'Menyiapkan skrip migrasi database'),
  )

  // Yesterday — Andi full day
  rows.push(
    block('u_andi', yesterday, '08:00', '12:00', 'Sprint planning & estimasi tugas'),
    block('u_andi', yesterday, '13:00', '17:00', 'Perbaikan bug checkout (lembur disetujui lanjut)'),
  )
  // Yesterday — Dewi with a small mid-morning gap
  rows.push(
    block('u_dewi', yesterday, '08:15', '10:15', 'Riset kompetitor HRIS'),
    block('u_dewi', yesterday, '11:00', '12:00', 'Sinkronisasi dengan tim produk'),
    block('u_dewi', yesterday, '13:00', '16:30', 'Desain komponen kartu kehadiran'),
  )

  return rows
}

export function makeSeed(today = toISODate(new Date())): AppData {
  counter = 0
  return {
    settings: { ...SETTINGS },
    employees: EMPLOYEES.map((e) => ({ ...e })),
    attendance: buildAttendance(today),
    leave: buildLeave(today),
    overtime: buildOvertime(today),
    activities: buildActivities(today),
  }
}
