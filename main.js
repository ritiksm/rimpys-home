/* Vier Dinge, keine Bibliothek:
   Kopf beim Scrollen ausblenden, Menue, Aufblenden beim Scrollen,
   Grossansicht fuer Bilder und Video. */
(function () {
  'use strict';

  var body = document.body;
  var menu = document.querySelector('.menu-overlay');
  var overlay = document.querySelector('.overlay-media');
  var overlayInner = overlay.querySelector('.overlay-inner');
  var overlayCaption = overlay.querySelector('.overlay-caption');

  // Ohne JS bleiben beide versteckt, mit JS uebernimmt die CSS-Blende.
  menu.removeAttribute('hidden');
  overlay.removeAttribute('hidden');
  menu.setAttribute('aria-hidden', 'true');
  overlay.setAttribute('aria-hidden', 'true');

  /* --- Kopf --------------------------------------------------------------- */

  var letzte = window.scrollY;
  window.addEventListener('scroll', function () {
    var jetzt = window.scrollY;
    body.classList.toggle('scrolled', jetzt > 120 && jetzt > letzte);
    letzte = jetzt;
  }, { passive: true });

  /* --- Menue -------------------------------------------------------------- */

  function menuAuf(offen) {
    body.classList.toggle('menu-open', offen);
    menu.setAttribute('aria-hidden', offen ? 'false' : 'true');
  }
  document.querySelector('.menu-icon').addEventListener('click', function () {
    menuAuf(!body.classList.contains('menu-open'));
  });
  menu.querySelector('.close-overlay').addEventListener('click', function () {
    menuAuf(false);
  });
  menu.addEventListener('click', function (ev) {
    if (ev.target.tagName === 'A') { menuAuf(false); }
  });

  /* --- Aufblenden beim Scrollen ------------------------------------------- */

  var teile = document.querySelectorAll('.scrollAnimatedItem');
  if ('IntersectionObserver' in window) {
    var beobachter = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('inview');
          beobachter.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    teile.forEach(function (t) { beobachter.observe(t); });
  } else {
    teile.forEach(function (t) { t.classList.add('inview'); });
  }

  /* --- Grossansicht ------------------------------------------------------- */

  function overlayZu() {
    body.classList.remove('overlay-open');
    overlay.setAttribute('aria-hidden', 'true');
    // Erst nach der Blende leeren, sonst flackert es.
    setTimeout(function () {
      if (!body.classList.contains('overlay-open')) { overlayInner.innerHTML = ''; }
    }, 600);
  }

  function overlayAuf(knoten, beschriftung) {
    overlayInner.innerHTML = '';
    overlayInner.appendChild(knoten);
    overlayCaption.textContent = beschriftung || '';
    body.classList.add('overlay-open');
    overlay.setAttribute('aria-hidden', 'false');
  }

  document.querySelectorAll('figure .image-container').forEach(function (knopf) {
    knopf.addEventListener('click', function () {
      var gross = new Image();
      // Auf dem Telefon reicht die mittlere Datei: sie ist dort immer noch
      // dreimal so breit wie die Anzeigeflaeche, waere aber halb so schwer.
      // Alles ab Tablet bekommt die grosse, damit Zoomen etwas bringt.
      var telefon = window.innerWidth < 768;
      gross.src = telefon ? knopf.dataset.mittel : knopf.dataset.full;
      gross.alt = knopf.dataset.caption || '';
      overlayAuf(gross, knopf.dataset.caption);
    });
  });

  overlay.querySelector('.close-overlay').addEventListener('click', overlayZu);
  overlay.addEventListener('click', function (ev) {
    if (ev.target === overlay || ev.target === overlayInner) { overlayZu(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { overlayZu(); menuAuf(false); }
  });

  var telefon = window.innerWidth < 768;

  /* --- Kopfvideo ----------------------------------------------------------- */

  // Laeuft stumm in Schleife, auch auf dem Telefon: die kleine Fassung wiegt
  // 1 MB, die grosse 2,6 MB. Wer Bewegung abgestellt hat, sieht das Standbild.
  var kopf = document.querySelector('.hero-video');
  if (kopf && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    kopf.src = telefon ? kopf.dataset.srcKlein : kopf.dataset.src;
    var start = kopf.play();
    if (start && start.catch) {
      // Wenn ein Browser den Selbststart doch verweigert, bleibt das Standbild
      // stehen, und ein Tippen startet ihn.
      start.catch(function () {
        kopf.addEventListener('click', function () { kopf.play(); }, { once: true });
      });
    }
  }

  /* --- Videos -------------------------------------------------------------- */

  document.querySelectorAll('.video-container').forEach(function (block) {
    var video = block.querySelector('video');
    if (!video) { return; }

    function starte() {
      if (!video.src && video.dataset.src) { video.src = video.dataset.src; }
      block.classList.add('play');
      var lauf = video.play();
      if (lauf && lauf.catch) { lauf.catch(function () {}); }
    }

    var knopf = block.querySelector('[data-action="play"]');
    if (knopf) {
      knopf.addEventListener('click', function (ev) {
        ev.stopPropagation();
        starte();
      });
    }

    // Der lange Film oben startet nur auf den Knopf, er ist 68 Sekunden und
    // 35 MB schwer. Die kurzen Kapitelvideos laufen auf dem Rechner von selbst
    // an, sobald ihr Block ins Bild kommt. Auf dem Telefon startet nichts von
    // allein, dort zeigt das Standbild den Raum.
    var kurz = block.closest('.video-block').classList.contains('klein');
    if (kurz && !telefon && 'IntersectionObserver' in window) {
      var wache = new IntersectionObserver(function (eintraege) {
        eintraege.forEach(function (e) {
          if (e.isIntersecting) { starte(); wache.unobserve(e.target); }
        });
      }, { rootMargin: '200px' });
      wache.observe(block);
    }

    // Klick auf das laufende Video oeffnet es gross, mit Bedienleiste.
    block.querySelector('.video-frame').addEventListener('click', function () {
      if (!block.classList.contains('play')) { return; }
      var kopie = video.cloneNode(false);
      kopie.src = video.currentSrc || video.dataset.src;
      kopie.controls = true;
      kopie.muted = false;
      kopie.currentTime = video.currentTime;
      kopie.play().catch(function () {});
      overlayAuf(kopie, '');
    });
  });
})();
