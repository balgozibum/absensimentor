// Talks to the /api/state serverless backend (Vercel Blob).
//   getRemoteState() → AppData (loaded) | null (backend up, empty) | undefined (no backend)
//   saveRemoteState(data) → persist the whole document
// Under plain `vite dev` there is no /api route, so the request resolves to
// the SPA HTML and JSON parsing fails → undefined → the store falls back to
// localStorage (single-device).

import type { AppData } from '../types'

export async function getRemoteState(): Promise<AppData | null | undefined> {
  try {
    const res = await fetch('/api/state', { headers: { 'cache-control': 'no-store' } })
    if (!res.ok) return undefined
    const json = (await res.json()) as { data?: AppData | null }
    return (json?.data ?? null) as AppData | null
  } catch {
    return undefined
  }
}

export async function saveRemoteState(data: AppData): Promise<void> {
  await fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
}
