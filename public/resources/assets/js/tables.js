/* ============================================================================
   DATA TABLES — every content <table> comes from JSON, at runtime.

   A table's spot on a page is an EMPTY placeholder, exactly like the news feeds:

       <div data-table="rti-officers"></div>

   This file fetches data/tables/rti-officers.json and builds the table into it.
   So editing that JSON changes the live site on the next reload — no build step,
   no shell access. resources/tools/gen-tables.py is only a helper (validate, or
   --bake a static copy for crawlers); it is NOT needed to publish a change.

   Shared by BOTH page sets: the GIGW pages (includes.js loads this) and the
   S3WaaS theme pages (s3waas.js injects it). The data path is derived from THIS
   script's own URL, so it works whether the page links assets absolutely
   ("/resources/assets/js/…") or relatively ("assets/js/…"), and after the
   portable theme-demo build rewrites every path.

   KEEP IN SYNC with render_table()/render_cell() in resources/tools/gen-tables.py —
   both must produce the same markup from the same JSON.
   ========================================================================== */
(function () {
  'use strict';
  if (window.SGTables) return;                     // already loaded

  /* Where data/tables/ lives, from our own <script src>: .../assets/js/tables.js
     -> .../data/tables/. window.__siteBase wins if the page set one. */
  var DATA_ROOT = (function () {
    if (window.__siteBase) return window.__siteBase + '/data/tables/';
    var me = document.currentScript ||
             document.querySelector('script[src*="tables.js"]');
    var src = (me && me.getAttribute('src')) || '';
    var m = src.replace(/[?#].*$/, '').match(/^(.*)assets\/js\/tables\.js$/);
    return m ? m[1] + 'data/tables/' : '/resources/data/tables/';
  })();

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (kids) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* The template's data files may carry // and /* comments — strip them the same
     way includes.js does, so a hand-annotated table JSON still parses. */
  function sjson(t) {
    var s = '', i = 0, n = t.length, q = false, e = false, a, b;
    while (i < n) {
      a = t.charAt(i); b = t.charAt(i + 1);
      if (q) { s += a; if (e) { e = false; } else if (a === '\\') { e = true; } else if (a === '"') { q = false; } i++; continue; }
      if (a === '"') { q = true; s += a; i++; continue; }
      if (a === '/' && b === '/') { i += 2; while (i < n && t.charAt(i) !== '\n') i++; continue; }
      if (a === '/' && b === '*') { i += 2; while (i < n && !(t.charAt(i) === '*' && t.charAt(i + 1) === '/')) i++; i += 2; continue; }
      s += a; i++;
    }
    return JSON.parse(s.replace(/,(\s*[}\]])/g, '$1'));
  }

  var SERIAL_HEADER = /^\s*s(?:r|erial)?\.?\s*(?:no|num(?:ber)?)?\.?\s*$/i;

  function stripTags(s) { return String(s).replace(/<[^>]+>/g, ''); }
  /* Same trust as a hand-written <td>: the JSON is ours, and cells legitimately
     carry inline <strong>/<sup>/<ul>. The only transform is newline -> <br>. */
  function cellHTML(s) { return String(s).replace(/\r\n/g, '\n').replace(/\n/g, '<br>'); }

  function tableCell(cell, label) {
    var td = el('td', label ? { 'data-label': stripTags(label) } : null);
    if (typeof cell === 'string') { td.innerHTML = cellHTML(cell); return td; }
    if (!cell || typeof cell !== 'object') return td;

    // "site": "wim.email" -> data-site, filled from data/site.json by includes.js,
    // so contact details live in ONE place across every policy page.
    if (cell.site) td.setAttribute('data-site', cell.site);

    if (cell.download) {
      var typ = cell.type || 'pdf', tu = String(typ).toUpperCase(), size = cell.size || '';
      var a = el('a', {
        class: 'dl-btn', href: cell.download, 'data-file-type': String(typ).toLowerCase(),
        'aria-label': 'Download ' + (cell.text || '') + (size ? ' (' + tu + ', ' + size + ')' : '')
      }, [el('i', { class: 'svg-ico fa-solid fa-download', 'aria-hidden': 'true' }), ' Download']);
      a.setAttribute('download', '');
      // "meta": false — the table already has its own Type/Size columns.
      if (cell.meta !== false) {
        a.appendChild(document.createTextNode(' '));
        a.appendChild(el('span', { class: 'dl-meta', text: tu + (size ? ' · ' + size : '') }));
      }
      td.appendChild(a);
      return td;
    }

    if (cell.url) {
      var text = cell.text == null ? cell.url : cell.text;
      var ext = /^https?:\/\//i.test(cell.url);
      var link = el('a', cell.button ? { class: 'dl-btn', href: cell.url } : { href: cell.url });
      link.innerHTML = cellHTML(text);
      if (cell.aria) link.setAttribute('aria-label', cell.aria);
      if (ext) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
      if (ext && !cell.button) {
        if (!cell.aria) link.setAttribute('aria-label', text + ' — opens in new window');
        link.appendChild(document.createTextNode(' '));
        link.appendChild(el('span', { class: 'ext-ico', 'aria-hidden': 'true' }, '↗'));
      }
      td.appendChild(link);
      return td;
    }

    td.innerHTML = cellHTML(cell.text || '');
    return td;
  }

  function buildTable(d) {
    var headers = d.headers || [], rows = d.rows || [];
    /* An "Sr. No." first column is GENERATED — rows carry one cell fewer and we
       number them here, so inserting or deleting a row never renumbers by hand. */
    var serial = d.serial;
    if (serial === undefined || serial === null) {
      serial = !!(headers.length && SERIAL_HEADER.test(stripTags(headers[0])));
    }
    // Fail safe: if the rows still carry their own number, don't double the column.
    if (serial && rows.some(function (r) { return r.length >= headers.length; })) serial = false;
    var fmt = d.serialFormat || '{n}';
    // "labels": false — omit data-label. .s3-table prints it as a visible caption
    // on mobile, so adding it to a table that never had it would put new text on
    // the page.
    var labels = d.labels !== false;

    var cls = d['class'] === undefined ? 'data-table' : d['class'];
    var table = el('table', cls ? { class: cls } : null);
    if (d.caption) {
      var cap = el('caption');
      cap.innerHTML = cellHTML(d.caption);
      table.appendChild(cap);
    }
    var htr = el('tr');
    headers.forEach(function (h) {
      var th = el('th', { scope: 'col' });
      th.innerHTML = cellHTML(h);
      htr.appendChild(th);
    });
    table.appendChild(el('thead', null, htr));

    var tb = el('tbody');
    rows.forEach(function (row, i) {
      var cells = serial ? [fmt.replace('{n}', String(i + 1))].concat(row) : row;
      var tr = el('tr');
      cells.forEach(function (c, j) { tr.appendChild(tableCell(c, labels ? headers[j] : null)); });
      tb.appendChild(tr);
    });
    table.appendChild(tb);

    // "wrap": true -> .table-wrap; false -> none; a string -> that class.
    var wrap = d.wrap === undefined ? true : d.wrap;
    var wrapCls = wrap === true ? 'table-wrap' : (wrap || '');
    return wrapCls ? el('div', { class: wrapCls }, table) : table;
  }

  function fail(host, name) {
    // Never leave a blank hole: say so, and log which file was missing.
    host.appendChild(el('p', { class: 'form-note', text: 'This table could not be loaded. Please refresh the page.' }));
    if (window.console && console.warn) console.warn('data-table "' + name + '" failed to load');
  }

  /* reinit=true -> after the rows land, re-run the page initialisers so things that
     decorate table content (file-size tags on download links, the data-site filler,
     …) can see them. Needed after an SPA swap, where the re-init fires synchronously
     while our fetch is still in flight. Guarded by the rendered count so it can never
     loop: the second pass finds every host already flagged and returns 0. */
  function render(reinit) {
    var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-table]'))
      .filter(function (h) { return h.getAttribute('data-table') && !h.dataset.sgTable; });
    if (!hosts.length) return Promise.resolve(0);
    return Promise.all(hosts.map(function (host) {
      var name = host.getAttribute('data-table');
      host.dataset.sgTable = '1';                    // never render the same host twice
      return fetch(DATA_ROOT + name + '.json', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
        .then(sjson)
        .then(function (d) {
          host.textContent = '';                     // drop any --bake'd static copy
          host.appendChild(buildTable(d));
          return 1;
        })
        .catch(function () {
          if (!host.querySelector('table')) fail(host, name);   // keep a baked copy if present
          return 0;
        });
    })).then(function (made) {
      var n = made.reduce(function (a, b) { return a + b; }, 0);
      if (n && reinit && window.SG && window.SG.initContent) window.SG.initContent();
      /* Anything that decorates table markup subscribes to this instead of guessing
         when the fetch finished — s3waas.js re-runs its .s3-td-label injection here.
         Fired only when rows actually landed, so it cannot ping-pong. */
      if (n) {
        try { window.dispatchEvent(new CustomEvent('sg:tables-rendered')); } catch (e) {}
      }
      return n;
    });
  }

  window.SGTables = { render: render, build: buildTable };

  /* First paint. GIGW pages award this to includes.js (which awaits it before
     revealing); on S3WaaS pages nothing else drives it, so run it here too — the
     per-host flag makes whichever call comes second a no-op. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(false); });
  } else {
    render(false);
  }

  /* Both page sets swap only <main> on an internal link click, so the incoming
     page arrives with EMPTY placeholders. spa-nav.js fires this on every swap. */
  window.addEventListener('spa:navigated', function () { render(true); });

  /* GIGW also re-runs registered content initialisers directly (nav.js -> the
     router's own path), so register there as well when that runtime exists. */
  (function reg(tries) {
    if (window.SG && window.SG.content) { window.SG.content(function () { render(true); }); return; }
    if ((tries || 0) < 40) setTimeout(function () { reg((tries || 0) + 1); }, 60);
  })();
})();
