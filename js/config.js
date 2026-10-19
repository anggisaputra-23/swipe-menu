/* =============================================================================
 * config.js — KONFIGURASI SWIPE.MENU
 * -----------------------------------------------------------------------------
 * File ini adalah SATU-SATUNYA file yang perlu diedit untuk menyesuaikan
 * template dengan usaha/klien lain (nama, warna, kontak, menu contoh, dll).
 * Semua nilai di bawah ini boleh diubah tanpa menyentuh app.js.
 * ========================================================================== */

window.APP_CONFIG = {

  /* -----------------------------------------------------------------------
   * 1. IDENTITAS
   * -------------------------------------------------------------------- */
  brand: {
    nama: 'Swipe.menu',
    tagline: 'Unggah foto menu, atur urutannya, lalu bagikan satu tautan. Pengunjung membalik halamannya seperti buku asli.',
    logo: 'assets/logo.svg',        // kosongkan ('') bila tidak pakai logo
    favicon: 'assets/logo.svg'
  },

  /* -----------------------------------------------------------------------
   * 2. TAMPILAN / PALET WARNA (Ink + Saffron)
   * - backgroundColor : warna latar gelap layar buku & panel hero
   * - backgroundImage : gambar latar (mis. tekstur meja kayu). '' = tanpa gambar.
   *   Saat memakai gambar latar, sistem otomatis menambahkan overlay gelap
   *   agar buku menu tetap menonjol (lihat overlayOpacity).
   * - accentColor     : warna aksen (saffron) tombol, banner, dan sorotan.
   * - paperColor      : warna kertas halaman buku.
   * Mode terang/gelap situs diatur pengunjung lewat tombol tema di header.
   * -------------------------------------------------------------------- */
  theme: {
    backgroundColor: '#16150F',     // tinta hangat
    backgroundImage: '',            // contoh: 'assets/latar/meja-kayu.jpg'
    overlayOpacity: 0.45,
    accentColor: '#E8A020',         // saffron
    paperColor: '#F7F3EA'           // kertas hangat
  },

  /* -----------------------------------------------------------------------
   * 3. TAUTAN KONTAK (kosongkan '' bila tidak dipakai, tombol disembunyikan)
   * Untuk situs Swipe.menu, isi dengan kanal resmi Swipe.menu.
   * -------------------------------------------------------------------- */
  links: {
    whatsapp: {
      number: '6281234567890',                        // format internasional tanpa '+'
      message: 'Halo, saya ingin bertanya soal Swipe.menu.' // pesan otomatis saat tombol ditekan
    },
    instagram: 'https://instagram.com/swipemenu',
    lokasi: ''                                        // contoh: 'https://maps.google.com/?q=...'
  },

  /* -----------------------------------------------------------------------
   * 4. PENGATURAN BUKU
   * -------------------------------------------------------------------- */
  book: {
    ukuranAwal: 'A4',        // 'A4', 'A5', atau 'custom'
    orientasi: 'portrait',   // bentuk halaman bawaan: 'portrait' (tegak)
                             // atau 'landscape' (lebar) — bisa diganti
                             // pengunjung lewat tombol di layar pengaturan
    jilid: 'biasa',          // gaya punggung buku bawaan: 'biasa' (punggung
                             // polos seperti buku lem/jahit) atau 'spiral'
                             // (kawat spiral) — bisa diganti pengunjung lewat
                             // tombol di layar pengaturan
    dpiDisarankan: 150,      // dipakai untuk hitungan "resolusi disarankan"
    maksHalaman: 40,         // batas jumlah halaman unggahan
    maksFileMB: 5,           // batas ukuran tiap file gambar
    minWidthPx: 220,         // lebar minimum (px) 1 halaman -> bila lebar panggung
                             // < 2×nilai ini (440 px), buku tampil 1 halaman
                             // (HP portrait). Di atas itu tampil spread 2 halaman
                             // (tablet, desktop, HP landscape).
    flippingTime: 700,       // lama animasi membalik (ms)
    kompresGambar: true,     // otomatis perkecil & konversi ke WebP agar ringan
    kompresFaktor: 1.25      // resolusi target kompresi = rekomendasi × faktor
  },

  /* -----------------------------------------------------------------------
   * 5. UKURAN CUSTOM (min & maks dalam mm, dipakai validasi input pengguna)
   * -------------------------------------------------------------------- */
  custom: {
    minLebar: 80, minTinggi: 80,
    maxLebar: 500, maxTinggi: 500,
    lebarAwal: 150, tinggiAwal: 210
  },

  /* -----------------------------------------------------------------------
   * 6. MENU CONTOH
   * Halaman contoh agar website langsung bisa dicoba tanpa unggah.
   * Setiap entri: { src, alt } — src berupa path gambar lokal atau URL.
   * -------------------------------------------------------------------- */
  sample: {
    autoLoad: true,          // langsung tampil saat website dibuka
    pages: [
      { src: 'assets/menu/01-sampul-depan.svg',    alt: 'Sampul depan menu demo' },
      { src: 'assets/menu/02-kopi-panas.svg',      alt: 'Halaman menu kopi panas' },
      { src: 'assets/menu/03-minuman-dingin.svg',  alt: 'Halaman menu minuman dingin' },
      { src: 'assets/menu/04-makanan.svg',         alt: 'Halaman menu makanan' },
      { src: 'assets/menu/05-camilan-promo.svg',   alt: 'Halaman menu camilan dan promo' },
      { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang menu demo' }
    ]
  },

  /* -----------------------------------------------------------------------
   * 7. EFEK SUARA
   * -------------------------------------------------------------------- */
  sound: {
    defaultOn: true,   // suara balik halaman menyala sejak awal
    volume: 0.22       // 0.0 (hening) s/d 1.0 (keras)
  }
};
