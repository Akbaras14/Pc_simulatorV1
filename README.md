# Bengkel Coding - Simulator Rakit PC 3D

Simulator interaktif untuk belajar merakit PC, mengatur BIOS, dan menggunakan desktop simulasi berbasis web.

Dikembangkan oleh **Akbar Aditiya S / Bengkel Coding** untuk tugas Arsitektur dan Organisasi Komputer dengan dosen **Muhammad Santoso**.

## Fitur

- Perakitan motherboard, CPU, RAM, SSD, pendingin, dan PSU melalui drag ke siluet pemasangan.
- Meja komputer 3D; PC berpindah ke samping meja setelah rakitan selesai.
- Penempatan monitor, mouse, dan keyboard. Kabel dengan aliran cahaya muncul setelah keyboard terpasang, melalui belakang meja dan monitor.
- Flashdrive wajib dicolokkan sebelum PC dinyalakan.
- BIOS: F2 / DEL / ESC, Boot Priority, First Boot USB, F10, dan Yes.
- Loading Windows, animasi Bengkel Coding, dan desktop.
- Start dengan pencarian aplikasi, Matikan, dan Mulai ulang.
- Word: ribbon, pemformatan, tabel, layout, zoom, undo/redo, autosave, unduh HTML, dan cetak/PDF.
- Note dan kalkulator dengan tombol, keyboard, persen, akar, kuadrat, operasi berantai, dan memori.
- Inspeksi model 3D dengan kontrol putar dan zoom.

## Menjalankan

Gunakan Python 3, Git LFS, dan browser yang mendukung WebGL. Koneksi internet diperlukan untuk memuat Three.js dari CDN. Tidak diperlukan database.

```powershell
git lfs install
git clone https://github.com/Akbaras14/Pc_simulatorV1.git
cd Pc_simulatorV1
git lfs pull
py -m http.server 8080 --bind 127.0.0.1 --directory src
```

Buka **http://127.0.0.1:8080/**. Jika `py` tidak tersedia, gunakan `python` atau `python3`. Pada Windows, `npm start` juga tersedia jika Node.js terpasang.

## Cara bermain

1. Klik **Mulai simulasi**, lalu **Lanjutkan step**.
2. Tarik komponen ke siluet hijau sampai PC selesai dirakit.
3. Pasang monitor, mouse, dan keyboard di meja. Kabel muncul setelah keyboard terpasang.
4. Colokkan flashdrive ke PC, lalu klik **Nyalakan PC**.
5. Tekan **F2**, **DEL**, atau **ESC** saat PC mulai menyala. Tombol pada sidebar juga tersedia.
6. Buka **Boot / Boot Priority**, lalu pilih **Flashdisk (USB / Removable Device)** sebagai **First Boot**.
7. Tekan **F10** dan pilih **Yes**.
8. Tunggu loading dan animasi selesai, lalu buka aplikasi melalui desktop, taskbar, atau Start.

Jika BIOS terlewat atau First Boot masih SSD, coba kembali dengan menyalakan PC.

## Sesi aplikasi langsung

Setelah server aktif, aplikasi dapat diuji tanpa mengulang perakitan:

| Aplikasi | Alamat |
| --- | --- |
| Word | http://127.0.0.1:8080/word.html |
| Kalkulator | http://127.0.0.1:8080/calculator.html |

Word menyimpan dokumen otomatis di browser yang sama. Proyek ini adalah simulasi; tidak memasang Windows atau Microsoft Office sungguhan. Ekspor Word tersedia sebagai HTML dan cetak/PDF; DOCX belum didukung.

## Pengujian

Pemeriksaan sintaks, aset, alur simulator, dan kalkulator membutuhkan Node.js:

```powershell
npm test
```

Pemeriksaan melalui HTTP membutuhkan server simulator yang aktif:

```powershell
node check-assets.cjs --http
```

Tes browser membutuhkan Chrome dan Playwright:

```powershell
npm install --no-save --package-lock=false playwright three@0.163.0
node check-word.cjs
$env:THREE_MODULE_PATH = (Resolve-Path node_modules/three).Path
node check-monitor.cjs
node check-keyboard-cables.cjs
```

Dua tes 3D terakhir membutuhkan server pada port 8080. Tes menggunakan sesi Chrome terpisah. Tes Word berjalan tanpa reload. Tes 3D menyiapkan scene melalui hook khusus pengujian; tes kabel kemudian menyeret keyboard untuk memeriksa koneksi dan aliran cahaya.

## Struktur proyek

```text
src/
  index.html               Simulator, BIOS, desktop, dan Start
  word.html/css/js         Aplikasi Word simulasi
  calculator.html/css/js   Aplikasi kalkulator
  favicon.ico              Ikon Bengkel Coding
  assets/models/           Model 3D, tekstur, dan lisensi aset
  assets/images/           Identitas Bengkel Coding
  assets/gif/              Animasi Bengkel Coding
check-assets.cjs            Pemeriksaan aplikasi dan aset
check-calculator.cjs        Tes kalkulator
check-word.cjs              Tes browser Word
check-monitor.cjs           Tes monitor 3D dan desktop
check-keyboard-cables.cjs    Tes keyboard dan kabel
restore-assets.cjs          Pemulihan aset Git LFS
```

## Teknologi dan lisensi

HTML, CSS, JavaScript, Three.js **0.163.0**, GLTFLoader, OrbitControls, CanvasTexture, dan Python HTTP server untuk pengembangan lokal.

Kode simulator menggunakan [MIT License](LICENSE). Proyek dikembangkan dari PCBuild3R oleh Vincent Chin. Model 3D mempunyai lisensi masing-masing pada `license.txt` di folder model; aset pihak ketiga tidak otomatis mengikuti lisensi MIT kode aplikasi. Kredit model meja, monitor, mouse, keyboard, dan flashdrive tersedia pada panduan simulator.

Repository: https://github.com/Akbaras14/Pc_simulatorV1
