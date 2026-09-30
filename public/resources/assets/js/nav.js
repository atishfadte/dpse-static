/* ============================================================================
   nav.js — SPA-style page navigation (no full reload).

   Goal: clicking an internal link should swap ONLY the content between the
   header and the footer — exactly like the reference Nuxt site — instead of
   reloading the whole document. The header (top bar + main nav) and footer are
   rendered once by includes.js and then stay put; only <main id="main-content">
   is replaced, so there is no header/footer rebuild flash and no white flicker.

   How it works on each intercepted click:
     1. fetch() the target page's HTML in the background.
     2. Crossfade the current <main> out (skipped if the OS prefers reduced motion).
     3. Parse the fetched HTML, swap in its <main>, update <title>/meta + the
        active nav link, and sync any page-specific <link>/<script> (e.g.
        contact.css, search.js).
     4. Tear down the leaving page's loops/listeners and re-initialise the new
        page's behaviour via the SG runtime in main.js.
     5. pushState the new URL, reset scroll, move focus to the new content.

   Fail-safe: anything unexpected (fetch error, missing <main>, no History API)
   falls back to a normal full navigation, so links always work. Modified clicks
   (Ctrl/Cmd/middle-click), downloads, external links, and same-page #anchors are
   left to the browser.
   ========================================================================== */
