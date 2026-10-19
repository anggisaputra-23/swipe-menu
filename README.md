# Swipe.menu — Buku Menu Digital Interaktif

Template buku menu digital untuk UMKM: unggah foto menu, lalu menu tampil
seperti buku asli dengan animasi membalik halaman (library
[StPageFlip](https://github.com/StPageFlip/Page-Flip)).

Murni **HTML + CSS + JavaScript** — tanpa framework, tanpa proses build.
Cukup buka `index.html` di peramban.

Desain: palet *Ink + Saffron* (tinta gelap + aksen kuning saffron), tanpa emoji,
tanpa efek kaca/gradien ungu generik. Font: Fraunces + Schibsted Grotesk +
DM Mono.

---

## 1. Cara Menjalankan

1. Salin seluruh folder ini ke hosting/static server, **atau** buka langsung
   `index.html` dengan klik dua kali (file:// juga berfungsi).
2. Saat pertama dibuka, website sudah menampilkan **menu contoh** (6 halaman)
   sehingga bisa langsung dicoba tanpa unggah apa pun.

> Library flipbook diambil dari CDN (`cdn.jsdelivr.net`), jadi peramban perlu
> koneksi internet saat pertama dibuka. Bila ingin sepenuhnya offline, unduh
> `page-flip.browser.js` lalu ganti tag `<script>` di `index.html` dengan file
> lokal.

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
│   └── menu/             ← 6 gambar menu contoh (rasio A4)
│       ├── 01-sampul-depan.svg
│       ├── 02-kopi-panas.svg
│       ├── 03-minuman-dingin.svg
│       ├── 04-makanan.svg
│       ├── 05-camilan-promo.svg
│       └── 06-sampul-belakang.svg
└── docs/
    ├── prd.md            ← dokumen kebutuhan produk
    └── banding-jilid.html ← halaman contoh 3 gaya jilid (alat bantu memilih)
```

## 3. Fitur

**Bentuk & tampilan buku**
- **Bentuk halaman**: *Portrait* (tegak, 210 × 297 mm) atau *Landscape*
  (lebar, 297 × 210 mm) — dipilih lewat kontrol bersegmen di kartu Ukuran.
- **Jenis jilid**: *Biasa* atau *Spiral Kawat* — dipilih lewat kontrol
  bersegmen di kartu Ukuran.
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
    C = lebih rapat) dalam dua tampilan — **satu halaman (portrait)** dan
    **buku terbuka (spread)** — untuk dibandingkan berdampingan.
  - Ketebalan sampul (pita lembaran tipis di tepi sampul) hanya muncul pada
    jilid **Biasa** saat buku tampil sebagai spread (2 halaman).

**Menyesuaikan perangkat (responsif)**
- Mobile-first, breakpoint 480 / 768 / 1024 / 1440 px.
- HP portrait & layar sempit = **1 halaman penuh**; tablet, desktop, dan HP
  landscape lebar = **spread 2 halaman**.
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
- Toolbar melayang yang menyusut otomatis setelah 3,8 detik diam (muncul lagi
  saat ada gerakan/ketukan).
- Drawer thumbnail: daftar semua halaman, bisa melompat ke halaman mana pun.
- Bilah kemajuan (progress) + indikator halaman (mis. `3–4 / 12`) + input lompat.
- Layar penuh (disembunyikan otomatis di peramban yang tidak mendukung).
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
- Menu contoh memakai rasio **portrait**. Bila bentuk buku diubah ke
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

Ganti `assets/menu/*.svg` dengan gambar sendiri bila ingin menu contoh
menggambarkan usaha Anda (atau daftarkan path gambar baru di `sample.pages`).

## 6. Catatan untuk Pengembangan Lanjutan (Multi-Klien)

Kode sengaja dibuat modular agar mudah ditambahi backend tanpa perombakan besar:

- **`js/config.js`** → tinggal dibuat per klien (atau hasil fetch
  `/api/menu/<slug>` yang mengisi `window.APP_CONFIG` sebelum `app.js` jalan).
- **`js/app.js`** dibagi blok bernomor: branding → tema → ukuran → unggah →
  daftar halaman → flipbook → zoom → suara → fullscreen → layar → event.
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
2. **Mobile** (atau DevTools mode perangkat): halaman tampil **penuh satu per
   satu**. Uji: swipe kiri/kanan, ketuk sisi kiri/kanan, ketuk ganda untuk
   zoom, pinch untuk zoom, geser saat zoom, tombol drawer (daftar halaman),
   tombol layar penuh, tombol tema.
3. **Ganti bentuk & jilid**: di kartu *Ukuran*, pilih **Landscape**, lalu pilih
   **Spiral Kawat** pada baris *Jenis jilid* → tekan **Buka Buku Menu**.
   Perhatikan rasio halaman berubah (mis. `297,00 : 210,00`) dan tekstur
   punggung buku ikut berubah.
   - **Jilid Biasa**: punggung harus **polos** — tidak ada kawat, garis, atau
     lengkung apa pun. Yang terlihat hanya tepi kertas dan bayangan punggung.
   - **Cek kemiripan jilid kawat**: perbesar (Ctrl + `+` atau zoom browser) lalu
     lihat tepi kiri halaman (mode 1 halaman) atau lipatan tengah (mode spread) —
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
      contoh tampil berdampingan dalam dua tampilan (satu halaman & buku
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

### Otomatis (opsional, saat pengembangan)
Folder ini diuji headless dengan Edge + `puppeteer-core`, mencakup 8 viewport
(360×800, 390×844, 844×390, 932×430, 667×375, 768×1024, 1024×768, 1440×900):
buka buku, navigasi keyboard, drawer + `Esc`, ukuran & pemusatan buku,
bentuk landscape + jilid spiral, zoom, tombol suara, auto-hide toolbar,
serta gestur sentuh (ketuk sisi = 1 halaman, ketuk ganda = zoom) dan mouse
(klik sisi, klik sudut, klik ganda, tarik sudut) — hasilnya **nol error konsol**.
