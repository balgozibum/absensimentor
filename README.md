# AbsensiMentor

Aplikasi **absensi karyawan internal** (tool internal, satu perusahaan, pegawai
remote). Dibangun mengikuti `../HANDOVER.md`. Tahap ini **frontend saja** — belum
ada backend; seluruh data disimpan di **local state** + `localStorage`.

> Identitas visual: *editorial operations almanac* — kanvas ivory, brand navy,
> aksen copper, judul serif (Fraunces), body Hanken Grotesk, waktu IBM Plex Mono.
> **Light mode** sesuai brief.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview
```

## Stack

Vite 8 · React 19 · TypeScript (strict) · Tailwind CSS v4 (`@tailwindcss/vite`).
Tanpa dependensi runtime tambahan.

## Dua portal (tanpa autentikasi)

Gunakan **pengalih peran** di pojok kiri-bawah untuk berpindah **Karyawan ⇄
Admin**. Di portal karyawan, pemilih "Masuk sebagai" memilih pegawai yang sedang
dilihat (pengganti login untuk demo).

### Portal Karyawan
- **Beranda** — sapaan, status absensi hari ini, statistik mingguan, pratinjau timeline.
- **Absensi** — jam langsung, absen masuk/pulang dengan **selfie wajib** (kamera
  `getUserMedia`, fallback unggah), deteksi terlambat otomatis, riwayat.
- **Cuti** — ajukan cuti (tahunan/izin/sakit) + lacak status.
- **Lembur** — **pra-persetujuan**: lembur harus disetujui *sebelum* dikerjakan.
- **Aktivitas** — timeline harian; isi blok aktivitas; celah otomatis terlihat.

### Portal Admin (pemilik)
- **Ringkasan** — rekap kehadiran hari ini, "perlu perhatian" (celah panjang),
  antrean persetujuan.
- **Persetujuan** — semua pengajuan cuti & lembur terpusat; setujui/tolak.
- **Timeline** — timeline aktivitas per pegawai (tampilan hari/minggu); celah
  panjang ditandai.
- **Pengaturan** — jam kerja perusahaan (+ toleransi keterlambatan) & kelola pegawai.

## Aturan bisnis utama

1. **Lembur = pra-persetujuan.** Hanya lembur yang disetujui yang sah.
2. **Keterlambatan otomatis** dari jam kerja tetap + toleransi.
3. **Celah timeline = indikasi tidak bekerja**; celah panjang ditandai untuk admin.
4. **Semua persetujuan terpusat** ke satu admin.

## Struktur

```
src/
  types.ts            # model domain
  lib/
    time.ts           # util waktu/tanggal, deteksi terlambat, segmentasi timeline
    seed.ts           # data demo deterministik (relatif terhadap "hari ini")
    store.tsx         # store global (Context) + localStorage
  components/
    ui.tsx            # primitif UI (Button, Card, Field, Modal, Badge, …)
    icons.tsx         # set ikon garis
    Shell.tsx         # kerangka aplikasi (nav + pengalih peran)
    SelfieCapture.tsx # kamera selfie + fallback unggah
    Timeline.tsx      # visualisasi timeline + penanda celah
  views/
    shared.tsx        # blok lintas-view (StatCard, PersonLine, badge status)
    employee/         # Dashboard, Attendance, Leave, Overtime, Activity
    admin/            # Dashboard, Approvals, Timelines, Settings
```

> Tombol **"Atur ulang data demo"** (kiri bawah) mengembalikan seluruh data
> contoh ke kondisi awal.
