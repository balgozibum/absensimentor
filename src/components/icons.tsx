// Inline line-icon set. Single consistent stroke style. Each icon
// inherits `currentColor` and accepts standard SVG props (className, etc.).

import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

function Base({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export const IconClock = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Base>
)
export const IconClockIn = (p: P) => (
  <Base {...p}><path d="M3 12h11" /><path d="M10 8l4 4-4 4" /><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /></Base>
)
export const IconClockOut = (p: P) => (
  <Base {...p}><path d="M14 12H3" /><path d="M7 8l-4 4 4 4" /><path d="M10 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8" /></Base>
)
export const IconCalendar = (p: P) => (
  <Base {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></Base>
)
export const IconCamera = (p: P) => (
  <Base {...p}><path d="M4 8.5a2 2 0 0 1 2-2h1.2l1-1.6a1 1 0 0 1 .85-.48h5.9a1 1 0 0 1 .85.48l1 1.6H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></Base>
)
export const IconCheck = (p: P) => (<Base {...p}><path d="M5 12.5l4.2 4.2L19 7" /></Base>)
export const IconX = (p: P) => (<Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>)
export const IconPlus = (p: P) => (<Base {...p}><path d="M12 5v14M5 12h14" /></Base>)
export const IconChevronLeft = (p: P) => (<Base {...p}><path d="M14.5 6l-6 6 6 6" /></Base>)
export const IconChevronRight = (p: P) => (<Base {...p}><path d="M9.5 6l6 6-6 6" /></Base>)
export const IconChevronDown = (p: P) => (<Base {...p}><path d="M6 9.5l6 6 6-6" /></Base>)
export const IconUser = (p: P) => (
  <Base {...p}><circle cx="12" cy="8" r="3.6" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></Base>
)
export const IconUsers = (p: P) => (
  <Base {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c0-3.1 2.7-4.8 6-4.8s6 1.7 6 4.8" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6.3M17.5 14.8c2.3.5 3.9 2 3.9 4.7" /></Base>
)
export const IconSettings = (p: P) => (
  <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5l1.4 2.6 2.9-.6.6 2.9 2.6 1.4-1.3 2.6 1.3 2.6-2.6 1.4-.6 2.9-2.9-.6L12 21.5l-1.4-2.6-2.9.6-.6-2.9-2.6-1.4 1.3-2.6-1.3-2.6 2.6-1.4.6-2.9 2.9.6z" /></Base>
)
export const IconLayout = (p: P) => (
  <Base {...p}><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M10 10v10" /></Base>
)
export const IconLeave = (p: P) => (
  <Base {...p}><path d="M5 21V7a2 2 0 0 1 2-2h7l5 4v12" /><path d="M14 5v4h5" /><path d="M9 13h6M9 16.5h4" /></Base>
)
export const IconOvertime = (p: P) => (
  <Base {...p}><path d="M7 3.5h10M7 20.5h10" /><path d="M8 3.5c0 4 8 5 8 8.5s-8 4.5-8 8.5" /><path d="M16 3.5c0 4-8 5-8 8.5" opacity="0" /></Base>
)
export const IconActivity = (p: P) => (
  <Base {...p}><path d="M3 12h4l2-6 4 14 2-8h6" /></Base>
)
export const IconCoffee = (p: P) => (
  <Base {...p}><path d="M4 8h13v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" /><path d="M17 9h1.6a2.4 2.4 0 0 1 0 4.8H17" /><path d="M8 3.5v2M12 3.5v2" /></Base>
)
export const IconAlert = (p: P) => (
  <Base {...p}><path d="M12 4.5l8.5 14.5H3.5z" /><path d="M12 10v4M12 16.8v.2" /></Base>
)
export const IconTrash = (p: P) => (
  <Base {...p}><path d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M6 7l.8 12a2 2 0 0 0 2 1.9h6.4a2 2 0 0 0 2-1.9L18 7" /></Base>
)
export const IconEdit = (p: P) => (
  <Base {...p}><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Base>
)
export const IconRefresh = (p: P) => (
  <Base {...p}><path d="M20 11a8 8 0 0 0-14-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14 4.5l2-1.5" /><path d="M20 20v-4h-4" /></Base>
)
export const IconSearch = (p: P) => (
  <Base {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></Base>
)
export const IconMail = (p: P) => (
  <Base {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M4 7l8 5.5L20 7" /></Base>
)
export const IconBuilding = (p: P) => (
  <Base {...p}><path d="M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16" /><path d="M14 9h4a1 1 0 0 1 1 1v11" /><path d="M8 8h2M8 12h2M8 16h2M3 21h18" /></Base>
)
export const IconSunrise = (p: P) => (
  <Base {...p}><path d="M3 18h18M5.5 18a6.5 6.5 0 0 1 13 0" /><path d="M12 3v4M5 9L3.5 7.5M19 9l1.5-1.5" /></Base>
)
export const IconArrowRight = (p: P) => (<Base {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Base>)
export const IconSparkle = (p: P) => (
  <Base {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Base>
)
export const IconHourglass = (p: P) => (
  <Base {...p}><path d="M7 3.5h10M7 20.5h10" /><path d="M8 3.5c0 4 8 5 8 8.5s-8 4.5-8 8.5M16 3.5c0 4-8 5-8 8.5s8 4.5 8 8.5" /></Base>
)
export const IconLogOut = (p: P) => (
  <Base {...p}><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M9 12h11M16 8l4 4-4 4" /></Base>
)
export const IconDot = (p: P) => (<Base {...p}><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></Base>)
export const IconCopy = (p: P) => (
  <Base {...p}><rect x="9" y="9" width="11" height="11" rx="2.2" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5V4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></Base>
)
export const IconKey = (p: P) => (
  <Base {...p}><circle cx="8" cy="15" r="4" /><path d="M10.8 12.2 20 3M17 6l2 2M14 9l1.8 1.8" /></Base>
)
export const IconEye = (p: P) => (
  <Base {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></Base>
)
export const IconDownload = (p: P) => (
  <Base {...p}><path d="M12 3.5v11M8 11l4 4 4-4" /><path d="M4.5 18.5v.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-.5" /></Base>
)
export const IconUpload = (p: P) => (
  <Base {...p}><path d="M12 20.5v-11M8 13l4-4 4 4" /><path d="M4.5 5.5V5A1.5 1.5 0 0 1 6 3.5h12A1.5 1.5 0 0 1 19.5 5v.5" /></Base>
)
export const IconEyeOff = (p: P) => (
  <Base {...p}><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.3 3M6.5 7.8A15.6 15.6 0 0 0 2.5 12s3.5 6 9.5 6a9.4 9.4 0 0 0 4-.9" /><path d="M9.8 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></Base>
)
