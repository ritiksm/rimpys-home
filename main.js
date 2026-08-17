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

  /* --- Hero-Blende --------------------------------------------------------- */

  var slides = document.querySelectorAll('.hero .slide');
  var punkte = document.querySelectorAll('.slide-dots button');
  if (slides.length > 1) {
    var aktiv = 0;
    var uhr = null;

    // Nur das erste Hero-Bild steht im Dokument. Die uebrigen tragen ihre
    // Quelle in data-Feldern und werden erst geladen, wenn sie an der Reihe
    // sind. Ohne das zieht schon die erste Ansicht drei Vollbilder.
    function lade(slide) {
      if (!slide) { return; }
      var img = slide.querySelector('img');
      if (!img || !img.dataset.src) { return; }
      img.srcset = img.dataset.srcset || '';
      img.src = img.dataset.src;
      delete img.dataset.src;
    }

    var bereit = false;   // wird erst nach der ersten Ansicht gesetzt

    function zeige(i) {
      aktiv = (i + slides.length) % slides.length;
      lade(slides[aktiv]);
      if (bereit) { lade(slides[(aktiv + 1) % slides.length]); }
      slides.forEach(function (s, n) { s.classList.toggle('active', n === aktiv); });
      punkte.forEach(function (p, n) {
        p.setAttribute('aria-current', n === aktiv ? 'true' : 'false');
      });
    }

    function starte() {
      clearInterval(uhr);
      uhr = setInterval(function () { zeige(aktiv + 1); }, 6000);
    }

    punkte.forEach(function (p) {
      p.addEventListener('click', function () {
        zeige(parseInt(p.dataset.slide, 10));
        starte();
      });
    });
    zeige(0);
    // Erst wenn die Seite steht, das zweite Hero-Bild nachladen.
    setTimeout(function () { bereit = true; lade(slides[1]); }, 2500);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) { starte(); }
  } else if (punkte.length) {
    punkte.forEach(function (p) { p.parentNode.parentNode.removeChild(p.parentNode); });
  }

  /* --- Video -------------------------------------------------------------- */

  var telefon = window.innerWidth < 768;

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

    // Auf dem Rechner laeuft das Video von selbst, sobald der Block ins Bild
    // kommt. Auf dem Telefon nicht: 14 MB ungefragt zu laden waere unhoeflich,
    // und das Poster zeigt ohnehin schon den Raum.
    if (!telefon && 'IntersectionObserver' in window) {
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
