/* =============================================================================
 * app.js — BUKU MENU INTERAKTIF (logika utama)
 * -----------------------------------------------------------------------------
 * Alur program:
 *   1) Branding      : terapkan konfigurasi dari js/config.js ke halaman.
 *   2) Ukuran buku   : A4 / A5 / Custom -> rasio & rekomendasi resolusi.
 *   3) Unggah halaman: validasi, kompresi ringan, thumbnail, urutan, hapus.
 *   4) Flipbook      : susun halaman -> StPageFlip -> navigasi, zoom, suara.
 *
 * Catatan modular: bagian-bagian di bawah dipisah komentar blok besar,
 * sehingga mudah dipindah ke modul terpisah bila nanti ditambahkan backend
 * (login klien, penyimpanan gambar, tautan otomatis per klien).
 * ========================================================================== */
(function () {
  'use strict';

  /* =========================================================================
   * 0. UTILITAS KECIL
   * ====================================================================== */
  const $ = (pilihan, ruang = document) => ruang.querySelector(pilihan);

  /** Elemen baru + kelas + teks, ringkas. */
  function elemen(tag, kelas, teks) {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (teks != null) n.textContent = teks;
    return n;
  }

  /** Ikon SVG dari gudang simbol (#ikon-...), mis. buatIkon('panah-atas'). */
  function buatIkon(nama, kelas) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', kelas ? `ikon ${kelas}` : 'ikon');
    svg.setAttribute('aria-hidden', 'true');
    const pakai = document.createElementNS(NS, 'use');
    pakai.setAttribute('href', '#ikon-' + nama);
    svg.appendChild(pakai);
    return svg;
  }

  /** Tunda pemanggilan (untuk resize, dsb.). */
  function debounce(fn, tunda) {
    let id;
    return function (...arg) { clearTimeout(id); id = setTimeout(() => fn.apply(this, arg), tunda); };
  }

  /** Batasi nilai dalam rentang. */
  const batas = (v, min, max) => Math.min(max, Math.max(min, v));

  /** Format angka gaya Indonesia (koma desimal). */
  const formatID = (n, desimal = 2) => n.toFixed(desimal).replace('.', ',');

  const MM_KE_PX = 96 / 25.4;     // konversi mm ke piksel CSS (96 dpi)
  const TOLERANSI_RASIO = 0.02;   // toleransi selisih rasio gambar: 2 %

  /* =========================================================================
   * 1. KONFIGURASI & STATE
   * ====================================================================== */
  const CFG = window.APP_CONFIG || {};

  /** Konfigurasi kerja (config + nilai bawaan agar aman bila ada yang kosong). */
  const KONFIG = {
    brand: CFG.brand || {},
    theme: CFG.theme || {},
    links: CFG.links || {},
    sound: Object.assign({ defaultOn: true, volume: 0.22 }, CFG.sound),
    book: Object.assign({
      ukuranAwal: 'A4', dpiDisarankan: 150, maksHalaman: 40, maksFileMB: 5,
      minWidthPx: 300, flippingTime: 700, kompresGambar: true, kompresFaktor: 1.25
    }, CFG.book),
    custom: Object.assign({ minLebar: 80, minTinggi: 80, maxLebar: 500, maxTinggi: 500, lebarAwal: 150, tinggiAwal: 210 }, CFG.custom),
    sample: CFG.sample || { pages: [] }
  };

  /** Daftar ukuran baku (mm). */
  const UKURAN_BAKU = {
    A4: { w: 210, h: 297 },
    A5: { w: 148, h: 210 }
  };

  const TIPE_GAMBAR = ['image/jpeg', 'image/png', 'image/webp'];

  /** Semua status aplikasi dalam satu objek (mudah diserialisasi bila perlu). */
  const state = {
    pages: [],                 // halaman unggahan: {id,nama,url,w,h,fit,rasioOk,blank,contoh}
    ukuranPreset: 'A4',        // 'A4' | 'A5' | 'custom'
    ukuranCustom: { w: KONFIG.custom.lebarAwal, h: KONFIG.custom.tinggiAwal },
    orientasi: KONFIG.book.orientasi === 'landscape' ? 'landscape' : 'portrait',
                              // bentuk halaman: 'portrait' (tegak) | 'landscape' (lebar)
    jilid: (KONFIG.book.jilid === 'spiral' || KONFIG.book.jilid === 'cincin')
      ? 'spiral' : 'biasa',
                              // gaya punggung buku: 'biasa' (polos) | 'spiral'
                              // (kawat spiral). Nilai lama tetap didukung:
                              // 'jahit' -> 'biasa', 'cincin' -> 'spiral'
    pilihFit: 'cover',         // penyesuaian otomatis untuk gambar bermasalah
    pageFlip: null,            // objek StPageFlip
    daftarBuku: [],            // salinan halaman yang dipakai di buku (+ halaman kosong)
    halamanAktif: 0,           // indeks halaman aktif (basis 0)
    zoom: { level: 1, tx: 0, ty: 0, fit: 1 },
    soundOn: !!KONFIG.sound.defaultOn,
    pernahBuka: false,         // buku sudah pernah dibuka (indikator tahap 03)
    halamanSebelumContoh: null,// halaman pengguna yang dipinjamkan sementara saat melihat contoh
    gayaSebelumContoh: null,   // konfigurasi pengguna yang dipinjamkan sementara saat melihat contoh
    gayaPreview: null,         // konfigurasi jilid/orientasi yang sedang dipratinjau
    idSeq: 1
  };

  /* =========================================================================
   * 2. NOTIFIKASI (TOAST)
   * ====================================================================== */
  let toastTimer;
  function toast(pesan, tipe = 'info') {
    const t = $('#toast');
    t.textContent = pesan;
    t.dataset.tipe = tipe;
    t.hidden = false;
    // paksa reflow agar transisi berjalan
    void t.offsetWidth;
    t.classList.add('is-tampil');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('is-tampil');
      setTimeout(() => { t.hidden = true; }, 250);
    }, 3600);
  }

  /* =========================================================================
   * 2b. TEMA (mode terang / gelap / ikut sistem)
   * ====================================================================== */
  /** Pilihan pengguna: 'auto' (ikut sistem) | 'terang' | 'gelap'. */
  const tema = { pilihan: 'auto' };
  const KUNCI_PREFERENSI = 'swipe-preferensi-buku';

  function simpanPreferensi() {
    try {
      localStorage.setItem(KUNCI_PREFERENSI, JSON.stringify({
        ukuranPreset: state.ukuranPreset,
        ukuranCustom: state.ukuranCustom,
        orientasi: state.orientasi,
        jilid: state.jilid,
        soundOn: state.soundOn
      }));
    } catch (e) { /* localStorage tidak tersedia: aplikasi tetap berjalan */ }
  }

  function bacaPreferensi() {
    try {
      const data = JSON.parse(localStorage.getItem(KUNCI_PREFERENSI) || 'null');
      if (!data || typeof data !== 'object') return;
      if (['A4', 'A5', 'custom'].includes(data.ukuranPreset)) state.ukuranPreset = data.ukuranPreset;
      if (data.ukuranCustom && Number.isFinite(Number(data.ukuranCustom.w)) &&
          Number.isFinite(Number(data.ukuranCustom.h))) {
        state.ukuranCustom = { w: Number(data.ukuranCustom.w), h: Number(data.ukuranCustom.h) };
      }
      if (data.orientasi === 'portrait' || data.orientasi === 'landscape') state.orientasi = data.orientasi;
      if (data.jilid === 'biasa' || data.jilid === 'spiral') state.jilid = data.jilid;
      if (typeof data.soundOn === 'boolean') state.soundOn = data.soundOn;
    } catch (e) { /* preferensi rusak atau storage diblokir: gunakan nilai bawaan */ }
  }

  /** Tema yang sedang efektif tampil. */
  function efektifTema() {
    if (tema.pilihan !== 'auto') return tema.pilihan;
    return (window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'gelap' : 'terang';
  }

  /** Terapkan tema ke <html>, tombol toggle, dan meta theme-color. */
  function terapkanTema() {
    const e = efektifTema();
    const root = document.documentElement;
    root.setAttribute('data-tema', e);
    root.setAttribute('data-tema-pilihan', tema.pilihan);
    document.querySelectorAll('[data-tema-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(e === 'gelap'));
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', e === 'gelap' ? '#1C2723' : '#EFE6D6');
  }

  /** Baca preferensi tersimpan, pasang tombol, dengar perubahan sistem. */
  function pasangTema() {
    try {
      const s = localStorage.getItem('swipe-tema');
      if (s === 'terang' || s === 'gelap') tema.pilihan = s;
    } catch (e) { /* localStorage diblokir: pakai auto */ }
    terapkanTema();

    document.querySelectorAll('[data-tema-toggle]').forEach((b) =>
      b.addEventListener('click', () => {
        // Klik = berpindah antara terang <-> gelap (keluar dari mode auto)
        tema.pilihan = efektifTema() === 'gelap' ? 'terang' : 'gelap';
        try { localStorage.setItem('swipe-tema', tema.pilihan); } catch (e) { /* abaikan */ }
        terapkanTema();
      }));

    // Bila sistem berubah & pengguna belum memilih, ikuti sistem secara live
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const dengar = () => { if (tema.pilihan === 'auto') terapkanTema(); };
      if (mq.addEventListener) mq.addEventListener('change', dengar);
      else if (mq.addListener) mq.addListener(dengar);
    }
  }

  /* =========================================================================
   * 3. BRANDING (dari js/config.js)
   * ====================================================================== */
  /** Ubah warna hex menjadi versi lebih gelap (untuk efek hover tombol). */
  function warnaGelap(hex, faktor = 0.8) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    const v = parseInt(m[1], 16);
    const kanal = (x) => Math.round(x * faktor).toString(16).padStart(2, '0');
    return '#' + kanal((v >> 16) & 255) + kanal((v >> 8) & 255) + kanal(v & 255);
  }

  function terapkanBranding() {
    const b = KONFIG.brand, t = KONFIG.theme;
    const root = document.documentElement.style;

    // Warna & latar -> variabel CSS
    const aksen = t.accentColor || '#E8A020';
    root.setProperty('--warna-aksen', aksen);
    root.setProperty('--warna-aksen-gelap', t.accentColorGelap || warnaGelap(aksen));
    root.setProperty('--warna-latar', t.backgroundColor || '#1C2723');
    root.setProperty('--warna-panggung-gelap', t.backgroundColor || '#1C2723');
    root.setProperty('--warna-panggung-terang', t.backgroundColorLight || '#EFE6D6');
    root.setProperty('--warna-kertas', t.paperColor || '#F7F3EA');

    // Lapisan latar layar buku: gradasi gelap (opasitas) + gambar opsional
    const lapis = [];
    if (t.overlayOpacity && t.backgroundImage) {
      lapis.push(`linear-gradient(rgba(10, 9, 6, ${t.overlayOpacity}), rgba(10, 9, 6, ${t.overlayOpacity}))`);
    }
    if (t.backgroundImage) lapis.push(`url("${t.backgroundImage}")`);
    root.setProperty('--lapisan-latar', lapis.length ? lapis.join(', ') : 'none');
    // Variabel lama (kompatibilitas)
    root.setProperty('--gambar-latar', t.backgroundImage ? `url("${t.backgroundImage}")` : 'none');
    root.setProperty('--opasitas-latar', String(t.overlayOpacity != null ? t.overlayOpacity : 0.45));

    // Teks header layar pengaturan
    if (b.nama) {
      $('#nama-usaha-header').textContent = b.nama;
      $('#nama-usaha-book').textContent = b.nama;
      const judulHalaman = b.nama + ': ' + (b.tagline || 'buku menu digital profesional');
      document.title = judulHalaman;
      const og = document.querySelector('meta[property="og:title"]');
      if (og) og.setAttribute('content', judulHalaman);
      const ogDesk = document.querySelector('meta[property="og:description"]');
      if (ogDesk) ogDesk.setAttribute('content', (b.tagline || '') + ' ' + (b.kalimatPendukung || ''));
    }
    if (b.tagline) $('#tagline-usaha').textContent = b.tagline;
    if (b.kalimatPendukung) {
      const pendukung = $('#hero-pendukung');
      if (pendukung) pendukung.textContent = b.kalimatPendukung;
    }

    // Logo & favicon
    if (b.logo) {
      $('#logo-header').src = b.logo;
      const logoBook = $('#logo-book');
      logoBook.src = b.logo; logoBook.hidden = false;
    } else {
      $('#logo-header').hidden = true;
    }
    if (b.favicon) {
      const link = document.querySelector('link[rel="icon"]');
      if (link) link.href = b.favicon;
    }

    // Tautan kontak ( disembunyikan bila kosong )
    const wa = KONFIG.links.whatsapp;
    if (wa && wa.number) {
      const a = $('#link-wa');
      a.href = 'https://wa.me/' + String(wa.number).replace(/[^\d]/g, '') +
        (wa.message ? '?text=' + encodeURIComponent(wa.message) : '');
      a.hidden = false;
    }
    if (KONFIG.links.instagram) { const a = $('#link-ig'); a.href = KONFIG.links.instagram; a.hidden = false; }
    if (KONFIG.links.lokasi) { const a = $('#link-lokasi'); a.href = KONFIG.links.lokasi; a.hidden = false; }

    // Info batas unggahan di dropzone
    $('#info-maks-mb').textContent = KONFIG.book.maksFileMB;
    $('#info-maks-hal').textContent = KONFIG.book.maksHalaman;
  }

  /* =========================================================================
   * 4. UKURAN BUKU
   * ====================================================================== */
  /** Ukuran aktif dalam mm (sudah memperhitungkan bentuk portrait/landscape). */
  function ukuranAktif() {
    let u;
    if (state.ukuranPreset === 'custom') {
      u = { w: state.ukuranCustom.w, h: state.ukuranCustom.h, label: 'Custom' };
    } else {
      const b = UKURAN_BAKU[state.ukuranPreset] || UKURAN_BAKU.A4;
      u = { w: b.w, h: b.h, label: state.ukuranPreset };
    }
    // Bentuk landscape = halaman diputar: lebar & tinggi bertukar tempat
    if (state.orientasi === 'landscape') {
      return { w: u.h, h: u.w, label: u.label + ' · lanskap' };
    }
    return u;
  }

  /** Validasi input custom (rentang min & maks dari config). */
  function ukuranValid() {
    if (state.ukuranPreset !== 'custom') return true;
    const c = KONFIG.custom, u = state.ukuranCustom;
    const oke = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
    return oke(u.w, c.minLebar, c.maxLebar) && oke(u.h, c.minTinggi, c.maxTinggi);
  }

  /** Ukuran halaman dalam px CSS (dipakai StPageFlip sebagai dasar rasio). */
  function pxHalaman() {
    const u = ukuranAktif();
    return { w: Math.round(u.w * MM_KE_PX), h: Math.round(u.h * MM_KE_PX) };
  }

  /** Resolusi gambar yang disarankan (dpi dari config, biasanya 150 dpi). */
  function rekomendasiPx() {
    const u = ukuranAktif(), dpi = KONFIG.book.dpiDisarankan;
    return { w: Math.round(u.w / 25.4 * dpi), h: Math.round(u.h / 25.4 * dpi) };
  }

  /** Perbarui teks info ukuran, input custom, rasio thumbnail, dan validasi. */
  function perbaruiInfoUkuran() {
    const u = ukuranAktif();
    $('#wrap-custom').hidden = state.ukuranPreset !== 'custom';

    const pesan = $('#pesan-custom');
    if (state.ukuranPreset === 'custom' && !ukuranValid()) {
      const c = KONFIG.custom;
      pesan.textContent = `Ukuran khusus harus berada di antara ${c.minLebar}–${c.maxLebar} mm (lebar) dan ${c.minTinggi}–${c.maxTinggi} mm (tinggi).`;
      pesan.hidden = false;
    } else {
      pesan.hidden = true;
    }

    // Rasio ditulis lebar : tinggi (1 : 1,41 untuk A4), seperti yang lazim
    // dicetak di daftar spesifikasi kertas.
    const r = u.h / u.w;
    $('#info-rasio').textContent = `${formatID(u.w)} : ${formatID(u.h)}  (1 : ${formatID(r, 2)})`;
    const rec = rekomendasiPx();
    $('#info-resolusi').textContent = `${rec.w} × ${rec.h} px`;
    const namaJilid = state.jilid === 'spiral' ? 'Spiral kawat' : 'Jilid biasa';
    $('#ringkasan-konfigurasi').textContent =
      `${state.ukuranPreset === 'custom' ? 'Custom' : state.ukuranPreset} · ` +
      `${state.orientasi === 'landscape' ? 'Landscape' : 'Portrait'} · ${namaJilid}`;

    // Rasio dipakai juga oleh thumbnail daftar halaman
    document.documentElement.style.setProperty('--rasio-halaman', `${u.w} / ${u.h}`);

    periksaRasio();
    renderDaftar();
    perbaruiInfoAksi();
  }

  /* =========================================================================
   * 5. UNGGAH GAMBAR
   * ====================================================================== */
  /** Baca lebar/tinggi asli sebuah gambar (src berupa URL objek atau path). */
  function bacaDimensi(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error('gambar tidak bisa dimuat'));
      img.src = url;
    });
  }

  /**
   * Kompres & konversi gambar besar agar buku ringan.
   * Mengembalikan { url, w, h } baru, atau null bila gagal (pakai file asli).
   */
  async function kompresGambar(url, dim, targetLebar) {
    try {
      const img = await bacaDimensi(url);
      const canvas = document.createElement('canvas');
      canvas.width = targetLebar;
      canvas.height = Math.max(1, Math.round(dim.h * (targetLebar / dim.w)));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Coba WebP dulu; bila peramban tidak mendukung, jatuh ke JPEG
      let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86));
      if (!blob || blob.type !== 'image/webp') {
        blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86));
      }
      if (!blob) return null;

      URL.revokeObjectURL(url); // bebaskan memori file asli
      return { url: URL.createObjectURL(blob), w: canvas.width, h: canvas.height };
    } catch (e) {
      return null; // diamkan: pakai gambar asli
    }
  }

  /** Validasi + proses satu file menjadi objek halaman. */
  async function prosesFile(file) {
    if (!TIPE_GAMBAR.includes(file.type)) {
      throw new Error(`Berkas "${file.name}" bukan JPG, PNG, atau WebP.`);
    }
    if (file.size > KONFIG.book.maksFileMB * 1024 * 1024) {
      throw new Error(`Berkas "${file.name}" lebih besar dari ${KONFIG.book.maksFileMB} MB.`);
    }

    let url = URL.createObjectURL(file);
    let dim;
    try {
      dim = await bacaDimensi(url);
    } catch (e) {
      URL.revokeObjectURL(url);
      throw new Error(`Berkas "${file.name}" bukan gambar yang valid.`);
    }

    // Kompresi otomatis agar loading cepat (hanya bila file besar)
    const target = Math.round(rekomendasiPx().w * KONFIG.book.kompresFaktor);
    if (KONFIG.book.kompresGambar && dim.w > target) {
      const hasil = await kompresGambar(url, dim, target);
      if (hasil) { url = hasil.url; dim = { w: hasil.w, h: hasil.h }; }
    }

    return {
      id: state.idSeq++,
      nama: file.name,
      url, w: dim.w, h: dim.h,
      fit: state.pilihFit,      // object-fit saat ditampilkan di buku
      rasioOk: true,            // dinilai ulang oleh periksaRasio()
      blank: false,
      contoh: false
    };
  }

  /** Terima daftar file dari input/drag & drop, lalu tambahkan ke state. */
  async function tanganiFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const sisa = KONFIG.book.maksHalaman - state.pages.length;
    if (sisa <= 0) {
      toast(`Jumlah halaman sudah mencapai batas maksimal (${KONFIG.book.maksHalaman} halaman).`, 'galat');
      return;
    }
    if (files.length > sisa) {
      toast(`Hanya ${sisa} berkas pertama yang dimasukkan (batas ${KONFIG.book.maksHalaman} halaman).`, 'galat');
    }

    setDropzoneSibuk(true);
    for (const file of files.slice(0, sisa)) {
      try {
        state.pages.push(await prosesFile(file));
      } catch (err) {
        toast(err.message || 'Berkas gagal diproses.', 'galat');
      }
    }
    setDropzoneSibuk(false);

    periksaRasio();
    renderDaftar();
    perbaruiInfoAksi();
  }

  function setDropzoneSibuk(sibuk) {
    const dz = $('#dropzone');
    dz.classList.toggle('is-over', sibuk);
    dz.setAttribute('aria-busy', sibuk ? 'true' : 'false');
  }

  /* =========================================================================
   * 6. DAFTAR HALAMAN (thumbnail, urutan, hapus)
   * ====================================================================== */
  /** Nilai rasio buku untuk pembanding. */
  const rasioBuku = () => { const u = ukuranAktif(); return u.w / u.h; };

  /** Nilai & tampilkan peringatan rasio untuk semua halaman. */
  function periksaRasio() {
    const rasio = rasioBuku();
    const u = ukuranAktif();
    let salah = 0;

    for (const p of state.pages) {
      p.rasioOk = Math.abs((p.w / p.h) / rasio - 1) <= TOLERANSI_RASIO;
      if (!p.rasioOk) {
        salah++;
        p.fit = state.pilihFit; // terapkan pilihan penyesuaian otomatis
      }
    }

    const banner = $('#banner-rasio');
    if (salah > 0) {
      $('#banner-rasio-teks').textContent =
        `${salah} gambar rasionya tidak sesuai ukuran halaman ${u.label} (${u.w} × ${u.h} mm). ` +
        'Pilih cara penyesuaian agar halaman tetap rapi.';
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  /** Susun ulang DOM thumbnail sesuai state.pages. */
  function renderDaftar() {
    const ul = $('#daftar-halaman');
    ul.innerHTML = '';
    const total = state.pages.length;

    state.pages.forEach((p, i) => {
      const li = elemen('li', 'item-halaman');
      li.dataset.id = p.id;
      li.dataset.fit = p.fit;

      /* --- thumbnail --- */
      const thumb = elemen('div', 'item-halaman__thumb');
      thumb.draggable = true; // geser-muat (drag & drop) untuk ubah urutan
      thumb.title = 'Seret untuk mengubah urutan';

      const img = elemen('img');
      img.src = p.url;
      img.alt = `Pratinjau halaman ${i + 1}: ${p.nama}`;
      img.loading = 'lazy';
      thumb.appendChild(img);

      // Label posisi halaman
      let labelTeks = `H${i + 1}`;
      let labelKelas = 'item-halaman__label';
      if (i === 0) { labelTeks = 'SAMPUL'; labelKelas += ' item-halaman__label--sampul'; }
      else if (i === total - 1 && total > 1) { labelTeks = 'BELAKANG'; labelKelas += ' item-halaman__label--sampul'; }
      thumb.appendChild(elemen('span', labelKelas, labelTeks));

      if (!p.rasioOk) thumb.appendChild(elemen('span', 'item-halaman__peringatan', 'Rasio'));

      li.appendChild(thumb);
      li.appendChild(elemen('p', 'item-halaman__nama', p.nama));

      /* --- tombol aksi (ikon, agar ringkas di HP) --- */
      const aksi = elemen('div', 'item-halaman__aksi');
      const bAtas = elemen('button');
      bAtas.type = 'button'; bAtas.title = 'Naikkan urutan';
      bAtas.setAttribute('aria-label', `Naikkan halaman ${i + 1}`);
      bAtas.appendChild(buatIkon('panah-atas'));
      bAtas.disabled = i === 0;
      bAtas.addEventListener('click', () => geserHalaman(p.id, -1));

      const bBawah = elemen('button');
      bBawah.type = 'button'; bBawah.title = 'Turunkan urutan';
      bBawah.setAttribute('aria-label', `Turunkan halaman ${i + 1}`);
      bBawah.appendChild(buatIkon('panah-bawah'));
      bBawah.disabled = i === total - 1;
      bBawah.addEventListener('click', () => geserHalaman(p.id, 1));

      const bHapus = elemen('button', 'hapus');
      bHapus.type = 'button'; bHapus.title = 'Hapus halaman';
      bHapus.setAttribute('aria-label', `Hapus halaman ${i + 1}`);
      bHapus.appendChild(buatIkon('hapus'));
      bHapus.addEventListener('click', () => hapusHalaman(p.id));

      aksi.append(bAtas, bBawah, bHapus);
      li.appendChild(aksi);

      /* --- event drag & drop (desktop) --- */
      thumb.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(p.id));
        li.classList.add('is-drag');
      });
      thumb.addEventListener('dragend', () => {
        li.classList.remove('is-drag');
        ul.querySelectorAll('.is-target').forEach((n) => n.classList.remove('is-target'));
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('is-target');
      });
      li.addEventListener('dragleave', () => li.classList.remove('is-target'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('is-target');
        const dariId = Number(e.dataTransfer.getData('text/plain'));
        pindahkanHalaman(dariId, p.id);
      });

      ul.appendChild(li);
    });
  }

  /** Pindahkan halaman ber-id `dariId` sehingga berada sebelum `keId`. */
  function pindahkanHalaman(dariId, keId) {
    if (dariId === keId) return;
    const dari = state.pages.findIndex((p) => p.id === dariId);
    let ke = state.pages.findIndex((p) => p.id === keId);
    if (dari < 0 || ke < 0) return;
    const [pindah] = state.pages.splice(dari, 1);
    if (dari < ke) ke--;            // indeks bergeser setelah splice
    state.pages.splice(ke, 0, pindah);
    renderDaftar();
  }

  /** Naik/turunkan urutan satu langkah (alternatif drag di HP). */
  function geserHalaman(id, arah) {
    const i = state.pages.findIndex((p) => p.id === id);
    const j = i + arah;
    if (i < 0 || j < 0 || j >= state.pages.length) return;
    [state.pages[i], state.pages[j]] = [state.pages[j], state.pages[i]];
    renderDaftar();
  }

  function hapusHalaman(id) {
    const i = state.pages.findIndex((p) => p.id === id);
    if (i < 0) return;
    URL.revokeObjectURL(state.pages[i].url); // bebaskan memori (khusus URL objek)
    state.pages.splice(i, 1);
    renderDaftar();
    periksaRasio();
    perbaruiInfoAksi();
  }

  /** Ringkasan jumlah halaman + status tombol "Buka buku menu". */
  function perbaruiInfoAksi() {
    const n = state.pages.length;
    const genap = n % 2 === 0;
    const info = $('#aksi-bawah-info');
    $('#info-halaman').textContent = n === 0 ? 'Belum ada halaman.' : `${n} halaman`;
    if (n === 0) {
      info.textContent = 'Belum ada halaman. Unggah gambar menu atau muat menu contoh.';
    } else {
      let teks = `${n} halaman siap dibuka`;
      if (!genap) teks += ' · jumlah halaman ganjil: satu halaman kosong ditambahkan otomatis sebelum sampul belakang';
      info.textContent = teks + '.';
    }
    $('#btn-lihat').disabled = n === 0 || (state.ukuranPreset === 'custom' && !ukuranValid());

    // Keadaan kosong pada daftar pratinjau
    const kosong = $('#daftar-kosong');
    if (kosong) kosong.hidden = n > 0;

    perbaruiAlur();
  }

  /**
   * Indikator tahap penyusunan (01 ukuran → 02 unggah → 03 buka buku):
   * langkah yang sudah tuntas diberi tanda centang, langkah berikutnya aktif.
   */
  function perbaruiAlur() {
    const langkah = document.querySelectorAll('#alur-alat .alur__langkah');
    if (!langkah.length) return;
    const selesai = [ukuranValid(), state.pages.length > 0, state.pernahBuka];
    let aktifIdx = selesai.findIndex((s) => !s);
    if (aktifIdx < 0) aktifIdx = 2;

    langkah.forEach((li, i) => {
      li.classList.toggle('is-selesai', selesai[i]);
      li.classList.toggle('is-aktif', !selesai[i] && i === aktifIdx);
    });

    const k1 = document.querySelector('[data-kartu="1"] .kartu__nomor');
    const k2 = document.querySelector('[data-kartu="2"] .kartu__nomor');
    if (k1) k1.classList.toggle('is-selesai', selesai[0]);
    if (k2) k2.classList.toggle('is-selesai', selesai[1]);
  }

  /**
   * Muat halaman contoh dari config (agar template langsung bisa dicoba).
   * @param {boolean} lewatiKonfirmasi  true bila halaman lama diganti tanpa tanya
   * @param {string} menuId             id menu dari KONFIG.sample.menus
   * @param {boolean} diam              true bila tidak perlu menampilkan toast
   */
  async function muatContoh(lewatiKonfirmasi = false, menuId = '', diam = false, sumberOverride = null) {
    const menu = (KONFIG.sample.menus || []).find((m) => m.id === menuId);
    const sumber = sumberOverride || (menu ? menu.pages : KONFIG.sample.pages);
    if (!sumber || !sumber.length) return false;

    if (!lewatiKonfirmasi && state.pages.length &&
        !window.confirm('Halaman yang ada akan diganti dengan menu contoh. Lanjutkan?')) return false;

    const tombol = $('#btn-contoh');
    if (tombol) tombol.disabled = true;
    try {
      const baru = [];
      for (const s of sumber) {
        const dim = await bacaDimensi(s.src); // SVG berukuran tetap juga terbaca
        baru.push({
          id: state.idSeq++,
          nama: (s.alt || s.src.split('/').pop()),
          url: s.src, w: dim.w, h: dim.h,
          fit: state.pilihFit, rasioOk: true, blank: false, contoh: true
        });
      }
      state.pages = baru;
      periksaRasio();
      renderDaftar();
      perbaruiInfoAksi();
      if (!diam) {
        toast(menu
          ? `Menu contoh "${menu.nama}" dimuat. Tekan "Buka buku menu" untuk melihat hasilnya.`
          : 'Menu contoh dimuat. Tekan "Buka buku menu" untuk melihat hasilnya.');
      }
      return true;
    } catch (e) {
      console.error(e);
      if (!diam) toast('Menu contoh gagal dimuat. Periksa koneksi internet, lalu coba lagi.', 'galat');
      return false;
    } finally {
      if (tombol) tombol.disabled = false;
    }
  }

  /** Muat salah satu menu siap pakai, lalu langsung buka buku menunya. */
  async function bukaMenuContoh(menuId) {
    const berhasil = await muatContoh(true, menuId, true);
    if (!berhasil) {
      toast('Menu contoh gagal dimuat. Periksa koneksi internet, lalu coba lagi.', 'galat');
      return;
    }
    await bukaLayarBuku();
  }

  /* =========================================================================
   * 7. FLIPBOOK (StPageFlip)
   * ====================================================================== */

  /** Susun daftar halaman buku; ganjil -> selipkan halaman kosong. */
  function halamanUntukBuku() {
    const daftar = state.pages.map((p) => Object.assign({}, p));
    if (daftar.length % 2 === 1) {
      daftar.splice(daftar.length - 1, 0, {
        id: 'kosong-' + state.idSeq++,
        nama: 'Halaman Kosong', blank: true, fit: 'cover', rasioOk: true
      });
    }
    return daftar;
  }

  /** Buat satu elemen halaman untuk StPageFlip (loadFromHTML). */
  function buatElemenHalaman(p, i, total) {
    const div = elemen('div', 'page');
    div.dataset.index = i;
    if (i === 0 || (i === total - 1 && total > 1)) div.classList.add('page--sampul');

    const inner = elemen('div', 'page-inner');

    if (p.blank) {
      div.classList.add('page--kosong');
      inner.appendChild(elemen('div', 'kosong-isi', 'Halaman Kosong'));
    } else {
      const img = elemen('img', 'page-img');
      img.alt = `Halaman ${i + 1}: ${p.nama}`;
      img.decoding = 'async';
      img.style.objectFit = p.fit === 'contain' ? 'contain' : 'cover';
      img.dataset.url = p.url;      // disimpan untuk "coba lagi" bila gagal
      pasangPantauGambar(img);      // skeleton -> selesai / pesan gagal
      if (i <= 1) {
        // Dua halaman awal (sampul + halaman pertama) dimuat langsung
        img.src = p.url;
        if (i === 0) img.fetchPriority = 'high';
      } else {
        // Sisanya dimuat bertahap oleh antrean lazy loading
        img.dataset.src = p.url;
      }
      inner.appendChild(img);

      // Lapisan skeleton: menutupi area halaman selama gambar dimuat
      const skel = elemen('span', 'page-skeleton');
      skel.setAttribute('aria-hidden', 'true');
      inner.appendChild(skel);
    }

    // Bayangan lipatan (spine) di sisi dalam halaman
    inner.appendChild(elemen('span', 'page-gutter'));
    div.appendChild(inner);
    return div;
  }

  /** Pasang pemantauan load/error pada gambar halaman (skeleton & retry). */
  function pasangPantauGambar(img) {
    img.addEventListener('load', () => {
      const skel = img.parentElement && img.parentElement.querySelector('.page-skeleton');
      if (skel) skel.classList.add('is-selesai');
    }, { once: true });
    img.addEventListener('error', () => tampilkanGagal(img), { once: true });
  }

  /** Tampilkan pesan ramah + tombol "Coba lagi" bila gambar gagal dimuat. */
  function tampilkanGagal(img) {
    const inner = img.parentElement;
    if (!inner || inner.querySelector('.page-gagal')) return;
    img.style.visibility = 'hidden';

    const kartu = elemen('div', 'page-gagal');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ikon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#ikon-gambar');
    svg.appendChild(use);
    kartu.appendChild(svg);
    kartu.appendChild(elemen('p', '', 'Gambar halaman ini gagal dimuat.'));

    const b = elemen('button', 'btn btn--kecil', 'Coba lagi');
    b.type = 'button';
    b.addEventListener('click', () => {
      kartu.remove();
      img.style.visibility = '';
      const skel = inner.querySelector('.page-skeleton');
      if (skel) skel.classList.remove('is-selesai');
      pasangPantauGambar(img);
      img.src = img.dataset.url || '';
    });
    kartu.appendChild(b);
    inner.appendChild(kartu);
  }

  /** Pasang ukuran panggung agar buku selalu muat di layar (tinggi & lebar). */
  function fitStage() {
    const stage = $('#book-stage'), host = $('#flip-host');
    if (!stage || !host || $('#screen-book').hidden) return;

    const rect = stage.getBoundingClientRect();
    // Pakai kotak KONTEN panggung (padding sudah dikurangi), termasuk ruang
    // toolbar melayang di bawah, agar buku tidak tertutup/terpotong toolbar.
    const gaya = getComputedStyle(stage);
    const padX = parseFloat(gaya.paddingLeft) + parseFloat(gaya.paddingRight);
    const padY = parseFloat(gaya.paddingTop) + parseFloat(gaya.paddingBottom);
    const u = ukuranAktif();
    const rasioTinggi = u.h / u.w;                 // tinggi / lebar 1 halaman
    const ruang = 28;                              // padding aman
    const lebarTersedia = Math.max(160, rect.width - padX - ruang);
    const tinggiTersedia = Math.max(160, rect.height - padY - ruang);

    // Buku selalu dirender sebagai spread. Pada layar sempit, StPageFlip tetap
    // memakai lebar minimum per halaman lalu spread diperkecil secara visual
    // agar dua halaman tetap utuh dan terpusat.
    const maksLebarSpread = Math.min(
      lebarTersedia,
      (2 * tinggiTersedia) / rasioTinggi
    );
    const px = pxHalaman();
    const lebarMinimumSpread = 2 * KONFIG.book.minWidthPx;
    const hostAkhir = Math.floor(Math.min(maksLebarSpread, px.w * 2));
    const lebarRender = Math.max(hostAkhir, lebarMinimumSpread);
    host.style.width = lebarRender + 'px';
    host.style.maxWidth = lebarRender + 'px';

    // Jika ukuran minimum spread lebih besar dari ruang aman panggung, buku
    // diperkecil dengan transform. Ukuran geometrinya tetap ukuran asli agar
    // zoom dan batas pan mengikuti buku yang sebenarnya.
    const tinggiRender = (lebarRender / 2) * rasioTinggi;
    state.zoom.fit = Math.min(
      1,
      lebarTersedia / lebarRender,
      tinggiTersedia / tinggiRender
    );
    terapkanTransform();

    perbaruiPanggungBuku();
  }

  /**
   * Perbarui variabel panggung: kotak buku (untuk bayangan, spine, dan
   * overlay jilid) + status spread. Dipanggil setelah layout buku berubah.
   */
  function perbaruiPanggungBuku() {
    const stage = $('#book-stage');
    if (!stage || $('#screen-book').hidden) return;
    if (animasiFlipAktif || Date.now() < akhirFlip) return;
    if (stage.dataset.jilid !== state.jilid) stage.dataset.jilid = state.jilid;

    const wrap = stage.querySelector('.stf__wrapper');
    const kotak = (wrap || $('#flip-host')).getBoundingClientRect();
    if (!kotak.width || !kotak.height) return;

    const panggung = stage.getBoundingClientRect();
    stage.style.setProperty('--buku-x', (kotak.left - panggung.left + kotak.width / 2).toFixed(1) + 'px');
    stage.style.setProperty('--buku-y', (kotak.top - panggung.top + kotak.height / 2).toFixed(1) + 'px');
    stage.style.setProperty('--buku-w', kotak.width.toFixed(1) + 'px');
    stage.style.setProperty('--buku-h', kotak.height.toFixed(1) + 'px');

    // Sampul awal/akhir tetap satu halaman walaupun wrapper memakai kelas
    // landscape. Hanya dua halaman yang sedang terlihat yang memakai spread.
    const halamanTerlihat = [...stage.querySelectorAll('.stf__item')].filter((halaman) => {
      const rect = halaman.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(halaman).visibility !== 'hidden';
    });
    const landscape = !!(wrap && wrap.classList && wrap.classList.contains('--landscape'));
    const indeksHalaman = state.pageFlip && state.pageFlip.getCurrentPageIndex();
    const jumlahHalaman = state.daftarBuku ? state.daftarBuku.length : 0;
    const spread = landscape && (
      halamanTerlihat.length > 1 ||
      (Number.isInteger(indeksHalaman) && indeksHalaman > 0 && indeksHalaman < jumlahHalaman - 1)
    );
    const halamanTunggal = !spread && halamanTerlihat[0];
    const sisiPunggung = halamanTunggal && halamanTunggal.classList &&
      halamanTunggal.classList.contains('--left') ? 'kanan' : 'kiri';
    stage.classList.toggle('is-spread', spread);

    // Gambar ulang isi jilid (kawat spiral) sesuai ukuran buku terbaru
    bangunJilid(halamanTunggal ? halamanTunggal.getBoundingClientRect() : kotak, panggung, spread, sisiPunggung);
  }

  /**
   * Bangun ulang isi overlay jilid.
   *
   * - `spiral` : lilitan kawat logam + lubang tusuk di kertas. Digambar sebagai
   *   elemen kecil (bukan gambar tempel) supaya ada kilau logam, bayangan
   *   kedalaman, dan kawat tampak melingkari tepi kertas.
   * - `biasa`  : punggung dibiarkan polos (tanpa elemen apa pun), seperti buku
   *   lem/jahit biasa.
   *
   * Garis tepi kertas berada tepat di tengah strip jilid (TEPI px dari kiri),
   * sehingga lubang tusuk jatuh di atas kertas.
   *
   * @param {DOMRect} kotak    rect kotak buku (.stf__wrapper)
   * @param {DOMRect} panggung rect #book-stage (acuan koordinat strip)
   * @param {boolean} spread   true bila buku tampil 2 halaman
   */
  function bangunJilid(kotak, panggung, spread, sisiPunggung = 'kiri') {
    const el = $('#jilid-buku');
    if (!el) return;

    el.innerHTML = '';
    if (state.jilid !== 'spiral') return;        // jilid biasa: punggung polos
    if (!kotak.width || !kotak.height) return;

    const TEPI = 38;                             // garis tepi kertas di dalam strip (px)
    // Wrapper selalu mewakili ukuran satu buku penuh, baik sampul tunggal
    // maupun spread. Pakai sebagai acuan vertikal agar kawat tidak bergeser
    // akibat tinggi halaman aktif yang berubah pecahan piksel saat flip.
    const wrapper = el.parentElement?.querySelector('.stf__wrapper');
    const acuanVertikal = wrapper ? wrapper.getBoundingClientRect() : kotak;
    const tinggi = acuanVertikal.height;

    // Posisi strip dihitung dari ukuran buku yang baru diukur (bukan variabel
    // CSS yang bisa sedikit basi sebelum font/layout mantap) agar kawat benar-
    // benar menempel di tepi punggung: 1 halaman -> tepi KIRI kertas, spread ->
    // tengah lipatan.
    const acuanX = spread ? kotak.width / 2 : (sisiPunggung === 'kanan' ? kotak.width : 0);
    el.style.left = (kotak.left - panggung.left + acuanX - TEPI).toFixed(1) + 'px';
    el.style.top = (acuanVertikal.top - panggung.top).toFixed(1) + 'px';
    el.style.height = tinggi.toFixed(1) + 'px';

    // Jarak antar lilitan: renggang & teratur seperti jilid kawat sungguhan
    // (makin tinggi buku makin lebar jaraknya, dijaga 14–20 px)
    const jarak = Math.max(14, Math.min(20, tinggi / 26));
    const jml = Math.max(6, Math.floor(tinggi / jarak));
    const sisa = tinggi - (jml - 1) * jarak;
    const pusatY = (i) => +((sisa / 2) + i * jarak).toFixed(1);

    const potongan = document.createDocumentFragment();

    // Celah tengah saat spread: buku spiral TIDAK punya lipatan di tengah —
    // kedua tumpukan halaman dipisahkan celah sempit tempat kawat berjalan.
    // Lebarnya mengikuti ukuran buku dan dipakai CSS lewat --jilid-celah.
    const lebarWrapper = wrapper ? wrapper.getBoundingClientRect().width : kotak.width;
    const celah = Math.max(5, Math.min(9, lebarWrapper * 0.009));
    if (el.parentElement) {
      el.parentElement.style.setProperty('--jilid-celah', celah.toFixed(1) + 'px');
    }

    // Tebal tumpukan kertas di tepi jilid.
    // - 1 halaman: satu bilah di tepi KIRI kertas (kita melihat sisi tumpukan).
    // - spread    : tidak dibuat di sini — saat buku terbuka, tebal tumpukan
    //   ditempel pada tiap HALAMAN (lihat CSS .page.--left/--right) supaya
    //   hiasannya hanya muncul di sisi yang memang ada halamannya.
    // Lubang tusuk: satu kolom bergaris-ulang (hemat elemen) berisi elips gelap
    // + pantulan cahaya di dinding bawahnya (tebal kertas). Titik tengah lubang
    // dibuat pas di tengah tiap lilitan (pakai calc, jadi tetap presisi berapa
    // pun jarak antar lilitannya).
    const LB = 2.4;                              // setengah lebar lubang (px)
    const LT = 1.8;                              // setengah tinggi lubang (px)
    const barisLubang = (xC) => {
      const d = elemen('div');
      d.className = 'jilid__lubang-baris';
      d.style.left = (xC - LB - 1) + 'px';
      d.style.width = (LB * 2 + 2) + 'px';
      d.style.backgroundImage =
        `radial-gradient(${(LB * .75).toFixed(2)}px ${(LT * .6).toFixed(2)}px at 50% calc(50% + 2.2px),` +
        ' rgba(255,255,255,.3) 0 100%, rgba(255,255,255,0) 100%),' +
        ` radial-gradient(${LB}px ${LT}px at 50% 50%,` +
        ' #0a0704 0 58%, #241a10 88%, rgba(0,0,0,0) 100%)';
      d.style.backgroundSize = `100% ${jarak.toFixed(2)}px`;
      d.style.backgroundPosition = `0 ${(pusatY(0) - jarak / 2).toFixed(1)}px`;
      potongan.appendChild(d);
    };
    // Pasangan lubang berjarak tetap di sampul depan, halaman tengah, dan
    // sampul belakang agar kawat melewati pola yang sama di sepanjang buku.
    barisLubang(TEPI - 9);
    barisLubang(TEPI + 9);

    // Pakai bentuk kawat yang sama pada sampul dan spread agar flip pertama
    // maupun terakhir tidak mengubah dimensi lilitan.
    const lebar = 20;
    const tinggiLoop = 12;
    const kiriLoop = TEPI;                       // pusat cincin tepat di tepi kertas
    for (let i = 0; i < jml; i++) {
      const loop = elemen('div');
      loop.className = 'jilid__loop';
      loop.style.width = lebar + 'px';
      loop.style.height = tinggiLoop + 'px';
      loop.style.left = kiriLoop + 'px';
      loop.style.top = pusatY(i) + 'px';
      potongan.appendChild(loop);
    }

    el.appendChild(potongan);
  }

  /** Tunggu sampai gambar pertama siap agar sampul tampil cepat. */
  async function siapkanGambarPertama(p) {
    if (!p || p.blank) return;
    try {
      const img = new Image();
      img.src = p.url;
      if (img.decode) await img.decode();
      else await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    } catch (e) { /* biarkan: library menampilkan placeholder */ }
  }

  /** Bangun (dan inisialisasi) buku di layar buku. */
  async function bangunBuku() {
    hancurkanBuku();
    resetZoom();

    const daftar = halamanUntukBuku();
    state.daftarBuku = daftar;
    state.halamanAktif = 0;

    // Elemen wadah baru (destroy() library ikut menghapus elemen lama)
    const host = elemen('div');
    host.id = 'flipbook';
    daftar.forEach((p, i) => host.appendChild(buatElemenHalaman(p, i, daftar.length)));
    $('#flip-host').innerHTML = '';
    $('#flip-host').appendChild(host);

    fitStage();
    $('#book-stage').style.setProperty('--durasi-flip', `${KONFIG.book.flippingTime}ms`);

    const px = pxHalaman();
    const pengaturan = {
      width: px.w, height: px.h,
      size: 'stretch',                 // mengikuti lebar container, rasio tetap
      minWidth: KONFIG.book.minWidthPx, // minimum lebar setiap halaman (HP)
      maxWidth: px.w,                   // batas lebar 1 halaman
      minHeight: 220,
      maxHeight: Math.round(px.h * 1.2),
      autoSize: true,
      usePortrait: false,               // selalu spread; sampul tetap sendiri
      showCover: true,                  // sampul depan/belakang tampil sendiri
      drawShadow: true,
      maxShadowOpacity: 1,
      flippingTime: KONFIG.book.flippingTime,
      swipeDistance: 30,
      mobileScrollSupport: true,
      showPageCorners: true,
      // Matikan pembalik-halaman bawaan saat halaman DIKETUK/DIPERIKSA (klik
      // biasa). Tanpa ini, satu ketukan diproses dua kali (event sentuh +
      // event mouse sintetis) dan halaman melompat 2 lembar. Pembalikan lewat
      // ketukan ditangani sendiri oleh aplikasi (prosesKetuk); pembalikan
      // lewat tarikan sudut halaman tetap berjalan normal.
      disableFlipByClick: true,
      startPage: 0
    };

    await siapkanGambarPertama(daftar[0]);

    const pageFlip = new window.St.PageFlip(host, pengaturan);

    pageFlip.on('init', () => {
      setBukuLoading(false);
      perbaruiIndikator();
      mulaiLazyLoad();
      isiDrawer();
      // Layout sudah final -> perbarui kotak buku (bayangan, spine, jilid)
      requestAnimationFrame(perbaruiPanggungBuku);
    });
    pageFlip.on('flip', (e) => {
      state.halamanAktif = typeof e.data === 'number' ? e.data : pageFlip.getCurrentPageIndex();
      perbaruiIndikator();
      if (state.soundOn) putarSuara();
      // Event flip mengonfirmasi indeks baru; ukur ulang setelah animasi agar
      // sampul depan/belakang dan spread memakai geometri halaman tujuan.
      jadwalkanPerbaruiJilid();
    });
    pageFlip.on('changeState', (e) => {
      // Ukuran/posisi lembar berubah setiap frame selama flip. Jangan ukur
      // ulang overlay spiral dari geometri sementara itu.
      if (e.data !== 'read') {
        animasiFlipAktif = true;
        akhirFlip = Date.now() + KONFIG.book.flippingTime;
        if (timerJilid) { clearTimeout(timerJilid); timerJilid = null; }
        return;
      }

      // Tunggu layout halaman benar-benar menetap sebelum mengukur jilid.
      jadwalkanPerbaruiJilid();
    });
    pageFlip.on('changeOrientation', () => {
      fitStage();
      resetZoom();
      perbaruiIndikator();
      // Pastikan kelas orientasi sudah terpasang sebelum diukur ulang
      requestAnimationFrame(perbaruiPanggungBuku);
    });

    pageFlip.loadFromHTML(Array.from(host.querySelectorAll('.page')));
    state.pageFlip = pageFlip;

    // Amati ukuran buku: bila berubah (mis. font/aturan layout menyusul),
    // posisi bayangan, spine, dan jilid dihitung ulang agar tetap di tepi buku.
    if (window.ResizeObserver) {
      const wrapBuku = document.querySelector('#book-stage .stf__wrapper');
      if (wrapBuku) {
        pengamatBuku = new ResizeObserver(() => {
          // Ukuran wrapper dapat varier selama flip; debounce perubahan agar
          // kawat tidak mengikuti setiap ukuran perantara halaman.
          if (pengamatBuku && !animasiFlipAktif) jadwalkanPerbaruiJilid();
        });
        pengamatBuku.observe(wrapBuku);
      }
    }
  }

  let pengamatBuku = null;   // ResizeObserver kotak buku (bayangan/spine/jilid)
  let timerJilid = null;     // penjadwal gambar ulang jilid setelah animasi
  let animasiFlipAktif = false;
  let akhirFlip = 0;

  /**
   * Gambar ulang overlay jilid setelah animasi balik halaman selesai.
   * Tanpa ini, kawat tetap memakai bentuk buku tertutup walau buku sudah
   * terbuka (lubang hanya satu sisi, tanpa celah tengah).
   */
  function jadwalkanPerbaruiJilid() {
    if (timerJilid) clearTimeout(timerJilid);
    timerJilid = setTimeout(() => {
      timerJilid = null;
      if ($('#screen-book').hidden) return;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if ($('#screen-book').hidden) return;
        if (Date.now() < akhirFlip) {
          jadwalkanPerbaruiJilid();
          return;
        }
        animasiFlipAktif = false;
        akhirFlip = 0;
        perbaruiPanggungBuku();
      }));
    }, Math.max(120, KONFIG.book.flippingTime + 100));
  }

  function hancurkanBuku() {
    if (pengamatBuku) { pengamatBuku.disconnect(); pengamatBuku = null; }
    if (state.pageFlip) {
      try { state.pageFlip.destroy(); } catch (e) { /* abaikan */ }
      state.pageFlip = null;
    }
    $('#flip-host').innerHTML = '';
    const jilid = $('#jilid-buku');
    if (jilid) { jilid.innerHTML = ''; jilid.removeAttribute('style'); }
  }

  /**
   * Ukur ulang kotak buku beberapa kali setelah buku tampil. Font web dan
   * gambar yang baru termuat bisa menggeser/merubah kotak buku tanpa memicu
   * event resize, sehingga bayangan, lipatan tengah, dan jilid bisa meleset.
   */
  function ukurUlangBertahap() {
    // Beberapa kali pengukuran: font & gambar menyusul setelahnya, sehingga
    // ukuran buku, bilah alat, dan geometri jilid ikut menyesuaikan.
    [0, 60, 150, 400, 900, 1600].forEach((t) => {
      setTimeout(() => {
        if ($('#screen-book').hidden) return;
        if (animasiFlipAktif || Date.now() < akhirFlip) return;
        ukurKendali();
        fitStage();
        perbaruiPanggungBuku();
      }, t);
    });
  }

  function setBukuLoading(tampil) {
    $('#book-loading').hidden = !tampil;
  }

  /* =========================================================================
   * 7b. LACI THUMBNAIL (drawer) — lompat cepat ke halaman tertentu
   * ====================================================================== */
  function isiDrawer() {
    const ul = $('#daftar-thumb');
    ul.innerHTML = '';
    state.daftarBuku.forEach((p, i) => {
      const li = elemen('li', 'drawer-item');
      li.dataset.index = String(i);

      const b = elemen('button', 'drawer-item__tombol');
      b.type = 'button';
      b.setAttribute('aria-label',
        `Buka halaman ${i + 1}${p.blank ? ' (kosong)' : ': ' + (p.nama || '')}`);

      const th = elemen('div', 'drawer-item__thumb');
      if (p.blank) {
        th.classList.add('drawer-item__kosong');
        th.textContent = 'Kosong';
      } else {
        const img = elemen('img');
        img.src = p.url;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        th.appendChild(img);
      }
      const no = elemen('span', 'drawer-item__no', String(i + 1));
      b.append(th, no);
      b.addEventListener('click', () => { keHalaman(i); tutupDrawer(); });

      li.appendChild(b);
      ul.appendChild(li);
    });
    perbaruiDrawer();
  }

  /** Tandai halaman aktif di drawer (dan gulir bila laci terbuka). */
  function perbaruiDrawer() {
    const ul = $('#daftar-thumb');
    if (!ul.children.length || !state.pageFlip) return;
    const idx = state.pageFlip.getCurrentPageIndex();
    const terbuka = $('#drawer-buku').classList.contains('is-terbuka');
    ul.querySelectorAll('.drawer-item').forEach((li) => {
      const aktif = Number(li.dataset.index) === idx;
      li.classList.toggle('is-aktif', aktif);
      if (aktif && terbuka) li.scrollIntoView({ block: 'nearest' });
    });
  }

  function bukaDrawer() {
    $('#drawer-buku').classList.add('is-terbuka');
    $('#drawer-overlay').classList.add('is-terbuka');
    document.body.classList.add('is-scroll-terkunci');
    $('#drawer-buku').setAttribute('aria-hidden', 'false');
    $('#btn-drawer').setAttribute('aria-expanded', 'true');
    KendaliBuku.tampilkan();   // toolbar tidak disembunyikan selama laci terbuka
    $('#btn-drawer-tutup').focus();
    perbaruiDrawer();
  }

  function tutupDrawer() {
    $('#drawer-buku').classList.remove('is-terbuka');
    $('#drawer-overlay').classList.remove('is-terbuka');
    document.body.classList.remove('is-scroll-terkunci');
    $('#drawer-buku').setAttribute('aria-hidden', 'true');
    $('#btn-drawer').setAttribute('aria-expanded', 'false');
  }

  const drawerTerbuka = () => $('#drawer-buku').classList.contains('is-terbuka');

  /* =========================================================================
   * 7c. TOOLBAR MELAYANG (auto-hide setelah beberapa detik diam)
   * ====================================================================== */
  const KendaliBuku = {
    idWaktu: 0,
    jeda: 3800,                 // ms sebelum toolbar menyusut sendiri
    tampilkan() {
      const k = $('#book-kendali');
      if (!k) return;
      k.classList.remove('is-sembunyi');
      clearTimeout(this.idWaktu);
      if ($('#screen-book').hidden) return;
      this.idWaktu = setTimeout(() => this.sembunyikan(), this.jeda);
    },
    sembunyikan() {
      if ($('#screen-book').hidden) return;
      if (state.zoom.level > 1) return;                        // zoom aktif
      if (drawerTerbuka()) return;                             // laci terbuka
      // Fokus hasil Tab (keyboard) pada toolbar -> jangan sembunyikan
      // (aksesibilitas). Fokus hasil klik mouse TIDAK menghalangi; CSS
      // :focus-within tetap menjaga toolbar terlihat sampai fokus berpindah.
      const aktif = document.activeElement;
      let fokusKeyboard = false;
      try {
        fokusKeyboard = aktif && aktif.matches && aktif.matches(':focus-visible');
      } catch (e) { fokusKeyboard = false; }
      if (fokusKeyboard && $('#book-toolbar').contains(aktif)) return;
      $('#book-kendali').classList.add('is-sembunyi');
    }
  };

  /* ---- Lazy loading: muat gambar bertahap, dimulai dari halaman aktif ---- */
  function mulaiLazyLoad() {
    // Dua pekerja paralel agar pengunduhan berjalan cepat tapi tidak membanjiri
    jalankanAntrean();
    jalankanAntrean();
  }

  async function jalankanAntrean() {
    let img;
    while ((img = pilihGambarBerikutnya())) {
      await muatGambar(img);
    }
  }

  /** Pilih gambar yang belum punya src dan paling dekat dengan halaman aktif. */
  function pilihGambarBerikutnya() {
    const host = $('#flip-host');
    if (!host) return null;
    const kandidat = Array.from(host.querySelectorAll('img[data-src]'));
    if (!kandidat.length) return null;
    kandidat.sort((a, b) => jarakHalaman(a) - jarakHalaman(b));
    return kandidat[0];
  }

  const jarakHalaman = (img) =>
    Math.abs(Number(img.closest('.page').dataset.index) - state.halamanAktif);

  async function muatGambar(img) {
    const src = img.dataset.src;
    delete img.dataset.src;
    img.src = src;
    try { if (img.decode) await img.decode(); } catch (e) { /* abaikan */ }
  }

  /* ---- Indikator & navigasi halaman ---- */
  function perbaruiIndikator() {
    const pf = state.pageFlip;
    if (!pf) return;
    const total = pf.getPageCount();
    const idx = pf.getCurrentPageIndex();
    let teks;

    try {
      // Tampilkan rentang halaman yang sedang tersusun di layar (spread)
      const col = pf.getPageCollection();
      const spread = col.getSpread()[col.getCurrentSpreadIndex()];
      teks = spread.length === 2
        ? `${spread[0] + 1}–${spread[1] + 1} / ${total}`
        : `${spread[0] + 1} / ${total}`;
    } catch (e) {
      teks = `${idx + 1} / ${total}`;
    }

    $('#ind-halaman').textContent = teks;
    const input = $('#in-lompat');
    input.max = total;
    input.value = idx + 1;

    // Bilah progres (transform scaleX, hemat GPU)
    const bar = $('#progress-halaman');
    const fraksi = total > 1 ? idx / (total - 1) : 1;
    bar.style.setProperty('--progres', fraksi.toFixed(4));
    bar.setAttribute('aria-valuenow', String(idx + 1));
    bar.setAttribute('aria-valuemax', String(total));

    perbaruiDrawer();
  }

  function keHalaman(n) {
    const pf = state.pageFlip;
    if (!pf) return;
    const tuj = batas(Math.round(n), 0, pf.getPageCount() - 1);
    state.halamanAktif = tuj;
    pf.turnToPage(tuj);
    perbaruiIndikator();
  }

  const halamanBerikut = () => state.pageFlip && state.pageFlip.flipNext('top');
  const halamanSebelum = () => state.pageFlip && state.pageFlip.flipPrev('top');

  /* =========================================================================
   * 8. ZOOM (tombol, pinch-to-zoom, geser, roda mouse)
   * ====================================================================== */
  function terapkanTransform() {
    const { level, tx, ty, fit } = state.zoom;
    // Skala visual = zoom pengguna × pengecil-otomatis (fit) agar buku muat
    const efektif = level * (fit || 1);
    $('#zoom-layer').style.transform = `translate(${tx}px, ${ty}px) scale(${efektif})`;
    const stage = $('#book-stage');
    stage.classList.toggle('is-zoomed', level > 1);

    const tombol = $('#btn-zoom');
    tombol.querySelector('.teks-tool').textContent = `${formatID(level, 1)}×`;
    tombol.setAttribute('aria-pressed', level > 1 ? 'true' : 'false');
  }

  /** Batasi geseran agar buku tidak hilang dari layar. */
  function batasiGeseran() {
    const rect = $('#book-stage').getBoundingClientRect();
    const efektif = state.zoom.level * (state.zoom.fit || 1);
    const maksX = Math.max(0, rect.width * (efektif - 1) / 2 + 48);
    const maksY = Math.max(0, rect.height * (efektif - 1) / 2 + 48);
    state.zoom.tx = batas(state.zoom.tx, -maksX, maksX);
    state.zoom.ty = batas(state.zoom.ty, -maksY, maksY);
  }

  /**
   * Atur level zoom. `jangkar` (opsional) = titik layar {x,y} yang ingin
   * tetap diam saat pembesaran berubah (mis. titik pinch).
   */
  function setZoom(levelBaru, jangkar) {
    const lama = state.zoom.level;
    const baru = batas(levelBaru, 1, 3);
    if (baru === lama) { terapkanTransform(); return; }

    const rect = $('#book-stage').getBoundingClientRect();
    // Pusat layer (posisi tata letak, tanpa transform) = titik tetap penskalaan
    // karena transform-origin layer ada di tengah.
    const layer = $('#zoom-layer');
    const pusat = {
      x: layer.offsetLeft + layer.offsetWidth / 2,
      y: layer.offsetTop + layer.offsetHeight / 2
    };
    const p = jangkar
      ? { x: jangkar.x - rect.left, y: jangkar.y - rect.top }
      : pusat;

    const k = baru / lama;
    // Jaga agar titik jangkar tetap di posisi layarnya
    state.zoom.tx = state.zoom.tx + (p.x - pusat.x - state.zoom.tx) * (1 - k);
    state.zoom.ty = state.zoom.ty + (p.y - pusat.y - state.zoom.ty) * (1 - k);
    state.zoom.level = baru;

    batasiGeseran();
    terapkanTransform();
  }

  function resetZoom() {
    // Faktor fit dipertahankan (dihitung ulang oleh fitStage saat layout berubah)
    state.zoom = { level: 1, tx: 0, ty: 0, fit: state.zoom.fit || 1 };
    terapkanTransform();
  }

  /** Gerakan sentuh & mouse pada panggung (pinch zoom, geser, ketuk halaman). */
  function pasangGesturZoom() {
    const stage = $('#book-stage');
    let gestur = null;
    let sentuh = null;           // pelacak ketuk tunggal (tap sisi halaman)
    let ketukTerakhir = 0, posKetuk = null;
    let abaikanKlikSampai = 0;   // klik sintetis setelah sentuhan -> diabaikan
    let mouseTurun = null;       // posisi mouse saat ditekan (deteksi seret)

    const jarakDuaTitik = (a, b) =>
      Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const titikRata = (t) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2
    });

    /**
     * Titik di zona sudut buku? Library sendiri membalik halaman saat halaman
     * diklik/ketuk tepat di zona sudut (kuadrat bersisi (diagonal 1 halaman)/5
     * di tiap sudut). Agar tidak membalik dua kali, ketukan di zona itu
     * diserahkan sepenuhnya ke library.
     */
    function diZonaSudut(x, y) {
      const wrap = document.querySelector('.stf__wrapper');
      if (!wrap) return false;
      const r = wrap.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
      const spread = stage.classList.contains('is-spread');
      const wHalaman = r.width / (spread ? 2 : 1);
      const s = Math.sqrt(wHalaman * wHalaman + r.height * r.height) / 5;
      return (x < r.left + s || x > r.right - s) && (y < r.top + s || y > r.bottom - s);
    }

    /**
     * Proses satu ketukan (dari sentuhan maupun mouse):
     * - ketuk ganda  -> zoom masuk (atau kembali normal bila sedang zoom)
     * - ketuk tunggal di sisi kiri/kanan halaman -> balik halaman
     */
    function prosesKetuk(x, y) {
      const pf = state.pageFlip;
      if (!pf) return;

      const now = Date.now();
      const kembar = now - ketukTerakhir < 320 && posKetuk &&
        Math.hypot(x - posKetuk.x, y - posKetuk.y) < 40;

      if (kembar) {
        // Ketuk ganda -> perbesar tampilan (atau kembalikan bila sedang zoom)
        clearTimeout(idBalikTunda); idBalikTunda = 0;
        ketukTerakhir = 0; posKetuk = null;
        if (state.zoom.level > 1) resetZoom();
        else setZoom(2, { x, y });
        return;
      }
      ketukTerakhir = now; posKetuk = { x, y };

      if (state.zoom.level > 1) return;   // saat zoom, ketuk tunggal diabaikan

      const rect = stage.getBoundingClientRect();
      const rx = x - rect.left;
      const sisiKiri = rx < rect.width * 0.3;
      const sisiKanan = rx > rect.width * 0.7;
      if (!sisiKiri && !sisiKanan) return;

      // Zona sudut sudah ditangani library -> berhenti di sini
      if (diZonaSudut(x, y)) return;

      // Ketuk di sisi halaman -> balik halaman. Tunda 260 ms agar ketuk ganda
      // kedua masih sempat membatalkan (lalu zoom).
      // Penjaga tambahan: bila library ternyata sudah membalik sendiri, jangan
      // membalik dua kali.
      const indeksAwal = pf.getCurrentPageIndex();
      idBalikTunda = setTimeout(() => {
        idBalikTunda = 0;
        if (!state.pageFlip) return;
        if (state.pageFlip.getCurrentPageIndex() !== indeksAwal) return;
        if (sisiKiri) halamanSebelum(); else halamanBerikut();
      }, 260);
    }

    /* ---- sentuh ---- */
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length >= 2) {
        // Dua jari = pinch zoom; hentikan agar tidak membalik halaman
        e.preventDefault();
        e.stopPropagation();
        gestur = {
          mode: 'pinch',
          jarakAwal: jarakDuaTitik(e.touches[0], e.touches[1]),
          zoomAwal: state.zoom.level,
          pusat: titikRata(e.touches)
        };
        sentuh = null;
        stage.classList.add('is-panning');
      } else if (state.zoom.level > 1) {
        // Satu jari saat zoom aktif = geser tampilan
        e.stopPropagation(); // cegah StPageFlip menganggapnya tarikan membalik
        gestur = {
          mode: 'pan', x: e.touches[0].clientX, y: e.touches[0].clientY,
          tx0: state.zoom.tx, ty0: state.zoom.ty, bergerak: false
        };
        sentuh = null;
        stage.classList.add('is-panning');
      } else if (e.touches.length === 1) {
        // Satu jari tanpa zoom = kandidat ketuk (tap sisi / ketuk ganda zoom)
        sentuh = {
          x: e.touches[0].clientX, y: e.touches[0].clientY,
          t: Date.now(), gerak: 0
        };
      }
    }, { capture: true, passive: false });

    stage.addEventListener('touchmove', (e) => {
      if (!gestur) {
        // Pantau pergerakan jari agar ketuk bisa dibedakan dari geseran
        // halaman yang ditangani library (swipe)
        if (sentuh && e.touches.length) {
          const dx = e.touches[0].clientX - sentuh.x;
          const dy = e.touches[0].clientY - sentuh.y;
          sentuh.gerak = Math.max(sentuh.gerak, Math.hypot(dx, dy));
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      if (gestur.mode === 'pinch' && e.touches.length >= 2) {
        const d = jarakDuaTitik(e.touches[0], e.touches[1]);
        setZoom(gestur.zoomAwal * (d / Math.max(1, gestur.jarakAwal)), gestur.pusat);
      } else if (gestur.mode === 'pan') {
        const dx = e.touches[0].clientX - gestur.x;
        const dy = e.touches[0].clientY - gestur.y;
        if (Math.hypot(dx, dy) > 5) gestur.bergerak = true;
        state.zoom.tx = gestur.tx0 + dx;
        state.zoom.ty = gestur.ty0 + dy;
        batasiGeseran();
        terapkanTransform();
      }
    }, { capture: true, passive: false });

    stage.addEventListener('touchend', (e) => {
      const mode = gestur && gestur.mode;
      const bergerak = gestur && gestur.bergerak;
      if (gestur) {
        gestur = null;
        stage.classList.remove('is-panning');
      }

      if (mode === 'pinch') {
        if (state.zoom.level < 1.08) resetZoom();
        sentuh = null;
        return;
      }
      if (mode === 'pan') {
        // Ketuk saat zoom aktif -> ketuk ganda kembali ke tampilan penuh
        if (!bergerak && e.changedTouches.length) {
          const t = e.changedTouches[0];
          const now = Date.now();
          if (now - ketukTerakhir < 320 && posKetuk &&
              Math.hypot(t.clientX - posKetuk.x, t.clientY - posKetuk.y) < 40) {
            resetZoom();
            ketukTerakhir = 0;
          } else {
            ketukTerakhir = now;
            posKetuk = { x: t.clientX, y: t.clientY };
          }
        }
        sentuh = null;
        return;
      }

      /* Tanpa gestur library -> kandidat ketuk (tap) pada panggung */
      if (!sentuh || !e.changedTouches.length) { sentuh = null; return; }
      const t = e.changedTouches[0];
      const dt = Date.now() - sentuh.t;
      const dekat = Math.hypot(t.clientX - sentuh.x, t.clientY - sentuh.y) < 12;
      const ketuk = sentuh.gerak < 12 && dt < 250 && dekat;
      sentuh = null;
      if (!ketuk) return;

      // Abaikan bila menyentuh area kendali (tombol/tautan/toolbar)
      if (e.target.closest &&
          e.target.closest('button, a, input, select, .book-toolbar, .book-kendali')) return;

      // Sentuhan ini akan memicu "click" sintetis di peramban -> agar tidak
      // diproses dua kali oleh penangan click mouse, tandai untuk diabaikan.
      abaikanKlikSampai = Date.now() + 800;
      prosesKetuk(t.clientX, t.clientY);
    });

    /* ---- mouse (desktop) ---- */
    stage.addEventListener('mousedown', (e) => {
      // Catat titik tekan untuk membedakan klik (balik halaman) dari seret
      mouseTurun = { x: e.clientX, y: e.clientY };
      if (state.zoom.level <= 1) return;
      e.stopPropagation();
      gestur = {
        mode: 'pan-mouse', x: e.clientX, y: e.clientY,
        tx0: state.zoom.tx, ty0: state.zoom.ty, bergerak: false
      };
      stage.classList.add('is-panning');
    });
    window.addEventListener('mousemove', (e) => {
      if (!gestur || gestur.mode !== 'pan-mouse') return;
      const dx = e.clientX - gestur.x, dy = e.clientY - gestur.y;
      if (Math.hypot(dx, dy) > 4) gestur.bergerak = true;
      state.zoom.tx = gestur.tx0 + dx;
      state.zoom.ty = gestur.ty0 + dy;
      batasiGeseran();
      terapkanTransform();
    });
    window.addEventListener('mouseup', () => {
      if (gestur && gestur.mode === 'pan-mouse') {
        gestur = null;
        stage.classList.remove('is-panning');
      }
    });

    /* ---- roda mouse (desktop) ---- */
    stage.addEventListener('wheel', (e) => {
      if (!$('#screen-book').hidden && (e.ctrlKey || Math.abs(e.deltaY) > 0)) {
        e.preventDefault();
        setZoom(state.zoom.level * (e.deltaY < 0 ? 1.12 : 1 / 1.12),
                { x: e.clientX, y: e.clientY });
      }
    }, { passive: false });

    /* ---- klik mouse (desktop): ketuk sisi = balik, klik ganda = zoom ---- */
    stage.addEventListener('click', (e) => {
      // Lewati klik sintetis yang berasal dari sentuhan (sudah diproses di touchend)
      if (Date.now() < abaikanKlikSampai) return;
      // Lewati bila menekan area kendali (tombol/tautan/toolbar)
      if (e.target.closest &&
          e.target.closest('button, a, input, select, .book-toolbar, .book-kendali')) return;
      // Lewati bila ini akhir dari sebuah seretan (drag sudut / geser halaman)
      if (mouseTurun && Math.hypot(e.clientX - mouseTurun.x, e.clientY - mouseTurun.y) > 10) {
        mouseTurun = null;
        return;
      }
      mouseTurun = null;
      prosesKetuk(e.clientX, e.clientY);
    });
  }

  /* =========================================================================
   * 9. EFEK SUARA MEMBALIK HALAMAN (disintesis, tanpa file audio)
   * ====================================================================== */
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { audioCtx = new AC(); } catch (e) { return; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function putarSuara() {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const dur = 0.26, sr = audioCtx.sampleRate;
    const n = Math.floor(sr * dur);
    const buf = audioCtx.createBuffer(1, n, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      // Deru halus dengan eksponeusial meredup = bunyi kertas berbalik
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(2400, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + dur);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(KONFIG.sound.volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);

    src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    src.start();
  }

  let pengamatPanggung = null;       // ResizeObserver panggung buku
  let idPantauPanggung = 0;          // id rAF untuk pantauPanggung()
  let kendaliTerakhir = -1;          // tinggi bilah kendali yang terakhir diukur
  let ukuranPanggungTerakhir = '';   // kunci ukuran panggung (deteksi perubahan)

  /**
   * Ukur tinggi bilah kendali melayang, lalu pakai sebagai ruang bawah
   * panggung buku. Tujuannya: buku tidak pernah tertutup bilah alat, berapa
   * pun jumlah baris tombolnya (HP sempit bisa membungkus ke dua baris).
   */
  function ukurKendali() {
    const k = $('#book-kendali');
    if (!k || $('#screen-book').hidden) return;
    const tinggi = Math.ceil(k.getBoundingClientRect().height);
    if (!tinggi || Math.abs(tinggi - kendaliTerakhir) < 2) return;
    kendaliTerakhir = tinggi;
    const ruang = batas(tinggi + 10, 78, 220);   // nilai wajar utk semua layar
    document.documentElement.style.setProperty('--kendali-ruang', ruang + 'px');
  }

  /** Pantau ukuran panggung buku (font/gambar/bilah peramban menyusul). */
  function pantauPanggung() {
    if (idPantauPanggung) return;      // sudah dijadwalkan
    idPantauPanggung = requestAnimationFrame(() => {
      idPantauPanggung = 0;
      if ($('#screen-book').hidden) return;
      const r = $('#book-stage').getBoundingClientRect();
      const kunci = Math.round(r.width) + '×' + Math.round(r.height);
      if (kunci === ukuranPanggungTerakhir) return;   // tidak ada perubahan nyata
      ukuranPanggungTerakhir = kunci;
      ukurKendali();
      fitStage();
    });
  }

  /* =========================================================================
   * 11. PERGANTIAN LAYAR
   * ====================================================================== */
  /** id timer "balik halaman karena ketuk cepat" (dibatalkan bila layar pindah). */
  let idBalikTunda = 0;

  async function tampilkanLayar(nama) {
    const diBuku = nama === 'book';

    pindahkanToast(diBuku);
    $('#screen-setup').hidden = diBuku;
    $('#screen-book').hidden = !diBuku;
    if (!diBuku) {
      clearTimeout(idBalikTunda); // jangan balik halaman setelah kembali
      tutupDrawer();
      hancurkanBuku();           // bebaskan memori & GPU saat kembali ke pengaturan
      if (state.halamanSebelumContoh !== null) {
        state.pages = state.halamanSebelumContoh;
        state.halamanSebelumContoh = null;
        periksaRasio();
        renderDaftar();
        perbaruiInfoAksi();
        toast('Halaman Anda dipulihkan setelah melihat contoh.');
      }
      if (state.gayaSebelumContoh) {
        state.orientasi = state.gayaSebelumContoh.orientasi;
        state.jilid = state.gayaSebelumContoh.jilid;
        state.gayaSebelumContoh = null;
        state.gayaPreview = null;
        sinkronSegmen();
        perbaruiInfoUkuran();
      }
      resetZoom();
      perbaruiAlur();            // tandai tahap yang sudah tuntas
    } else {
      KendaliBuku.tampilkan();   // tampilkan toolbar saat masuk layar buku
      ukurKendali();             // ruang bawah panggung disesuaikan bilah alat
    }
    window.scrollTo(0, 0);
  }

  /** Pindahkan elemen notifikasi (#toast) ke layar yang sedang tampil. */
  function pindahkanToast(diBuku) {
    const t = $('#toast');
    const induk = diBuku ? $('#screen-book') : document.body;
    if (t && induk && t.parentElement !== induk) induk.appendChild(t);
  }

  async function bukaLayarBuku() {
    if (!state.pages.length) {
      toast('Unggah minimal satu gambar menu sebelum membuka buku.', 'galat');
      return;
    }
    if (state.ukuranPreset === 'custom' && !ukuranValid()) {
      toast('Periksa kembali ukuran khusus pada kartu "Ukuran halaman".', 'galat');
      return;
    }
    if (typeof window.St === 'undefined' || !window.St.PageFlip) {
      toast('Pustaka buku digital gagal dimuat. Periksa koneksi internet, lalu muat ulang halaman.', 'galat');
      return;
    }

    tampilkanLayar('book');
    setBukuLoading(true);
    try {
      await bangunBuku();
    } catch (e) {
      console.error(e);
      toast('Buku menu gagal disiapkan. Silakan coba lagi.', 'galat');
      tampilkanLayar('setup');
      return;
    }
    setBukuLoading(false);
    state.pernahBuka = true;                     // tahap 03 (buka buku) tuntas
    requestAnimationFrame(perbaruiPanggungBuku); // final setelah layout selesai
    ukurUlangBertahap();                         // font & gambar menyusul
    KendaliBuku.tampilkan();
  }

  /* =========================================================================
   * 12. PEMASANGAN EVENT
   * ====================================================================== */

  /** Sinkronkan kontrol orientasi dan jilid pada kartu Ukuran halaman. */
  function sinkronSegmen() {
    document.querySelectorAll('.segmen[data-orientasi]').forEach((b) => {
      const aktif = b.dataset.orientasi === state.orientasi;
      b.classList.toggle('is-aktif', aktif);
      b.setAttribute('aria-pressed', String(aktif));
    });
    document.querySelectorAll('.segmen[data-jilid]').forEach((b) => {
      const aktif = b.dataset.jilid === state.jilid;
      b.classList.toggle('is-aktif', aktif);
      b.setAttribute('aria-pressed', String(aktif));
    });
  }

  function pasangEvent() {
    pasangKendaliTerbit();
    /* ---- navigasi mobile ---- */
    const dialogMenu = $('#dialog-menu-mobile');
    const tombolMenu = $('#btn-menu-mobile');
    const tutupMenu = () => {
      if (!dialogMenu) return;
      if (dialogMenu.open) dialogMenu.close();
      if (tombolMenu) tombolMenu.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-scroll-terkunci');
    };
    if (dialogMenu && tombolMenu) {
      tombolMenu.addEventListener('click', () => {
        dialogMenu.showModal();
        tombolMenu.setAttribute('aria-expanded', 'true');
        document.body.classList.add('is-scroll-terkunci');
        const tutup = $('#btn-menu-mobile-tutup');
        if (tutup) tutup.focus();
      });
      const tutup = $('#btn-menu-mobile-tutup');
      if (tutup) tutup.addEventListener('click', tutupMenu);
      dialogMenu.addEventListener('click', (e) => {
        if (e.target === dialogMenu) tutupMenu();
      });
      dialogMenu.addEventListener('close', () => {
        tombolMenu.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-scroll-terkunci');
      });
      dialogMenu.querySelectorAll('a').forEach((tautan) => tautan.addEventListener('click', tutupMenu));
    }
    /* ---- ukuran buku ---- */
    const sel = $('#sel-ukuran');
    sel.value = state.ukuranPreset;
    if (sel.value !== state.ukuranPreset) {
      state.ukuranPreset = KONFIG.book.ukuranAwal;
      sel.value = state.ukuranPreset;
    }

    sel.addEventListener('change', () => {
      state.ukuranPreset = sel.value;
      simpanPreferensi();
      perbaruiInfoUkuran();
    });

    const inL = $('#in-lebar'), inT = $('#in-tinggi');
    inL.min = KONFIG.custom.minLebar; inL.max = KONFIG.custom.maxLebar;
    inT.min = KONFIG.custom.minTinggi; inT.max = KONFIG.custom.maxTinggi;
    inL.value = state.ukuranCustom.w; inT.value = state.ukuranCustom.h;
    const bacaCustom = () => {
      state.ukuranCustom.w = parseFloat(inL.value);
      state.ukuranCustom.h = parseFloat(inT.value);
      simpanPreferensi();
      perbaruiInfoUkuran();
    };
    inL.addEventListener('input', bacaCustom);
    inT.addEventListener('input', bacaCustom);

    /* ---- unggah file ---- */
    const input = $('#file-input'), dz = $('#dropzone');
    const bukaDialog = () => input.click();
    $('#btn-pilih-file').addEventListener('click', bukaDialog);
    dz.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // tombol "Pilih File" sudah cukup
      bukaDialog();
    });
    dz.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bukaDialog(); }
    });
    input.addEventListener('change', () => {
      tanganiFiles(input.files);
      input.value = ''; // agar file yang sama bisa dipilih ulang
    });

    // Drag & drop dari sistem berkas
    ['dragenter', 'dragover'].forEach((t) => dz.addEventListener(t, (e) => {
      e.preventDefault();
      dz.classList.add('is-over');
    }));
    ['dragleave', 'drop'].forEach((t) => dz.addEventListener(t, (e) => {
      e.preventDefault();
      dz.classList.remove('is-over');
    }));
    dz.addEventListener('drop', (e) => tanganiFiles(e.dataTransfer.files));

    /* ---- pilihan penyesuaian rasio ---- */
    $('#btn-rasio-crop').addEventListener('click', () => {
      state.pilihFit = 'cover';
      periksaRasio(); renderDaftar();
      toast('Gambar ditampilkan "isi penuh": tepinya terpotong sedikit.');
    });
    $('#btn-rasio-fit').addEventListener('click', () => {
      state.pilihFit = 'contain';
      periksaRasio(); renderDaftar();
      toast('Gambar ditampilkan "muat penuh": ada tepi kosong di sekelilingnya.');
    });

    /* ---- aksi utama ---- */
    $('#btn-contoh').addEventListener('click', () => muatContoh());
    $('#btn-lihat').addEventListener('click', bukaLayarBuku);
    $('#btn-kembali').addEventListener('click', () => tampilkanLayar('setup'));

    /* ---- tombol demo pada hero: muat menu contoh, langsung buka buku ---- */
    $('#btn-hero-demo').addEventListener('click', async () => {
      if (!state.pages.length) await muatContoh();
      if (state.pages.length) bukaLayarBuku();
    });

    /* ---- kartu menu siap pakai di landing: buka buku menu itu langsung ---- */
    document.querySelectorAll('[data-menu-contoh]').forEach((b) =>
      b.addEventListener('click', () => bukaMenuContoh(b.dataset.menuContoh)));

    /* ---- pilihan bentuk halaman dan jenis jilid ---- */
    sinkronSegmen();
    document.querySelectorAll('.segmen[data-orientasi]').forEach((b) =>
      b.addEventListener('click', () => {
        state.orientasi = b.dataset.orientasi === 'landscape' ? 'landscape' : 'portrait';
        simpanPreferensi();
        sinkronSegmen();
        perbaruiInfoUkuran();
      }));
    document.querySelectorAll('.segmen[data-jilid]').forEach((b) =>
      b.addEventListener('click', () => {
        state.jilid = b.dataset.jilid === 'spiral' ? 'spiral' : 'biasa';
        simpanPreferensi();
        sinkronSegmen();
        if (state.pageFlip) perbaruiPanggungBuku();
      }));

    /* ---- contoh mandiri: hanya ikon mata yang membuka flipbook ---- */
    async function bukaContohGaya(kunci) {
        const konfigurasi = {
          'portrait-biasa': { orientasi: 'portrait', jilid: 'biasa' },
          'portrait-spiral': { orientasi: 'portrait', jilid: 'spiral' },
          'landscape-biasa': { orientasi: 'landscape', jilid: 'biasa' },
          'landscape-spiral': { orientasi: 'landscape', jilid: 'spiral' }
        }[kunci];
        if (!konfigurasi) return;
        if (!state.gayaSebelumContoh) {
          state.gayaSebelumContoh = { orientasi: state.orientasi, jilid: state.jilid };
        }
        state.gayaPreview = konfigurasi;
        state.orientasi = konfigurasi.orientasi;
        state.jilid = konfigurasi.jilid;
        sinkronSegmen();
        perbaruiInfoUkuran();
      if (state.halamanSebelumContoh === null) {
        state.halamanSebelumContoh = state.pages;
        state.pages = [];
      }
      const halamanContoh = konfigurasi.orientasi === 'landscape'
        ? KONFIG.sample.landscapePages
        : KONFIG.sample.portraitPages;
      const berhasil = await muatContoh(true, '', true, halamanContoh);
      toast('Contoh ditampilkan sementara. Halaman Anda tidak diubah.');
      if (berhasil) await bukaLayarBuku();
      else if (state.halamanSebelumContoh !== null) {
        state.pages = state.halamanSebelumContoh;
        state.halamanSebelumContoh = null;
        renderDaftar();
        perbaruiInfoAksi();
        if (state.gayaSebelumContoh) {
          state.orientasi = state.gayaSebelumContoh.orientasi;
          state.jilid = state.gayaSebelumContoh.jilid;
          state.gayaSebelumContoh = null;
          sinkronSegmen();
          perbaruiInfoUkuran();
        }
      }
      state.gayaPreview = null;
    }
    document.querySelectorAll('[data-preview]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        bukaContohGaya(b.dataset.preview);
      }));

    /* ---- laci thumbnail (drawer) ---- */
    $('#btn-drawer').addEventListener('click', () =>
      drawerTerbuka() ? tutupDrawer() : bukaDrawer());
    $('#btn-drawer-tutup').addEventListener('click', tutupDrawer);
    $('#drawer-overlay').addEventListener('click', tutupDrawer);
    const drawer = $('#drawer-buku');
    let drawerSentuhAwal = null;
    drawer.addEventListener('touchstart', (e) => {
      if (!drawerTerbuka() || e.touches.length !== 1) return;
      const t = e.touches[0];
      drawerSentuhAwal = { x: t.clientX, y: t.clientY };
    }, { passive: true });
    drawer.addEventListener('touchend', (e) => {
      if (!drawerSentuhAwal || e.changedTouches.length !== 1) {
        drawerSentuhAwal = null;
        return;
      }
      const t = e.changedTouches[0];
      const dy = t.clientY - drawerSentuhAwal.y;
      const dx = Math.abs(t.clientX - drawerSentuhAwal.x);
      drawerSentuhAwal = null;
      if (dy > 64 && dy > dx * 1.2) tutupDrawer();
    }, { passive: true });

    /* ---- toolbar melayang: tampil saat interaksi, menyusut saat diam ---- */
    let terakhirGerak = 0;
    const bangunkanKendali = () => {
      const now = Date.now();
      if (now - terakhirGerak < 250) return; // hemat: pointermove sering sekali
      terakhirGerak = now;
      KendaliBuku.tampilkan();
    };
    document.addEventListener('pointermove', bangunkanKendali, { passive: true });
    document.addEventListener('pointerdown', () => KendaliBuku.tampilkan(), { passive: true });
    document.addEventListener('touchstart', () => KendaliBuku.tampilkan(), { passive: true });
    document.addEventListener('keydown', () => KendaliBuku.tampilkan());

    /* ---- toolbar buku ---- */
    $('#btn-awal').addEventListener('click', () => keHalaman(0));
    $('#btn-akhir').addEventListener('click', () =>
      state.pageFlip && keHalaman(state.pageFlip.getPageCount() - 1));
    $('#btn-sebelum').addEventListener('click', halamanSebelum);
    $('#btn-berikut').addEventListener('click', halamanBerikut);

    $('#form-lompat').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = parseInt($('#in-lompat').value, 10);
      if (Number.isFinite(n)) keHalaman(n - 1);
    });

    const tahapZoom = [1, 1.5, 2];
    $('#btn-zoom').addEventListener('click', () => {
      const kini = state.zoom.level;
      const berikut = tahapZoom.find((z) => z > kini + 0.05) || 1;
      setZoom(berikut);
    });

    const tombolSuara = $('#btn-suara');
    tombolSuara.setAttribute('aria-pressed', String(state.soundOn));
    tombolSuara.addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      simpanPreferensi();
      // Ikon berubah lewat CSS berdasarkan aria-pressed (nyala <-> mati)
      tombolSuara.setAttribute('aria-pressed', String(state.soundOn));
      if (state.soundOn) { initAudio(); putarSuara(); } // contoh suara
    });

    /* ---- keyboard ---- */
    document.addEventListener('keydown', (e) => {
      if ($('#screen-book').hidden) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      switch (e.key) {
        case 'ArrowRight': e.preventDefault(); halamanBerikut(); break;
        case 'ArrowLeft': e.preventDefault(); halamanSebelum(); break;
        case 'Home': e.preventDefault(); keHalaman(0); break;
        case 'End':
          e.preventDefault();
          if (state.pageFlip) keHalaman(state.pageFlip.getPageCount() - 1);
          break;
        case 'Escape':
          if (drawerTerbuka()) { tutupDrawer(); break; }
          tampilkanLayar('setup');
          break;
      }
    });

    /* ---- resize & perubahan orientasi layar ---- */
    let lebarSebelumnya = window.innerWidth;
    const saatResize = debounce(() => {
      // Kembali ke zoom normal bila lebar layar berpindah mode (HP/desktop)
      if ((lebarSebelumnya < 700) !== (window.innerWidth < 700)) resetZoom();
      lebarSebelumnya = window.innerWidth;
      ukuranPanggungTerakhir = '';   // paksa pengukuran ulang
      pantauPanggung();
    }, 150);
    window.addEventListener('resize', saatResize);
    window.addEventListener('orientationchange', saatResize); // rotasi HP
    // Tinggi bilah alamat HP (visual viewport) juga mengubah ruang buku
    if (window.visualViewport) window.visualViewport.addEventListener('resize', saatResize);

    /* ---- gesture zoom ---- */
    pasangGesturZoom();

    /* ---- audio: hanya boleh dibuat setelah interaksi pengguna (iOS) ---- */
    ['pointerdown', 'touchstart', 'keydown'].forEach((t) =>
      document.addEventListener(t, initAudio, { once: true, passive: true }));
  }

  /* =========================================================================
   * 12b. MENU TERSIMPAN DAN TAUTAN PUBLIK
   * ====================================================================== */
  let menuTersimpanId = new URLSearchParams(location.search).get('edit') || '';

  function slugOtomatis(teks) {
    return String(teks || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  }

  function aturStatusTerbit(pesan, error = false) {
    const status = $('#publish-status');
    if (!status) return;
    status.textContent = pesan;
    status.hidden = !pesan;
    status.dataset.error = error ? 'true' : 'false';
  }

  async function apiMenu(url, options = {}) {
    const { headers, ...requestOptions } = options;
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...requestOptions,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || 'Permintaan belum berhasil.'), { status: response.status });
    return data;
  }

  async function siapkanHalamanTerbit(page, index, total) {
    if (!/^(blob:|data:)/.test(page.url)) {
      return { name: page.nama, url: page.url, w: page.w, h: page.h, fit: page.fit };
    }
    const source = await fetch(page.url);
    if (!source.ok) throw new Error('Salah satu halaman tidak dapat dibaca.');
    const image = await source.blob();
    aturStatusTerbit(`Mengunggah halaman ${index} dari ${total}…`);
    const response = await fetch('/api/uploads', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': image.type },
      body: image
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(result.error || 'Gambar halaman gagal diunggah.'), { status: response.status });
    page.url = result.url;
    return { name: page.nama, url: result.url, w: page.w, h: page.h, fit: page.fit };
  }

  async function terbitkanMenu() {
    const tombol = $('#publish-button');
    if (!tombol) return;
    if (!state.pages.length) return aturStatusTerbit('Tambahkan minimal satu halaman sebelum menerbitkan.', true);
    const cafeName = $('#publish-cafe-name').value.trim();
    const slug = $('#publish-slug').value.trim().toLowerCase();
    if (cafeName.length < 2) return aturStatusTerbit('Isi nama kafe atau tempat usaha.', true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 48) {
      return aturStatusTerbit('Alamat harus 3–48 karakter dan hanya memakai huruf kecil, angka, atau tanda hubung.', true);
    }

    try {
      const { user } = await apiMenu('/api/auth/me');
      if (!user) {
        aturStatusTerbit('Masuk atau buat akun melalui tombol di samping, lalu terbitkan lagi.');
        return;
      }
      tombol.disabled = true;
      tombol.textContent = 'Menyimpan halaman…';
      aturStatusTerbit('Mengunggah dan menyimpan halaman menu…');
      const pages = [];
      for (let index = 0; index < state.pages.length; index++) {
        pages.push(await siapkanHalamanTerbit(state.pages[index], index + 1, state.pages.length));
      }
      const menu = await apiMenu('/api/menus', {
        method: 'POST',
        body: JSON.stringify({
          id: menuTersimpanId || undefined,
          cafeName, slug,
          orientation: state.orientasi,
          binding: state.jilid,
          sizePreset: state.ukuranPreset,
          customWidth: state.ukuranCustom.w,
          customHeight: state.ukuranCustom.h,
          pages
        })
      });
      menuTersimpanId = menu.id;
      history.replaceState(null, '', `/?edit=${encodeURIComponent(menu.id)}`);
      $('#publish-slug').value = menu.slug;
      $('#publish-result-link').href = menu.url;
      $('#publish-result-link').textContent = new URL(menu.url, location.origin).href;
      $('#publish-result').hidden = false;
      $('#publish-account-link').textContent = 'Kelola menu di akun';
      aturStatusTerbit('Menu tersimpan dan link publiknya sudah aktif.');
      tombol.textContent = 'Perbarui menu';
    } catch (error) {
      if (error.status === 401) {
        aturStatusTerbit('Masuk atau buat akun melalui tombol di samping, lalu terbitkan lagi.');
      } else aturStatusTerbit(error.message, true);
    } finally {
      tombol.disabled = false;
      if (tombol.textContent === 'Menyimpan halaman…') tombol.textContent = menuTersimpanId ? 'Perbarui menu' : 'Simpan & terbitkan';
    }
  }

  function pasangKendaliTerbit() {
    const cafeInput = $('#publish-cafe-name');
    const slugInput = $('#publish-slug');
    $('#publish-account-link').href = `/akun?return=${encodeURIComponent(location.pathname + location.search)}`;
    cafeInput.addEventListener('input', () => {
      if (slugInput.dataset.manual !== 'true') slugInput.value = slugOtomatis(cafeInput.value);
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.manual = 'true';
      slugInput.value = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-');
    });
    $('#publish-button').addEventListener('click', terbitkanMenu);
    $('#publish-copy-button').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('#publish-result-link').href);
        aturStatusTerbit('Link menu disalin.');
      } catch { aturStatusTerbit(`Salin link ini: ${$('#publish-result-link').href}`); }
    });
    apiMenu('/api/auth/me').then(({ user }) => {
      if (user) $('#publish-account-link').textContent = 'Kelola menu di akun';
    }).catch(() => {});
  }

  function terapkanMenuCloud(menu) {
    state.pages = menu.pages.map((page) => ({
      id: state.idSeq++, nama: page.name, url: page.url, w: page.w, h: page.h,
      fit: page.fit === 'contain' ? 'contain' : 'cover', rasioOk: true,
      blank: false, contoh: false
    }));
    state.orientasi = menu.orientation;
    state.jilid = menu.binding;
    state.ukuranPreset = menu.sizePreset;
    if (menu.sizePreset === 'custom') {
      state.ukuranCustom.w = Number(menu.customWidth);
      state.ukuranCustom.h = Number(menu.customHeight);
      $('#in-lebar').value = state.ukuranCustom.w;
      $('#in-tinggi').value = state.ukuranCustom.h;
    }
    $('#sel-ukuran').value = menu.sizePreset;
    $('#publish-cafe-name').value = menu.cafeName;
    $('#publish-slug').value = menu.slug;
    $('#publish-slug').dataset.manual = 'true';
    sinkronSegmen();
    perbaruiInfoUkuran();
    periksaRasio();
    renderDaftar();
    perbaruiInfoAksi();
    menuTersimpanId = menu.id;
    $('#publish-button').textContent = 'Perbarui menu';
    $('#publish-account-link').textContent = 'Kelola menu di akun';
    $('#publish-result-link').href = menu.url;
    $('#publish-result-link').textContent = new URL(menu.url, location.origin).href;
    $('#publish-result').hidden = false;
  }

  async function bukaMenuEdit(id) {
    try {
      const menu = await apiMenu(`/api/menus/${encodeURIComponent(id)}`);
      terapkanMenuCloud(menu);
      document.title = `Mengubah ${menu.cafeName} · Swipe.menu`;
    } catch (error) {
      if (error.status === 401) {
        const returnTo = `/?edit=${encodeURIComponent(id)}`;
        location.assign(`/akun?return=${encodeURIComponent(returnTo)}`);
      } else aturStatusTerbit(error.message, true);
    }
  }

  async function bukaMenuPublik(slug) {
    document.documentElement.dataset.menuPublik = 'true';
    $('#screen-setup').hidden = true;
    try {
      const menu = await apiMenu(`/api/public/menus/${encodeURIComponent(slug)}`);
      terapkanMenuCloud(menu);
      $('#nama-usaha-book').textContent = menu.cafeName;
      document.title = `${menu.cafeName} · Buku menu`;
      await bukaLayarBuku();
    } catch (error) {
      $('#screen-book').hidden = true;
      $('#menu-not-found').hidden = false;
      const notFound = error.status === 404;
      $('#menu-not-found-heading').textContent = notFound ? 'Tautan menu belum aktif' : 'Menu belum dapat dimuat';
      $('#menu-not-found-message').textContent = notFound
        ? 'Belum ada menu yang diterbitkan pada tautan ini. Jika Anda pemiliknya, masuk ke akun untuk menerbitkan menu atau periksa kembali alamatnya.'
        : 'Server belum berhasil memuat menu. Periksa koneksi internet lalu coba lagi.';
      const retry = $('#menu-not-found-retry');
      retry.href = location.href;
      retry.hidden = notFound;
      document.title = `${notFound ? 'Tautan menu belum aktif' : 'Menu belum dapat dimuat'} · Swipe.menu`;
    }
  }

  /* =========================================================================
   * 13. MULAI APLIKASI
   * ====================================================================== */
  function mulai() {
    pasangTema();
    bacaPreferensi();
    terapkanBranding();
    pasangEvent();
    if (typeof ResizeObserver !== 'undefined') {
      pengamatPanggung = new ResizeObserver(pantauPanggung);
      pengamatPanggung.observe($('#book-stage'));
    }
    pindahkanToast(false);      // notifikasi mulai di layar penyusun
    perbaruiInfoUkuran();       // sekalian mengisi info & daftar halaman
    terapkanTransform();

    const slugPublik = location.pathname.match(/^\/menu\/([a-z0-9-]+)\/?$/)?.[1];
    if (slugPublik) {
      bukaMenuPublik(slugPublik);
      return;
    }
    if (menuTersimpanId) {
      bukaMenuEdit(menuTersimpanId);
      return;
    }

    // Menu contoh agar website langsung bisa dicoba tanpa unggah
    if (KONFIG.sample.autoLoad && KONFIG.sample.pages.length) {
      muatContoh();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})();
