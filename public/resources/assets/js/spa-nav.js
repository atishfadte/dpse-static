/* ============================================================================
   spa-nav.js — client-side PARTIAL navigation (no framework). UNIFIED for every shell
   (GIGW + S3WaaS + built sites).

   Keeps pages as plain static HTML but makes navigation feel instant: it intercepts
   internal link clicks, fetches the target page, and swaps in ONLY its <main> — so the
   top bar, masthead, navbar and footer render ONCE and never reload or flash (they behave
   like persistent components). ~2 KB, self-contained, CSP-safe (external 'self').

   It drives whatever re-init API the theme exposes, in this order:
     • window.SGBoot()          — S3WaaS / built sites (re-init a swapped <main>, builds home)
     • window.SG.initContent()  — GIGW (re-run content initialisers), with SG.teardown() first
   If neither is present it stays dormant and links navigate normally. Any error or an
   unparseable/different-structure page falls back to a full load.
   REVERT: remove the <script src=".../spa-nav.js"> tag (site works as normal static pages),
   or git revert (tag: pre-spa-nav).
   ========================================================================== */
(function () {
  'use strict';
  if (window.__spaNav) return;
  if (!window.history || !window.history.pushState || !window.fetch || !window.DOMParser) return;
  var hasBoot = (typeof window.SGBoot === 'function');
  var hasGIGW = (window.SG && typeof window.SG.initContent === 'function');
  if (!hasBoot && !hasGIGW) return;                    // no theme re-init hook → stay dormant
  window.__spaNav = true;

  // Tag the initial page's inline <head><style> so the first navigation removes it too
  // (see syncHeadStyles) — otherwise the landing page's page-specific CSS would linger.
  Array.prototype.forEach.call(document.querySelectorAll('head style'), function (s) { s.setAttribute('data-spa-style', ''); });

  var CACHE = {};

  function mainOf(doc) {
    return doc.querySelector('main') ||
           doc.getElementById('s3-main') || doc.getElementById('main-content');
  }

  function isInternal(a) {
    if (!a || a.tagName !== 'A') return false;
    var href = a.getAttribute('href');
    if (!href) return false;
    if (a.origin !== location.origin) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download') || a.hasAttribute('data-no-spa')) return false;
    if (href.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;
    if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3|csv|json)(\?|$)/i.test(a.pathname)) return false;
    return true;
  }

  function get(url) {
    if (CACHE[url]) return Promise.resolve(CACHE[url]);
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok || (r.headers.get('content-type') || '').indexOf('text/html') < 0) throw 0; return r.text(); })
      .then(function (t) { CACHE[url] = t; return t; });
  }

  function copyMeta(doc) {
    document.title = doc.title || document.title;
    var sd = doc.querySelector('meta[name="description"]'), dd = document.querySelector('meta[name="description"]');
    if (sd && dd) dd.setAttribute('content', sd.getAttribute('content') || '');
    var sc = doc.querySelector('link[rel="canonical"]'), dc = document.querySelector('link[rel="canonical"]');
    if (sc && dc) dc.setAttribute('href', sc.getAttribute('href') || '');
  }

  // Carry the target page's PAGE-SPECIFIC inline <head><style> blocks across the swap.
  // Only <main> is swapped, so without this the head's inline CSS is lost — and any page
  // whose rendering depends on it breaks SILENTLY after an SPA hop while a full reload
  // works. Canonical example: a CSS-only tab widget whose panels are display:none by
  // default in the theme stylesheet, revealed only by per-page :checked rules
  // (#tN:checked ~ … {display:block}) that live in that inline <style>. Navigate in via
  // SPA and every tab shows empty; refresh reloads the head and it works — the classic
  // "only loads on refresh" report. Shared CSS is loaded via <link>, never inline, so
  // swapping the inline blocks touches nothing global. Injected copies are tagged so the
  // next navigation removes them instead of accumulating. Found on sec-goa (§60).
  function syncHeadStyles(doc) {
    Array.prototype.forEach.call(document.querySelectorAll('head style[data-spa-style]'), function (s) { s.remove(); });
    Array.prototype.forEach.call(doc.querySelectorAll('head style'), function (s) {
      var c = document.createElement('style');
      c.setAttribute('data-spa-style', '');
      if (s.getAttribute('media')) c.setAttribute('media', s.getAttribute('media'));
      c.textContent = s.textContent;
      document.head.appendChild(c);
    });
  }

  function closeChrome() {
    // close any open drawer / mobile menu (prefix-agnostic)
    Array.prototype.forEach.call(document.querySelectorAll('aside[aria-hidden="false"], .s3-drawer.open, [class*="drawer"].open, .nav-open, .menu-open'), function (d) {
      d.setAttribute && d.setAttribute('aria-hidden', 'true'); d.classList && d.classList.remove('open');
    });
    document.documentElement.classList.remove('s3-drawer-open', 'nav-open', 'menu-open', 'no-scroll');
    if (document.body) document.body.classList.remove('s3-drawer-open', 'nav-open', 'menu-open', 'no-scroll', 's3-noscroll');
    Array.prototype.forEach.call(document.querySelectorAll('.s3-menu > li.open, .mainnav li.open, [aria-expanded="true"]'), function (o) {
      if (o.closest && (o.closest('.s3-menu') || o.closest('.mainnav'))) { o.classList.remove('open'); o.setAttribute && o.setAttribute('aria-expanded', 'false'); }
    });
  }

  function reinit() {
    if (typeof window.SGBoot === 'function') { window.SGBoot(); if (window.SGMarkCurrent) try { window.SGMarkCurrent(); } catch (e) {} }
    else if (window.SG && window.SG.initContent) { window.SG.initContent(); }
  }

  function swap(html, url, push) {
    var doc;
    try { doc = new DOMParser().parseFromString(html, 'text/html'); } catch (e) { location.href = url; return; }
    var nm = mainOf(doc), cm = mainOf(document);
    if (!nm || !cm) { location.href = url; return; }
    try { if (window.SG && window.SG.teardown) window.SG.teardown(); } catch (e) {}   // GIGW: clean up old page
    closeChrome();
    // CRITICAL: pages carry a DEPTH-RELATIVE <base href> (home "./", deep pages "../../"). Update it to
    // the target page's base so relative asset/link paths in the swapped-in content resolve correctly
    // (without this, images/links break after navigating between different depths — esp. on Safari).
    var sBase = doc.querySelector('base'), dBase = document.querySelector('head base');
    if (sBase) {
      if (!dBase) { dBase = document.createElement('base'); document.head.insertBefore(dBase, document.head.firstChild); }
      // RESOLVE AGAINST THE TARGET URL — never copy the raw relative value.
      // A <base> element's URL is FROZEN when its href is set: it is parsed against the
      // document's URL at that moment, and the history.pushState() below does NOT recompute
      // it. Copying home's raw "./" while the document was still /rti/ froze the base at
      // /rti/, so every relative fetch then resolved against /rti/ —
      // "./data/home/_index.json" became /rti/data/home/_index.json, a 404. The home builder
      // got {} from its per-part .catch and wrote an EMPTY <main>: header and footer rendered,
      // the page body did not. It only bit when navigating to a SHALLOWER page (anything ->
      // Home), because same-depth hops resolve to the right place by luck — which is exactly
      // why it looked intermittent instead of broken. Found on sec-goa (§49).
      // Resolving to an absolute URL is also ORDER-INDEPENDENT: it cannot break again if
      // these lines are ever moved relative to pushState.
      var raw = sBase.getAttribute('href') || './';
      var abs; try { abs = new URL(raw, url).href; } catch (e) { abs = raw; }
      dBase.setAttribute('href', abs);
    }
    // import the parsed <main> into THIS document before inserting (Safari-safe cross-document adoption)
    var newMain;
    try { newMain = document.importNode(nm, true); } catch (e) { newMain = nm; }
    cm.replaceWith(newMain);
    nm = newMain;
    copyMeta(doc);
    syncHeadStyles(doc);
    if (push) { try { history.pushState({ spa: 1 }, '', url); } catch (e) {} }
    // Scroll to the #section if the URL carries one (e.g. about-us/#vision from another page),
    // otherwise to the top. Without this, a cross-page hash link landed at the top of <main>.
    var _hash = '';
    try { _hash = new URL(url).hash; } catch (e) {}
    var _tgt = (_hash && _hash.length > 1) ? document.getElementById(decodeURIComponent(_hash.slice(1))) : null;
    if (_tgt) { try { _tgt.scrollIntoView(); } catch (e) { window.scrollTo(0, 0); } }
    else { window.scrollTo(0, 0); }
    try { reinit(); } catch (e) {}
    nm.setAttribute('tabindex', '-1');
    try { nm.focus({ preventScroll: true }); } catch (e) { try { nm.focus(); } catch (e2) {} }
    window.dispatchEvent(new CustomEvent('spa:navigated', { detail: { url: url } }));
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!isInternal(a)) return;
    var url = a.href;
    if (url.split('#')[0] === location.href.split('#')[0]) return;
    e.preventDefault();
    get(url).then(function (html) { swap(html, url, true); }).catch(function () { location.href = url; });
  });

  window.addEventListener('popstate', function () {
    get(location.href).then(function (html) { swap(html, location.href, false); }).catch(function () { location.reload(); });
  });

  document.addEventListener('mouseover', function (e) {                 // prefetch on hover
    var a = e.target.closest ? e.target.closest('a') : null;
    if (isInternal(a) && !CACHE[a.href]) get(a.href).catch(function () {});
  });
})();
