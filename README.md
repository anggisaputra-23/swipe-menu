# Swipe.menu — Buku Menu Digital Interaktif

Template buku menu digital untuk UMKM: unggah foto menu, lalu menu tampil
seperti buku asli dengan animasi membalik halaman (library
[StPageFlip](https://github.com/StPageFlip/Page-Flip)).

Antarmuka menggunakan HTML, CSS, dan JavaScript tanpa framework. Akun dan
publikasi menu berjalan pada server Node.js 24 atau lebih baru. Jalankan
`npm start`, lalu buka `http://localhost:3001`.

Desain: mode terang memakai kertas hangat, mode gelap memakai hijau arang,
keduanya memakai aksen terakota;
tipografi editorial menjaga hubungan visual dengan buku cetak. Judul memakai
Fraunces (serif editorial) karena produk ini adalah "buku", isi memakai Plus
Jakarta Sans, dan DM Mono dipakai untuk angka halaman serta label teknis.

Warna utama dapat diganti dari token di bagian `1. Token & tema` pada
`css/style.css`. Ubah `--warna-aksen`, `backgroundColor` dan `backgroundColorLight` di
`js/config.js`, serta `--halaman`, token
permukaan, teks, dan garis untuk menyesuaikan palet terang; nilai tema gelap
berada pada selector `[data-tema="gelap"]` dan mode otomatis. Warna merek pada
`js/config.js` menimpa token yang sama, jadi ubah di sana untuk tiap klien.

---

## 1. Cara Menjalankan

1. Untuk memakai akun dan menerbitkan menu, jalankan server aplikasi dengan
   `npm start`, lalu buka `http://localhost:3001`. Mode ini menyimpan akun,
   data menu, dan gambar di folder `data/`.
2. Untuk uji tampilan statis, `index.html` masih dapat dibuka langsung, tetapi
   fitur akun dan link publik memerlukan server aplikasi.
3. Saat pertama dibuka, website menunggu Anda mengunggah halaman menu. Bagian
   **Contoh gaya buku** memperlihatkan pilihan bentuk dan jilid buku. Tombol
   **Gunakan menu contoh** di dalam alat memuat menu contoh tanpa langsung membuka buku.

> Library flipbook diambil dari CDN (`cdn.jsdelivr.net`), jadi peramban perlu
> koneksi internet saat pertama dibuka. Bila ingin sepenuhnya offline, unduh
> `page-flip.browser.js` lalu ganti tag `<script>` di `index.html` dengan file
> lokal.

### Akun dan link menu

1. Pilih **Akun pemilik**, lalu buat akun dengan email dan kata sandi.
2. Kembali ke penyusun, unggah dan atur halaman seperti biasa.
3. Isi nama kafe dan alamat menu, lalu pilih **Simpan & terbitkan**. Alamat
   seperti `/menu/kopi-senja` dapat dibagikan tanpa akun.
4. Masuk ke **Akun pemilik** untuk menyalin link, mengubah menu, atau menghapusnya.

Untuk menjalankan lewat Docker, gunakan `docker compose up --build`. Volume
`swipemenu-data` menyimpan database dan gambar agar tetap ada saat container
diganti. Agar pelanggan dapat membukanya di internet, pasang aplikasi pada
server dengan domain dan HTTPS; server satu komputer lokal hanya bisa dibuka
oleh perangkat yang dapat menjangkaunya. Saat berada di balik reverse proxy,
isi `PUBLIC_ORIGIN` dengan URL HTTPS dan set `TRUST_PROXY=true` agar validasi
asal permintaan, cookie, dan pembatas percobaan akun mengikuti proxy tepercaya.

### Deploy ke Vercel

1. Impor repository GitHub `anggisaputra-23/swipe-menu` sebagai project di Vercel.
2. Buat database Neon PostgreSQL dan tambahkan connection string sebagai
   environment variable `DATABASE_URL` pada project Vercel.
3. Buat Vercel Blob store dan tambahkan token tulis-baca sebagai
   `BLOB_READ_WRITE_TOKEN`.
4. Deploy project. Tabel akun, sesi, dan menu dibuat otomatis saat API pertama
   kali dipanggil. Tetapkan `PUBLIC_ORIGIN` ke origin HTTPS project bila ingin
   memaksa pemeriksaan origin.

Vercel menjalankan `api/index.js` sebagai function dan menyajikan HTML, CSS,
JavaScript, serta aset contoh secara statis. Gambar unggahan disimpan pada Blob;
setiap halaman menu yang diunggah dibatasi 4 MB agar tetap di bawah batas request
function. Nilai rahasia cukup dimasukkan melalui pengaturan Environment Variables
Vercel dan jangan pernah di-commit ke repository.

## 2. Struktur Folder

```
buku-menu/
├── index.html            ← halaman utama (dua layar: pengaturan & buku)
├── css/
│   └── style.css         ← seluruh tampilan (mobile-first, mode terang/gelap)
├── js/
│   ├── config.js         ← KONFIGURASI (satu-satunya file yang sering diedit)
│   └── app.js            ← logika: unggah, urutan, validasi, flipbook, zoom, tema
├── assets/
│   ├── logo.svg          ← logo contoh
│   └── menu/             ← gambar menu contoh (rasio A4, 1240 × 1754)
│       ├── sampul-kopi.svg, sampul-makanan.svg,
│       │   sampul-minuman.svg, sampul-promo.svg   ← sampul tiap menu siap pakai
│       ├── 02-kopi-panas.svg, 03-minuman-dingin.svg,
│       │   04-makanan.svg, 05-camilan-promo.svg   ← halaman isi
│       ├── kopi-susu.svg, sarapan.svg,
│       │   jus-teh.svg, paket-hemat.svg           ← halaman isi kedua
│       └── 06-sampul-belakang.svg                 ← sampul belakang
└── docs/
    ├── prd.md            ← dokumen kebutuhan produk
    └── banding-jilid.html ← halaman contoh 3 gaya jilid (alat bantu memilih)
+-- scripts/diagnostics/  # alat audit dan pengukuran, tidak dipakai aplikasi
+-- tests/                # berkas isolasi untuk pemeriksaan manual
+-- artifacts/visual-audits/ # arsip dan baseline tangkapan layar
```

### Peralatan pengembangan

Skrip pemeriksaan dan pengukuran disimpan di `scripts/diagnostics/`, terpisah
dari berkas aplikasi. Arsip tangkapan layar lama disimpan di
`artifacts/visual-audits/archive/`, sedangkan baseline ukuran ada di
`artifacts/visual-audits/baseline/`. Hasil audit baru masuk ke folder
`latest-audit/` dan `latest-measurement/`.
Gerak teks seperti lembar yang dibuka diatur terpisah di `js/motion.js`;
animasi berhenti otomatis saat preferensi kurangi gerak aktif.

```sh
npm run check:layout-tokens
npm run measure:landing -- artifacts/visual-audits/latest-measurement
npm run measure:element -- '.kartu[data-kartu="1"]' 390 844
```

`npm run audit:layout` menggunakan server lokal pada port 5500 secara bawaan.
Atur `SWIPE_URL` bila alamat server berbeda. Pemeriksaan spiral menaruh hasil
tangkapan di direktori sementara sistem, bukan di folder aplikasi.

## 3. Fitur

**Bentuk & tampilan buku**
- **Bentuk halaman**: *Portrait* (tegak, 210 × 297 mm) atau *Landscape*
  (lebar, 297 × 210 mm) — dipilih melalui kontrol **Bentuk halaman** pada
  kartu Ukuran halaman.
- **Jenis jilid**: *Jilid biasa* atau *Spiral kawat* — dipilih melalui kontrol
  **Jenis jilid** pada kartu Ukuran halaman.
- Ringkasan konfigurasi aktif ditampilkan di bawah rasio dan resolusi halaman.
  Ukuran, orientasi, jenis jilid, dan pilihan suara disimpan di peramban agar
  pilihan terakhir tetap tersedia setelah halaman dimuat ulang.
- Bagian **Contoh gaya buku** berdiri sendiri dari konfigurasi pada kartu
  Ukuran halaman. Setiap kartu menyediakan satu ikon mata untuk membuka contoh
  langsung di flipbook. Ikon mata tidak mengubah pilihan konfigurasi Anda;
  jika Anda sudah mengunggah halaman sendiri, halaman dan konfigurasi tersebut
  disimpan lalu dipulihkan ketika kembali ke Pengaturan.
- Empat pilihan gaya adalah Portrait + jilid biasa, Portrait + spiral kawat,
  Landscape + jilid biasa, dan Landscape + spiral kawat. Miniatur kartu
  menggunakan rasio tetap agar halaman Landscape tampil utuh.
  - **Biasa** — punggung buku polos seperti buku lem/jahit biasa: tidak ada
    kawat, tidak ada garis atau lengkung apa pun. Hanya tepi kertas asli dan
    bayangan punggung buku yang tampak (ditambah bayangan lipatan saat spread).
  - **Spiral Kawat** — deret **cincin kawat logam tipis** yang melingkari tepi
    kertas, berjarak teratur (jarak menyesuaikan tinggi buku, 14–20 px).
    Punggung digambar sebagai elemen asli (bukan gambar tempel) supaya tampak
    seperti buku sungguhan: tiap cincin memakai **kilau logam** (sisi atas
    terang, sisi bawah gelap karena cahaya dari kiri-atas), **bayangan
    kedalaman**, **lubang tusuk** di kertas (tepat di tengah tiap cincin), dan
    **tebal tumpukan lembaran** di tepi jilid — sehingga kawat tampak
    melingkari tepi kertas (sebagian di luar kertas), bukan menempel di atasnya.
    Saat buku **terbuka** (spread 2 halaman), halaman tidak digambarkan
    terlipat di tengah: yang muncul adalah **celah tipis gelap** di tengah
    (tempat kawat berjalan) dengan **tebal tumpukan kertas di sisi dalam tiap
    halaman** — persis punggung buku spiral sungguhan. Hiasan tepi itu hanya
    muncul di sisi yang memang ada halamannya, jadi ketika sampul depan/belakang
    tampil sendirian, separuh buku yang kosong tetap bersih.
  - Bingung soal kerapatan/gaya kawat? Buka `docs/banding-jilid.html` di
    peramban: ada 3 gaya contoh (A = dipakai sekarang, B = gaya "jahit" lama,
    C = lebih rapat) dalam dua tampilan — **sampul tunggal** dan
    **buku terbuka (spread)** — untuk dibandingkan berdampingan.
  - Ketebalan sampul (pita lembaran tipis di tepi sampul) hanya muncul pada
    jilid **Biasa** saat buku tampil sebagai spread (2 halaman).

**Menyesuaikan perangkat (responsif)**
- Mobile-first, breakpoint 480 / 768 / 1024 / 1440 px.
- Buku selalu tampil sebagai **spread 2 halaman** seperti desktop, termasuk
  pada HP portrait dan landscape. Sampul depan serta sampul belakang tetap
  tampil sendirian.
- Ukuran buku dihitung ulang otomatis saat resize/rotate **tanpa reload**.
- Layar sangat pendek (HP landscape) otomatis merapatkan topbar/toolbar dan
  mengecilkan halaman secara visual supaya seluruh halaman tetap terlihat utuh
  (tidak terpotong, tidak tertutup toolbar).
- Mendukung `env(safe-area-inset-*)` (poni/home-indicator), target sentuh
  ≥ 44 × 44 px, dan bebas scroll horizontal tak disengaja.

**Interaksi**
- Balik halaman: tarik sudut/sisi halaman, ketuk sisi kiri/kanan, swipe,
  tombol panah, keyboard (← →, Home, End).
- Zoom: tombol zoom (1× → 1,5× → 2×), pinch-to-zoom, ketuk-ganda untuk zoom &
  reset, geser (pan) saat zoom, roda mouse di desktop.
- Layar buku menggunakan tata letak tetap yang aman di desktop dan HP tanpa
  perubahan mode tampilan, sehingga tombol navigasi dan buku tetap berada di dalam
  panggung yang terukur.
- Toolbar melayang yang menyusut otomatis setelah 3,8 detik diam (muncul lagi
  saat ada gerakan/ketukan); tinggi toolbar **diukur otomatis** sehingga halaman
  buku tidak pernah tertutup kendali — termasuk di HP sempit yang tombolnya
  membungkus menjadi dua baris.
- Drawer thumbnail: daftar semua halaman, bisa melompat ke halaman mana pun.
- Status kosong informatif pada daftar halaman, dan **indikator tiga tahap**
  penyusunan (01 ukuran → 02 unggah → 03 buka buku) dengan tanda centang saat
  tuntas.

**Bahasa & aksesibilitas**
- Seluruh antarmuka memakai **bahasa Indonesia profesional** dengan sapaan
  "Anda", satu istilah untuk satu hal (halaman, unggah, buku menu), dan pesan
  galat yang menyebut masalah + langkah perbaikannya.
- Kontras teks memenuhi **WCAG AA** pada tema terang & gelap (diuji otomatis).
- `prefers-reduced-motion` dihormati (animasi & transisi dipercepat mendekati 0).
- Target sentuh ≥ 44 px, `env(safe-area-inset-*)` untuk poni & home-indicator.
- Setiap tombol/ikon memiliki `aria-label` bahasa Indonesia; ikon dekoratif
  `aria-hidden`; bahasa gaul/bertele-tele dihindari.
- Dapat dioperasikan penuh dengan keyboard: `←`/`→`, `Home`/`End`, `Tab`, dan
  `Esc` (tutup laci atau kembali ke penyusun).
- Bilah kemajuan (progress) + indikator halaman (mis. `3–4 / 12`) + input lompat.
- Efek suara balik halaman (disintesis, tanpa file audio) + tombol on/off.
- Mode **Terang/Gelap**: mengikuti setelan sistem (`prefers-color-scheme`) dan
  bisa dipaksa lewat tombol; pilihan disimpan di `localStorage` (`swipe-tema`).

**Muatan & performa**
- Lazy loading halaman (gambar termuat bertahap, dimulai dari halaman aktif),
  `decoding="async"`, skeleton saat gambar sedang dimuat, dan pesan gagal +
  tombol coba lagi bila gambar tidak dapat dimuat.
- Animasi memakai `transform`/`opacity`, resize di-debounce, dan animasi
  dihormati setelan `prefers-reduced-motion`.
- Ikon memakai SVG inline dari gudang `<symbol>` (tanpa font ikon, tanpa emoji).

## 4. Cara Mengganti Menu

### Lewat website (tanpa coding)
1. Buka website → bagian **2. Halaman Menu**.
2. Seret gambar ke area unggah, atau tekan **Pilih File** (boleh banyak file
   sekaligus: JPG, PNG, WebP, maks. 5 MB & 40 halaman).
3. Atur urutan dengan **drag & drop** pada thumbnail (di HP: tombol ↑ ↓).
   Hapus halaman dengan tombol hapus.
4. Bila ada gambar yang rasio-nya tidak sama dengan ukuran buku, muncul
   peringatan + pilihan otomatis:
   - **Isi penuh (crop)** — gambar memenuhi halaman, tepi sedikit terpotong.
   - **Muat penuh (letterbox)** — gambar utuh, ada tepi kertas tipis.
5. Tekan **Buka Buku Menu**.

Catatan:
- File **pertama** otomatis jadi sampul depan, file **terakhir** jadi sampul
  belakang.
- Jumlah halaman **ganjil** otomatis diberi 1 halaman kosong sebelum sampul
  belakang supaya buku rapi.
- Gambar unggahan yang lebarnya jauh melebihi kebutuhan otomatis dikompres &
  dikonversi ke WebP agar cepat (matikan di `config.js` → `book.kompresGambar`).
- Contoh menu memakai rasio **portrait**. Bila bentuk buku diubah ke
  *Landscape*, gambar portrait akan dipotong tengah (center-crop) untuk
  mengisi halaman yang lebar — sebaiknya unggah gambar berasio landscape.

### Menyiapkan gambar terbaik
| Ukuran buku | Rasio | Resolusi disarankan (±150 dpi) |
|---|---|---|
| A4 portrait (210 × 297 mm) | 1 : 1,414 | 1240 × 1754 px |
| A4 landscape (297 × 210 mm) | 1,414 : 1 | 1754 × 1240 px |
| A5 (148 × 210 mm) | 1 : 1,414 | 874 × 1240 px |
| Custom | menyesuaikan | otomatis dihitung di website |

Saran: ekspor dari Canva/Photoshop dengan ukuran di atas, rasio seragam untuk
semua halaman, penamaan urut (01.jpg, 02.jpg, …).

## 5. Cara Mengubah Konfigurasi (`js/config.js`)

Semua diatur dalam satu objek `window.APP_CONFIG`:

| Bagian | Fungsi |
|---|---|
| `brand` | Nama usaha, tagline, logo, favicon |
| `theme` | Warna latar, gambar latar (mis. meja kayu), warna aksen, warna kertas |
| `links` | Nomor WhatsApp (+pesan otomatis), Instagram, tautan Google Maps |
| `book` | Ukuran awal (A4/A5/custom), **bentuk halaman (`orientasi`)**, **jenis jilid (`jilid`)**, dpi, batas halaman & file, ukuran animasi, kompresi |
| `custom` | Batas minimum & maksimum ukuran custom (mm) |
| `sample` | Halaman menu contoh (`autoLoad: false` bila tidak ingin langsung tampil) |
| `sound` | Efek suara balik halaman (nyala/bawaan & volume) |

Contoh cepat untuk klien baru:

```js
brand: { nama: 'Warung Bu Tini', tagline: 'Masakan rumah sejak 1998', logo: 'assets/logo.svg' },
theme: { backgroundColor: '#33241c', accentColor: '#d98e3c' },
links: { whatsapp: { number: '628111222333', message: 'Halo, mau tanya menu hari ini.' } },
book:  { orientasi: 'landscape', jilid: 'spiral' },  // bentuk & jilid bawaan
sample: { autoLoad: false, pages: [] },              // sembunyikan menu contoh
```

Ganti `assets/menu/*.svg` dengan gambar sendiri bila ingin contoh menu
menggambarkan usaha Anda (atau daftarkan path gambar baru di `sample.pages`).

## 6. Catatan untuk Pengembangan Lanjutan (Multi-Klien)

Kode sengaja dibuat modular agar mudah ditambahi backend tanpa perombakan besar:

- **`js/config.js`** → tinggal dibuat per klien (atau hasil fetch
  `/api/menu/<slug>` yang mengisi `window.APP_CONFIG` sebelum `app.js` jalan).
- **`js/app.js`** dibagi blok bernomor: branding → tema → ukuran → unggah →
  daftar halaman → flipbook → zoom → suara → layar → event.
  Bagian unggah (`prosesFile`) adalah titik ganti bila nanti file dikirim ke
  server (Supabase/Cloudinary) alih-alih `URL.createObjectURL`.
- **`state.pages`** sudah berupa daftar data murni (`{nama, url, w, h, fit}`),
  sehingga mudah disimpan/dimuat dari API.
- Kontrak CSS ↔ JS: `--progres` (bilah kemajuan), `--lapisan-latar` (latar tema),
  `--buku-x/y/w/h` (geometri buku untuk punggung jilid), kelas `.is-spread`,
  `.is-zoomed`, `.is-panning`, `.is-sembunyi`, `.is-terbuka`, `.is-aktif`.

Belum termasuk (fase berikutnya): login admin, database, QR code, pesan WA
berisi halaman aktif, hotspot produk, dan dukungan PDF.

## 7. Cara Mengetes

### Manual (peramban)
1. **Desktop**: buka `index.html`. Klik **Lihat Menu Contoh** → buku terbuka
   dengan 2 halaman berdampingan. Uji: klik sisi halaman, tarik sudut halaman,
   tombol ← →, `Home`/`End`, roda mouse untuk zoom, klik-ganda untuk zoom.
2. **Mobile** (atau DevTools mode perangkat): buku tampil sebagai spread
   berdampingan, kecuali sampul. Uji: swipe kiri/kanan, ketuk sisi
   kiri/kanan, ketuk ganda untuk zoom, pinch untuk zoom, geser saat zoom,
   tombol drawer (daftar halaman), dan tombol tema.
3. **Ganti bentuk & jilid**: di kartu *Ukuran*, pilih **Landscape**, lalu pilih
   **Spiral Kawat** pada baris *Jenis jilid* → tekan **Buka Buku Menu**.
   Perhatikan rasio halaman berubah (mis. `297,00 : 210,00`) dan tekstur
   punggung buku ikut berubah.
   - **Jilid Biasa**: punggung harus **polos** — tidak ada kawat, garis, atau
     lengkung apa pun. Yang terlihat hanya tepi kertas dan bayangan punggung.
   - **Cek kemiripan jilid kawat**: perbesar (Ctrl + `+` atau zoom browser) lalu
   lihat tepi kiri sampul atau lipatan tengah (mode spread) —
     kawat harus terlihat sebagai logam berkilau yang **melingkari tepi
     kertas** (sebagian cincin di luar kertas, sebagian menembus kertas), dengan **lubang tusuk gelap tepat di tengah tiap cincin** dan **bayangan
     jatuh** di bawahnya. Pada mode landscape (spread) cincin lebih lebar di **tengah
     lipatan**, dengan lubang tusuk di kedua sisinya.
    - **Cek tampilan buku terbuka (spread)**: di tengah buku harus ada **celah
      tipis gelap** (bukan bayangan lipatan kertas seperti buku jilid biasa)
      dengan **tebal tumpukan kertas di sisi dalam halaman kiri & kanan**, dan
      deret kawat **melintasi celah** itu. Saat sampul tampil sendirian
      (halaman pertama/terakhir), hanya sisi yang berisi halaman yang memakai
      tebal tumpukan — separuh yang kosong tetap bersih.
    - **Bandingkan gaya kawat**: buka `docs/banding-jilid.html` — tiga gaya
      contoh tampil berdampingan dalam dua tampilan (sampul tunggal & buku
      terbuka), di atas latar gelap dan kertas krem; pilih yang paling cocok
      lalu beri tahu gaya mana (A/B/C) untuk dipasang.
4. **Rotasi/resize**: putar perangkat atau ubah ukuran jendela → buku menghitung
   ulang ukurannya tanpa reload dan tetap utuh di dalam panggung.
5. **Tema**: tekan tombol tema di header → berganti terang/gelap; muat ulang
   halaman → pilihan tetap tersimpan.
6. **Aksesibilitas**: tab sampai area buku → outline fokus terlihat; tekan
   `Esc` saat drawer terbuka → drawer menutup; `Esc` lagi → kembali ke halaman
   pengaturan.
7. Buka DevTools → Console: **tidak boleh ada error**.

### Pemeriksaan otomatis

Alat bantu Playwright berada di `scripts/diagnostics/`. Jalankan dari root
proyek dengan perintah npm di atas. Pengukuran landing menghasilkan laporan
dan tangkapan layar pada direktori tujuan; skrip tersebut tidak mengubah
berkas aplikasi.
