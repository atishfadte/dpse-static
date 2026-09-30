/* ============================================================================
   counter.js — THE single page-visit counter + "last updated" logic, shared by
   BOTH the GIGW templates and the S3WaaS themes (and every built site). Extracted
   from main.js so there is ONE implementation, not a copy per chrome. Reads
   data/site-stats.json (pageViewsSeed / lastUpdated / counterEndpoint /
   counterPollMs), uses the shared PHP counter (data/counter.php) with an
   instant localStorage paint + live polling, and a per-browser seed fallback on
   static/preview hosts. Element-agnostic: fills #page-views/#last-updated (GIGW)
   or #s3-visit-count/#s3-last-updated (S3WaaS); base from window.__siteBase or
   <html data-s3-base>. Load it once per page (after the chrome is in the DOM).
   ========================================================================== */
window.SGCounter = (function () {
  var _pollTimer = null, _visBound = false;
  return function () {
  var viewsEl = document.getElementById('page-views') || document.getElementById('s3-visit-count');
  var dateEl  = document.getElementById('last-updated') || document.getElementById('s3-last-updated');
  if (!viewsEl && !dateEl) return;

  var MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var SESS = 'sg-pv-counted';
  // __siteBase is '' on a root-served site (a DEFINED empty string), so test for a
  // string — `|| '/resources'` would wrongly treat '' as missing and 404 every fetch.
  var base = (typeof window.__siteBase === 'string') ? window.__siteBase
             : ((document.documentElement.getAttribute('data-s3-base') || '').replace(/\/+$/, '') || '/resources');

  function fmt(n) { return Number(n).toLocaleString('en-IN'); }

  // Only real government domains may INCREMENT the shared count — staging, CDN
  // test hosts and previews still display & poll it live, but never inflate it.
  // Matches *.gov.in, *.nic.in and the generic .gov TLD (case-insensitive). The
  // backends enforce the same allowlist, so a direct request can't bump it either.
  function isGovHost(h) {
    h = (h || location.hostname || '').toLowerCase();
    return /(^|\.)(gov\.in|nic\.in|gov)$/.test(h);
  }

  function sessionCounted() {
    try { return sessionStorage.getItem(SESS) === '1'; } catch (e) { return false; }
  }
  function markCounted() {
    try { sessionStorage.setItem(SESS, '1'); } catch (e) {}
  }

  // Cache the last shared total in localStorage so the footer paints the right
  // number INSTANTLY on the next visit — no flash of 0/blank during the network
  // round-trip. Refreshed on every server read; read back on load.
  var CACHE = 'sg-pv-cache';
  function readCache() {
    try { var v = parseInt(localStorage.getItem(CACHE), 10); return isNaN(v) ? null : v; }
    catch (e) { return null; }
  }
  function writeCache(n) { try { localStorage.setItem(CACHE, String(n)); } catch (e) {} }
  // Offline-safe buffer: counts that couldn't reach the server are held here and flushed later
  // (on the next visit or via a page-close beacon), so no visit is lost. The server adds them atomically.
  var PEND = 'sg-pending';
  function pendingCount() { try { return parseInt(localStorage.getItem(PEND) || '0', 10) || 0; } catch (e) { return 0; } }
  function addPending(n) { try { localStorage.setItem(PEND, String(pendingCount() + n)); } catch (e) {} }
  function clearPending() { try { localStorage.removeItem(PEND); } catch (e) {} }

  // Show a number only when it actually changed (avoids needless repaints while
  // polling). `quiet` suppresses the highlight — used for the instant cache paint
  // and the first live read on load, so the bump only flags a genuine live change.
  function boxNum(str) {
    var o = '', i, ch;
    for (i = 0; i < str.length; i++) { ch = str.charAt(i); o += (ch >= '0' && ch <= '9') ? '<span class="footer-digit">' + ch + '</span>' : '<span class="footer-digit-sep">' + ch + '</span>'; }
    return o;
  }
  function paint(el, val) { if (!el) return; if (el.hasAttribute && el.hasAttribute('data-boxed')) el.innerHTML = boxNum(val); else el.textContent = val; }
  var countRAF = 0;
  function animateCount(from, to, quiet) {
    if (countRAF && typeof cancelAnimationFrame === 'function') { cancelAnimationFrame(countRAF); countRAF = 0; }
    if (quiet || from === to || typeof requestAnimationFrame !== 'function') { paint(viewsEl, fmt(to)); return; }
    var start = Date.now(), dur = Math.min(1400, 500 + Math.abs(to - from));
    (function step() {
      var p = Math.min(1, (Date.now() - start) / dur), e = 1 - Math.pow(1 - p, 3);
      paint(viewsEl, fmt(Math.round(from + (to - from) * e)));
      if (p < 1) countRAF = requestAnimationFrame(step); else { countRAF = 0; paint(viewsEl, fmt(to)); }
    })();
  }
  var lastShown = null;
  function showCount(n, quiet) {
    if (!viewsEl) return;
    // MONOTONIC: a visitor count never decreases. Floor n by the highest value already shown or
    // cached so a momentarily-lower read (stale cache, a fallback repaint, a race) can never make
    // the footer count visibly drop ("count coming down"). Counters only go up.
    var floor = Math.max(lastShown || 0, readCache() || 0);
    if (typeof n === 'number' && n < floor) n = floor;
    writeCache(n);
    if (n === lastShown) return;
    var bumped = !quiet && lastShown !== null && n > lastShown;
    var from = (lastShown === null) ? (quiet ? n : 0) : lastShown;
    lastShown = n;
    animateCount(from, n, quiet);
    if (bumped) {
      viewsEl.classList.add('count-bump');
      setTimeout(function () { viewsEl.classList.remove('count-bump'); }, 600);
    }
  }

  // Mode 1 — shared server counter. One request to the counter endpoint;
  // peek=true reads WITHOUT incrementing. Resolves to the number, or null if the
  // endpoint isn't a usable counter (no backend / static host / bad response).
  function fetchCount(endpoint, peek, add) {
    if (!endpoint) return Promise.resolve(null);
    var url = endpoint + (endpoint.indexOf('?') < 0 ? '?' : '&') + (peek ? 'peek=1' : 'v=1') + (add ? '&add=' + add : '');
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) { if (j && j.lastUpdated) renderDate(j.lastUpdated); var n = parseInt(j.count, 10); return isNaN(n) ? null : n; })
      .catch(function () { return null; });
  }

  // Near-realtime: re-read (peek, never increments) the shared count on an
  // interval and update the footer live as other visitors arrive — no reload.
  // Uses polling, NOT sockets, so it works on EVERY host (shared PHP, static,
  // serverless). Pauses while the tab is hidden to spare the server and battery.
  function startPolling(endpoint, ms) {
    if (!(ms > 0)) return;
    function tick() {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchCount(endpoint, true).then(function (n) { if (n !== null) showCount(n); });
    }
    if (_pollTimer) clearInterval(_pollTimer);   // guard: only ONE interval even if re-run
    _pollTimer = setInterval(tick, ms);
    if (!_visBound && typeof document !== 'undefined' && document.addEventListener) {
      _visBound = true;
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) tick();          // refresh the instant the tab returns
      });
    }
  }

  // Mode 2 — per-browser fallback (seed + this browser's session tally). Used on
  // ANY host that has no shared counter backend, so the footer still shows a
  // sensible, growing number whatever the server is.
  function renderLocalViews(seed) {
    if (!viewsEl) return;
    var KEY = 'sg-pageviews-v2';
    var cur = 0;
    try { cur = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch (e) {}
    // Count once per session on any REAL deployed host, but never on a local /
    // dev preview, so previews don't inflate the number.
    var h = location.hostname;
    var isLocal = !h || h === 'localhost' || h === '127.0.0.1' || h === '::1'
                  || /\.local$/i.test(h) || location.protocol === 'file:';
    // Only count on a real government domain (never on previews/staging/dev).
    if (!isLocal && isGovHost(h) && !sessionCounted()) {
      cur += 1;
      try { localStorage.setItem(KEY, String(cur)); } catch (e) {}
      markCounted();
    }
    showCount(seed + cur, true);   // route through the monotonic floor so the fallback can't drop a live value
  }

  function renderDate(val) {
    if (!dateEl || !val) return;
    val = String(val).trim();
    // Stored form is already "DD Mon YYYY" -> show it VERBATIM. (A new Date(val) reparse
    // shifted the day by the local timezone offset -> "11 Jul 2026" rendered "10 July 2026".)
    var m = val.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
    if (m) {
      dateEl.textContent = val;
      var mi = -1, k;
      for (k = 0; k < MONTHS.length; k++) { if (MONTHS[k].slice(0,3).toLowerCase() === m[2].slice(0,3).toLowerCase()) { mi = k; break; } }
      if (mi >= 0) dateEl.setAttribute('datetime', m[3] + '-' + ('0'+(mi+1)).slice(-2) + '-' + ('0'+m[1]).slice(-2));
      return;
    }
    var d = new Date(val);
    if (isNaN(d.getTime())) { dateEl.textContent = val; return; }
    dateEl.textContent = ('0'+d.getUTCDate()).slice(-2) + ' ' + MONTHS[d.getUTCMonth()].slice(0,3) + ' ' + d.getUTCFullYear();
    dateEl.setAttribute('datetime', d.toISOString().slice(0,10));
  }

  // Resolve the counter URL: absolute or root-relative URLs are used as-is, a
  // bare path is taken relative to the site base. Defaults to the PHP backend.
  function resolveEndpoint(ep) {
    if (!ep) return base + '/data/counter.php';
    if (/^(https?:)?\/\//.test(ep) || ep.charAt(0) === '/') return ep;
    return base + '/' + ep;
  }

  // Fallbacks read from the existing markup (used if the JSON fetch fails).
  var fallbackSeed = 0;
  if (viewsEl) {
    var raw = viewsEl.getAttribute('data-seed') || viewsEl.textContent || '';
    fallbackSeed = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
  }
  var fallbackDate = (dateEl && dateEl.getAttribute('datetime')) || '';

  function start(stats) {
    stats = stats || {};
    renderDate(stats.lastUpdated || fallbackDate);
    var seed = parseInt(stats.pageViewsSeed, 10);
    if (isNaN(seed)) seed = fallbackSeed;
    // Counter federation: if this site was built FROM an existing LIVE site, set
    // site-stats.json counterUpstream.url to that site's counter so the count CONTINUES
    // from it. Remove it once THIS becomes the primary/live site (then it uses its own).
    var pollMs = parseInt(stats.counterPollMs, 10);
    if (isNaN(pollMs)) pollMs = 15000;          // ~15s live refresh; set 0 to disable

    // Instant paint from the cached total, then read the live total. We count
    // ONCE PER BROWSER SESSION: the first load increments (v=1); every later load
    // or refresh only peeks (read-only). sessionStorage survives refreshes but is
    // cleared when the tab closes — so refreshing never bumps the number, while
    // closing the tab and returning (a new session) counts once. Others' visits
    // still appear live via polling. Non-gov hosts always peek (never inflate it).
    var cached = readCache();
    if (cached !== null) showCount(cached, true);
    // COUNT SOURCE — federation with AUTO-CUTOVER via the hidden signature. If counterUpstream is
    // set (this site was built FROM a live OLD site), prefetch that site and read its 'sig':
    //  • OLD site still live there (sig == counterUpstream.sig) -> FEDERATE: show its live count,
    //    READ-ONLY (never increment the old site).
    //  • that URL now serves OUR site (sig == our siteSignature — the new site replaced the old)
    //    -> TERMINATE federation and increment our OWN counter. (Remove counterUpstream once cut over.)
    resolveCounterSource(stats).then(function (src) {
      var countThisVisit = !src.federated && !sessionCounted() && isGovHost();
      var attemptDone = false, pend = pendingCount();
      // A counting visit also flushes any counts buffered while offline (add=pend).
      fetchCount(src.endpoint, !countThisVisit, countThisVisit ? pend : 0).then(function (n) {
        attemptDone = true;
        if (n === null) {                                // server unreachable
          if (cached === null) renderLocalViews(seed);   // backup: per-browser tally (no PHP)
          if (countThisVisit) addPending(1);             // buffer this visit -> flush next time
          return;
        }
        if (countThisVisit) markCounted();
        clearPending();                                  // this visit + buffered are now recorded server-side
        showCount(n, true);
        startPolling(src.endpoint, pollMs);
      });
      // If a countable visit isn't recorded yet when the tab is hidden/closed (slow/failed request),
      // sendBeacon so the count is NEVER lost -- the server adds it atomically (flock).
      if (countThisVisit) {
        var beaconed = false;
        var flush = function () {
          if (beaconed || attemptDone || sessionCounted() || typeof navigator === 'undefined' || !navigator.sendBeacon) return;
          beaconed = true;
          try { navigator.sendBeacon(src.endpoint + (src.endpoint.indexOf('?') < 0 ? '?' : '&') + 'v=1' + (pend ? '&add=' + pend : '')); markCounted(); clearPending(); } catch (e) {}
        };
        window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
      }
    });
  }

  function sigText(t) { if (!t) return ''; try { return JSON.parse(t).sig || ''; } catch (e) { return String(t).trim(); } }
  function resolveCounterSource(stats) {
    var localEp = resolveEndpoint(stats.counterEndpoint);
    var up = stats.counterUpstream, mySig = stats.siteSignature || '';
    // serverSide upstream (an HTML-count old site scraped by counter.php) -> the browser can't
    // fetch it (CORS); just use our own counter.php, which returns the scraped live count.
    if (!up || !up.url || up.serverSide || typeof fetch !== 'function') return Promise.resolve({ endpoint: localEp, federated: false });
    // ALL federation state (the cutover flag AND the continuity floor) lives in FILES on the server,
    // managed by counter.php — NEVER browser storage. Ask our own server first.
    return fetch(localEp + (localEp.indexOf('?') < 0 ? '?' : '&') + 'peek=1&stats=1', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; }, function () { return {}; })
      .then(function (mine) {
        if (mine && mine.cutover) return { endpoint: localEp, federated: false };   // server file: cutover already done
        var upEp = resolveEndpoint(up.url);
        var upSigUrl = up.sigUrl || upEp.replace(/[^/?#]*([?#].*)?$/, 'site.sig');
        // Read the upstream's signature via PHP (counter.php 'sig') OR, when PHP isn't available (a
        // PURE STATIC host), the STATIC site.sig file — so detection works either way, no PHP needed.
        return Promise.all([
          fetch(upEp + (upEp.indexOf('?') < 0 ? '?' : '&') + 'peek=1&stats=1', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }, function () { return null; }),
          fetch(upSigUrl, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; }, function () { return null; })
        ]).then(function (res) {
          var j = res[0] || {}, upSig = j.sig || sigText(res[1]), upCount = parseInt(j.count, 10);
          // Detection by PRESENCE of OUR signature (we can't add anything to the old site).
          if (upSig && mySig && upSig === mySig) {
            // Cutover: on a PHP host, persist the marker + continuity floor server-side (ignored on
            // a static host, where the check just re-runs each load — a CDN-cached static file).
            var q = 'fedoff=1&sig=' + encodeURIComponent(mySig);
            if (!isNaN(upCount)) q += '&seed=' + upCount;
            try { fetch(localEp + (localEp.indexOf('?') < 0 ? '?' : '&') + q, { cache: 'no-store' }); } catch (e) {}
            return { endpoint: localEp, federated: false };
          }
          if (!isNaN(upCount)) return { endpoint: upEp, federated: true };   // old site HAS a counter -> federate
          return { endpoint: localEp, federated: false };                    // old site has NO counter -> ours
        });
      });
  }

  if (typeof fetch !== 'function') {
    renderLocalViews(fallbackSeed);
    if (fallbackDate) renderDate(fallbackDate);
    return;
  }
  // Instant boxed paint from the cached total BEFORE the site-stats.json round-trip,
  // so a returning visitor never sees an unstyled "…" placeholder while the network
  // resolves. start() still refreshes it live (and animates any genuine change).
  var _cachedNow = readCache();
  if (_cachedNow !== null) showCount(_cachedNow, true);
  if (fallbackDate) renderDate(fallbackDate);

  (function loadStats(tries) {
    fetch(base + '/data/site-stats.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(start)
      .catch(function () {                    // flaky mobile network -> retry a few times before giving up
        if (tries > 0) { setTimeout(function () { loadStats(tries - 1); }, 1000); }
        else { start(null); }
      });
  })(3);
  };
})();
window.SGCounter();   // run once on load; re-callable after the footer is rebuilt
