/* ============================================================================
   pdf.js — DEDICATED, standalone loader for inline PDF VIEWER embeds
   (`<div class="pdf-embed"><iframe …src="…​.pdf"></iframe></div>`). The sibling of
   map.js: kept SEPARATE from the heavy main.js bundle so an embedded PDF paints
   fast and can self-heal, and so a page's PDF is warmed BEFORE you navigate to it.

   Note the scrollable image-based viewer `.pdf-embed.pdf-doc` has NO iframe — the
   `.pdf-embed iframe` selector skips it, so this only touches real PDF frames.

   For every `.pdf-embed iframe` on the page it:
     1. EAGER   — strips `loading="lazy"` and sets `fetchpriority="high"` so a
        below-the-fold PDF loads immediately, showing the in-box spinner
        (.embed-loading) until the frame fires `load`.
     2. HOT-RELOAD THE PDF SECTION ONLY — if the frame hasn't fired `load` within
        the watchdog window (a blank box), it rebuilds JUST that iframe as a fresh
        element in the live document to force a new fetch — no full-page reload.
        PDFs are large and legitimately slow, so the window is generous and it only
        retries ONCE, then clears the spinner (never an endless spin, never thrash).

   SITE-WIDE PRELOAD (Nuxt-style, no framework): whenever nav.js PREFETCHES a page
   (hover / visible-on-idle), we `<link rel="prefetch">` that page's PDF embed URL so
   it's cached before the SPA swap mounts the iframe. Exposed as window.SGPdf.warmDoc.
   PDFs can be several MB, so the prefetch is SIZE-GUARDED — skipped on Save-Data or
   a slow (2g) connection. Same-origin, so no preconnect is needed (unlike the map).

   CSP-safe: plain external file under /resources/assets/js/ ('self'). */
(function () {
  'use strict';

  var WATCHDOG = 8000;   // PDFs are heavier than a map tile — wait longer before reloading
  var MAX_TRIES = 1;     // one hot-reload only; don't thrash a large in-flight download

  /* Skip prefetching big PDFs when the user is saving data or on a slow link. */
  function slowLink() {
    var c = navigator.connection || {};
    return !!c.saveData || /(^|-)2g$/.test(c.effectiveType || '');
  }

  /* Rebuild an iframe as a FRESH element in the live document (same attributes) so
     it gets a new browsing context and fetches again — hot reload of the PDF frame. */
  function rebuild(f) {
    var fresh = document.createElement('iframe');
    for (var i = 0; i < f.attributes.length; i++) {
      fresh.setAttribute(f.attributes[i].name, f.attributes[i].value);
    }
    fresh.removeAttribute('loading');           // stay eager on reload
    fresh.dataset.pdfReady = '1';               // already managed — don't re-init
    f.parentNode.replaceChild(fresh, f);
    return fresh;
  }

  /* Watch one PDF frame: clear the spinner on `load`; if it never loads within the
     window, hot-reload it once, then stop spinning. */
  function watch(box, f, tries) {
    var settled = false;
    var onLoad = function () { settled = true; box.classList.remove('embed-loading'); };
    f.addEventListener('load', onLoad);
    setTimeout(function () {
      if (settled) return;                      // loaded in time — nothing to do
      if (tries < MAX_TRIES) {
        watch(box, rebuild(f), tries + 1);      // blank → hot-reload the PDF section
      } else {
        box.classList.remove('embed-loading');  // give up gracefully, no endless spin
      }
    }, WATCHDOG);
  }

  function initPdfs() {
    var frames = document.querySelectorAll('.pdf-embed iframe');
    if (!frames.length) return;                 // no inline PDF on this page → no-op
    Array.prototype.forEach.call(frames, function (f) {
      if (f.dataset.pdfReady) return;           // guard: run once per frame
      var box = f.closest ? f.closest('.pdf-embed') : f.parentNode;
      f.dataset.pdfReady = '1';
      f.removeAttribute('loading');             // never lazy — load the PDF now
      try { f.fetchPriority = 'high'; } catch (e) {}
      f.setAttribute('fetchpriority', 'high');
      if (box) { box.classList.add('embed-loading'); watch(box, f, 0); }
    });
  }

  /* ---- SITE-WIDE PDF PRELOAD (Nuxt-style prefetch, size-guarded) ------------ */
  var warmed = {};                              // pdf URL -> true (dedupe prefetch links)

  function prefetchUrl(url) {
    if (!url || warmed[url] || slowLink()) return;
    warmed[url] = true;
    var head = document.head || document.getElementsByTagName('head')[0];
    if (!head) return;
    var l = document.createElement('link');
    l.rel = 'prefetch';                         // low-priority cache warm; reused by the iframe nav
    l.href = url;
    l.setAttribute('data-pdf-prefetch', '1');
    head.appendChild(l);
  }

  // Pull the PDF embed URL(s) out of a parsed document and warm them.
  function warmDoc(doc) {
    if (!doc || !doc.querySelectorAll) return;
    var frames = doc.querySelectorAll('.pdf-embed iframe[src]');
    Array.prototype.forEach.call(frames, function (f) { prefetchUrl(f.getAttribute('src')); });
  }

  window.SGPdf = window.SGPdf || {};
  window.SGPdf.warmDoc = warmDoc;               // nav.js calls this for every prefetched page
  window.SGPdf.warmUrl = prefetchUrl;

  /* Boot: prefer the SG runtime (re-runs on every SPA swap); fall back to the DOM
     lifecycle if pdf.js is ever loaded standalone before main.js defines SG. */
  if (window.SG && typeof SG.content === 'function') {
    SG.content(initPdfs);                       // runs now + after each nav.js swap
  } else {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPdfs);
    else initPdfs();
    var t = setInterval(function () {
      if (window.SG && typeof SG.content === 'function') { SG.content(initPdfs); clearInterval(t); }
    }, 250);
    setTimeout(function () { clearInterval(t); }, 8000);
  }
})();
