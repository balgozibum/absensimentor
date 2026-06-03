// ───────────────────────────────────────────────────────────────
// SelfieCapture — live webcam capture for clock-in/out (HANDOVER §3.1).
// Mirrored preview, capture-to-canvas → JPEG data URL. Falls back to a
// file picker when the camera is unavailable or permission is denied.
// ───────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react'
import { IconCamera, IconRefresh, IconCheck, IconAlert } from './icons'
import { Button, cx } from './ui'

type Phase = 'starting' | 'live' | 'captured' | 'error'

export function SelfieCapture({
  onConfirm,
  onCancel,
  confirmLabel = 'Gunakan foto ini',
}: {
  onConfirm: (dataUrl: string) => void
  onCancel?: () => void
  confirmLabel?: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('starting')
  const [shot, setShot] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setPhase('starting')
    setShot(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setPhase('live')
    } catch (err) {
      setErrorMsg(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Akses kamera ditolak. Izinkan kamera di browser, atau unggah foto.'
          : 'Kamera tidak tersedia di perangkat ini. Silakan unggah foto.',
      )
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const w = video.videoWidth || 640
    const h = video.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // mirror horizontally to match the preview
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    const url = canvas.toDataURL('image/jpeg', 0.82)
    setShot(url)
    setPhase('captured')
    stop()
  }, [stop])

  const retake = useCallback(() => {
    start()
  }, [start])

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setShot(String(reader.result))
      setPhase('captured')
      stop()
    }
    reader.readAsDataURL(file)
  }, [stop])

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line-strong bg-ink/90">
        {/* live video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={cx(
            'h-full w-full -scale-x-100 object-cover transition-opacity',
            phase === 'live' ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* captured still */}
        {phase === 'captured' && shot && (
          <img src={shot} alt="Selfie" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {/* starting spinner */}
        {phase === 'starting' && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <div className="flex flex-col items-center gap-2">
              <IconCamera className="h-7 w-7 animate-pulse-soft" />
              <span className="text-xs">Menyalakan kamera…</span>
            </div>
          </div>
        )}

        {/* error */}
        {phase === 'error' && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div className="flex flex-col items-center gap-2 text-white/85">
              <IconAlert className="h-7 w-7 text-warn" />
              <span className="text-[13px] leading-snug">{errorMsg}</span>
            </div>
          </div>
        )}

        {/* framing guide on live */}
        {phase === 'live' && (
          <>
            <div className="pointer-events-none absolute inset-5 rounded-xl border border-white/25" />
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm">
              Posisikan wajah di dalam bingkai
            </div>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onFile}
      />

      <div className="mt-4 flex w-full items-center justify-center gap-2">
        {phase === 'live' && (
          <>
            <Button variant="primary" size="lg" onClick={capture} className="flex-1">
              <IconCamera className="h-5 w-5" />
              Ambil Foto
            </Button>
            {onCancel && (
              <Button variant="ghost" size="lg" onClick={onCancel}>
                Batal
              </Button>
            )}
          </>
        )}

        {phase === 'captured' && (
          <>
            <Button variant="secondary" size="lg" onClick={retake}>
              <IconRefresh className="h-4.5 w-4.5" />
              Ulangi
            </Button>
            <Button variant="primary" size="lg" onClick={() => shot && onConfirm(shot)} className="flex-1">
              <IconCheck className="h-5 w-5" />
              {confirmLabel}
            </Button>
          </>
        )}

        {phase === 'error' && (
          <>
            <Button variant="secondary" size="lg" onClick={() => fileRef.current?.click()} className="flex-1">
              Unggah Foto
            </Button>
            <Button variant="ghost" size="lg" onClick={start}>
              <IconRefresh className="h-4.5 w-4.5" />
              Coba lagi
            </Button>
          </>
        )}

        {phase === 'starting' && (
          <Button variant="secondary" size="lg" disabled className="flex-1">
            Memuat…
          </Button>
        )}
      </div>
    </div>
  )
}
