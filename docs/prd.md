PRD – Website Buku Menu Interaktif (Flipbook Template)
Versi: 1.1 (Draft)
Tanggal: 18 Oktober 2026
Status: Untuk review
1. Ringkasan Produk
Website template yang menampilkan menu produk dalam bentuk buku menu digital. Pengunjung membuka halaman satu per satu dengan efek membalik halaman seperti buku asli (animasi flip, bayangan, lengkungan kertas). Pemilik usaha cukup mengunggah foto/file menu sesuai ukuran buku menu, tanpa perlu coding, lalu website siap dipakai.
2. Latar Belakang dan Masalah
• Pemilik usaha sudah punya foto menu produk, tetapi belum punya cara menampilkannya secara menarik di web.
• Menu berbentuk gambar/PDF biasa terasa kaku dan kurang berkesan.
• Pelanggan biasanya membuka menu lewat HP (scan QR di meja), sehingga tampilan harus ringan dan nyaman di layar kecil.
3. Tujuan
1. Menampilkan menu dengan pengalaman seperti membuka buku menu fisik.
2. Pemilik usaha dapat mengganti isi menu hanya dengan mengunggah file gambar.
3. Berjalan lancar di HP, tablet, dan desktop.
4. Mudah digunakan ulang sebagai template untuk banyak usaha/klien.
Di luar cakupan (versi 1)
• Sistem pemesanan/keranjang belanja dan pembayaran online.
• Manajemen stok dan akun pelanggan.
• Multi-bahasa otomatis.
4. Target Pengguna
Peran
Deskripsi
Kebutuhan utama
Pengunjung/Pelanggan
Orang yang melihat menu lewat HP atau komputer
Menu cepat terbuka, mudah dibaca, mudah membalik halaman
Pemilik usaha (Admin)
Pemilik kafe/restoran/toko
Upload menu mudah, tanpa keahlian teknis
Developer/Penyedia template
Pihak yang memasang template ke banyak klien
Konfigurasi sederhana (nama, logo, warna)
5. Fitur Utama
5.1 Tampilan Buku (Flipbook)
• Tampilan buku dengan sampul depan dan sampul belakang.
• Animasi membalik halaman realistis (efek kertas melengkung dan bayangan).
• Cara membalik: tarik/drag sudut halaman, klik/tap sisi halaman, swipe (HP), tombol panah, dan keyboard (← →).
• Mode 2 halaman (spread) di desktop/tablet dan mode 1 halaman di HP (portrait).
• Indikator nomor halaman (misalnya 3 / 12) dan tombol Lompat ke halaman.
• Tombol Next, Prev, Ke Awal, Ke Akhir.
• Zoom: pinch-to-zoom di HP dan klik untuk memperbesar di desktop.
• Mode layar penuh (fullscreen).
• Efek suara balik halaman (opsional, bisa dimatikan).
5.2 Upload Menu (Admin)
• Upload banyak file sekaligus (JPG, PNG, WebP; PDF pada tahap lanjutan).
• Urutan halaman dapat diubah dengan drag and drop.
• Pratinjau (preview) buku sebelum dipublikasikan.
• Validasi ukuran: sistem mengecek rasio dan resolusi file, lalu memberi peringatan jika tidak sesuai.
• Pilihan ukuran buku: A4 (210 × 297 mm) atau A5 (148 × 210 mm). Rasio buku, area unggah, dan validasi file menyesuaikan pilihan ini.
• Pengguna memasukkan jumlah halaman yang akan diunggah; sistem menampilkan indikator progres unggah (misalnya 3 / 12 halaman).
• Kompresi otomatis dan konversi ke WebP agar loading cepat.
5.3 Pengaturan Tampilan (Branding)
• Nama usaha, logo, dan favicon.
• Warna latar website (atau gambar latar seperti meja kayu/kain).
• Gaya sampul/ketebalan buku (opsional).
• Tautan kontak: WhatsApp, Instagram, lokasi (Google Maps).
5.4 Berbagi, Akses, dan Pemesanan
• Satu tautan unik per menu (misalnya namausaha.com/menu).
• QR code otomatis yang dapat diunduh untuk dicetak.
• Tombol bagikan ke WhatsApp.
• Tombol pemesanan via WhatsApp: pengunjung dapat langsung menghubungi/memesan melalui WhatsApp, dengan pesan otomatis yang menyertakan halaman/menu yang sedang dilihat.
5.5 Fitur Tambahan (Opsional / Fase Berikutnya)
• Hotspot klik pada gambar menu (misalnya klik produk lalu muncul detail).
• Beberapa menu dalam satu website (Makanan, Minuman, Promo).
• Analitik sederhana: jumlah pengunjung dan halaman yang paling sering dilihat.
6. Spesifikasi File Menu
Item
Ketentuan
Format
JPG, PNG, WebP
Rasio
Seragam untuk semua halaman; dipilih pengguna: A4 (210 × 297 mm) atau A5 (148 × 210 mm)
Resolusi disarankan
A4: 1240 × 1754 px; A5: 874 × 1240 px (±150 dpi) atau lebih tinggi
Ukuran per file
Maks. 5 MB (dikompres otomatis)
Jumlah halaman
Genap disarankan (sampul depan, isi, sampul belakang); maks. 40 halaman
Penamaan
Urut, misalnya 01.jpg, 02.jpg, dan seterusnya
Catatan: jika jumlah halaman ganjil, sistem menambahkan halaman kosong di bagian akhir agar buku tetap rapi.
7. Alur Pengguna (User Flow)
Pelanggan: scan QR atau buka tautan → sampul buku muncul → tap/swipe untuk membuka → membalik halaman satu per satu → zoom bila perlu → hubungi/pesan via WhatsApp.
Admin: login → unggah file menu → atur urutan → atur branding → preview → publikasikan → unduh QR code.
8. Kebutuhan Non-Fungsional
• Performa: halaman pertama tampil kurang dari 3 detik pada jaringan 4G; halaman lain dimuat bertahap (lazy loading).
• Responsif: nyaman di layar 360 px hingga desktop.
• Animasi: target 60 fps pada HP kelas menengah.
• Kompatibilitas: Chrome, Safari, Firefox, Edge versi terbaru; Android dan iOS.
• Aksesibilitas: navigasi keyboard, teks alternatif per halaman, dan tombol berukuran cukup besar.
• Keamanan: hanya admin yang bisa mengunggah; validasi tipe dan ukuran file di server.
• SEO: judul, deskripsi, dan Open Graph agar tampilan saat dibagikan menarik.
9. Rekomendasi Teknologi
Bahasa Pemrograman
Website buku menu berjalan di browser, sehingga bahasa utamanya adalah:
• HTML untuk struktur halaman.
• CSS untuk tampilan (latar, sampul, bayangan, responsif).
• JavaScript untuk interaksi dan animasi membalik halaman.
Pilihan Stack
Opsi
Teknologi
Cocok untuk
Catatan
A (Prototipe cepat)
HTML + CSS + JavaScript + library StPageFlip (page-flip)
Template sederhana, cepat jadi, hosting murah/gratis
Library flipbook ringan, mendukung mode 1 dan 2 halaman, sentuhan HP
B (Direkomendasikan)
Next.js (React) + StPageFlip/react-pageflip + penyimpanan file (Supabase/Firebase/Cloudinary)
Banyak klien, upload lewat dashboard
Lebih fleksibel, butuh sedikit backend
C (Alternatif)
PHP/Laravel + JavaScript
Jika terbiasa dengan hosting PHP biasa
Admin upload mudah dibuat di Laravel
Rekomendasi: gunakan Opsi B (Next.js + react-pageflip + penyimpanan file) karena dibutuhkan admin panel upload dan mendukung banyak klien. Opsi A (HTML, CSS, JavaScript murni + StPageFlip) dapat dipertimbangkan hanya untuk prototipe cepat tanpa admin panel.
Library alternatif: Turn.js (lama, kurang aktif dirawat) dan 3D Flip Book (berbayar). Untuk template gratis dan modern, StPageFlip lebih disarankan.
Hosting
• Opsi A: Netlify, Vercel, atau GitHub Pages (gratis).
• Opsi B: Vercel + Supabase/Cloudinary untuk penyimpanan gambar.
Struktur Template (Arah Pengembangan – Opsi B)
apps/web-next/  (Next.js 15 + TypeScript)
├── app/
│   ├── (admin)/        ← dashboard admin (multi-klien)
│   ├── (viewer)/       ← halaman flipbook publik
│   └── api/            ← upload, kompresi, qr, dsb
├── components/
│   ├── flipbook/       ← wrapper react-pageflip / custom
│   └── ui/
├── lib/                ← utils, config
├── prisma/             ← skema (usaha, menu, pages)
└── storage/ atau cloud (Supabase/Cloudinary)
(menu/) opsional hanya untuk migrasi/import awal
Struktur ini menggantikan folder menu-book/ statis (Opsi A). Nanging, untuk viewer tetap ringan dan bisa prerender (SSG/ISR) per menu.
11. Kriteria Keberhasilan
• Pengguna dapat membalik seluruh halaman menu dengan mulus di HP tanpa patah-patah.
• Admin dapat mengunggah, mengatur urutan, dan mempublikasikan menu dalam kurang dari 5 menit (termasuk validasi & preview).
• Skor Lighthouse Performance minimal 85 pada mobile.
• Minimal 90% pengunjung berhasil membuka menu hingga halaman kedua.
12. Rencana Pengerjaan (Roadmap)
Fase
Isi
Estimasi
Fase 1 – MVP (Viewer)
Flipbook viewer untuk menampilkan menu dari data terstruktur, dukung A4/A5, mode 1/2 halaman, navigasi (prev/next/jump/fullscreen), zoom, indikator halaman, tombol WA, dan responsif. Define schema menu (cover + pages + meta usaha + bookSize + pageCount).
1–2 minggu
Fase 2 – Branding & Polesan
Branding (nama, logo, favicon, warna/gambar latar), QR Code otomatis, tombol Bagikan WA, pesan WA otomatis (sertakan halaman yang dilihat), sounds optional, optimasi lazy loading & WebP.
1–2 minggu
Fase 3 – Admin Panel (Core)
Auth admin sederhana (multi-klien: 1 akun admin dapat kelola banyak usaha/menu), dashboard upload multi-file (JPG/PNG/WebP), input jumlah halaman, pilih ukuran buku (A4/A5), drag-and-drop urutan, validasi rasio/resolusi, kompresi + konversi WebP, preview, publikasikan, generate QR, kelola branding & WA.
2–4 minggu
Fase 4 – Lanjutan (Opsional)
Multi-menu per usaha (Makanan/Minuman/Promo), hotspot produk, dukungan PDF, analitik sederhana (jumlah pengunjung & halaman populer).
Menyesuaikan
13. Risiko dan Mitigasi
Risiko
Mitigasi
Gambar besar membuat loading lambat
Kompres otomatis, WebP, lazy loading
Ukuran gambar tidak seragam sehingga buku terlihat rusak
Validasi rasio saat upload dan panduan ukuran yang jelas
Animasi berat di HP lama
Mode sederhana (tanpa bayangan berat) sebagai cadangan
Teks pada menu sulit dibaca di HP
Fitur zoom dan resolusi gambar yang cukup tinggi
14. Pertanyaan Terbuka (Sudah Dijawab)
1. Ukuran buku: hanya A4 (210 × 297 mm) dan A5 (148 × 210 mm); custom tidak digunakan.
2. Jumlah halaman: diinput pengguna saat konfigurasi/upload.
3. Admin panel: diperlukan untuk upload menu.
4. Target penggunaan: template untuk banyak klien/usaha.
5. Pemesanan via WhatsApp: diperlukan, tombol langsung ke WhatsApp.

15. Catatan Implementasi
- Admin panel + multi-klien menjadi wajib (sesuai Opsi B).
- Viewer dan skema data (bookSize: A4/A5, pageCount input user) jadi prioritas Fase 1.
- Gunakan Next.js 15 + TypeScript + react-pageflip + Supabase/Cloudinary untuk penyimpanan gambar & data.
- Tombol WA wajib mengirim pesan otomatis yang menyertakan halaman/menu yang sedang dilihat.
- Maks. 40 halaman, genap disarankan; jika ganjil, tambahkan halaman kosong di akhir.