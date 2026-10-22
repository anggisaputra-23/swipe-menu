/* Gerak masuk bertahap untuk judul dan bagian landing. Konten tetap terlihat
   bila browser tidak mendukung IntersectionObserver atau motion dikurangi. */
(() => {
  const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (kurangiGerak || !('IntersectionObserver' in window)) return;

  const teksHero = document.querySelector('.hero__teks');
  if (teksHero) {
    requestAnimationFrame(() => teksHero.classList.add('is-lembar-masuk'));
  }

  const selector = [
    '.landing-section__heading',
    '.langkah-card',
    '.contoh-tampilan',
    '.kartu-grid > .kartu',
    '.faq-item',
    '.landing-cta'
  ].join(',');
  const target = [...document.querySelectorAll(selector)];
  if (!target.length) return;

  target.forEach((elemen, index) => {
    elemen.dataset.reveal = 'lembar';
    elemen.style.setProperty('--jeda-reveal', `${Math.min(index % 4, 3) * 70}ms`);
    const kotak = elemen.getBoundingClientRect();
    if (kotak.top < window.innerHeight && kotak.bottom > 0) {
      elemen.classList.add('is-terbuka');
    }
  });

  document.documentElement.classList.add('motion-ready');
  const pengamat = new IntersectionObserver((entri, observer) => {
    entri.forEach(({ isIntersecting, target: elemen }) => {
      if (!isIntersecting) return;
      elemen.classList.add('is-terbuka');
      observer.unobserve(elemen);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  target.forEach((elemen) => {
    if (!elemen.classList.contains('is-terbuka')) pengamat.observe(elemen);
  });
})();
