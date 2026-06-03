// ───────────────────────────────────────────────────────────────
// App store — single source of truth held in React state. Persisted to
// Supabase (one JSON document, synced realtime to every device) when
// configured; otherwise mirrored to localStorage (single-device demo).
// Every view reads/writes through `useStore()`; nothing mutates `data`
// directly.
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
import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'absensimentor.v3'
const ADMIN_ID = 'u_admin'
const DOC_ID = 'singleton'

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

/** empty shell used while the shared document loads from Supabase */
function emptyAppData(): AppData {
  return {
    settings: { clockIn: '08:00', clockOut: '17:00', graceMinutes: 5 },
    employees: [],
    attendance: [],
    leave: [],
    overtime: [],
    activities: [],
  }
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
  /** true while the shared document is still loading from the backend */
  loading: boolean
  /** whether a central backend (Supabase) is wired up */
  backed: boolean
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

  resetData: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => (isSupabaseConfigured ? emptyAppData() : load()))
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session>({ role: 'karyawan', employeeId: null })

  // JSON of the last value written-to / received-from the backend — guards
  // against re-persisting our own echo (which would loop) and re-applying
  // realtime events we originated.
  const syncedRef = useRef<string | null>(null)

  // ── Initial load + realtime subscription (Supabase only) ──
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const sb = supabase
    let cancelled = false

    ;(async () => {
      const { data: row, error } = await sb
        .from('app_state')
        .select('data')
        .eq('id', DOC_ID)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error('Supabase load failed:', error.message)
        setLoading(false)
        return
      }
      if (row?.data) {
        syncedRef.current = JSON.stringify(row.data)
        setData(row.data as AppData)
      } else {
        // first connection — seed the shared document
        const seed = makeSeed()
        syncedRef.current = JSON.stringify(seed)
        await sb.from('app_state').upsert({ id: DOC_ID, data: seed })
        if (!cancelled) setData(seed)
      }
      if (!cancelled) setLoading(false)
    })()

    const channel = sb
      .channel('app_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_state' },
        (payload) => {
          const next = (payload.new as { data?: AppData } | null)?.data
          if (!next) return
          const json = JSON.stringify(next)
          if (json === syncedRef.current) return // our own echo
          syncedRef.current = json
          setData(next)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      sb.removeChannel(channel)
    }
  }, [])

  // ── Persist on every change ──
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (isSupabaseConfigured && supabase) {
      if (loading) return
      const json = JSON.stringify(data)
      if (json === syncedRef.current) return // unchanged or echo
      syncedRef.current = json
      const client = supabase
      const handle = setTimeout(() => {
        client
          .from('app_state')
          .upsert({ id: DOC_ID, data, updated_at: new Date().toISOString() })
          .then(({ error }) => {
            if (error) console.error('Supabase save failed:', error.message)
          })
      }, 250)
      return () => clearTimeout(handle)
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* storage may be unavailable — non-fatal for a demo */
    }
  }, [data, loading])

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
    backed: isSupabaseConfigured,
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
    resetData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
