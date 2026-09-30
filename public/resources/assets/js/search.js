/* Client-side site search — reads ?q=, scores pages from data/search-index.json, renders results. */
(function () {
  'use strict';

  var PER_PAGE = 30;
  var params, q, page, input, statusEl, resultsEl;
  var IDX = null;   // the fetched index, kept across re-runs so Back is instant

  /* Re-read the query AND the DOM on every entry. spa-nav.js swaps <main> on navigation, so
     after a browser Back the elements captured on first load are detached from the document —
     writing results into them renders into nothing, which is why the page came back blank.
     Returns false on any page without the search hooks, so boot() is a no-op elsewhere.
     See BUILD-ERRORS §135. */
  function readState() {
    params = new URLSearchParams(window.location.search);
    q = (params.get('q') || '').trim();
    page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
    input = document.getElementById('q');
    statusEl = document.getElementById('search-status');
    resultsEl = document.getElementById('search-results');
    if (!statusEl || !resultsEl) return false;
    if (input && q) input.value = q;
    return true;
  }

  // Obfuscate any email in result text/snippets so it matches the rest of the
  // site (test@gmail.com -> test[at]gmail[dot]com) and isn't harvestable here.
  function obfEmails(s) {
    return s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, function (m) {
      return m.replace(/-/g, '[dash]').replace(/@/g, '[at]').replace(/\./g, '[dot]');
    });
  }
  function esc(s) {
    return obfEmails(String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    }));
  }

  // CORE security (not the contact-form kit): refuse a query that carries code / scripts / markup.
  // The query is already escaped on output, but as a policy the search bar accepts plain words only —
  // no <script>/HTML, event handlers, PHP/ASP/template tags, shell or command substitution. This
  // never touches keyboard navigation.
  var INJECT = /<\s*\/?\s*(?:script|iframe|object|embed|svg|base|meta|link|style|form|input|img)\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|\bon(?:error|load|click|mouseover|mouseenter|focus|submit|toggle|animationstart|begin)\s*=|<\?(?:php|=)|<%|%>|\?>|\{%|%\}|\{\{[^}]*\}\}|\$\(|`[^`]*`|\b(?:system|exec|shell_exec|passthru|eval|assert)\s*\(|\/\*[\s\S]*?\*\/|\bmso-[a-z-]+|\bfont-(?:family|size|weight|style)\s*:|\{[^{}]*[a-z-]+\s*:[^{}]*;[^{}]*\}|<\s*style\b|\bstyle\s*=\s*['\"]/i;
  function hasCode(s) { return typeof s === 'string' && s !== '' && INJECT.test(s); }

  // Quick-jump chips shown on the empty + no-results cards (relative to /search/).
  function jumpRow(label) {
    return '<div class="search-jump"><span class="search-jump-label">' + label + '</span>' +
      '<a class="search-chip" href="../sitemap/">Sitemap</a>' +
      '<a class="search-chip" href="../contact/">Contact Us</a>' +
      '<a class="search-chip" href="../">Home</a></div>';
  }
  function stateCard(inner) {
    return '<div class="search-state"><div class="search-state-card">' +
      '<i class="svg-ico fa-solid fa-magnifying-glass search-state-ico" aria-hidden="true"></i>' +
      inner + '</div></div>';
  }
  // hide the plain status line so the query is never named twice (the card carries it)
  function hideStatus() { statusEl.textContent = ''; statusEl.classList.add('visually-hidden'); }
  function showStatus() { statusEl.classList.remove('visually-hidden'); }

  function boot() {
    if (!readState()) return;

    if (q && hasCode(q)) {
      if (input) input.value = q;   // .value is inert (never parsed as HTML)
      hideStatus();
      resultsEl.innerHTML = stateCard(
        '<h2 class="search-state-title">That search isn’t allowed</h2>' +
        '<p class="search-state-lead">Your search contains code, scripts or markup. ' +
        'Please search using plain words only.</p>' +
        jumpRow('Try instead:'));
      return;
    }

    if (!q) {
      hideStatus();
      resultsEl.innerHTML = stateCard(
        '<h2 class="search-state-title">Search this website</h2>' +
        '<p class="search-state-lead">Type a word or phrase in the box above to find pages, ' +
        'notices, documents and more across the site.</p>' +
        jumpRow('Popular pages:'));
      return;
    }

    statusEl.textContent = 'Searching…';
    var tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    var phrase = q.toLowerCase();

    function highlight(s) {
      s = String(s == null ? '' : s);
      if (!tokens.length) return esc(s);
      // Match ALL tokens in ONE pass over the RAW text, then escape each segment separately and wrap
      // matches in <mark>. (The old code escaped first, then regex-replaced on the escaped HTML — so a
      // token could match INSIDE an inserted <mark> tag or an HTML entity like &amp;/&lt; and corrupt
      // the output; multiple tokens also clobbered each other's tags.)
      var re = new RegExp('(' + tokens.map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'ig');
      var out = '', last = 0, m;
      while ((m = re.exec(s)) !== null) {
        if (m.index > last) out += esc(s.slice(last, m.index));
        out += '<mark>' + esc(m[0]) + '</mark>';
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;   // guard against a zero-length match looping forever
      }
      out += esc(s.slice(last));
      return out;
    }

    function snippet(it) {
      var text = it.x || it.d || '';
      if (!text) return '';
      var low = text.toLowerCase();
      var pos = -1;
      tokens.forEach(function (tk) {
        var p = low.indexOf(tk);
        if (p !== -1 && (pos === -1 || p < pos)) pos = p;
      });
      if (pos === -1) pos = 0;
      var start = pos > 70 ? pos - 70 : 0;
      var snip = text.slice(start, start + 220);
      if (start > 0) snip = '…' + snip;
      if (start + 220 < text.length) snip = snip + '…';
      return highlight(snip);
    }

    function pageUrl(n) { return '?q=' + encodeURIComponent(q) + (n > 1 ? '&page=' + n : ''); }
    function pager(totalPages, cur) {
      if (totalPages <= 1) return '';
      var out = '<nav class="search-pager" aria-label="Search results pages">';
      out += cur > 1
        ? '<a href="' + pageUrl(cur - 1) + '" rel="prev">‹ Prev</a>'
        : '<span class="is-disabled">‹ Prev</span>';
      // windowed page numbers (1 … cur-1 cur cur+1 … last)
      var nums = [], i;
      for (i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= cur - 2 && i <= cur + 2)) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
      }
      nums.forEach(function (n) {
        if (n === '…') out += '<span class="pager-gap">…</span>';
        else if (n === cur) out += '<span class="is-current" aria-current="page">' + n + '</span>';
        else out += '<a href="' + pageUrl(n) + '">' + n + '</a>';
      });
      out += cur < totalPages
        ? '<a href="' + pageUrl(cur + 1) + '" rel="next">Next ›</a>'
        : '<span class="is-disabled">Next ›</span>';
      return out + '</nav>';
    }
    function render(results) {
      if (!results.length) {
        hideStatus();
        resultsEl.innerHTML = stateCard(
          '<h2 class="search-state-title">We couldn’t find a match</h2>' +
          '<p class="search-state-lead">No results found for <strong>“' + esc(q) +
          '”</strong>. A few things to try:</p>' +
          '<ul class="search-tips">' +
          '<li><i class="svg-ico fa-solid fa-lightbulb" aria-hidden="true"></i>Check the spelling, or try fewer / more general words.</li>' +
          '<li><i class="svg-ico fa-solid fa-lightbulb" aria-hidden="true"></i>Search by a single keyword instead of a full phrase.</li>' +
          '<li><i class="svg-ico fa-solid fa-lightbulb" aria-hidden="true"></i>Use the full name of a page (e.g. “RTI”, “Feedback”).</li>' +
          '</ul>' +
          jumpRow('Or jump straight to:'));
        return;
      }
      showStatus();
      var total = results.length;
      var totalPages = Math.ceil(total / PER_PAGE);
      if (page > totalPages) page = totalPages;
      var start = (page - 1) * PER_PAGE;
      var slice = results.slice(start, start + PER_PAGE);
      statusEl.innerHTML = '<strong>' + total + '</strong> result' + (total > 1 ? 's' : '') +
        ' for <strong>“' + esc(q) + '”</strong>' +
        (totalPages > 1 ? ' — showing ' + (start + 1) + '–' + (start + slice.length) + ' (page ' + page + ' of ' + totalPages + ')' : '');
      resultsEl.innerHTML = slice.map(function (r) {
        var it = r.it;
        return '<article class="search-result">' +
          '<h2 class="sr-title"><a href="' + esc(it.u) + '">' + highlight(it.t) + '</a></h2>' +
          '<p class="sr-url"><i class="svg-ico fa-solid fa-link" aria-hidden="true"></i>' + esc(it.u) + '</p>' +
          (snippet(it) ? '<p class="sr-snip">' + snippet(it) + '</p>' : '') +
          '</article>';
      }).join('') + pager(totalPages, page);
    }

    // ---- the page index — THREE ways, tried in order (search never depends on one file) ----
    // 1. data/search-index.json — the prebuilt index (fastest; kept current by
    //    update-site.py or the server-side data/search-index.php).
    // 2. data/search-index.php  — if present, a live server endpoint returning a fresh
    //    index (auto-rebuilt when pages change), so results are never stale.
    // 3. runtime crawl          — if neither file is available, build an equivalent index
    //    in the browser by fetching every page in data/routes.json (cached per session).
    function loadIdx(url) {
      return fetch(url)
        .then(function (r) { if (!r.ok) return Promise.reject(); return r.json(); })
        .then(function (j) { var a = (j && j.pages) || j; if (!a || !a.length) return Promise.reject(); return a; });
    }

    function textFromDoc(doc) {
      var main = doc.querySelector('#main-content, [role="main"], [id$="-main"], main') || doc.body;
      if (!main) return '';
      main.querySelectorAll('script, style, noscript').forEach(function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
      return (main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12000);
    }

    /* Data tables are rendered by assets/js/tables.js from data/tables/*.json. A page
       fetched here is parsed by DOMParser, which never runs scripts — so its
       <div data-table="NAME"> is still EMPTY and its rows would be missing from the
       index. Fetch each table's JSON and fold its words into the page text. */
    var tableCache = {};
    function tableWords(name, base) {
      if (tableCache[name]) return tableCache[name];
      tableCache[name] = fetch(base + '/data/tables/' + name + '.json')
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) {
          var out = [];
          if (d.caption) out.push(d.caption);
          (d.headers || []).forEach(function (h) { out.push(h); });
          (d.rows || []).forEach(function (row) {
            (row || []).forEach(function (c) {
              if (typeof c === 'string') out.push(c);
              else if (c && c.text) out.push(c.text);
            });
          });
          return out.join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }).catch(function () { return ''; });
      return tableCache[name];
    }

    function crawlOne(url, base) {
      return fetch(url).then(function (r) { if (!r.ok) throw 0; return r.text(); })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var tEl = doc.querySelector('title') || doc.querySelector('h1');
          var dEl = doc.querySelector('meta[name="description"]');
          var names = [].slice.call(doc.querySelectorAll('[data-table]'))
            .map(function (n) { return n.getAttribute('data-table'); }).filter(Boolean);
          return Promise.all(names.map(function (n) { return tableWords(n, base || ''); }))
            .then(function (parts) {
              return { t: ((tEl && tEl.textContent) || url).trim(), u: url,
                       d: (dEl && dEl.getAttribute('content')) || '',
                       x: (textFromDoc(doc) + ' ' + parts.join(' ')).trim().slice(0, 12000) };
            });
        }).catch(function () { return null; });
    }
    function buildFromRoutes(base) {
      try { var c = sessionStorage.getItem('sg-search-idx'); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
      function getRoutes(url) { return fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
      return getRoutes(base + '/data/routes.json')
        .catch(function () { return getRoutes('data/routes.json'); })
        .then(function (rj) {
          var routes = (rj && rj.routes) || rj || [];
          var items = [], i = 0, CONC = 8;
          function next() {
            if (i >= routes.length) return Promise.resolve();
            var batch = routes.slice(i, i + CONC); i += CONC;
            statusEl.textContent = 'Building search index… ' + Math.min(i, routes.length) + '/' + routes.length;
            return Promise.all(batch.map(function (u) { return crawlOne(u, base); })).then(function (res) {
              res.forEach(function (it) { if (it) items.push(it); });
              return next();
            });
          }
          return next().then(function () {
            try { sessionStorage.setItem('sg-search-idx', JSON.stringify(items)); } catch (e) {}
            return items;
          });
        });
    }

    /* Record what people search for, so the site owner can see the gaps. Fire-and-
       forget: the endpoint stores ONLY the term + a count (no IP, no user agent, no
       session), and a failure here must never affect the results on screen. */
    function logQuery(hits) {
      try {
        var url = (window.__siteBase || '/resources') + '/data/search-log.php';
        var body = 'q=' + encodeURIComponent(q) + '&hits=' + hits;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([body], { type: 'application/x-www-form-urlencoded' }));
        } else {
          fetch(url, { method: 'POST', keepalive: true,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body }).catch(function () {});
        }
      } catch (e) { /* logging is optional — never break search */ }
    }

    /* Count non-overlapping occurrences of a token — a page that says "RTI" nine times
       is a better answer than one that mentions it once, which the old found-it-or-not
       scoring couldn't tell apart. Capped so one long page can't bury a short one. */
    function freq(hay, needle) {
      var n = 0, i = hay.indexOf(needle);
      while (i !== -1 && n < 12) { n++; i = hay.indexOf(needle, i + needle.length); }
      return n;
    }

    function scoreAndRender(items) {
      var results = [];
      items.forEach(function (it) {
        var title = (it.t || it.title || '').toLowerCase();
        var url = (it.u || it.url || '').toLowerCase();
        var desc = (it.d || '').toLowerCase();
        var text = (it.x || it.text || '').toLowerCase();
        var score = 0, allMatch = true;
        tokens.forEach(function (tk) {
          var inT = title.indexOf(tk) !== -1;
          var inD = desc.indexOf(tk) !== -1;
          var nX = freq(text, tk);
          if (inT) score += 10;
          if (inD) score += 4;
          score += nX;                                   // weight by how often it appears
          // The slug is a strong signal: /rti/ really is THE page about RTI.
          if (url.indexOf(tk) !== -1) score += 6;
          // Whole-word beats a fragment ("art" inside "apart" shouldn't rank).
          if (new RegExp('\\b' + tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text)) score += 2;
          if (!inT && !inD && !nX) allMatch = false;
        });
        if (title.indexOf(phrase) !== -1) score += 15;   // exact phrase in the title
        if (text.indexOf(phrase) !== -1) score += 8;     // exact phrase anywhere
        if (title === phrase) score += 25;               // the page IS the thing asked for
        if (allMatch && score > 0) results.push({ it: it, score: score });
      });
      // Ties broken by the shorter title — the more specific page of two equals.
      results.sort(function (a, b) {
        return b.score - a.score ||
               (a.it.t || a.it.title || '').length - (b.it.t || b.it.title || '').length;
      });
      render(results);
      logQuery(results.length);
    }

    if (IDX) { scoreAndRender(IDX); return; }   // already loaded: re-render straight away
    var base = (window.__siteBase || '/resources');
    loadIdx(base + '/data/search-index.json')
      .catch(function () { return loadIdx('/resources/data/search-index.json'); })
      .catch(function () { return loadIdx(base + '/data/search-index.php'); })
      .catch(function () { return buildFromRoutes(base); })
      .then(function (items) { IDX = items; scoreAndRender(items); })
      .catch(function () {
        statusEl.textContent = 'Sorry, search is unavailable right now. Please browse the sitemap instead.';
      });
  }

  boot();
  /* spa-nav.js swaps <main> and fires this after every SPA navigation, including the one it
     performs on popstate — so this is what restores results when the user hits Back from a
     result. `pageshow`+persisted covers a real bfcache restore when SPA nav is not in play. */
  window.addEventListener('spa:navigated', function () { boot(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) boot(); });
})();
