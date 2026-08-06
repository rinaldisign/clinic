# Tur Virtual 360°

Halaman full-page viewer 360° dengan denah mini interaktif di pojok kanan bawah.

## Cara publish ke GitHub Pages

1. Buat repository baru di GitHub, misalnya `my-360-tour`.
2. Upload semua isi folder ini (`index.html`, `css/`, `js/`, `lib/`, `assets/`) ke root repository tersebut — bisa lewat "Add file → Upload files" di web GitHub, atau lewat git:
   ```bash
   git init
   git add .
   git commit -m "Initial 360 viewer"
   git branch -M main
   git remote add origin https://github.com/USERNAME/my-360-tour.git
   git push -u origin main
   ```
3. Di repo GitHub: **Settings → Pages → Source**, pilih branch `main` dan folder `/ (root)`, lalu Save.
4. Tunggu 1–2 menit, halaman akan aktif di:
   `https://USERNAME.github.io/my-360-tour/`

## Kalau mau ini jadi homepage utama GitHub kamu

Buat/rename repository jadi persis `USERNAME.github.io` (ganti USERNAME dengan username GitHub kamu), isi root repo dengan file yang sama seperti di atas. Nanti otomatis aktif di `https://USERNAME.github.io/` tanpa perlu setting Pages manual.

## Menambah titik pandang (viewpoint) baru

Semua pengaturan scene ada di `js/app.js`, di bagian array `scenes` paling atas.

1. Taruh file panorama JPG baru di folder `assets/`.
2. Tambahkan objek baru ke array `scenes`, contoh:
   ```js
   {
     id: "scene2",
     title: "Ruang Tunggu",
     panorama: "assets/panorama2.jpg",
     dot: { x: 50, y: 40 }, // posisi titik di denah, dalam persen (%)
     hotspots: [],
   }
   ```
3. Titik di denah otomatis muncul dan bisa diklik untuk pindah scene.

Untuk cari posisi `dot` (persen x/y) dengan mudah: buka gambar denah di aplikasi edit gambar, lihat koordinat piksel titik yang diinginkan, lalu:
```
x% = (posisi_x_piksel / lebar_gambar) * 100
y% = (posisi_y_piksel / tinggi_gambar) * 100
```

## Menambah panah navigasi di dalam panorama

Selain titik di denah, kamu juga bisa menaruh panah yang menempel langsung
di dalam gambar 360 (ikut berputar saat pandangan digeser) — dipakai untuk
pindah ke scene lain tanpa harus buka denah.

Isi array `hotspots` pada scene yang bersangkutan, contoh menghubungkan
`scene1` ke `scene2` (dan sebaliknya):
```js
// di dalam objek scene1:
hotspots: [
  { pitch: -5, yaw: 120, target: "scene2", text: "Ruang Tunggu" }
]

// di dalam objek scene2:
hotspots: [
  { pitch: -5, yaw: 300, target: "scene1", text: "Ruang Konsultasi" }
]
```

- `pitch` — sudut atas/bawah dalam derajat (0 = sejajar mata)
- `yaw` — sudut kiri/kanan dalam derajat (0–360)
- `target` — id scene tujuan
- `text` — label singkat yang muncul di bawah panah

**Cara cari angka pitch/yaw yang pas:** buka halaman di browser, arahkan
pandangan panorama ke lokasi yang mau dikasih panah (misalnya ke arah
pintu ruangan berikutnya), lalu buka Console browser (klik kanan →
Inspect → tab Console) dan ketik:
```js
viewer.getPitch()
viewer.getYaw()
```
Catat kedua angka itu, lalu masukkan ke `pitch` dan `yaw` di atas.

## Struktur file

```
index.html          halaman utama
css/style.css        tampilan (tema, panel, kompas, denah)
js/app.js             logic viewer, kompas, dan navigasi denah
lib/                  Pannellum (library viewer 360, self-hosted)
assets/panorama1.jpg  gambar 360 (equirectangular, 8000x4000)
assets/floorplan.jpg  gambar denah
```
