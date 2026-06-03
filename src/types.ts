// ───────────────────────────────────────────────────────────────
// Domain model (per HANDOVER.md §5). No backend — these shapes are
// held in local state. Dates are ISO 'YYYY-MM-DD'; times are 'HH:MM'.
// ───────────────────────────────────────────────────────────────

export type Role = 'karyawan' | 'admin'

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export type AttendanceType = 'in' | 'out'
export type AttendanceStatus = 'ontime' | 'late'

export type LeaveType = 'tahunan' | 'izin' | 'sakit'

export interface Employee {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  /** seed-time hue (0–360) used for the generated avatar — purely cosmetic */
  hue: number
  title: string
  /** ISO 'YYYY-MM-DD'. Doubles as the employee-portal password (as DDMMYYYY). */
  birthDate: string
}

export interface Settings {
  /** company-wide fixed clock-in, e.g. '08:00' */
  clockIn: string
  /** company-wide fixed clock-out, e.g. '17:00' */
  clockOut: string
  /** minutes of grace before a clock-in counts as late */
  graceMinutes: number
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  type: AttendanceType
  time: string
  /** data-URL of the captured selfie ('' for seeded historical rows) */
  selfie: string
  /** only meaningful for type === 'in' */
  status?: AttendanceStatus
  lateMinutes?: number
}

export interface LeaveRequest {
  id: string
  employeeId: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  reason: string
  status: RequestStatus
  createdAt: string
  decidedAt?: string
  decisionNote?: string
}

export interface OvertimeRequest {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  reason: string
  status: RequestStatus
  createdAt: string
  decidedAt?: string
  decisionNote?: string
}

export interface ActivityBlock {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  description: string
}

export interface AppData {
  settings: Settings
  employees: Employee[]
  attendance: AttendanceRecord[]
  leave: LeaveRequest[]
  overtime: OvertimeRequest[]
  activities: ActivityBlock[]
}
