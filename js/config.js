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
    // Slogan utama — singkat, langsung menekankan manfaat (berbagi satu tautan)
    tagline: 'Satu tautan, satu buku menu.',
    kalimatPendukung: 'Unggah fotonya, susun urutannya, lalu bagikan. Pelanggan membalik halamannya langsung dari HP.',
    logo: 'assets/logo.svg',        // kosongkan ('') bila tidak pakai logo
    favicon: 'assets/logo.svg'
  },

  /* -----------------------------------------------------------------------
   * 2. TAMPILAN / PALET WARNA (Netral + satu aksen)
   * - backgroundColor : warna panggung mode gelap (hijau arang)
   * - backgroundColorLight : warna panggung mode terang (kertas hangat)
   * - backgroundImage : gambar latar (mis. tekstur meja kayu). '' = tanpa gambar.
   *   Saat memakai gambar latar, sistem otomatis menambahkan overlay gelap
   *   agar buku menu tetap menonjol (lihat overlayOpacity).
   * - accentColor     : satu-satunya warna aksen (tombol utama, status aktif).
   * - paperColor      : warna kertas halaman buku.
   * Mode terang/gelap situs diatur pengunjung lewat tombol tema di header.
   * -------------------------------------------------------------------- */
  theme: {
    backgroundColor: '#1C2723',    // panggung hijau arang untuk mode gelap
    backgroundColorLight: '#EFE6D6', // krem terang untuk hero & panggung mode terang
    backgroundImage: '',            // contoh: 'assets/latar/meja-kayu.jpg'
    overlayOpacity: 0.45,
    accentColor: '#C2410C',         // terakota
    accentColorGelap: '#9A3412',
    paperColor: '#FAF7F1'           // kertas cetak
  },

  /* -----------------------------------------------------------------------
   * 3. TAUTAN KONTAK (kosongkan '' bila tidak dipakai, tombol disembunyikan)
   * Untuk situs Swipe.menu, isi dengan kanal resmi Swipe.menu.
   * -------------------------------------------------------------------- */
  links: {
    whatsapp: {
      number: '6281234567890',                        // format internasional tanpa '+'
      message: 'Halo, saya ingin memperoleh informasi tentang buku menu digital Swipe.menu.' // pesan otomatis saat tombol ditekan
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
    minWidthPx: 220,         // lebar minimum (px) setiap halaman saat spread
                             // dirender. Pada layar sempit, spread diperkecil
                             // secara visual agar tetap utuh.
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
   * Empat menu yang sudah jadi, siap dibuka sebagai contoh. Tiap menu
   * beranggota 4 halaman (sampul, isi 1, isi 2, sampul belakang) supaya
   * buku tidak perlu halaman kosong tambahan.
   * -------------------------------------------------------------------- */
  sample: {
    autoLoad: false,         // pengguna mengunggah halaman sebelum membuka buku
    menus: [
      {
        id: 'kopi',
        nama: 'Menu Kopi',
        ringkas: 'Kopi panas, kopi susu, dan harga contoh.',
        cover: 'assets/menu/sampul-kopi.svg',
        pages: [
          { src: 'assets/menu/sampul-kopi.svg', alt: 'Sampul depan menu kopi' },
          { src: 'assets/menu/02-kopi-panas.svg', alt: 'Halaman kopi panas' },
          { src: 'assets/menu/kopi-susu.svg', alt: 'Halaman kopi susu' },
          { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang' }
        ]
      },
      {
        id: 'makanan',
        nama: 'Menu Makanan',
        ringkas: 'Sarian, sarapan, dan harga contoh.',
        cover: 'assets/menu/sampul-makanan.svg',
        pages: [
          { src: 'assets/menu/sampul-makanan.svg', alt: 'Sampul depan menu makanan' },
          { src: 'assets/menu/04-makanan.svg', alt: 'Halaman makanan' },
          { src: 'assets/menu/sarapan.svg', alt: 'Halaman sarapan' },
          { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang' }
        ]
      },
      {
        id: 'minuman',
        nama: 'Menu Minuman',
        ringkas: 'Minuman dingin, jus, dan teh.',
        cover: 'assets/menu/sampul-minuman.svg',
        pages: [
          { src: 'assets/menu/sampul-minuman.svg', alt: 'Sampul depan menu minuman' },
          { src: 'assets/menu/03-minuman-dingin.svg', alt: 'Halaman minuman dingin' },
          { src: 'assets/menu/jus-teh.svg', alt: 'Halaman jus dan teh' },
          { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang' }
        ]
      },
      {
        id: 'promo',
        nama: 'Menu Promo',
        ringkas: 'Camilan harian dan paket hemat.',
        cover: 'assets/menu/sampul-promo.svg',
        pages: [
          { src: 'assets/menu/sampul-promo.svg', alt: 'Sampul depan menu promo' },
          { src: 'assets/menu/05-camilan-promo.svg', alt: 'Halaman camilan dan promo' },
          { src: 'assets/menu/paket-hemat.svg', alt: 'Halaman paket hemat' },
          { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang' }
        ]
      }
    ],
    // Halaman contoh untuk tombol "Gunakan menu contoh" (menu pertama).
    pages: [
      { src: 'assets/menu/sampul-kopi.svg', alt: 'Sampul depan menu contoh' },
      { src: 'assets/menu/02-kopi-panas.svg', alt: 'Halaman menu kopi panas' },
      { src: 'assets/menu/kopi-susu.svg', alt: 'Halaman menu kopi susu' },
      { src: 'assets/menu/06-sampul-belakang.svg', alt: 'Sampul belakang menu contoh' }
    ],
    // Halaman portrait dibuat dari gambar yang diberikan pengguna.
    portraitPages: [
      { src: 'assets/menu/portrait/sampul-menu.jpg', alt: 'Sampul menu Nusantara portrait' },
      { src: 'assets/menu/portrait/hidangan-utama.jpg', alt: 'Halaman hidangan utama portrait' },
      { src: 'assets/menu/portrait/kue-klepon.jpg', alt: 'Halaman kue klepon portrait' },
      { src: 'assets/menu/portrait/kue-tradisional.jpg', alt: 'Halaman kue tradisional portrait' },
      { src: 'assets/menu/portrait/menu-kopi.jpg', alt: 'Halaman menu kopi portrait' },
      { src: 'assets/menu/portrait/minuman-non-kopi.jpg', alt: 'Halaman minuman non-kopi portrait' },
      { src: 'assets/menu/portrait/minuman-tradisional.jpg', alt: 'Halaman minuman tradisional portrait' },
      { src: 'assets/menu/portrait/sampul-belakang.jpg', alt: 'Sampul belakang menu portrait' }
    ],
    // Halaman landscape dibuat dari gambar yang diberikan pengguna.
    landscapePages: [
      { src: 'assets/menu/landscape/sampul-menu.jpg', alt: 'Sampul menu Nusantara landscape' },
      { src: 'assets/menu/landscape/menu-kopi.jpg', alt: 'Halaman menu kopi landscape' },
      { src: 'assets/menu/landscape/hidangan-utama.jpg', alt: 'Halaman hidangan utama landscape' },
      { src: 'assets/menu/landscape/kue-tradisional.jpg', alt: 'Halaman kue tradisional landscape' },
      { src: 'assets/menu/landscape/halaman-kue-putu.jpg', alt: 'Halaman kue putu landscape' },
      { src: 'assets/menu/landscape/sampul-belakang.jpg', alt: 'Sampul belakang menu landscape' }
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