(function () {
  'use strict';

  // Capability check — if anything we need is missing, do nothing and let the
  // site behave as a normal multi-page site (every link is a full navigation).
  if (!window.history || !history.pushState || !window.fetch || !window.DOMParser) return;

  var MAIN_SEL = '#main-content';
  var FADE_MS = 180;
  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Links to binary/asset files should download/open normally, never be PJAX'd.
  var ASSET_RE = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|ppt|pptx|zip|rar|7z|csv|json|xml|txt|rtf|jpe?g|png|gif|webp|svg|ico|mp4|webm|mp3|wav|woff2?|ttf|eot)(?:$|[?#])/i;

  // Scripts the framework already manages — never re-inject these on a swap
  // (re-running includes.js would rebuild the header/footer = the flash we are
  // removing; boot/main/nav are one-time bootstrap).
  var FRAMEWORK_JS = /\/assets\/js\/(boot|includes|main|nav)\.js(?:$|[?#])/i;

  // Page-specific assets we injected for the CURRENT page, removed on next swap.
  var injectedCSS = [];
  var injectedJS = [];

  var busy = false;

  // Path (no hash) of the page currently rendered. Used to tell a real
  // back/forward navigation apart from a same-page hash change (e.g. clicking
  // "Skip to Main Content"), which the browser must be left to scroll natively.
  var lastPath = location.pathname + location.search;

  /* ----------------------------------------------------------- helpers --- */
  function delay(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  function absHrefs(nodes) {
    return Array.prototype.map.call(nodes, function (n) { return n.href; });
  }

  /* Is this anchor an in-site page we can swap to? Returns the resolved URL
     object, or null to let the browser handle the link normally. Shared by the
     click handler and the prefetcher. */
  function eligibleURL(a) {
    if (!a) return null;

    var target = a.getAttribute('target');
    if (target && target !== '_self') return null;        // opens in new tab/window
    if (a.hasAttribute('download')) return null;
    if (/(^|\s)external(\s|$)/i.test(a.getAttribute('rel') || '')) return null;

    var raw = a.getAttribute('href') || '';
    if (!raw || /^(#|mailto:|tel:|sms:|javascript:)/i.test(raw)) return null;

    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return null; }

    if (url.origin !== location.origin) return null;       // external site
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (ASSET_RE.test(url.pathname)) return null;          // file download/open
    return url;
  }

  /* Decide whether a click should be handled as an in-page swap. Returns the
     resolved URL object to navigate to, or null to let the browser handle it. */
  function resolveLink(e) {
    if (e.defaultPrevented) return null;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;

    var a = e.target.closest && e.target.closest('a[href]');
    var url = eligibleURL(a);
    if (!url) return null;

    // Same document, only the #hash differs -> let the browser scroll natively.
    if (url.pathname === location.pathname && url.search === location.search) {
      if (url.hash) return null;
      if (url.href === location.href) return null;          // exact same URL
    }
    return url;
  }

  function syncMeta(newDoc, selector) {
    var incoming = newDoc.querySelector(selector);
    var current = document.querySelector(selector);
    if (incoming && current) current.setAttribute('content', incoming.getAttribute('content') || '');
  }

  /* Add this page's unique stylesheets (e.g. /contact/contact.css), remove the
     previous page's. Shared stylesheets (style.css, fontawesome) are already in
     <head> on every page, so they are never touched. */
  function syncPageCSS(newDoc) {
    var wanted = absHrefs(newDoc.querySelectorAll('head link[rel="stylesheet"][href]'));
    var have = absHrefs(document.querySelectorAll('head link[rel="stylesheet"][href]'));

    // Drop previously-injected sheets that the new page doesn't want.
    injectedCSS = injectedCSS.filter(function (link) {
      if (wanted.indexOf(link.href) === -1) { link.parentNode && link.parentNode.removeChild(link); return false; }
      return true;
    });

    // Add any wanted sheet not already present in <head>.
    wanted.forEach(function (href) {
      if (have.indexOf(href) !== -1) return;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      injectedCSS.push(link);
    });
  }

  /* Re-run page-specific scripts (e.g. /resources/assets/js/search.js on the search page).
     Setting innerHTML never executes scripts, so we recreate each non-framework
     <script src> as a fresh element. Previous page scripts are removed first. */
  function runPageScripts(newDoc) {
    injectedJS.forEach(function (s) { s.parentNode && s.parentNode.removeChild(s); });
    injectedJS = [];

    var scripts = newDoc.querySelectorAll('script[src]');
    Array.prototype.forEach.call(scripts, function (old) {
      var src = old.getAttribute('src') || '';
      if (!src || FRAMEWORK_JS.test(old.src)) return;
      var s = document.createElement('script');
      s.src = old.src;
      if (old.type) s.type = old.type;
      s.async = false;
      document.body.appendChild(s);
      injectedJS.push(s);
    });
  }

  /* Re-mark the active nav link for the new URL. Mirrors includes.js: the page
     identifier is the last non-empty path segment ('' on the home page). */
  function currentSeg() {
    var segs = location.pathname.split('/').filter(Boolean);
    var last = segs.length ? segs[segs.length - 1].toLowerCase() : '';
    return last === 'index.html' ? '' : last;
  }
  function markActiveNav() {
    var here = currentSeg();
    var nav = document.querySelector('.mainnav');
    if (!nav) return;
    nav.querySelectorAll('.is-current, [aria-current]').forEach(function (el) {
      el.classList.remove('is-current');
      el.removeAttribute('aria-current');
    });
    nav.querySelectorAll('.has-current').forEach(function (el) { el.classList.remove('has-current'); });

    nav.querySelectorAll('a.nav-link[href], a.nav-sublink[href]').forEach(function (a) {
      var raw = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
      var segs = raw.split('/').filter(Boolean);
      var seg = (segs.length ? segs[segs.length - 1] : '').toLowerCase();
      if (seg !== here) return;
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'page');
      var parentItem = a.closest('.nav-item.has-children');
      if (parentItem) {
        parentItem.classList.add('has-current');
        var pb = parentItem.querySelector('.nav-parent');
        if (pb) pb.classList.add('is-current');
      }
    });
  }

  function scrollAndFocus(url, restoreY) {
    if (typeof restoreY === 'number') {
      window.scrollTo(0, restoreY);
    } else if (url.hash) {
      var t = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (t) { t.scrollIntoView(); } else { window.scrollTo(0, 0); }
    } else {
      window.scrollTo(0, 0);
    }
    // Move focus to the new content for keyboard/screen-reader users.
    var main = document.querySelector(MAIN_SEL);
    if (main) {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); }
    }
  }

  /* ----------------------------------------------------------- the swap --- */
  function render(newDoc, url, restoreY) {
    var newMain = newDoc.querySelector(MAIN_SEL);
    var curMain = document.querySelector(MAIN_SEL);
    if (!newMain || !curMain) { window.location.href = url.href; return; }

    // Crossing a subdomain boundary: the target page declares a different data root
    // (<html data-base="…">), so its header / footer / nav come from a DIFFERENT data
    // folder than the chrome already on screen. The SPA swap only replaces <main> and
    // keeps the existing chrome, so it can't be used here — fall back to a full browser
    // load so boot.js re-reads the new subdomain's data. (Same base -> swap as normal.)
    var newBase = (newDoc.documentElement.getAttribute('data-base') || '').replace(/\/+$/, '');
    if (newBase !== (window.__siteBase || '')) { window.location.href = url.href; return; }

    lastPath = url.pathname + url.search;   // this page is now the rendered one

    // Stop the leaving page's animation loops / listeners so nothing leaks.
    if (window.SG && SG.teardown) SG.teardown();

    var titleEl = newDoc.querySelector('title');
    if (titleEl) document.title = titleEl.textContent;
    syncMeta(newDoc, 'meta[name="description"]');
    syncMeta(newDoc, 'meta[name="keywords"]');
    syncPageCSS(newDoc);

    // Swap the content node (header + footer are left exactly as they are).
    var fresh = document.importNode(newMain, true);
    curMain.parentNode.replaceChild(fresh, curMain);

    // Iframes imported from the parsed (inert) document have a dead browsing
    // context and never navigate to their src, so maps / PDF previews stay blank
    // until a manual refresh. Rebuild each as a fresh element in the LIVE document
    // so it actually loads. Done BEFORE initContent so the embed spinner's
    // load-listener (main.js) binds to the new iframe and can clear the spinner.
    reloadFrames(fresh);

    markActiveNav();
    runPageScripts(newDoc);

    // Re-bind this page's behaviour (sliders, tabs, modals, forms, …).
    if (window.SG && SG.initContent) SG.initContent();
    /* Re-point the fragment links at the NEW page. A partial navigation swaps <main> but leaves the
       chrome — so the skip link still carried the PREVIOUS page's path and "Skip to Main Content"
       navigated away instead of scrolling. fixFragments re-matches via data-sg-frag, since these
       hrefs are no longer "#…" after the first pass. */
    if (window.SGFixFragments) { try { window.SGFixFragments(document); } catch (e) {} }

    scrollAndFocus(url, restoreY);
  }

  /* Replace each imported iframe with a freshly created one (same attributes) so
     it gets a live browsing context and loads — see render(). */
  function reloadFrames(root) {
    var frames = root.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      var old = frames[i], fresh = document.createElement('iframe');
      for (var a = 0; a < old.attributes.length; a++) {
        fresh.setAttribute(old.attributes[a].name, old.attributes[a].value);
      }
      // Load now, not on scroll: the user navigated here on purpose and lazy can
      // leave a below-the-fold map/PDF blank after a swap.
      fresh.setAttribute('loading', 'eager');
      old.parentNode.replaceChild(fresh, old);
    }
  }

  /* ---------------------------------------------------- prefetch cache --- */
  /* SPEED: the moment a visitor hovers/focuses a link — or it scrolls into view
     — we fetch + parse that page in the background and keep it here, keyed by
     URL. By the time they actually click, the swap is instant (no network wait).
     This is what makes navigation feel as quick as the reference Nuxt site.
     The cache is capped and parsed docs are reused, so it stays cheap. */
  var cache = {};            // url string -> Promise<Document>
  var cacheKeys = [];        // insertion order, for trimming
  var CACHE_MAX = 24;

  function fetchPage(url) {
    var key = url.href;
    if (cache[key]) return cache[key];
    var p = fetch(key, { credentials: 'same-origin', headers: { 'X-PJAX': 'true' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        // Nuxt-style: warm this page's heavy embeds the moment the page is prefetched,
        // so they paint instantly after the swap. map.js / pdf.js own the warming.
        try { if (window.SGMap && SGMap.warmDoc) SGMap.warmDoc(doc); } catch (e) {}
        try { if (window.SGPdf && SGPdf.warmDoc) SGPdf.warmDoc(doc); } catch (e) {}
        return doc;
      });
    // Drop a failed fetch from the cache so a later click can retry it.
    p.catch(function () { delete cache[key]; });
    cache[key] = p;
    cacheKeys.push(key);
    if (cacheKeys.length > CACHE_MAX) delete cache[cacheKeys.shift()];
    return p;
  }

  function prefetch(a) {
    var url = eligibleURL(a);
    if (!url) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    fetchPage(url);          // fire-and-forget; result is cached for the click
  }

  function loadAndSwap(url, opts) {
    opts = opts || {};
    if (busy) return;
    busy = true;
    document.documentElement.classList.add('sg-navigating');

    var minFade = prefersReduced ? Promise.resolve() : delay(FADE_MS);
    var fetchDoc = fetchPage(url);   // instant if it was prefetched on hover

    Promise.all([fetchDoc, minFade])
      .then(function (out) {
        var newDoc = out[0];

        if (!opts.pop) {
          // Save the scroll position of the page we are leaving, then push the new one.
          try { history.replaceState({ sg: true, y: window.scrollY }, '', location.href); } catch (e) {}
          try { history.pushState({ sg: true }, '', url.href); } catch (e) {}
        }

        render(newDoc, url, opts.restoreY);

        // Let the new <main> mount at opacity 0, then fade it in next frame.
        requestAnimationFrame(function () {
          document.documentElement.classList.remove('sg-navigating');
          busy = false;
        });
      })
      .catch(function () {
        // Never strand the user — fall back to a real navigation.
        window.location.href = url.href;
      });
  }

  /* --------------------------------------------------------- listeners --- */
  document.addEventListener('click', function (e) {
    var url = resolveLink(e);
    if (!url) return;
    e.preventDefault();
    loadAndSwap(url);
  });

  /* SPEED: warm the cache as soon as the user shows intent. mouseover/focusin
     cover mouse + keyboard; touchstart covers mobile (fires ~100ms before the
     click). All are passive and de-duped by the cache, so they are cheap. */
  function onIntent(e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) prefetch(a);
  }
  document.addEventListener('mouseover', onIntent);
  document.addEventListener('focusin', onIntent);
  document.addEventListener('touchstart', onIntent, { passive: true });

  /* SPEED: also prefetch links already visible on screen, a little after load,
     when the network is idle — so the first click is instant too. Skipped if the
     visitor asked to save data or is on a slow connection. */
  function prefetchVisible() {
    if ('IntersectionObserver' in window === false) return;
    var conn = navigator.connection || {};
    if (conn.saveData) return;
    if (/(^|-)2g$/.test(conn.effectiveType || '')) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { prefetch(en.target); obs.unobserve(en.target); }
      });
    }, { rootMargin: '200px' });
    document.querySelectorAll('a[href]').forEach(function (a) { io.observe(a); });
  }
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 800); };
  idle(prefetchVisible);

  window.addEventListener('popstate', function (e) {
    // Browser already changed location.* to the target; swap to match it.
    var st = e.state;
    if (st && !st.sg) return;            // a state we didn't create — ignore
    var url;
    try { url = new URL(location.href); } catch (err) { return; }
    // Same page, only the #hash changed (e.g. "Skip to Main Content", or Back
    // between two in-page anchors): let the browser do its native fragment
    // scroll — swapping + scroll-resetting here is the first-click skip glitch.
    if (url.pathname + url.search === lastPath) return;
    busy = false;                        // popstate can interrupt an in-flight swap
    loadAndSwap(url, { pop: true, restoreY: st && typeof st.y === 'number' ? st.y : 0 });
  });

  // Seed history with our marker + current scroll so the first Back works cleanly.
  try { history.replaceState({ sg: true, y: window.scrollY }, '', location.href); } catch (e) {}

  // Browser-managed scroll restoration fights our manual handling — turn it off.
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) {}
  }
})();
