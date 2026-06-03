// Serverless backend for AbsensiMentor.
// Stores the whole app state as one JSON document in a PRIVATE Vercel Blob
// store, so every browser/device reads & writes the same data. The Blob token
// (BLOB_READ_WRITE_TOKEN) is managed by Vercel and lives only here on the
// server — never exposed to the browser.

import { put, list } from '@vercel/blob'

const PATH = 'state.json'

export default async function handler(req, res) {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) {
    res.status(500).json({ error: 'Backend not configured' })
    return
  }

  try {
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: PATH, token })
      const blob = blobs.find((b) => b.pathname === PATH)
      res.setHeader('Cache-Control', 'no-store')
      if (!blob) {
        res.status(200).json({ data: null })
        return
      }
      const r = await fetch(blob.url, { headers: { authorization: `Bearer ${token}` } })
      if (!r.ok) {
        res.status(502).json({ error: 'blob read failed', status: r.status })
        return
      }
      res.status(200).json({ data: JSON.parse(await r.text()) })
      return
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body
      const data = body && body.data
      if (data === undefined) {
        res.status(400).json({ error: 'missing data' })
        return
      }
      await put(PATH, JSON.stringify(data), {
        access: 'private',
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        token,
      })
      res.status(200).json({ ok: true })
      return
    }

    res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
