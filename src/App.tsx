import { useMemo, useState } from 'react'
import { StoreProvider, useStore } from './lib/store'
import { Shell, type NavItem } from './components/Shell'
import {
  IconActivity,
  IconCalendar,
  IconClock,
  IconHourglass,
  IconLayout,
  IconLeave,
  IconSettings,
} from './components/icons'

import { EmployeeDashboard } from './views/employee/Dashboard'
import { AttendanceView } from './views/employee/Attendance'
import { LeaveView } from './views/employee/Leave'
import { OvertimeView } from './views/employee/Overtime'
import { ActivityView } from './views/employee/Activity'

import { AdminDashboard } from './views/admin/Dashboard'
import { ApprovalsView } from './views/admin/Approvals'
import { TimelinesView } from './views/admin/Timelines'
import { SettingsView } from './views/admin/Settings'

function Workspace() {
  const { session, data } = useStore()
  const [employeePage, setEmployeePage] = useState('dashboard')
  const [adminPage, setAdminPage] = useState('dashboard')

  const pendingCount =
    data.leave.filter((l) => l.status === 'pending').length +
    data.overtime.filter((o) => o.status === 'pending').length

  const isAdmin = session.role === 'admin'
  const page = isAdmin ? adminPage : employeePage
  const setPage = isAdmin ? setAdminPage : setEmployeePage

  const navItems: NavItem[] = useMemo(() => {
    const ic = { className: 'h-[22px] w-[22px]' }
    if (isAdmin) {
      return [
        { key: 'dashboard', label: 'Ringkasan', icon: <IconLayout {...ic} /> },
        { key: 'approvals', label: 'Persetujuan', icon: <IconCalendar {...ic} />, badge: pendingCount || undefined },
        { key: 'timelines', label: 'Timeline', icon: <IconActivity {...ic} /> },
        { key: 'settings', label: 'Pengaturan', icon: <IconSettings {...ic} /> },
      ]
    }
    return [
      { key: 'dashboard', label: 'Beranda', icon: <IconLayout {...ic} /> },
      { key: 'attendance', label: 'Absensi', icon: <IconClock {...ic} /> },
      { key: 'leave', label: 'Cuti', icon: <IconLeave {...ic} /> },
      { key: 'overtime', label: 'Lembur', icon: <IconHourglass {...ic} /> },
      { key: 'activity', label: 'Aktivitas', icon: <IconActivity {...ic} /> },
    ]
  }, [isAdmin, pendingCount])

  return (
    <Shell navItems={navItems} page={page} onNavigate={setPage}>
      {isAdmin ? <AdminRoutes page={adminPage} go={setAdminPage} /> : <EmployeeRoutes page={employeePage} go={setEmployeePage} />}
    </Shell>
  )
}

function EmployeeRoutes({ page, go }: { page: string; go: (k: string) => void }) {
  switch (page) {
    case 'attendance':
      return <AttendanceView />
    case 'leave':
      return <LeaveView />
    case 'overtime':
      return <OvertimeView />
    case 'activity':
      return <ActivityView />
    default:
      return <EmployeeDashboard onNavigate={go} />
  }
}

function AdminRoutes({ page, go }: { page: string; go: (k: string) => void }) {
  switch (page) {
    case 'approvals':
      return <ApprovalsView />
    case 'timelines':
      return <TimelinesView />
    case 'settings':
      return <SettingsView />
    default:
      return <AdminDashboard onNavigate={go} />
  }
}

export default function App() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  )
}
