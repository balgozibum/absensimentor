// ───────────────────────────────────────────────────────────────
// App store — single source of truth held in React state, mirrored to
// localStorage. No backend (HANDOVER §8). Every view reads/writes through
// the `useStore()` hook; nothing mutates `data` directly.
// ───────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  ActivityBlock,
  AppData,
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveType,
  OvertimeRequest,
  RequestStatus,
  Role,
  Settings,
} from '../types'
import { makeSeed } from './seed'
import { evaluateClockIn, todayISO } from './time'
import { getRemoteState, saveRemoteState } from './remote'

const STORAGE_KEY = 'absensimentor.v3'
const ADMIN_ID = 'u_admin'
const POLL_MS = 7000

let seq = 0
function newId(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}`
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function load(): AppData {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as AppData
    } catch {
      /* ignore — fall through to seed */
    }
  }
  return makeSeed()
}

// ── Context shape ────────────────────────────────────────────────

export interface Session {
  role: Role
  /**
   * The logged-in person. In the employee portal a karyawan can only ever be
   * themselves — null means "not logged in" and the app shows the login gate.
   * Admins are always the ADMIN_ID account.
   */
  employeeId: string | null
}

interface StoreValue {
  data: AppData
  settings: Settings
  session: Session
  /** true while the shared document is loading from the backend */
  loading: boolean
  /**
   * The logged-in employee. Only read by the Shell + portal views, which render
   * exclusively when someone is logged in, so it is always defined there. Falls
   * back to the first employee while the login gate is showing (never read then).
   */
  currentEmployee: Employee

  // session
  setRole: (role: Role) => void
  /** log into the employee portal as a specific person (their own data only) */
  login: (employeeId: string) => void
  /** leave the employee portal — returns to the login gate */
  logout: () => void

  // lookups
  employeeById: (id: string) => Employee | undefined
  attendanceFor: (employeeId: string, date: string) => {
    in?: AttendanceRecord
    out?: AttendanceRecord
  }

  // attendance
  clockIn: (employeeId: string, selfie: string, time?: string, date?: string) => void
  clockOut: (employeeId: string, selfie: string, time?: string, date?: string) => void

  // leave
  submitLeave: (input: {
    employeeId: string
    leaveType: LeaveType
    startDate: string
    endDate: string
    reason: string
  }) => void
  decideLeave: (id: string, status: Extract<RequestStatus, 'approved' | 'rejected'>, note?: string) => void

  // overtime
  submitOvertime: (input: {
    employeeId: string
    date: string
    startTime: string
    endTime: string
    reason: string
  }) => void
  decideOvertime: (id: string, status: Extract<RequestStatus, 'approved' | 'rejected'>, note?: string) => void

  // activities
  addActivity: (input: Omit<ActivityBlock, 'id'>) => void
  updateActivity: (id: string, patch: Partial<Omit<ActivityBlock, 'id' | 'employeeId'>>) => void
  deleteActivity: (id: string) => void

  // settings + employees
  updateSettings: (patch: Partial<Settings>) => void
  addEmployee: (input: { name: string; email: string; title: string; birthDate: string }) => void
  setEmployeeActive: (id: string, active: boolean) => void
  /** permanently remove an employee and ALL of their records (never the admin) */
  deleteEmployee: (id: string) => void

  /** replace the entire dataset (used by Restore / import) */
  replaceAllData: (next: AppData) => void

  resetData: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session>({ role: 'karyawan', employeeId: null })

  // Whether the shared backend (/api/state) is reachable, and the JSON we last
  // synced (guards against re-saving our own echo and re-applying polled data).
  const remoteRef = useRef(false)
  const syncedRef = useRef<string | null>(null)

  // ── Detect backend, load shared doc, then poll for remote changes ──
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const poll = async () => {
      const latest = await getRemoteState()
      if (cancelled || !latest) return
      const json = JSON.stringify(latest)
      if (json !== syncedRef.current) {
        syncedRef.current = json
        setData(latest)
      }
    }

    ;(async () => {
      const remote = await getRemoteState()
      if (cancelled) return
      if (remote === undefined) {
        // no backend (e.g. local `vite dev`) — stay on localStorage
        remoteRef.current = false
        setLoading(false)
        return
      }
      remoteRef.current = true
      if (remote) {
        syncedRef.current = JSON.stringify(remote)
        setData(remote)
      } else {
        // first connection — seed the shared document
        const seed = makeSeed()
        syncedRef.current = JSON.stringify(seed)
        await saveRemoteState(seed)
        if (!cancelled) setData(seed)
      }
      if (!cancelled) setLoading(false)
      timer = setInterval(poll, POLL_MS)
      window.addEventListener('focus', poll)
    })()

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      window.removeEventListener('focus', poll)
    }
  }, [])

  // ── Persist on every change (backend if available, else localStorage) ──
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (remoteRef.current) {
      const json = JSON.stringify(data)
      if (json === syncedRef.current) return // unchanged or echo of polled data
      syncedRef.current = json
      const handle = setTimeout(() => {
        saveRemoteState(data).catch((e) => console.error('Save failed:', e))
      }, 400)
      return () => clearTimeout(handle)
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage may be unavailable — non-fatal for a demo */
    }
  }, [data])

  const setRole = useCallback((role: Role) => {
    if (role === 'admin') {
      setSession({ role, employeeId: ADMIN_ID })
    } else {
      // entering the karyawan portal requires logging in as a specific person;
      // no one is impersonated by default
      setSession({ role, employeeId: null })
    }
  }, [])

  const login = useCallback((employeeId: string) => {
    setSession({ role: 'karyawan', employeeId })
  }, [])

  const logout = useCallback(() => {
    setSession({ role: 'karyawan', employeeId: null })
  }, [])

  const employeeById = useCallback(
    (id: string) => data.employees.find((e) => e.id === id),
    [data.employees],
  )

  const attendanceFor = useCallback(
    (employeeId: string, date: string) => {
      const rows = data.attendance.filter((a) => a.employeeId === employeeId && a.date === date)
      return {
        in: rows.find((r) => r.type === 'in'),
        out: rows.find((r) => r.type === 'out'),
      }
    },
    [data.attendance],
  )

  const clockIn = useCallback<StoreValue['clockIn']>(
    (employeeId, selfie, time, date) => {
      const d = date ?? todayISO()
      const t = time ?? nowHHMM()
      setData((prev) => {
        // prevent duplicate clock-in for the day
        if (prev.attendance.some((a) => a.employeeId === employeeId && a.date === d && a.type === 'in')) {
          return prev
        }
        const evaluated = evaluateClockIn(t, prev.settings)
        const record: AttendanceRecord = {
          id: newId('att'),
          employeeId,
          date: d,
          type: 'in',
          time: t,
          selfie,
          status: evaluated.status,
          lateMinutes: evaluated.lateMinutes,
        }
        return { ...prev, attendance: [...prev.attendance, record] }
      })
    },
    [],
  )

  const clockOut = useCallback<StoreValue['clockOut']>(
    (employeeId, selfie, time, date) => {
      const d = date ?? todayISO()
      const t = time ?? nowHHMM()
      setData((prev) => {
        if (prev.attendance.some((a) => a.employeeId === employeeId && a.date === d && a.type === 'out')) {
          return prev
        }
        const record: AttendanceRecord = {
          id: newId('att'),
          employeeId,
          date: d,
          type: 'out',
          time: t,
          selfie,
        }
        return { ...prev, attendance: [...prev.attendance, record] }
      })
    },
    [],
  )

  const submitLeave = useCallback<StoreValue['submitLeave']>((input) => {
    setData((prev) => {
      const req: LeaveRequest = {
        id: newId('lv'),
        ...input,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 16),
      }
      return { ...prev, leave: [req, ...prev.leave] }
    })
  }, [])

  const decideLeave = useCallback<StoreValue['decideLeave']>((id, status, note) => {
    setData((prev) => ({
      ...prev,
      leave: prev.leave.map((l) =>
        l.id === id
          ? { ...l, status, decidedAt: new Date().toISOString().slice(0, 16), decisionNote: note }
          : l,
      ),
    }))
  }, [])

  const submitOvertime = useCallback<StoreValue['submitOvertime']>((input) => {
    setData((prev) => {
      const req: OvertimeRequest = {
        id: newId('ot'),
        ...input,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 16),
      }
      return { ...prev, overtime: [req, ...prev.overtime] }
    })
  }, [])

  const decideOvertime = useCallback<StoreValue['decideOvertime']>((id, status, note) => {
    setData((prev) => ({
      ...prev,
      overtime: prev.overtime.map((o) =>
        o.id === id
          ? { ...o, status, decidedAt: new Date().toISOString().slice(0, 16), decisionNote: note }
          : o,
      ),
    }))
  }, [])

  const addActivity = useCallback<StoreValue['addActivity']>((input) => {
    setData((prev) => ({
      ...prev,
      activities: [...prev.activities, { id: newId('act'), ...input }],
    }))
  }, [])

  const updateActivity = useCallback<StoreValue['updateActivity']>((id, patch) => {
    setData((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }, [])

  const deleteActivity = useCallback<StoreValue['deleteActivity']>((id) => {
    setData((prev) => ({ ...prev, activities: prev.activities.filter((a) => a.id !== id) }))
  }, [])

  const updateSettings = useCallback<StoreValue['updateSettings']>((patch) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const addEmployee = useCallback<StoreValue['addEmployee']>((input) => {
    setData((prev) => {
      const emp: Employee = {
        id: newId('u'),
        name: input.name,
        email: input.email,
        title: input.title,
        birthDate: input.birthDate,
        role: 'karyawan',
        active: true,
        hue: Math.round((prev.employees.length * 53) % 360),
      }
      return { ...prev, employees: [...prev.employees, emp] }
    })
  }, [])

  const setEmployeeActive = useCallback<StoreValue['setEmployeeActive']>((id, active) => {
    setData((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, active } : e)),
    }))
  }, [])

  const deleteEmployee = useCallback<StoreValue['deleteEmployee']>((id) => {
    setData((prev) => {
      const target = prev.employees.find((e) => e.id === id)
      if (!target || target.role === 'admin') return prev // never delete the owner
      return {
        ...prev,
        employees: prev.employees.filter((e) => e.id !== id),
        attendance: prev.attendance.filter((a) => a.employeeId !== id),
        leave: prev.leave.filter((l) => l.employeeId !== id),
        overtime: prev.overtime.filter((o) => o.employeeId !== id),
        activities: prev.activities.filter((a) => a.employeeId !== id),
      }
    })
    // if the deleted person was the one logged into the employee portal, log them out
    setSession((s) => (s.employeeId === id ? { role: 'karyawan', employeeId: null } : s))
  }, [])

  const replaceAllData = useCallback<StoreValue['replaceAllData']>((next) => {
    setData(next)
  }, [])

  const resetData = useCallback(() => {
    setData(makeSeed())
    setSession({ role: 'karyawan', employeeId: null })
  }, [])

  const currentEmployee = useMemo(
    () => data.employees.find((e) => e.id === session.employeeId) ?? data.employees[0],
    [data.employees, session.employeeId],
  )

  const value: StoreValue = {
    data,
    settings: data.settings,
    session,
    loading,
    currentEmployee,
    setRole,
    login,
    logout,
    employeeById,
    attendanceFor,
    clockIn,
    clockOut,
    submitLeave,
    decideLeave,
    submitOvertime,
    decideOvertime,
    addActivity,
    updateActivity,
    deleteActivity,
    updateSettings,
    addEmployee,
    setEmployeeActive,
    deleteEmployee,
    replaceAllData,
    resetData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
