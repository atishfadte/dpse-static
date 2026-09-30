/* ============================================================================
   boot.js — runs render-blocking in <head>, BEFORE the first paint.

   Kills the reload "glitch" two ways:
   1. Applies the visitor's saved theme + font size immediately, so a dark-mode
      or enlarged-font user never sees a light/small flash that then snaps over.
   2. Marks <html> `is-loading` so the body stays hidden until includes.js has
      injected the header + footer; the finished page then fades in already in
      its final position — no header pop-in, no content jump.

   The class lives on <html> (not <body>) because this script runs while <head>
   is parsing and <body> does not exist yet. CSP-safe: it is an external file
   under /resources/assets/js/ ('self'), so no inline <script> is needed.

   Fail-safe: if includes.js is slow or errors, the page is still revealed by
   the `load` event and a hard timeout, so it can never get stuck hidden. If JS
   is disabled, `is-loading` is never added and the body shows normally.
   ========================================================================== */
(function () {
  'use strict';
  var d = document.documentElement;

  // Self-heal stale/cached links that doubled a template path segment, e.g.
  // /resources/gigw-templates/x/resources/gigw-templates/x/about/ -> /resources/gigw-templates/x/about/.
  try {
    var pth = location.pathname;
    var fixed = pth.replace(/\/((?:gigw-templates|s3waas)\/[^/]+\/)(?:\1)+/g, '/$1');
    if (fixed !== pth) { location.replace(fixed + location.search + location.hash); return; }
  } catch (e) {}

  try { if (localStorage.getItem('sg-dark') === '1') d.classList.add('dark-mode'); } catch (e) {}
  try {
    var f = parseFloat(localStorage.getItem('sg-font'));
    if (f && f !== 1) d.style.fontSize = (f * 16).toFixed(3) + 'px';
  } catch (e) {}

  // Per-subdomain data root. A subdomain page declares its own data folder with
  // <html data-base="/org">; the main site leaves it empty. Layout, CSS and JS are
  // SHARED from the site root (absolute /resources/assets/ paths); only the site-specific data
  // (header, footer, nav, stats, feedback) is read from the subdomain's own
  // /<base>/data/ folder, so each subdomain has SEPARATE data behind the SAME layout.
  // Shared data (accessibility, translate, search index) is always read from the root.
  window.__siteBase = (d.getAttribute('data-base') || '').replace(/\/+$/, '');

  // Portable build only: when a <base href> is set (relative-path build), in-page
  // "#id" links would resolve against the base and navigate away. Scroll within
  // the current page instead, so skip-links and anchors keep working.
  if (document.querySelector('base[href]')) {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var h = a.getAttribute('href');
      if (!h || h === '#') return;
      var t = document.getElementById(h.slice(1));
      if (t) { e.preventDefault(); if (t.tabIndex < 0) t.tabIndex = -1; t.focus({ preventScroll: true }); t.scrollIntoView(); }
    });
  }

  d.classList.add('is-loading');

  var done = false;
  function reveal() {
    if (done) return;
    done = true;
    d.classList.remove('is-loading');
    d.classList.add('is-ready');
  }

  // includes.js calls this the moment the header + footer are in the DOM.
  window.__siteReveal = reveal;
  // Fail-safes so the page is never left hidden.
  window.addEventListener('load', reveal);
  setTimeout(reveal, 1200);
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
