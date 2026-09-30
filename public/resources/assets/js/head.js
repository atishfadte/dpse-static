/* ============================================================================
   head.js — injects the <head> tags that are IDENTICAL on every page (favicon +
   the FontAwesome icon-font stylesheet) from ONE file, so they are no longer
   repeated in each page's <head>. Render-blocking in <head>; the icon font is
   written synchronously (document.write during parse) so glyphs never flash in.

   Page-SPECIFIC head tags stay inline by design: <title>, <meta description/
   keywords/author>, the CSP <meta>, and the page's own stylesheet (style.css for
   GIGW, s3waas.css for the S3WaaS look) — those differ per page / must apply
   before paint, so they can't be centralised here. Security headers (CSP etc.)
   are centralised separately as real HTTP headers in .htaccess / _headers / deploy/.
   CSP-safe: external file under /resources/assets/js/ ('self').

   OPTIONAL — SITE COLOUR PALETTE FROM JSON. If <html> carries a data-s3-theme
   attribute (its value = the URL of a colours JSON, e.g. data-s3-theme="data/theme.json"),
   head.js fetches it and applies each { "--token": "#hex" } in its "cssVars" object
   onto the :root CSS variables — so brand colours have ONE editable home. The
   stylesheet's :root keeps matching defaults, so there is no colour flash if the
   JSON is slow/absent. Opt-in: pages WITHOUT the attribute never fetch (no 404s).
   Every built site wires this (data-s3-theme + a data/theme.json of its palette).
   ========================================================================== */
(function () {
  // NO-FLASH THEME: apply the saved dark / high-contrast theme to <html> BEFORE first paint
  // (render-blocking in <head>). s3waas.js also applies it to <body> and owns the toggle; a CSS
  // bridge (html.s3-dark body.s3 …) paints the body correctly pre-paint, so navigating between
  // pages never flashes light→dark. (Built sites use their renamed prefix, e.g. secgoa-dark.)
  try {
    var _c = document.documentElement.classList, _ls = window.localStorage;
    if (_ls.getItem('sg-dark') === '1' || /[?&]sgdark=1/.test(location.search)) _c.add('s3-dark');
  } catch (e) {}

  // NO-FLASH REVEAL: keep the page HIDDEN until fonts + deferred chrome settle, then FADE it in (kills
  // the icon-pop / nav-fold / font-swap glitch). Render-blocking here -> sg-loading is on <html> before
  // first paint; fonts.ready + window load + a 1400ms timeout each clear it (can never stay blank).
  document.documentElement.classList.add("sg-loading");
  (function () { var done=false; function reveal(){ if(done)return; done=true; document.documentElement.classList.remove("sg-loading"); }
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal); } catch(e){}
    if (document.readyState === "complete") reveal(); else window.addEventListener("load", reveal);
    setTimeout(reveal, 1400); })();

  var LOGO = '/resources/assets/media/shared/govt-of-goa-logo.png';   // favicon = the site logo
  var ic = document.createElement('link'); ic.rel = 'icon'; ic.href = LOGO; document.head.appendChild(ic);
  var at = document.createElement('link'); at.rel = 'apple-touch-icon'; at.href = LOGO; document.head.appendChild(at);
  // FontAwesome PRO 7 is split: the CORE carries the glyph definitions, and each STYLE carries
  // its own @font-face. Every sheet in this list is required — a missing one is not a degraded
  // icon, it is a blank square with no error anywhere: core + the house style + brands (logos
  // exist in no other style). tools/fa-style.py owns this list — do not edit it by hand; it also
  // adds a sheet when a few icons are given a second style (`--accent`). All non-render-blocking (media=print -> all on load) so the icon CSS
  // never blocks first paint. Set via JS -> CSP-safe.
  ['fontawesome.min.css', 'solid.min.css', 'brands.min.css'].forEach(function (f) {
    var _fa = document.createElement('link');
    _fa.rel = 'stylesheet'; _fa.href = '/resources/assets/fonts/fontawesome/css/' + f;
    _fa.media = 'print';
    (function (link) {
      // ROBUST flip: some mobile browsers never fire `load` on a media="print" sheet, so onload
      // alone leaves icons hidden until a 2nd (cache-warmed) load. onload + double-rAF sheet check
      // + a timeout backstop guarantee the promotion to media="all". (BUILD-ERRORS §87)
      var flipped = false;
      function flip() { if (flipped) return; flipped = true; link.media = 'all'; }
      link.onload = flip; link.addEventListener('load', flip);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (link.sheet) flip(); }); });
      setTimeout(flip, 1200);
    })(_fa);
    document.head.appendChild(_fa);
  });

  // Brand colours from JSON (opt-in via data-s3-theme). The URL resolves against
  // the page (or its <base href> on a built site). Silent no-op if absent/failed.
  var THEME = document.documentElement.getAttribute('data-s3-theme');
  if (THEME) {
    fetch(THEME, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (t) {
        if (!t || !t.cssVars) return;
        var root = document.documentElement.style;
        Object.keys(t.cssVars).forEach(function (k) {
          if (/^--[\w-]+$/.test(k)) root.setProperty(k, String(t.cssVars[k]));
        });
      })
      .catch(function () {});
  }
})();

/* ── Security deterrent: disable right-click + inspect/view-source keys ────────────────────────
   Deterrent ONLY (devtools can still be opened from the browser menu — no web page can truly block
   it). Blocks the right-click context menu and F12 / Ctrl|Cmd+Shift+I,J,C / Ctrl|Cmd+U. It NEVER
   blocks a plain key, Tab, Enter, arrows or typing, so keyboard navigation + screen readers are
   completely unaffected (WCAG 2.1.1). Runs on every page from this render-blocking head file. */
(function () {
  /* DEV/LOCAL keeps inspect + right-click WORKING (so a developer can debug); the deterrent applies
     only on the LIVE site. Mirrors the counter's dev-host detection. */
  function sgIsDev(){var h=(location.hostname||"").toLowerCase();if(location.protocol==="file:")return true;if(h===""||h==="localhost"||h==="127.0.0.1"||h==="::1")return true;if(/\.(local|test|localhost)$/.test(h))return true;if(/\.hostingersite\.com$/.test(h))return true;if(/^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return true;return false;}
  if (sgIsDev()) return;   // dev/local: leave inspect + right-click enabled; block only on live
  function sgEditable(el) { return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable); }
  document.addEventListener("contextmenu", function (e) { if (!sgEditable(e.target)) e.preventDefault(); }, false);
  document.addEventListener("keydown", function (e) {
    if (sgEditable(e.target)) return;   // never interfere with typing / autofill / paste in a field
    var k = (e.key || "").toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === "F12" ||
        (mod && (e.shiftKey || e.altKey) && (k === "i" || k === "j" || k === "c")) ||
        (mod && !e.shiftKey && k === "u")) { e.preventDefault(); }
  }, true);
})();

/* Warm the Bhashini plugin CDN so its late-injected translate button arrives sooner on a
   cold/hard-refresh load (pairs with the reserved .bhashini-plugin-container slot in CSS). */
(function () {
  try {
    var H = 'https://translation-plugin.bhashini.co.in';
    if (document.querySelector('link[rel="preconnect"][href="' + H + '"]')) return;
    var p = document.createElement('link'); p.rel = 'preconnect'; p.href = H; document.head.appendChild(p);
    var d = document.createElement('link'); d.rel = 'dns-prefetch'; d.href = H; document.head.appendChild(d);
  } catch (e) {}
})();
