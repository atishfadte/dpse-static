/* ============================================================================
   s3waas.js — powers the S3WaaS-lookalike pages.

   Data-driven: the NAV/drawer build from data/s3waas/nav.json and the whole
   HOMEPAGE builds from data/s3waas/home.json (hero, latest news, about + tabs,
   explore tiles, officials, gallery, events, divisions, important links,
   partner-portal strip). A template's <main id="s3-main" data-s3-home> ships
   EMPTY and is filled at runtime, so all 12 themes share one content source and
   differ only by their <style>:root{…}</style> palette.

   Sections:
   1. Accessibility dropdown — text size, high contrast, dark mode (localStorage
      sg-font / sg-dark, shared with the GIGW site).
   2. Page-visit counter (client-side, seeded).
   3. Nav + "More Menu" drawer (from nav.json).
   4. Homepage builder (from home.json) → then the content widgets init:
      hero slider, latest-news ticker, partner-logo strip, photo-gallery
      lightbox, vertical "What's New" marquee, count-up stats, card carousel.
      All moving content is user-pausable (GIGW 2.2.2). On pages WITHOUT a
      data-s3-home root (e.g. the components catalogue) the widgets init on the
      existing static markup instead.
   CSP-safe: external file under /resources/assets/js/ ('self'); no inline script needed.
   ========================================================================== */

/* ---- self-heal stale/cached links that doubled a theme path segment, e.g.
   /resources/s3waas/x/resources/s3waas/x/about/ -> /resources/s3waas/x/about/ ---- */
(function () {
  try {
    var pth = location.pathname;
    var fixed = pth.replace(/\/((?:s3waas|gigw-templates)\/[^/]+\/)(?:\1)+/g, '/$1');
    if (fixed !== pth) location.replace(fixed + location.search + location.hash);
  } catch (e) {}
})();

/* ---- shared helper ---- */
function s3esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* Prose from JSON that may carry the SOURCE DOCUMENT's own emphasis. A client's .docx
   bolds and italicises deliberately (a department name, an Act, the date it was founded) and
   flattening that to plain text loses meaning they put there. Escape everything, then allow
   back a tiny inline whitelist — <strong> <b> <em> <i> <u> <mark> <br> — and nothing else, so
   no markup, attribute or script can arrive through a data file. */
function s3rich(t) {
  return s3esc(t).replace(/&lt;(\/?)(strong|b|em|i|u|mark|br)\s*\/?&gt;/gi,
                          function (m, slash, tag) { return '<' + slash + tag.toLowerCase() + '>'; });
}
/* LINE ICONS. assets/js/icons.js (if the page loads it) publishes window.LINE_ICONS, a map of
   FontAwesome name -> Lucide path data. Its PRESENCE is the switch: load it and the site draws
   line icons, drop the tag and every icon falls back to the FontAwesome glyph it always was.
   Brand marks stay on FontAwesome — a logo is a trademark, not a line icon.

   upgradeIcons() rewrites any <i class="fa-…"> inside a container after it is built, so both the
   static pages and everything these builders emit are covered without touching 40 call sites. */
function lineIconSvg(name) {
  var paths = window.LINE_ICONS && window.LINE_ICONS[name];
  if (!paths) return '';
  return '<svg class="s3-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + paths + '</svg>';
}
var STYLE_CLASSES = ['thin', 'light', 'regular', 'solid', 'duotone', 'sharp',
                     'sharp-duotone', 'brands'];
function upgradeIcons(root) {
  if (!window.LINE_ICONS) return;
  var brands = window.LINE_ICON_BRANDS || [];
  var list = (root || document).querySelectorAll('i[class*="fa-"]');
  Array.prototype.forEach.call(list, function (el) {
    var m = /\bfa-([a-z0-9-]+)(?!\S)/g, name = null, x;
    while ((x = m.exec(el.className))) {
      // style classes are not icon names. FontAwesome 7 has eight of them; miss one and
      // 'light' gets treated as the icon. (fa-sharp / fa-duotone are style modifiers too.)
      if (STYLE_CLASSES.indexOf(x[1]) < 0) name = x[1];
    }
    if (!name || brands.indexOf(name) >= 0) return;      // brand marks keep the FA glyph
    var svg = lineIconSvg(name);
    if (!svg) return;
    var span = document.createElement('span');
    span.innerHTML = svg;
    var node = span.firstChild;
    if (el.className.indexOf('s3-el-go') >= 0) node.setAttribute('class', 's3-ico s3-el-go');
    el.parentNode.replaceChild(node, el);
  });
}
window.upgradeIcons = upgradeIcons;
function s3hasUrl(h) { return h && h !== '#' && String(h).indexOf('javascript:') !== 0; }
function s3base() { return (document.documentElement.getAttribute('data-s3-base') || '').replace(/\/+$/, ''); }

/* ============================================================================
   1 + 2. Accessibility dropdown + page-visit counter (chrome — runs now).
   ========================================================================== */
(function () {
  'use strict';

  /* ===== Reject code / script / markup / SQL-injection in ANY input field (client-side; the
     server re-checks authoritatively). Delegated, so it covers every form on every page. ===== */
  if (!window.__sgInputGuard) {
    window.__sgInputGuard = 1;
    var SGIN_SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]), textarea';
    var SGIN_BAD = /<\s*\/?\s*[a-z!][^>]*>|<\s*script|javascript\s*:|vbscript\s*:|\bon[a-z]{3,}\s*=|<\?|\?>|<%|%>|\{\{|\}\}|`[^`]*`|\$\(|\beval\s*\(|\b(?:system|exec|shell_exec|passthru|assert)\s*\(|\b(?:union\s+select|drop\s+(?:table|database)|insert\s+into|delete\s+from|update\s+\w+\s+set|information_schema|xp_cmdshell)\b|['"]\s*(?:or|and)\s*['"\d]|\b(?:or|and)\s+\d+\s*=\s*\d+|['"]\s*=\s*['"]|;\s*(?:drop|delete|update|insert|select)\b|\/\*[\s\S]*?\*\/|\bmso-[a-z-]+|\bfont-(?:family|size|weight|style)\s*:|\{[^{}]*[a-z-]+\s*:[^{}]*;[^{}]*\}|<\s*style\b|\bstyle\s*=\s*['\"]/i;
    var sginWarn = 0;
    var sginToast = function (msg) {
      if (typeof window.__sgToast === 'function') { window.__sgToast(msg, 'err', 0); return; }
      var wrap = document.querySelector('.sg-toasts');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'sg-toasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
      var t = document.createElement('div'); t.className = 'sg-toast err'; t.setAttribute('role', 'alert');
      t.innerHTML = '<span class="sg-toast-ico" aria-hidden="true"></span><div class="sg-toast-body"><p class="sg-toast-title">Not allowed</p><p class="sg-toast-msg"></p></div><button type="button" class="sg-toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><span class="sg-toast-bar"></span>';
      t.querySelector('.sg-toast-msg').textContent = msg;
      var hide = function () { t.classList.add('hide'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 340); };
      t.querySelector('.sg-toast-close').addEventListener('click', hide);
      t.querySelector('.sg-toast-bar').addEventListener('animationend', hide);
      wrap.appendChild(t); requestAnimationFrame(function () { t.classList.add('show'); }); setTimeout(hide, 6000);
    };
    document.addEventListener('input', function (e) {
      var el = e.target; if (!el || !el.matches || !el.matches(SGIN_SEL)) return;
      if (el.value && SGIN_BAD.test(el.value)) el.setAttribute('aria-invalid', 'true');
      else if (el.getAttribute('aria-invalid') === 'true') el.removeAttribute('aria-invalid');
    }, true);
    document.addEventListener('submit', function (e) {
      var form = e.target; if (!form || !form.querySelectorAll) return;
      var bad = null;
      Array.prototype.forEach.call(form.querySelectorAll(SGIN_SEL), function (f) {
        if (f.value && SGIN_BAD.test(f.value)) { f.setAttribute('aria-invalid', 'true'); bad = bad || f; }
      });
      if (bad) {
        e.preventDefault(); e.stopImmediatePropagation();
        var n = Date.now(); if (n - sginWarn > 1500) { sginWarn = n; sginToast('For your security, please remove any code, script or markup from the form.'); }
        if (bad.focus) bad.focus();
      }
    }, true);
  }

  /* ===== Block copy/paste site-wide (forms + search bar) — typed entry only (default). ===== */
  if (!window.__sgClipGuard) {
    window.__sgClipGuard = 1;
    var SGCLIP_SEL = 'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea';
    var sgClipWarn = 0;
    var sgClipToast = function (msg) {
      if (typeof window.__sgToast === 'function') { window.__sgToast(msg, 'err', 0); return; }
      var wrap = document.querySelector('.sg-toasts');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'sg-toasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
      var t = document.createElement('div'); t.className = 'sg-toast err'; t.setAttribute('role', 'alert');
      t.innerHTML = '<span class="sg-toast-ico" aria-hidden="true"></span><div class="sg-toast-body"><p class="sg-toast-title">Not allowed</p><p class="sg-toast-msg"></p></div><button type="button" class="sg-toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><span class="sg-toast-bar"></span>';
      t.querySelector('.sg-toast-msg').textContent = msg;
      var hide = function () { t.classList.add('hide'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 340); };
      t.querySelector('.sg-toast-close').addEventListener('click', hide);
      t.querySelector('.sg-toast-bar').addEventListener('animationend', hide);
      wrap.appendChild(t); requestAnimationFrame(function () { t.classList.add('show'); }); setTimeout(hide, 6000);
    };
    var sgClipRefuse = function (e) {
      e.preventDefault();
      var n = Date.now(); if (n - sgClipWarn < 1500) return; sgClipWarn = n;
      sgClipToast('Copying and pasting are turned off here \u2014 please type your details.');
    };
    var sgClipLocked = function (t) { return t && t.matches && t.matches(SGCLIP_SEL); };
    ['copy', 'cut', 'paste', 'drop', 'dragstart', 'contextmenu'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { if (sgClipLocked(e.target)) sgClipRefuse(e); }, true);
    });
    document.addEventListener('keydown', function (e) {
      if (!sgClipLocked(e.target)) return;
      var k = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (k === 'c' || k === 'v' || k === 'x')) sgClipRefuse(e);
      else if (e.shiftKey && k === 'insert') sgClipRefuse(e);
      else if (e.ctrlKey && k === 'insert') sgClipRefuse(e);
    }, true);
  }
  var d = document.documentElement, b = document.body;

  /* ---- restore saved preferences before paint settles ---- */
  try { if (localStorage.getItem('sg-dark') === '1' || /[?&]sgdark=1/.test(location.search)) b.classList.add('s3-dark'); } catch (e) {}
  try { if (localStorage.getItem('s3-contrast') === '1') b.classList.add('s3-contrast'); } catch (e) {}
  var font = 1;
  try { var sf = parseFloat(localStorage.getItem('sg-font')); if (sf) font = sf; } catch (e) {}
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  /* A-/A/A+ must scale BOTH <html> (for rem-sized headings/widgets) AND <body>
     (.s3 sets a fixed font-size:16px, so paragraph/body text inherits from <body>
     and would NOT grow if only <html> were scaled). Use px on both — not % on
     body, which would compound against the already-scaled <html>. */
  function applyFontSize() {
    d.style.fontSize = (font * 16).toFixed(3) + 'px';
    b.style.fontSize = (font * 16).toFixed(3) + 'px';
  }
  if (font !== 1) applyFontSize();

  /* ---- accessibility dropdown ---- */
  var toggle = document.querySelector('.s3-a11y-toggle');
  var panel = document.querySelector('.s3-a11y-panel');
  function closeA11y() {
    if (panel) panel.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  // Accessibility and Bhashini (translate) are mutually exclusive — opening one
  // closes the other, so the two dropdowns never stay open together. The Bhashini
  // plugin trigger reflects its state in aria-expanded; clicking it while open
  // toggles it closed. `suppress` ignores THAT synthetic click, so closing Bhashini
  // in order to OPEN accessibility doesn't immediately re-close the a11y panel.
  var suppress = false;
  function bhBtnIfOpen() {
      var b = document.querySelector('.bhashini-dropdown-btn');
      if (!b) return null;
      var open = b.getAttribute('aria-expanded') === 'true';
      if (!open) { var dd = document.querySelector('.bhashini-plugin-container [class*="dropdown-content"], .bhashini-plugin-container [class*="content-list"]'); if (dd && dd.offsetParent !== null) open = true; }
      return open ? b : null;
    }
    function closeBhashini() { var b = bhBtnIfOpen(); if (b) { suppress = true; b.click(); suppress = false; } }
  if (toggle && panel) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) closeBhashini();          // opening accessibility closes Bhashini
    });
    document.addEventListener('click', function (e) {
      if (suppress) return;
      if (!panel.contains(e.target) && e.target !== toggle) closeA11y();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeA11y();
    });
    // Clicking the Bhashini trigger closes the accessibility panel. Capture phase,
    // so it fires even though the plugin stops the click from bubbling to document.
    document.addEventListener('click', function (e) {
      if (suppress) return;
      if (e.target.closest && e.target.closest('.bhashini-dropdown-btn')) closeA11y();
    }, true);
  }
  function applyFont() { applyFontSize(); save('sg-font', font); try { window.dispatchEvent(new CustomEvent('sg-font-changed')); } catch (e) {} }
  // reflect persisted toggle states
  var darkBtn = document.querySelector('[data-a11y="dark"]');
  var conBtn = document.querySelector('[data-a11y="contrast"]');
  function darkLabel(on) { var l = document.querySelector('.s3-dark-label'); if (l) l.textContent = on ? 'Light mode' : 'Dark mode'; }
  if (darkBtn && b.classList.contains('s3-dark')) { darkBtn.setAttribute('aria-pressed', 'true'); darkLabel(true); }
  try { b.classList.remove('s3-contrast'); document.documentElement.classList.remove('s3-contrast'); localStorage.removeItem('s3-contrast'); } catch (e) {}   // High contrast feature removed

  // Reader aids (universal sg-* classes) — body class + localStorage; client-side only, off by default.
  var A11Y_OPTS = ['readable-font', 'big-spacing', 'align-left', 'tint', 'hide-img', 'big-cursor', 'hi-cursor', 'read-guide', 'read-mask'];
  A11Y_OPTS.forEach(function (k) { var on = false; try { on = localStorage.getItem('sg-' + k) === '1'; } catch (e) {} if (on) b.classList.add('sg-' + k); var ob = document.querySelector('[data-a11y="opt"][data-opt="' + k + '"]'); if (ob && on) ob.setAttribute('aria-pressed', 'true'); });
  var _guide = null, _maskT = null, _maskB = null, _moveOn = false, _offBtn = null;
  function _onMove(e) { var y = e.clientY; if (_guide) _guide.style.top = y + 'px'; if (_maskT) { _maskT.style.height = Math.max(0, y - 26) + 'px'; _maskB.style.top = (y + 26) + 'px'; } }
  function _turnOffReadAids() { ['read-guide', 'read-mask'].forEach(function (k) { b.classList.remove('sg-' + k); save('sg-' + k, '0'); var pb = document.querySelector('[data-a11y="opt"][data-opt="' + k + '"]'); if (pb) pb.setAttribute('aria-pressed', 'false'); }); syncPointerAids(); }
  function syncPointerAids() {
    var g = b.classList.contains('sg-read-guide'), m = b.classList.contains('sg-read-mask');
    if (g && !_guide) { _guide = document.createElement('div'); _guide.className = 'sg-guideline'; document.body.appendChild(_guide); }
    else if (!g && _guide) { _guide.parentNode.removeChild(_guide); _guide = null; }
    if (m && !_maskT) { _maskT = document.createElement('div'); _maskT.className = 'sg-maskpane sg-maskpane-top'; _maskB = document.createElement('div'); _maskB.className = 'sg-maskpane sg-maskpane-bot'; document.body.appendChild(_maskT); document.body.appendChild(_maskB); }
    else if (!m && _maskT) { _maskT.parentNode.removeChild(_maskT); _maskB.parentNode.removeChild(_maskB); _maskT = _maskB = null; }
    var need = g || m;
    if (need && !_offBtn) { _offBtn = document.createElement('button'); _offBtn.type = 'button'; _offBtn.className = 'sg-read-off'; _offBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Turn Off Reading Aids'; _offBtn.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); _turnOffReadAids(); }); _offBtn.addEventListener('touchend', function (ev) { ev.preventDefault(); ev.stopPropagation(); _turnOffReadAids(); }, { passive: false }); document.body.appendChild(_offBtn); }
    else if (!need && _offBtn) { _offBtn.parentNode.removeChild(_offBtn); _offBtn = null; }
    if (need && !_moveOn) { document.addEventListener('mousemove', _onMove); _moveOn = true; }
    else if (!need && _moveOn) { document.removeEventListener('mousemove', _onMove); _moveOn = false; }
  }
  syncPointerAids();

  Array.prototype.forEach.call(document.querySelectorAll('[data-a11y]'), function (btn) {
    btn.addEventListener('click', function () {
      var a = btn.getAttribute('data-a11y');
      if (a === 'font-dec') { font = Math.max(0.85, Math.round((font - 0.1) * 10) / 10); applyFont(); }
      else if (a === 'font-inc') { font = Math.min(1.4, Math.round((font + 0.1) * 10) / 10); applyFont(); }
      else if (a === 'font-reset') { font = 1; applyFont(); }
      else if (a === 'dark') { var dk = b.classList.toggle('s3-dark'); document.documentElement.classList.toggle('s3-dark', dk); save('sg-dark', dk ? '1' : '0'); btn.setAttribute('aria-pressed', dk ? 'true' : 'false'); darkLabel(dk); }
      else if (a === 'opt') { var k = btn.getAttribute('data-opt'); var o = b.classList.toggle('sg-' + k); save('sg-' + k, o ? '1' : '0'); btn.setAttribute('aria-pressed', o ? 'true' : 'false'); if (o && (k === 'big-cursor' || k === 'hi-cursor')) { var _oc = k === 'big-cursor' ? 'hi-cursor' : 'big-cursor'; b.classList.remove('sg-' + _oc); save('sg-' + _oc, '0'); var _ob = document.querySelector('[data-opt="' + _oc + '"]'); if (_ob) _ob.setAttribute('aria-pressed', 'false'); } syncPointerAids(); }
      else if (a === 'a11y-reset') { b.classList.remove('s3-dark'); document.documentElement.classList.remove('s3-dark'); A11Y_OPTS.forEach(function (k) { b.classList.remove('sg-' + k); save('sg-' + k, '0'); }); save('sg-dark', '0'); font = 1; applyFont(); darkLabel(false); syncPointerAids(); Array.prototype.forEach.call(document.querySelectorAll('[data-a11y][aria-pressed]'), function (x) { x.setAttribute('aria-pressed', 'false'); }); }
    });
  });

  // Bhashini translate: inject its <script> from JS so the plugin's non-standard attributes
  // (language_order / translation-language-list) stay OUT of the static HTML (W3C-valid); CSP allows the src.
  (function injectBhashini() {
    var host = document.querySelector('[data-bhashini-langs]');
    if (!host || document.querySelector('script[data-bhashini]')) return;
    var langs = host.getAttribute('data-bhashini-langs') || 'en';
    var s = document.createElement('script');
    s.src = 'https://translation-plugin.bhashini.co.in/v3/website_translation_utility.js';
    s.defer = true;
    s.setAttribute('data-bhashini', 'true');
    s.setAttribute('language_order', langs);
    s.setAttribute('translation-language-list', langs);
    (document.body || document.head).appendChild(s);
  })();

  /* page-visit counter + "last updated" now live in the SHARED assets/js/counter.js
     (one implementation for GIGW + S3WaaS); it is loaded per page after s3waas.js. */
})();

/* ============================================================================
   3. Nav (inline bar + side drawer) — built from data/s3waas/nav.json. Chrome,
      so it runs now (independent of the homepage content).
   ========================================================================== */
(function () {
  'use strict';
  var navToggle = document.querySelector('.s3-nav-toggle');
  var drawer = document.getElementById('s3-drawer');
  var overlay = document.querySelector('.s3-drawer-overlay');
  // The drawer + overlay are position:fixed, so they stay put over the page WITHOUT
  // locking the page scroll. We do NOT touch <html>/<body> overflow or position: locking
  // scroll (overflow:hidden resets scrollTop to 0 -> jump to top on close; position:fixed
  // pushes the sticky nav off-screen -> nav "disappears" when opened from the bottom).
  // So opening/closing never moves the page; the sticky nav stays exactly where it is.
  function openDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    if (overlay) overlay.hidden = false;
    navToggle.setAttribute('aria-expanded', 'true');
    var f = drawer.querySelector('.s3-drawer-close'); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    if (overlay) overlay.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
    try { navToggle.focus({ preventScroll: true }); } catch (e) { navToggle.focus(); }
  }
  if (drawer) {
    // close drawer when a link is chosen; Up/Down (+ Home/End) move focus within it
    drawer.addEventListener('click', function (e) { if (e.target.closest('a[href]')) closeDrawer(); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
      var links = Array.prototype.slice.call(drawer.querySelectorAll('a[href],button'));
      if (!links.length) return;
      var i = links.indexOf(document.activeElement); e.preventDefault();
      if (e.key === 'ArrowDown') (links[i + 1] || links[0]).focus();
      else if (e.key === 'ArrowUp') (links[i - 1] || links[links.length - 1]).focus();
      else if (e.key === 'Home') links[0].focus();
      else links[links.length - 1].focus();
    });
    // Lock the PAGE scroll while the drawer is open (the drawer scrolls internally),
    // WITHOUT moving <body> — moving the body pushes the sticky nav off-screen and jumps
    // on close. Instead block wheel/touch that isn't inside the drawer; the sticky nav
    // stays put, closing never jumps, and scrolling now moves the SIDEBAR, not the page.
    function s3BlockScroll(e) { if (drawer.classList.contains('open') && !drawer.contains(e.target)) e.preventDefault(); }
    document.addEventListener('wheel', s3BlockScroll, { passive: false });
    document.addEventListener('touchmove', s3BlockScroll, { passive: false });
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;
      // block PageUp/Down, Space, Home/End and arrows from scrolling the page (not inside the drawer)
      var keys = [' ', 'Spacebar', 'PageUp', 'PageDown', 'End', 'Home', 'ArrowUp', 'ArrowDown'];
      if (keys.indexOf(e.key) !== -1 && !drawer.contains(e.target)) e.preventDefault();
    }, false);
  }
  var inlineMenu = document.getElementById('s3-menu');
  var drawerList = document.querySelector('.s3-drawer-list');
  // Recursive renderers so the nav supports 3+ levels (e.g. Elections > Previous >
  // Village Panchayats) in BOTH the inline dropdown and the sidebar drawer.
  function s3subItems(list) {
    return list.map(function (s) {
      var gk = s.children && s.children.length ? s.children : null;
      if (gk) return '<li class="s3-subgroup"><a href="' + s3esc(s.href) + '">' + s3esc(s.label) + ' <i class="fa-solid fa-chevron-right s3-subcaret" aria-hidden="true"></i></a><ul class="s3-subsub">' + s3subItems(gk) + '</ul></li>';
      return '<li><a href="' + s3esc(s.href) + '">' + s3esc(s.label) + '</a></li>';
    }).join('');
  }
  function s3drawItems(list) {
    return list.map(function (s) {
      var gk = s.children && s.children.length ? s.children : null;
      // A sub-group PARENT that has its OWN page (real href) is a LINK to that
      // page; a pure container (# / empty) stays a non-link group label. In the
      // drawer the children are always visible, so linking the parent is safe.
      var pl = gk
        ? (s3hasUrl(s.href)
            ? '<a class="s3-drawer-group s3-draw-parent" href="' + s3esc(s.href) + '">' + s3esc(s.label) + '</a>'
            : '<span class="s3-drawer-group s3-draw-parent">' + s3esc(s.label) + '</span>')
        : '<a href="' + s3esc(s.href) + '">' + s3esc(s.label) + '</a>';
      return '<li' + (gk ? ' class="s3-draw-has"' : '') + '>' + pl + (gk ? '<ul class="s3-drawer-sub">' + s3drawItems(gk) + '</ul>' : '') + '</li>';
    }).join('');
  }
  function buildNav(items) {
    if (!inlineMenu) return;
    var inline = '', draw = '';
    items.forEach(function (it) {
      var kids = it.children && it.children.length ? it.children : null;
      // Home keeps its house ICON, but the ACTIVE PILL is applied dynamically by markCurrent().
      var cls = kids ? ' aria-haspopup="true"' : '';
      var ico = it.current ? '<i class="fa-solid fa-house s3-home-ico" aria-hidden="true"></i> ' : '';
      var car = kids ? ' <i class="fa-solid fa-chevron-down s3-caret" aria-hidden="true"></i>' : '';
      // Desktop dropdown: a parent WITH its own page gets an "Overview" link at the TOP of its
      // dropdown (parents are <button> toggles, so this is how desktop reaches the parent page — same as the drawer).
      var ov = (kids && s3hasUrl(it.href)) ? '<li class="s3-sub-overview"><a href="' + s3esc(it.href) + '"><i class="fa-regular fa-file-lines" aria-hidden="true"></i> Overview</a></li>' : '';
      var subInline = kids ? '<ul class="s3-sub">' + ov + s3subItems(kids) + '</ul>' : '';
      var subDraw = kids ? '<ul class="s3-drawer-sub">' + s3drawItems(kids) + '</ul>' : '';
      // GIGW model: parents are <button> (never navigate -> Enter/Space toggle cleanly); leaves are <a>.
      // drawerOnly items (e.g. Sitemap, Screen Reader Access — already in the top bar) render ONLY in the
      // hamburger drawer, never in the inline nav bar.
      if (!it.drawerOnly) {
        var pin = it.pinned ? ' data-pinned' : '';   // never folded into the drawer by fitMenu()
        if (kids) inline += '<li' + pin + '><button type="button" class="s3-parent" aria-haspopup="true" aria-expanded="false">' + ico + s3esc(it.label) + car + '</button>' + subInline + '</li>';
        else inline += '<li' + pin + '><a' + cls + ' href="' + s3esc(it.href) + '">' + ico + s3esc(it.label) + '</a></li>';
      }
      // Drawer top level: a parent WITH its own page (real href, e.g. Elections ->
      // elections/) is a LINK to that page; a pure container (# / empty, e.g. "More")
      // stays a non-link GROUP LABEL. Children are always visible below, so linking
      // the section parent is safe. The wrapping <li> is tagged .s3-draw-group so the
      // whole group (heading + its children) can be bordered as one connected block.
      var _pl = kids
        ? (s3hasUrl(it.href)
            ? '<a class="s3-drawer-group s3-draw-toplink" href="' + s3esc(it.href) + '">' + s3esc(it.label) + '</a>'
            : '<span class="s3-drawer-group">' + s3esc(it.label) + '</span>')
        : '<a href="' + s3esc(it.href) + '">' + s3esc(it.label) + '</a>';
      draw += '<li' + (kids ? ' class="s3-draw-group"' : '') + '>' + _pl + subDraw + '</li>';
    });
    inlineMenu.innerHTML = inline;
    inlineMenu.classList.add('s3-measuring');   // hidden until fitMenu has folded with the FINAL (web-font) widths — no fold-flash on page switch
    if (drawerList) drawerList.innerHTML = draw;
    markCurrent();
  }
  /* Highlight the current page: TOP NAV = the section (parent) gets the pill like Home;
     DRAWER = only the exact current leaf. */
  function normPath(p) { p = (p || '').replace(/index\.html$/, ''); if (!/\/$/.test(p)) p += '/'; return p; }
  function markCurrent() {
    var cur;
    try { cur = normPath(decodeURIComponent(location.pathname)); } catch (e) { cur = normPath(location.pathname); }
    if (!cur) return;
    // CLEAR the previous page's marks FIRST. This is exposed as window.SGMarkCurrent and
    // spa-nav.js calls it on EVERY partial navigation, but the nav bar is NOT rebuilt between
    // pages — so an add-only marker leaves each visited item lit and they pile up (Home, then
    // Home+RTI, then Home+RTI+Contact…). Adding without clearing is correct only on a
    // freshly-built nav (first load). The GIGW nav.js markActiveNav() already clears; this
    // S3WaaS twin did not. See BUILD-ERRORS §53.
    [inlineMenu, drawerList].forEach(function (root) {
      if (!root) return;
      root.querySelectorAll('.is-active').forEach(function (el) { el.classList.remove('is-active'); });
      root.querySelectorAll('[aria-current]').forEach(function (el) { el.removeAttribute('aria-current'); });
    });
    // A link is "current" only if its pathname matches AND — for a same-page SECTION ANCHOR
    // (href like "about-us/#vision") — its fragment matches location.hash. Without the hash
    // check every #-anchor child of a section shares that section's pathname, so on the
    // section's own page ALL of them (Vision, Functions, Rights…) light up at once. See
    // BUILD-ERRORS §66.
    function isCurrentLink(a) {
      if ((a.getAttribute('href') || '').charAt(0) === '#') return false; // pure group opener / same-page top
      if (normPath(a.pathname) !== cur) return false;
      if (a.hash && a.hash.length > 1) return a.hash === location.hash;   // section anchor → only when its fragment is current
      return true;
    }
    if (inlineMenu) {
      inlineMenu.querySelectorAll('a[href]').forEach(function (a) {
        if (!isCurrentLink(a)) return;
        a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); // the child inside the dropdown
        var topli = a.closest('.s3-menu>li');
        if (topli) { var head = topli.querySelector(':scope>a,:scope>button'); if (head && head !== a) head.classList.add('is-active'); } // the section parent pill
      });
    }
    if (drawerList) {
      drawerList.querySelectorAll('a[href]').forEach(function (a) {
        if (isCurrentLink(a)) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
      });
    }
  }
  // Re-mark on hash navigation so section-anchor items (About Us › Vision & Mission →
  // about-us/#vision) update their active state as the fragment changes. See BUILD-ERRORS §66.
  window.addEventListener('hashchange', function () { if (typeof markCurrent === 'function') markCurrent(); });
  /* Keep the inline bar to ONE line: overflowing items get .s3-hidden (they
     remain in the drawer) so the bar never wraps to two lines. */
  function fitMenu() {
    if (!inlineMenu || getComputedStyle(inlineMenu).display === 'none') return;
    var lis = inlineMenu.children, i, li;
    for (i = 0; i < lis.length; i++) lis[i].classList.remove('s3-hidden');
    // PINNED items (nav.json "pinned": true — Contact Us) are never folded into the drawer:
    // reserve their width first, then fold only the others. Contact Us is the LAST item, so
    // without this it is the first thing overflow hides — exactly backwards.
    var avail = inlineMenu.clientWidth - 24, used = 0, reserved = 0;   // buffer so the last item never touches the hamburger
    for (i = 0; i < lis.length; i++) if (lis[i].hasAttribute('data-pinned')) reserved += lis[i].offsetWidth + 6;
    for (i = 0; i < lis.length; i++) {
      li = lis[i];
      if (li.hasAttribute('data-pinned')) continue;
      used += li.offsetWidth + 6;
      if (used + reserved > avail && i > 0) li.classList.add('s3-hidden');
    }
  }
  var _navRevealed = false;
  function revealMenu() { fitMenu(); if (_navRevealed) return; _navRevealed = true; if (inlineMenu) inlineMenu.classList.remove('s3-measuring'); }
  function initNav() {
    fitMenu();
    requestAnimationFrame(fitMenu);
    setTimeout(fitMenu, 300);
    window.addEventListener('load', fitMenu);
    window.addEventListener('sg-font-changed', fitMenu);
    // Reveal the inline bar only AFTER the web font settles (final fold, no post-font re-fold flash); 500ms safety.
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(revealMenu); else revealMenu(); } catch (e) { revealMenu(); }
    setTimeout(revealMenu, 500);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitMenu, 150); });
    /* Dropdowns — hover + click toggle, opening one closes others, click-closed
       suppresses hover until pointer leaves, outside-click / Esc closes (= GIGW). */
    var parents = Array.prototype.filter.call(inlineMenu.children, function (li) { return li.querySelector('.s3-sub'); });
    function closeAll() { parents.forEach(function (p) { p.classList.remove('open'); }); }
    // Do NOT close on mouseleave: a CLICK-opened dropdown must stay open while you move the
    // pointer down to select an item (the absolute .s3-sub + the button margin leave a small
    // gap that mouseleave used to fire across, closing it instantly). Hover open/close is pure
    // CSS (:hover); click/keyboard .open is closed by outside-click + Esc (below).
    // TAP/CLICK the parent button toggles its dropdown — ESSENTIAL on TOUCH tablets/phones (no
    // hover pointer, so CSS :hover never fires). Works on desktop click too. Opening one closes others.
    parents.forEach(function (li) {
      var head = li.firstElementChild;
      if (!head || head.tagName !== 'BUTTON') return;
      head.addEventListener('click', function (e) {
        e.preventDefault();
        var wasOpen = li.classList.contains('open');
        closeAll();
        if (!wasOpen) { li.classList.add('open'); li.classList.remove('click-closed'); head.setAttribute('aria-expanded', 'true'); }
        else { li.classList.add('click-closed'); head.setAttribute('aria-expanded', 'false'); }   // click-closed suppresses the :focus-within reopen while the button keeps focus
      });
      // pointer leaving the item clears the click-closed guard so hover/focus can open it again
      li.addEventListener('mouseleave', function () { li.classList.remove('click-closed'); });
    });
    // 3rd-tier flyout parent (.s3-subgroup > a) — TAP opens the flyout, never navigates (on tablet a
    // tap used to open the flyout AND follow the link). preventDefault + toggle .open; hover still works.
    /* The flyout opens level with the row you are pointing at, which is what makes the menu
       readable — but a row near the bottom of a long dropdown would then start the panel near
       the bottom of the screen and run straight off it. CSS cannot fix that: the height budget
       depends on where the row happens to be, which is only known at open time. So measure.
       Prefer keeping it level with the row; only when it will not fit, slide it up by the
       overflow (never above the dropdown itself) and cap what is left with a scrollbar.
       See BUILD-ERRORS §137. */
    function fitFlyout(sg) {
      var fly = sg.querySelector('.s3-subsub');
      if (!fly) return;
      fly.style.maxHeight = ''; fly.style.top = '';            // measure unconstrained
      if (getComputedStyle(fly).position === 'static') return; // narrow layout: it is inline
      var GAP = 12, TOP_ALIGN = -9;
      var row = sg.getBoundingClientRect(), vh = window.innerHeight;
      var natural = fly.scrollHeight;
      var top = TOP_ALIGN, avail = vh - (row.top + top) - GAP;
      if (natural > avail) {
        var ceiling = sg.closest('.s3-sub').getBoundingClientRect().top;
        var shift = Math.max(0, Math.min(row.top - ceiling, natural - avail));
        top -= shift; avail += shift;
        fly.style.maxHeight = Math.max(160, Math.min(natural, avail)) + 'px';
      }
      fly.style.top = top + 'px';
    }
    inlineMenu.querySelectorAll('.s3-subgroup').forEach(function (sg) {
      sg.addEventListener('mouseenter', function () { fitFlyout(sg); });
      sg.addEventListener('focusin', function () { fitFlyout(sg); });
    });
    window.addEventListener('resize', function () {
      inlineMenu.querySelectorAll('.s3-subgroup').forEach(function (sg) {
        if (sg.matches(':hover, .open') || sg.contains(document.activeElement)) fitFlyout(sg);
      });
    });

    inlineMenu.querySelectorAll('.s3-subgroup > a').forEach(function (sa) {
      sa.addEventListener('click', function (e) {
        e.preventDefault();
        var sg = sa.parentNode, wasOpen = sg.classList.contains('open');
        var box = sg.closest('.s3-sub');
        if (box) Array.prototype.forEach.call(box.querySelectorAll('.s3-subgroup.open'), function (o) { if (o !== sg) o.classList.remove('open'); });
        sg.classList.toggle('open', !wasOpen);
        sa.setAttribute('aria-expanded', !wasOpen ? 'true' : 'false');
        if (!wasOpen) fitFlyout(sg);
      });
    });
    // Keyboard nav — mirrors the GIGW .mainnav model (one delegated handler).
    // Clicking a real LEAF LINK inside the dropdown/flyout CLOSES the menu — otherwise it stays open
    // over the freshly-loaded page (spa-nav swaps <main> but never touches the nav). Parent <button>s
    // and the flyout opener (href="#") are skipped by the href test.
    inlineMenu.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || !inlineMenu.contains(a)) return;
      var href = a.getAttribute('href') || '';
      if (!href || href.charAt(0) === '#') return;
      closeAll();
      // .click-closed forces display:none even under :hover / :focus-within — else the still-hovered
      // dropdown stays open after navigating. Cleared on mouseleave, so hover works again after.
      var li = a.closest('.s3-menu > li'); if (li) li.classList.add('click-closed');
      Array.prototype.forEach.call(inlineMenu.querySelectorAll('.s3-subgroup.open'), function (o) { o.classList.remove('open'); });
      if (document.activeElement && document.activeElement.blur) { try { document.activeElement.blur(); } catch (x) {} }
    });
    function topItems() { return Array.prototype.map.call(inlineMenu.children, function (li) { return li.firstElementChild; }).filter(function (a) { return a && (a.tagName === 'A' || a.tagName === 'BUTTON'); }); }
    function focusTop(dir) {
      var tops = topItems(), cur = document.activeElement;
      var topLi = cur && cur.closest ? cur.closest('.s3-menu > li') : null;
      var i = topLi ? tops.indexOf(topLi.firstElementChild) : -1;
      if (i < 0) i = 0; else i = (i + dir + tops.length) % tops.length;
      closeAll();   // arrowing between top items CLOSES the previously-open dropdown
      if (tops[i]) { var _nli = tops[i].closest('.s3-menu > li'); if (_nli) _nli.classList.remove('click-closed'); tops[i].focus(); }   // let the new item open on :focus-within
    }
    inlineMenu.addEventListener('keydown', function (e) {
      var t = document.activeElement;
      var topLi = t && t.closest ? t.closest('.s3-menu > li') : null;
      var parent = topLi && topLi.querySelector('.s3-sub') ? topLi : null;
      var a = parent ? parent.firstElementChild : null;
      var inSub = !!(t && t.closest && t.closest('.s3-sub'));
      var items = parent ? Array.prototype.slice.call(parent.querySelectorAll('.s3-sub a[href]')) : [];
      var idx = items.indexOf(t);
      function open() { if (parent) { closeAll(); parent.classList.remove('click-closed'); parent.classList.add('open'); if (a) a.setAttribute('aria-expanded', 'true'); } }
      function close() { if (parent) { parent.classList.remove('open'); parent.classList.add('click-closed'); if (a) a.setAttribute('aria-expanded', 'false'); } }
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'Spacebar':
          // toggle; focus stays on the button so a second Enter closes (ArrowDown steps in)
          if (parent && !inSub) { e.preventDefault(); if (parent.classList.contains('open')) close(); else open(); }
          break;
        case 'ArrowRight': if (!inSub) { e.preventDefault(); focusTop(1); } break;
        case 'ArrowLeft': if (!inSub) { e.preventDefault(); focusTop(-1); } break;
        case 'ArrowDown': if (parent) { e.preventDefault(); open(); if (idx < 0) { if (items[0]) items[0].focus(); } else { (items[idx + 1] || items[0]).focus(); } } break;
        case 'ArrowUp': if (parent && inSub) { e.preventDefault(); if (idx <= 0) a.focus(); else items[idx - 1].focus(); } break;
        case 'Home': if (parent && items.length) { e.preventDefault(); open(); items[0].focus(); } break;
        case 'End': if (parent && items.length) { e.preventDefault(); open(); items[items.length - 1].focus(); } break;
        case 'Escape': if (parent) { e.preventDefault(); close(); if (a) a.focus(); } break;
      }
    });
    inlineMenu.addEventListener('focusout', function (e) { if (!inlineMenu.contains(e.relatedTarget)) { closeAll(); } });   // do NOT strip .click-closed here: a leaf click blurs into <main> (spa-nav), firing focusout, which would re-open the just-navigated dropdown under the still-hovering pointer. mouseleave / keyboard-open clear click-closed instead.
    if (parents.length) {
      document.addEventListener('click', function (e) { if (!inlineMenu.contains(e.target)) closeAll(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    }
  }
  // per-theme base: a self-contained S3WaaS site declares <html data-s3-base="/resources/s3waas/blue">
  // so its nav + home load from <base>/data/s3waas/ (its OWN menu/content). Default '' = shared.
  function s3Base() { return (document.documentElement.getAttribute('data-s3-base') || '').replace(/\/+$/, ''); }
  if (inlineMenu) {
    fetch((s3Base() || '/resources') + '/data/s3waas/nav.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) { buildNav((d && d.items) || []); initNav(); })
      .catch(function () { initNav(); });
  }
  if (navToggle && drawer) {
    navToggle.addEventListener('click', function () {
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-s3-drawer-close]'), function (b) {
      b.addEventListener('click', closeDrawer);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-s3-open-drawer]'), function (b) {
      b.addEventListener('click', openDrawer);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
    });
  }
  window.SGMarkCurrent = markCurrent;   // expose for the boot IIFE / spa-nav.js active-nav refresh
})();

/* ============================================================================
   4. Homepage builder (from home.json) + content widgets.
      If a [data-s3-home] root exists, build all sections then init widgets;
      otherwise init widgets on whatever static markup the page already has.
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- section builders (return HTML strings) ---------- */
  function buildHero(slides, defaults) {
    if (!slides || !slides.length) return '';
    var n = slides.length;
    var dft = defaults || {};   // heroDefaults from home.json: fill in when a slide omits a key
    var s = slides.map(function (sl, i) {
      // Per-slide image controls from home.json: fit ('cover'|'contain'|'fill'|'scale-down'),
      // position (object-position focal point, e.g. 'center top' / '50% 20%').
      // Empty on a slide -> fall back to heroDefaults; still empty -> auto aspect detector.
      var _fit = sl.fit || dft.fit;
      var _pos = sl.position || dft.position;
      var _st = [];
      if (_fit) _st.push('object-fit:' + _fit);
      if (_pos) _st.push('object-position:' + _pos);
      var _imgStyle = _st.length ? ' style="' + s3esc(_st.join(';')) + '"' : '';
      var _fitFixed = _fit ? ' data-fit="fixed"' : '';   // explicit/default fit -> auto aspect detector skips it
      return '<div class="s3-slide' + (i === 0 ? ' is-active' : '') + '" role="group" aria-roledescription="slide" aria-label="Slide ' + (i + 1) + ' of ' + n + '">'
        + '<img src="' + s3esc(sl.img) + '" alt="' + s3esc(sl.alt) + '"' + (i === 0 ? ' fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"') + _imgStyle + _fitFixed + '>'
        // No title and no text -> NO caption element: its gradient scrim would otherwise
        // paint a band across the bottom of every slide for content that does not exist.
        + ((sl.title || sl.text)
            ? '<div class="s3-hero-caption">' + (sl.title ? '<h2>' + s3esc(sl.title) + '</h2>' : '')
              + (sl.text ? '<p>' + s3esc(sl.text) + '</p>' : '') + '</div>'
            : '') + '</div>';
    }).join('');
    return '<section class="s3-hero" data-s3-slider aria-roledescription="carousel" aria-label="Highlights">'
      + '<div class="s3-slides">' + s + '</div>'
      + '<div class="s3-hero-ctrls">'
      + '<button type="button" class="s3-hero-arrow" data-s3-prev aria-label="Previous slide"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
      + '<button type="button" class="s3-hero-pause" data-s3-pause aria-pressed="false" aria-label="Pause slideshow"><i class="fa-solid fa-pause" aria-hidden="true"></i></button>'
      + '<button type="button" class="s3-hero-arrow" data-s3-next aria-label="Next slide"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>'
      + '</div></section>';
  }
  function buildLatest(ln) {
    if (!ln || !ln.items || !ln.items.length) return '';
    var li = ln.items.map(function (it) {
      return '<li><a href="' + s3esc(it.href) + '">' + s3esc(it.label) + (it.isNew ? ' <span class="s3-new">New</span>' : '') + '</a></li>';
    }).join('');
    return '<div class="s3-latest" data-s3-ticker><div class="container">'
      + '<span class="s3-latest-badge">' + s3esc(ln.badge || 'Latest News') + '</span>'
      + '<div class="s3-latest-row">'
      + '<div class="s3-latest-viewport"><ul class="s3-latest-track">' + li + '</ul></div>'
      + '<button type="button" class="s3-latest-pause" data-s3-tpause aria-pressed="false" aria-label="Pause the latest news"><i class="fa-solid fa-pause" aria-hidden="true"></i></button>'
      + '</div>'
      + '</div></div>';
  }
  function vmItem(it) {
    return '<li><a href="' + s3esc(it.href) + '">' + s3esc(it.label) + (it.isNew ? ' <span class="s3-new">New</span>' : '') + (it.meta ? ' <span class="s3-meta">(' + s3esc(it.meta) + ')</span>' : '') + '</a></li>';
  }
  // Style a JSON-defined button FROM DATA — so ANY button can change its COLOUR
  // and pick up EXTRA classes without touching code. Reads from the button's own
  // config object (the same object that carries `label`/`href`):
  //   variant : "primary" (default) -> solid brand fill + white  (.s3-btn)
  //             "accent"/"secondary" -> darker brand fill          (.s3-btn accent)
  //             "ghost"/"white"/"outline" -> white/outline button  (.s3-btn ghost)
  //   class / classes : extra class name(s) appended verbatim — a string
  //             ("s3-btn-block") OR an array (["s3-btn-block","s3-btn-lg"]).
  // Pass `fallbackVariant` for buttons whose natural default isn't primary
  // (e.g. 'ghost'). Guidance: primary on light sections; ghost over a dark band.
  function s3btnClass(cfg, fallbackVariant) {
    cfg = cfg || {};
    var base;
    switch (String(cfg.variant || fallbackVariant || '').toLowerCase()) {
      case 'accent':
      case 'secondary': base = 's3-btn accent'; break;
      case 'ghost':
      case 'white':
      case 'outline':   base = 's3-btn ghost'; break;
      default:          base = 's3-btn';
    }
        // JSON-driven colour: "color":"accent"|"orange"|"blue"|"green"|"red"|"teal"|"maroon"|"purple"
    var col = String(cfg.color || cfg.colour || '').toLowerCase().replace(/[^a-z-]/g, '');
    if (col) base += ' s3-btn--' + col;
    var extra = cfg['class'] || cfg.classes || '';
    if (Array.isArray(extra)) extra = extra.join(' ');
    extra = String(extra).trim();
    return extra ? base + ' ' + s3esc(extra) : base;
  }
  function buildAboutTabs(about, tabs) {
    about = about || {};
    // EMPTY SECTIONS DO NOT RENDER. A tab whose list is empty is an empty box, so it is
    // dropped; if there is neither about text nor a single populated tab, the whole
    // section is skipped — never a heading with nothing under it.
    tabs = (tabs || []).filter(function (t) { return t && (t.items || []).length; });
    var paras = (about.paragraphs || []).map(function (p) { return '<p>' + s3rich(p) + '</p>'; }).join('');
    var rm = about.readMore && s3hasUrl(about.readMore.href) ? '<p><a class="' + s3btnClass(about.readMore) + '" href="' + s3esc(about.readMore.href) + '">' + s3esc(about.readMore.label || 'Read More') + '</a></p>' : '';
    var radios = tabs.map(function (t, i) { return '<input type="radio" name="s3tab" id="s3tab' + (i + 1) + '"' + (i === 0 ? ' checked' : '') + '>'; }).join('');
    var labels = tabs.map(function (t, i) { return '<label for="s3tab' + (i + 1) + '">' + s3esc(t.label) + '</label>'; }).join('');
    var panels = tabs.map(function (t) {
      return '<div class="s3-tabpanel"><div class="s3-vmarquee" data-s3-vmarquee>'
        + '<div class="s3-vm-viewport"><ul class="s3-vm-track">' + (t.items || []).map(vmItem).join('') + '</ul></div>'
        + '<div class="s3-vm-ctrls"><button type="button" class="s3-vm-pause" data-s3-vmpause aria-pressed="false" aria-label="Pause"><i class="fa-solid fa-pause" aria-hidden="true"></i></button></div>'
        + '</div></div>';
    }).join('');
    if (!paras && !rm && !tabs.length) return '';
    var aboutCol = (paras || rm)
      ? '<div><h2 class="s3-h">' + s3esc(about.title || 'About') + '</h2>' + paras + rm + '</div>' : '';
    var tabsCol = tabs.length
      ? '<div class="s3-tabs">' + radios + '<div class="s3-tablabels">' + labels + '</div>'
        + '<div class="s3-tabwrap">' + panels + '</div></div>' : '';
    // two columns only when there ARE two; a lone column takes the full width
    var grid = (aboutCol && tabsCol) ? ' class="s3-two"' : '';
    return '<section class="s3-section"><div class="container"><div' + grid + '>'
      + aboutCol + tabsCol + '</div></div></section>';
  }
  function buildExplore(ex) {
    if (!ex || !ex.tiles || !ex.tiles.length) return '';
    // On the HOME, show exactly 4 = ONE FULL ROW of the g4 grid, so there is never a ragged
    // half-row; "View All" carries the visitor to the listing page, which renders every tile.
    // Same headRow treatment as the gallery, so the two sections read as a pair.
    var t = ex.tiles.slice(0, 4).map(function (x) {
      return '<article class="s3-tile"><span class="s3-tile-ico" aria-hidden="true"><i class="' + s3esc(x.icon) + '"></i></span>'
        + '<h3>' + s3esc(x.title) + '</h3><p>' + s3rich(x.text) + '</p>'
        + '<a class="s3-readmore" href="' + s3esc(x.href || '#') + '">Read more</a></article>';
    }).join('');
    return '<section class="s3-section alt"><div class="container">' + headRow(ex.title || 'Explore', ex.viewAll)
      + '<div class="s3-grid s3-g4">' + t + '</div></div></section>';
  }
  function buildOfficials(off) {
    if (!off || !off.people || !off.people.length) return '';
    var p = off.people.map(function (per) {
      var social = (per.social || []).filter(function (s) { return s3hasUrl(s.href); }).map(function (s) {
        return '<a href="' + s3esc(s.href) + '" aria-label="' + s3esc(s.label) + '"><i class="' + s3esc(s.icon) + '" aria-hidden="true"></i></a>';
      }).join('');
      var socialP = social ? '<p class="s3-social">' + social + '</p>' : '';
      var actions = '';
      if (per.profile && s3hasUrl(per.profile.href)) actions += '<a class="' + s3btnClass(per.profile, 'ghost') + '" href="' + s3esc(per.profile.href) + '">' + s3esc(per.profile.label || 'Profile') + '</a> ';
      if (per.contact && s3hasUrl(per.contact.href)) actions += '<a class="' + s3btnClass(per.contact) + '" href="' + s3esc(per.contact.href) + '">' + s3esc(per.contact.label || 'Contact') + '</a>';
      var actionsP = actions ? '<p class="s3-official-actions">' + actions + '</p>' : '';
      return '<article class="s3-official"><img src="' + s3esc(per.photo) + '" alt="Photograph of ' + s3esc(per.name) + '" loading="lazy" decoding="async"><div>'
        + '<h3>' + s3esc(per.name) + '</h3><p class="s3-role">' + s3esc(per.role) + '</p>' + socialP + actionsP + '</div></article>';
    }).join('');
    return '<section class="s3-section"><div class="container"><h2 class="s3-h">' + s3esc(off.title || 'Key Officials') + '</h2>'
      + '<div class="s3-grid s3-g2">' + p + '</div></div></section>';
  }
  function headRow(title, viewAll) {
    var va = viewAll && s3hasUrl(viewAll.href) ? '<a class="s3-viewall" href="' + s3esc(viewAll.href) + '">' + s3esc(viewAll.label || 'View All') + '</a>' : '';
    return '<div class="s3-h-row"><h2 class="s3-h">' + s3esc(title) + '</h2>' + va + '</div>';
  }
  function buildGallery(g) {
    if (!g || !g.images || !g.images.length) return '';
    var imgs = g.images.slice(0, 6).map(function (im) {
      return '<a href="' + s3esc(im.src) + '"><img src="' + s3esc(im.src) + '" alt="' + s3esc(im.alt) + '" loading="lazy"></a>';
    }).join('');
    return '<section class="s3-section alt" id="s3-gallery"><div class="container">' + headRow(g.title || 'Photo Gallery', g.viewAll)
      + '<div class="s3-gallery">' + imgs + '</div></div></section>';
  }
  function buildEvents(ev) {
    if (!ev || !ev.items || !ev.items.length) return '';
    var it = ev.items.map(function (e) {
      return '<article class="s3-event"><img src="' + s3esc(e.img) + '" alt="' + s3esc(e.title) + '" loading="lazy" decoding="async"><div class="s3-event-body">'
        + '<span class="s3-date">' + s3esc(e.date) + '</span><h3><a href="' + s3esc(e.href || '#') + '">' + s3esc(e.title) + '</a></h3>'
        + '<p>' + s3esc(e.text) + '</p></div></article>';
    }).join('');
    return '<section class="s3-section"><div class="container">' + headRow(ev.title || 'Events', ev.viewAll)
      + '<div class="s3-grid s3-g2">' + it + '</div></div></section>';
  }
  function buildDivisions(dv) {
    if (!dv || !dv.items || !dv.items.length) return '';
    var li = dv.items.map(function (x) {
      return '<li><a href="' + s3esc(x.href || '#') + '"><i class="' + s3esc(x.icon) + '" aria-hidden="true"></i> ' + s3esc(x.label) + '</a></li>';
    }).join('');
    return '<section class="s3-section alt"><div class="container">' + headRow(dv.title || 'Divisions', dv.viewAll)
      + '<ul class="s3-links">' + li + '</ul></div></section>';
  }
  function buildImpLinks(il) {
    if (!il || !il.groups || !il.groups.length) return '';
    var g = il.groups.map(function (grp) {
      var links = (grp.links || []).map(function (l) {
        return '<li><a href="' + s3esc(l.href || '#') + '" target="_blank" rel="noopener noreferrer">' + s3esc(l.label) + '</a></li>';
      }).join('');
      return '<details><summary>' + s3esc(grp.label) + '</summary><div class="s3-imp-body"><ul>' + links + '</ul></div></details>';
    }).join('');
    return '<section class="s3-section"><div class="container"><h2 class="s3-h">' + s3esc(il.title || 'Important Links') + '</h2>'
      + '<div class="s3-imp">' + g + '</div></div></section>';
  }
  function buildPortals(pt) {
    if (!pt || !pt.items || !pt.items.length) return '';
    var li = pt.items.map(function (x) {
      return '<li><a href="' + s3esc(x.href || '#') + '" target="_blank" rel="noopener noreferrer">' + s3esc(x.label) + '</a></li>';
    }).join('');
    return '<section class="s3-logos" data-s3-logos aria-label="Government partner portals"><div class="container">'
      + '<h2 class="s3-logos-title">' + s3esc(pt.title || 'Related Government Portals') + '</h2>'
      + '<div class="s3-logos-row">'
      + '<button type="button" class="s3-logos-pause" data-s3-logos-pause aria-pressed="false" aria-label="Pause logo scroll"><i class="fa-solid fa-pause" aria-hidden="true"></i></button>'
      + '<div class="s3-logos-viewport"><ul class="s3-logos-track">' + li + '</ul></div>'
      + '</div></div></section>';
  }
  /* Section registry: key -> builder. Lets a page choose its OWN section order
     via data-s3-layout, so the 12 theme templates differ in LAYOUT, not just colour. */
  function sectionRegistry(data) {
    return {
      hero: buildHero(data.hero, data.heroDefaults),
      latest: buildLatest(data.latestNews),
      about: buildAboutTabs(data.about, data.tabs),
      explore: buildExplore(data.explore),
      officials: buildOfficials(data.officials),
      gallery: buildGallery(data.gallery),
      events: buildEvents(data.events),
      divisions: buildDivisions(data.divisions),
      important: buildImpLinks(data.importantLinks),
      portals: buildPortals(data.portals)
    };
  }
  /* ---------- DISTINCT layout components (modelled on the real s3waas.gov.in
     Government-Department templates) — these give each family its OWN UI, not
     just a recolour: service-tile row, support-helpline band, tourism icon band,
     meet-the-minister split, 3-column activities, circular-collage + know-your-CM. */
  /* CUSTOM LINE ICONS for the service/scheme tiles. FontAwesome's solid glyphs sit heavy in a
     60px circle, and several schemes have no sensible glyph in the free set at all (a
     marriage-incentive scheme, a mobile therapy van). Each is light line work —
     fill:none, stroke:currentColor at a 1.35 hairline — so it inherits the tile's own colour and
     follows dark mode with no second palette and no per-theme rule to forget. Set a tile's icon
     to "svg:<name>" to use one; any other value is still treated as a FontAwesome class. */
  var SVG_ICONS = {
    'stipend': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14z"/><path class="ln" d="M9.7 9.5h4.6M9.7 11.6h4.6M9.7 9.5c2.8 0 3.3 2.1 0 2.1M10.7 11.6l3.3 3.1"/></svg>',
    'scholarship': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M12 4.6 21.4 9 12 13.4 2.6 9z"/><path class="ln" d="M6.8 11v4.4c0 1.7 2.3 2.9 5.2 2.9s5.2-1.2 5.2-2.9V11"/><path class="ln" d="M21.4 9v5.2"/></svg>',
    'bandhan': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M8.9 8.8a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8z"/><path class="ln" d="M15.1 8.8a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8z"/><path class="ln" d="M8.9 8.8V5.2M15.1 8.8V5.2M7.1 5.2h3.6M13.3 5.2h3.6"/></svg>',
    'high-support': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M12 19.6 5.7 13.3a4.2 4.2 0 0 1 5.9-5.9l.4.4.4-.4a4.2 4.2 0 0 1 5.9 5.9L12 19.6z"/></svg>',
    'rath': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M3 15.6V8c0-.8.6-1.4 1.4-1.4h8.2c.8 0 1.4.6 1.4 1.4v7.6"/><path class="ln" d="M14 9.9h2.7c.6 0 1.1.3 1.5.8l2 2.9c.2.3.3.6.3.9v1.1"/><path class="ln" d="M3 15.6h1.6M9.4 15.6h4.8M19.4 15.6h1.6"/><path class="ln" d="M7 13.3a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z"/><path class="ln" d="M17 13.3a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z"/><path class="ln" d="M8.5 8.9v2.9M7.1 10.4h2.9"/></svg>',
    'kaushal': '<svg class="s3-ico" viewBox="0 0 24 24" width="33" height="33" aria-hidden="true" focusable="false"><path class="ln" d="M20.4 5.6a4.9 4.9 0 0 1-6.4 6.4l-7.7 7.7a2.3 2.3 0 0 1-3.3-3.3l7.7-7.7a4.9 4.9 0 0 1 6.4-6.4l-3 3 1 3.3 3.3 1 2-3.3z"/></svg>'
  };
  function tileIcon(icon) {
    var m = /^svg:(.+)$/.exec(icon || '');
    if (m && SVG_ICONS[m[1]]) return SVG_ICONS[m[1]];
    return '<i class="' + s3esc(icon) + '" aria-hidden="true"></i>';
  }
  function buildServiceTiles(ex) {
    if (!ex || !ex.tiles || !ex.tiles.length) return '';
    // On the HOME, show exactly 4 = ONE FULL ROW of .s3-svc-row (a 4-column grid), so there is
    // never a ragged half-row; "View All" carries the visitor to the listing page, which renders
    // every tile. Same headRow treatment as the gallery, so the sections read as a set.
    var t = ex.tiles.slice(0, 4).map(function (x) {
      return '<article class="s3-svc"><span class="s3-svc-ico">' + tileIcon(x.icon) + '</span>'
        + '<h3>' + s3esc(x.title) + '</h3><p>' + s3rich(x.text) + '</p>'
        + '<a class="' + s3btnClass(x, 'ghost') + '" href="' + s3esc(x.href || '#') + '">Read More</a></article>';
    }).join('');
    return '<section class="s3-section alt"><div class="container">' + headRow(ex.title || 'Our Services', ex.viewAll)
      + '<div class="s3-svc-row">' + t + '</div></div></section>';
  }
  function buildHelpline(hl) {
    var items = (hl && hl.items) || [];
    if (!items.length) return '';
    var c = items.map(function (h) { return '<div class="s3-help-item"><span class="s3-help-num">' + s3esc(h.num) + '</span><span class="s3-help-lbl">' + s3esc(h.label) + '</span></div>'; }).join('');
    return '<section class="s3-section"><div class="container"><h2 class="s3-h">' + s3esc(hl.title || 'Support Helpline') + '</h2><div class="s3-help-band"><div class="s3-help-row">' + c + '</div></div></div></section>';
  }
  /* edge-to-edge variant: full-bleed dark band, title OUTSIDE (above) it. */
  function buildHelplineFull(hl) {
    var items = (hl && hl.items) || [];
    if (!items.length) return '';
    var c = items.map(function (h) { return '<div class="s3-help-item"><span class="s3-help-num">' + s3esc(h.num) + '</span><span class="s3-help-lbl">' + s3esc(h.label) + '</span></div>'; }).join('');
    return '<section class="s3-section"><div class="container"><h2 class="s3-h">' + s3esc(hl.title || 'Support Helpline') + '</h2></div>'
      + '<div class="s3-help-full"><div class="container"><div class="s3-help-row">' + c + '</div></div></div></section>';
  }
  function buildTourismBand(dv) {
    var items = (dv && dv.items) || [];
    if (!items.length) return '';
    var c = items.slice(0, 5).map(function (x) {
      return '<a class="s3-tour-ico" href="' + s3esc(x.href || '#') + '"><span class="s3-tour-badge"><i class="' + s3esc(x.icon || 'fa-solid fa-star') + '" aria-hidden="true"></i></span><span>' + s3esc(x.label) + '</span></a>';
    }).join('');
    return '<section class="s3-tourism"><div class="container"><h2 class="s3-tourism-h">Tourism</h2><div class="s3-tour-row">' + c + '</div></div></section>';
  }
  function buildMinisterSplit(off, about) {
    if (!off || !off.people || !off.people.length) return '';
    var p = off.people[0];
    var photo = p.photo ? '<img src="' + s3esc(p.photo) + '" alt="Photograph of ' + s3esc(p.name) + '" loading="lazy" decoding="async">' : '';
    var paras = ((about && about.paragraphs) || []).slice(0, 2).map(function (x) { return '<p>' + s3esc(x) + '</p>'; }).join('');
    return '<section class="s3-section"><div class="container"><div class="s3-minister">'
      + '<div class="s3-minister-card">' + photo + '<div class="s3-minister-meta"><h3>' + s3esc(p.name) + '</h3><p class="s3-role">' + s3esc(p.role) + '</p>'
      + (p.profile && s3hasUrl(p.profile.href) ? '<a class="' + s3btnClass(p.profile) + '" href="' + s3esc(p.profile.href) + '">' + s3esc(p.profile.label || 'Profile') + '</a>' : '') + '</div></div>'
      + '<h2 class="s3-h s3-minister-title">Meet the Minister</h2>'
      + '<div class="s3-minister-about">' + paras + '</div></div></div></section>';
  }
  function s3col(title, items, icon) {
    var li = (items || []).slice(0, 5).map(function (x) { return '<li><a href="' + s3esc(x.href || '#') + '">' + s3esc(x.label) + '</a></li>'; }).join('');
    return '<div class="s3-acol"><h3><i class="' + icon + '" aria-hidden="true"></i> ' + title + '</h3><ul>' + li + '</ul></div>';
  }
  function buildActivities3(ev, ex, dv) {
    var a = ((ev && ev.items) || []).map(function (e) { return { label: e.title, href: e.href }; });
    var pr = ((ex && ex.tiles) || []).map(function (t) { return { label: t.title, href: t.href }; });
    var tr = ((dv && dv.items) || []);
    if (!a.length && !pr.length && !tr.length) return '';
    return '<section class="s3-section alt"><div class="container"><div class="s3-acols">'
      + (a.length ? s3col('Activities', a, 'fa-solid fa-calendar-check') : '')
      + (pr.length ? s3col('Projects & Initiatives', pr, 'fa-solid fa-diagram-project') : '')
      + (tr.length ? s3col('Training', tr, 'fa-solid fa-chalkboard-user') : '')
      + '</div></div></section>';
  }
  function buildCircularFeature(g) {
    if (!g || !g.images || !g.images.length) return '';
        var imgs = g.images.slice(0, 4).map(function (im, i) {
      return '<span class="s3-circ-item"><span class="s3-circ-title">' + s3esc(im.title || im.alt || '') + '</span>'
        + '<a class="s3-circ" href="' + s3base() + '/media/#s3-gallery" aria-label="View ' + s3esc(im.alt || 'gallery') + ' photos"><img src="' + s3esc(im.src) + '" alt="' + s3esc(im.alt) + '"></a></span>';
    }).join('');
    return '<section class="s3-section"><div class="container"><div class="s3-circwrap"><div class="s3-circ-stage">' + imgs + '</div>'
      + '<div class="s3-circ-text"><h2 class="s3-h">' + s3esc(g.title || 'Photo Gallery') + '</h2><p>A glimpse of our activities, events and citizen services delivered across the department. Explore the albums below.</p>'
      + '<p class="s3-circ-cta"><a class="s3-btn" href="' + s3base() + '/media/#s3-gallery">View Gallery</a></p></div></div></div></section>';
  }
  function buildKnowCM(off) {
    if (!off || !off.people || !off.people.length) return '';
    var labels = ['Know Your CM', 'Deputy CM'];
    var p = off.people.slice(0, 2).map(function (per, i) {
      var link = per.profile && s3hasUrl(per.profile.href)
        ? '<a class="s3-cm-link" href="' + s3esc(per.profile.href) + '">View Profile <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' : '';
      return '<article class="s3-cm"><img src="' + s3esc(per.photo) + '" alt="Photograph of ' + s3esc(per.name) + '" loading="lazy" decoding="async"><div class="s3-cm-meta"><span class="s3-cm-tag">' + labels[i] + '</span><h3>' + s3esc(per.name) + '</h3><p class="s3-role">' + s3esc(per.role) + '</p>' + link + '</div></article>';
    }).join('');
    return '<section class="s3-section alt"><div class="container"><div class="s3-cmrow">' + p + '</div></div></section>';
  }
  /* Album-style GRID of recent albums (4 cards: thumb + title + link). */
  function buildAlbumGrid(g) {
    if (!g || !g.images || !g.images.length) return '';
        var cards = g.images.slice(0, 4).map(function (im, i) {
      return '<a class="s3-album-card" href="' + s3base() + '/media/#s3-gallery"><span class="s3-album-thumb"><img src="' + s3esc(im.src) + '" alt="' + s3esc(im.alt) + '" loading="lazy"></span>'
        + '<span class="s3-album-name">' + s3esc(im.title || im.alt || '') + '</span><span class="s3-album-go">View album <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>';
    }).join('');
    return '<section class="s3-section"><div class="container">' + headRow('Photo Albums', g.viewAll) + '<div class="s3-album-grid">' + cards + '</div></div></section>';
  }
  /* album CAROUSEL: same album cards in a horizontal scroller with prev/next arrows. */
  function buildAlbumCarousel(g) {
    if (!g || !g.images || !g.images.length) return '';
        var cards = g.images.slice(0, 6).map(function (im, i) {
      return '<a class="s3-album-card" href="' + s3base() + '/media/#s3-gallery"><span class="s3-album-thumb"><img src="' + s3esc(im.src) + '" alt="' + s3esc(im.alt) + '" loading="lazy"></span>'
        + '<span class="s3-album-name">' + s3esc(im.title || im.alt || '') + '</span><span class="s3-album-go">View album <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span></a>';
    }).join('');
    return '<section class="s3-section"><div class="container">' + headRow('Photo Albums', g.viewAll)
      + '<div class="s3-carousel" data-s3-carousel>'
      + '<button type="button" class="s3-carousel-nav s3-carousel-prev" aria-label="Previous albums"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
      + '<div class="s3-carousel-track">' + cards + '</div>'
      + '<button type="button" class="s3-carousel-nav s3-carousel-next" aria-label="Next albums"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>'
      + '</div></div></section>';
  }
  /* stat-counter band — DATA-DRIVEN (data/home/stats.json). It carried invented figures
     (1240 beneficiaries / 86 schemes / 32 offices / 12 districts) that no client ever sent
     and could not correct: a section must render its data or nothing at all. */
  function buildStats(st) {
    var items = (st && st.items) || [];
    if (!items.length) return '';
    // Render the REAL figure, not 0. The count-up starts from 0 when the band scrolls into
    // view — but if that never runs (no IntersectionObserver, reduced motion, band already
    // on screen, a JS error) the page must still show the number, never "0".
    var c = items.map(function (x) { return '<div class="s3-stat"><span class="num" data-count="' + s3esc(x.num) + '">' + s3esc(x.num) + '</span><span class="s3-stat-lbl">' + s3esc(x.label) + '</span></div>'; }).join('');
    return '<section class="s3-section alt"><div class="container"><h2 class="s3-h">' + s3esc(st.title || 'By the Numbers') + '</h2><div class="s3-stats">' + c + '</div></div></section>';
  }
  /* PER-THEME layouts — every one of the 12 themes is a STRUCTURALLY DIFFERENT page
     (distinct mix + order of distinctive sections), not a recolour of a shared
     family. All keep hero -> latest -> about on top and portals last; the body
     between is unique to each theme (keyed by data-s3-layout = theme name). */
  var S3_FAMILIES = {
    blue:    function (d, r) { return r.hero + r.latest + r.about + buildServiceTiles(d.explore) + r.officials + buildStats(d.stats) + buildAlbumGrid(d.gallery) + r.important + r.portals; },
    emerald: function (d, r) { return r.hero + r.latest + r.about + buildServiceTiles(d.explore) + buildTourismBand(d.divisions) + buildAlbumGrid(d.gallery) + r.gallery + r.events + r.portals; },
    maroon:  function (d, r) { return r.hero + r.latest + r.about + buildMinisterSplit(d.officials, d.about) + r.explore + r.events + buildAlbumGrid(d.gallery) + r.gallery + r.important + r.portals; },
    teal:    function (d, r) { return r.hero + r.latest + r.about + buildActivities3(d.events, d.explore, d.divisions) + r.officials + buildAlbumCarousel(d.gallery) + r.important + r.portals; },
    indigo:  function (d, r) { return r.hero + r.latest + r.about + buildCircularFeature(d.gallery) + r.gallery + r.explore + r.officials + r.portals; },
    amber:   function (d, r) { return r.hero + r.latest + r.about + buildServiceTiles(d.explore) + r.officials + r.events + r.divisions + r.important + r.portals; },
    purple:  function (d, r) { return r.hero + r.latest + r.about + buildMinisterSplit(d.officials, d.about) + r.events + r.gallery + r.portals; },  /* gallery = grid, LAST before portals (BUILD-ERRORS §66) */
    slate:   function (d, r) { return r.hero + r.latest + r.about + buildHelplineFull(d.helpline) + buildActivities3(d.events, d.explore, d.divisions) + buildAlbumGrid(d.gallery) + r.gallery + r.officials + r.portals; },
    crimson: function (d, r) { return r.hero + r.latest + r.about + r.events + buildTourismBand(d.divisions) + r.officials + buildAlbumGrid(d.gallery) + r.gallery + r.important + r.portals; },
    olive:   function (d, r) { return r.hero + r.latest + r.about + buildTourismBand(d.divisions) + buildAlbumGrid(d.gallery) + r.gallery + r.officials + r.events + r.portals; },
    royal:   function (d, r) { return r.hero + r.latest + r.about + r.officials + buildServiceTiles(d.explore) + buildHelpline(d.helpline) + buildAlbumCarousel(d.gallery) + r.gallery + r.important + r.portals; },
    plum:    function (d, r) { return r.hero + r.latest + r.about + buildCircularFeature(d.gallery) + r.officials + buildAlbumCarousel(d.gallery) + r.gallery + r.events + r.portals; }
  };
  function buildHome(data, family) {
    var reg = sectionRegistry(data);
    var fam = S3_FAMILIES[family] || S3_FAMILIES.blue;
    return fam(data, reg);
  }
  /* Re-stripe full-width sections so the alt-background rhythm stays correct no
     matter how the layout reorders them (avoids two tinted sections in a row). */
  function stripeSections(root) {
    var secs = root.querySelectorAll('.s3-section');
    Array.prototype.forEach.call(secs, function (s, i) { s.classList.toggle('alt', i % 2 === 1); });
  }

  /* ---------- content widgets (init on whatever markup is present) ---------- */
  function initSlider() {
    document.querySelectorAll('[data-s3-slider]').forEach(function (root) {
      var slides = Array.prototype.slice.call(root.querySelectorAll('.s3-slide'));
      if (slides.length < 2) return;
      var i = 0, timer = null, playing = !reduce;
      var pauseBtn = root.querySelector('[data-s3-pause]');
      function show(n) { i = (n + slides.length) % slides.length; slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); }); }
      function next() { show(i + 1); }
      function prev() { show(i - 1); }
      function start() { stop(); if (playing) timer = setInterval(next, 5000); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function setPlay(on) {
        playing = on; if (pauseBtn) {
          pauseBtn.setAttribute('aria-pressed', on ? 'false' : 'true');
          pauseBtn.setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow');
          pauseBtn.innerHTML = on ? '<i class="fa-solid fa-pause" aria-hidden="true"></i>' : '<i class="fa-solid fa-play" aria-hidden="true"></i>';
        }
        start();
      }
      var nb = root.querySelector('[data-s3-next]'), pb = root.querySelector('[data-s3-prev]');
      if (nb) nb.addEventListener('click', function () { next(); start(); });
      if (pb) pb.addEventListener('click', function () { prev(); start(); });
      if (pauseBtn) pauseBtn.addEventListener('click', function () { setPlay(!playing); });
      // Pause-on-hover ONLY for a real mouse. On touch, `mouseenter` fires on the first tap
      // and `mouseleave` may never fire, so the slideshow stopped for good and looked broken
      // (the reported "it doesn't loop"). Touch users still have the explicit pause button.
      var _fine = false;
      try { _fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (e) {}
      if (_fine) {
        root.addEventListener('mouseenter', stop);
        root.addEventListener('mouseleave', start);
      }
      setPlay(!reduce);
    });
  }
  function initTicker() {
    document.querySelectorAll('[data-s3-ticker]').forEach(function (root) {
      var track = root.querySelector('.s3-latest-track');
      var vp = root.querySelector('.s3-latest-viewport');
      if (track && vp && !reduce) {
        // single-pass sweep: start off the RIGHT edge (near the pause), scroll to off the LEFT edge, repeat
        var lastVw = -1, lastTw = -1, raf = 0;
        var size = function () {
          var vw = vp.clientWidth, tw = track.scrollWidth;
          if (vw === lastVw && tw === lastTw) return;   // nothing changed -> do nothing (no observer churn)
          lastVw = vw; lastTw = tw;
          track.style.setProperty('--tk-start', vw + 'px');
          track.style.setProperty('--tk-end', (-tw) + 'px');
          track.style.animationDuration = Math.max(14, Math.round((vw + tw) / 50)) + 's';
        };
        size();
        // RO fires only on a real viewport resize; rAF-debounce a burst to one measure, and it writes to
        // the TRACK (a child) so it can never change the observed viewport's size -> no feedback loop.
        if ('ResizeObserver' in window) { try { new ResizeObserver(function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; size(); }); }).observe(vp); } catch (e) {} }
      }
      // begin the sweep only once the ticker scrolls into view (like the important-notices marquee)
      if (track && !reduce && 'IntersectionObserver' in window) {
        var _io = new IntersectionObserver(function (ents) {
          ents.forEach(function (e) { if (e.isIntersecting) { root.classList.add('s3-inview'); _io.disconnect(); } });
        }, { threshold: 0.2 });
        _io.observe(root);
      } else { root.classList.add('s3-inview'); }
      var btn = root.querySelector('[data-s3-tpause]');
      if (btn) btn.addEventListener('click', function () {
        var paused = root.classList.toggle('paused');
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.setAttribute('aria-label', paused ? 'Play the latest news' : 'Pause the latest news');
        btn.innerHTML = paused ? '<i class="fa-solid fa-play" aria-hidden="true"></i>' : '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
      });
    });
  }
  function initLogos() {
    document.querySelectorAll('[data-s3-logos]').forEach(function (root) {
      var track = root.querySelector('.s3-logos-track');
      if (track && !reduce) {
        var copy = track.cloneNode(true);
        Array.prototype.forEach.call(copy.children, function (li) { li.setAttribute('aria-hidden', 'true'); });
        while (copy.firstChild) track.appendChild(copy.firstChild);
      }
      var lb = root.querySelector('[data-s3-logos-pause]');
      if (lb) lb.addEventListener('click', function () {
        var paused = root.classList.toggle('paused');
        lb.setAttribute('aria-pressed', paused ? 'true' : 'false');
        lb.setAttribute('aria-label', paused ? 'Play logo scroll' : 'Pause logo scroll');
        lb.innerHTML = paused ? '<i class="fa-solid fa-play" aria-hidden="true"></i>' : '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
      });
    });
  }
  function initVmarquee() {
    document.querySelectorAll('[data-s3-vmarquee]').forEach(function (vm) {});
    // movie-credits roll: starts BELOW the viewport, rolls up and off the top, then repeats from the
    // bottom (NO seamless clone). --vm-start = the actual viewport height so it fills the tall card.
    function sizeVm(){document.querySelectorAll('.s3-vm-viewport').forEach(function(vp){var tr=vp.querySelector('.s3-vm-track');if(!tr)return;var vh=vp.clientHeight,th=tr.scrollHeight;if(vh)tr.style.setProperty('--vm-start',vh+'px');if(vh&&th)tr.style.animationDuration=Math.max(16,Math.round((vh+th)/28))+'s';});}
    sizeVm(); requestAnimationFrame(sizeVm);
    var _vrt; window.addEventListener('resize', function(){clearTimeout(_vrt);_vrt=setTimeout(sizeVm,160);});
    // Roll only while IN THE VIEWPORT: paused (content waiting below) until you scroll the
    // news section into view, then it rolls bottom->top; re-pauses when it leaves view.
    var vms = document.querySelectorAll('.s3-vmarquee');
    if (vms.length && 'IntersectionObserver' in window && !reduce) {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.target.classList.toggle('vm-inview', e.isIntersecting); });
      }, { threshold: 0.25 });
      Array.prototype.forEach.call(vms, function (vm) { vio.observe(vm); });
    } else { Array.prototype.forEach.call(vms, function (vm) { vm.classList.add('vm-inview'); }); }
    document.querySelectorAll('[data-s3-vmpause]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mq = btn.closest('.s3-vmarquee') || document;
        var paused = mq.classList ? mq.classList.toggle('vm-paused') : false;
        btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
        btn.innerHTML = paused ? '<i class="fa-solid fa-play" aria-hidden="true"></i>' : '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
      });
    });
  }
  // Prev/next (or up/down) SCROLL ARROWS for the auto marquees: Latest News + Related Portals
  // (horizontal) and the What's-New / Important-Notices vertical roll. An arrow switches the strip to
  // native manual scroll (`.s3-manual`) + pauses the auto-roll and nudges one page; the Play button
  // exits manual mode and resumes the auto-roll. Arrow-free version is tagged `no-arrow-marquee`.
  function initMqArrows() {
    function mkArrow(dir, axis) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 's3-mq-arrow s3-mq-' + (dir < 0 ? 'prev' : 'next');
      var ic = axis === 'Y' ? (dir < 0 ? 'up' : 'down') : (dir < 0 ? 'left' : 'right');
      b.setAttribute('aria-label', dir < 0 ? 'Scroll to previous' : 'Scroll to next');
      b.innerHTML = '<i class="fa-solid fa-chevron-' + ic + '" aria-hidden="true"></i>';
      return b;
    }
    function playIcon(btn, paused) {
      if (!btn) return;
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.innerHTML = paused ? '<i class="fa-solid fa-play" aria-hidden="true"></i>' : '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
    }
    // vpFn is a function so the vertical (tabbed) marquee can resolve the ACTIVE panel each click.
    function wire(host, pauseBtn, manualRoot, pausedCls, axis, vpFn) {
      if (!host || host.querySelector('.s3-mq-arrow')) return;
      function nudge(dir) {
        var vp = vpFn(); if (!vp) return;
        var isY = axis === 'Y';
        if (!manualRoot.classList.contains('s3-manual')) {
          // preserve the current visual position so the FIRST click doesn't jump the strip to the start
          var trk0 = vp.querySelector('ul'), off = 0, m = trk0 ? getComputedStyle(trk0).transform : 'none';
          if (m && m.indexOf('matrix') === 0) { var mv = m.slice(m.indexOf('(') + 1, -1).split(', '); off = Math.abs(parseFloat(isY ? mv[5] : mv[4])) || 0; }
          manualRoot.classList.add('s3-manual');
          if (off) { if (isY) vp.scrollTop = off; else vp.scrollLeft = off; }
        }
        manualRoot.classList.add(pausedCls);
        playIcon(pauseBtn, true);
        // ONE ITEM AT A TIME: snap to the next/prev <li> so exactly one item shows per click.
        var items = vp.querySelectorAll('li'), vr = vp.getBoundingClientRect();
        var cur = isY ? vp.scrollTop : vp.scrollLeft, target = null, i, r, pos;
        for (i = 0; i < items.length; i++) {
          r = items[i].getBoundingClientRect();
          pos = Math.round(isY ? (r.top - vr.top + vp.scrollTop) : (r.left - vr.left + vp.scrollLeft));
          if (dir > 0) { if (pos > cur + 2) { target = pos; break; } }
          else if (pos < cur - 2) { target = pos; }   // keep the last item before the current position
        }
        if (target == null) target = dir > 0 ? (isY ? vp.scrollHeight : vp.scrollWidth) : 0;
        var o = { behavior: 'smooth' }; o[isY ? 'top' : 'left'] = target;
        try { vp.scrollTo(o); } catch (e) { vp[isY ? 'scrollTop' : 'scrollLeft'] = target; }
      }
      var a = mkArrow(-1, axis), b = mkArrow(1, axis);
      a.addEventListener('click', function () { nudge(-1); });
      b.addEventListener('click', function () { nudge(1); });
      var grp = document.createElement('span'); grp.className = 's3-mq-group';   // tight prev|pause|next cluster
      if (pauseBtn && pauseBtn.parentNode === host) host.insertBefore(grp, pauseBtn); else host.appendChild(grp);
      grp.appendChild(a); if (pauseBtn) grp.appendChild(pauseBtn); grp.appendChild(b);
      // Play button (its own handler toggles the paused class first): if now playing, leave manual mode.
      if (pauseBtn) pauseBtn.addEventListener('click', function () {
        setTimeout(function () {
          if (!manualRoot.classList.contains(pausedCls)) {
            manualRoot.classList.remove('s3-manual');
            var vp = vpFn(); if (vp) { try { vp.scrollTo(axis === 'Y' ? { top: 0 } : { left: 0 }); } catch (e) {} }
          }
        }, 0);
      });
    }
    document.querySelectorAll('[data-s3-ticker]').forEach(function (r) {
      wire(r.querySelector('.s3-latest-row'), r.querySelector('[data-s3-tpause]'), r, 'paused', 'X',
        function () { return r.querySelector('.s3-latest-viewport'); });
    });
    document.querySelectorAll('[data-s3-logos]').forEach(function (r) {
      wire(r.querySelector('.s3-logos-row'), r.querySelector('[data-s3-logos-pause]'), r, 'paused', 'X',
        function () { return r.querySelector('.s3-logos-viewport'); });
    });
    document.querySelectorAll('.s3-vmarquee').forEach(function (mq) {
      var pauseBtn = mq.querySelector('[data-s3-vmpause]'); if (!pauseBtn) return;
      wire(pauseBtn.parentNode, pauseBtn, mq, 'vm-paused', 'Y', function () { return mq.querySelector('.s3-vm-viewport'); });
    });
  }
  function initGallery() {
    var galleries = document.querySelectorAll('.s3-gallery, .s3-gallery-cap');
    if (!galleries.length) return;
    var lb = document.createElement('div');
    lb.className = 's3-lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<button type="button" class="s3-lb-btn s3-lb-close" aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>'
      + '<button type="button" class="s3-lb-btn s3-lb-prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>'
      + '<figure><img alt=""><figcaption></figcaption></figure>'
      + '<button type="button" class="s3-lb-btn s3-lb-next" aria-label="Next image"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('figcaption');
    var items = [], idx = 0, opener = null;
    function render() { var it = items[idx]; if (!it) return; img.src = it.href; img.alt = it.alt || ''; cap.textContent = it.alt || ''; }
    function open(list, i, from) { items = list; idx = i; opener = from; lb.classList.add('open'); render(); lb.querySelector('.s3-lb-close').focus(); }
    function close() { lb.classList.remove('open'); img.src = ''; if (opener) opener.focus(); }
    function go(n) { idx = (n + items.length) % items.length; render(); }
    galleries.forEach(function (g) {
      var links = Array.prototype.slice.call(g.querySelectorAll('a'));
      var list = links.map(function (a) { var im = a.querySelector('img'); return { href: a.getAttribute('href'), alt: im ? im.alt : '' }; });
      links.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(list, i, a); }); });
    });
    lb.querySelector('.s3-lb-close').addEventListener('click', close);
    lb.querySelector('.s3-lb-next').addEventListener('click', function () { go(idx + 1); });
    lb.querySelector('.s3-lb-prev').addEventListener('click', function () { go(idx - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(idx + 1);
      else if (e.key === 'ArrowLeft') go(idx - 1);
    });
  }
  function initCount() {
    var els = document.querySelectorAll('[data-s3-count]');
    if (!els.length) return;
    function fmt(n) { return n.toLocaleString('en-IN'); }
    function run(el) {
      var target = parseFloat(el.getAttribute('data-s3-count')) || 0;
      var suffix = el.getAttribute('data-s3-suffix') || '';
      if (reduce) { el.textContent = fmt(target) + suffix; return; }
      var start = null, dur = 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = fmt(Math.floor(target * (1 - Math.pow(1 - p, 3)))) + suffix;
        if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target) + suffix;
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.4 });
      Array.prototype.forEach.call(els, function (el) { io.observe(el); });
    } else { Array.prototype.forEach.call(els, run); }
  }
  function initCarousel() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-s3-carousel]'), function (root) {
      var track = root.querySelector('.s3-carousel-track');
      var prev = root.querySelector('.s3-carousel-prev');
      var next = root.querySelector('.s3-carousel-next');
      if (!track) return;
      function amt() { var c = track.querySelector('.s3-feat-card'); return c ? c.getBoundingClientRect().width + 14 : 300; }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -amt(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: amt(), behavior: 'smooth' }); });
    });
  }

  function initReveal() { /* reveal animations removed — content is always visible instantly (no scroll fade) */ }

  /* ---- Section tabs: an interior-page tabbed-sections component (N tabs, ARIA +
     keyboard). Author static markup with `.s3-sectiontabs[data-s3-tabs]` → a
     `[role=tablist]` of `<button role=tab aria-controls=…>` + `[role=tabpanel]`
     sections; this wires selection, `hidden`, roving tabindex and arrow keys.
     Groups are independent, so a page may hold several. ---- */
  function initSectionTabs() {
    document.querySelectorAll('[data-s3-tabs]').forEach(function (root) {
      var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        if (focus) { tab.focus(); tab.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(tab); });
        tab.addEventListener('keydown', function (e) {
          var j = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') j = 0;
          else if (e.key === 'End') j = tabs.length - 1;
          if (j !== null) { e.preventDefault(); select(tabs[j], true); }
        });
      });
      var pre = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; });
      select(pre[0] || tabs[0]);
    });
  }

  /* ---- Section jump-nav (.s3-secnav): an "On this page" bar whose links smooth-scroll
     to in-page sections (all sections stay visible). fixHrefs()+the fragment click handler
     above do the base-href rewrite + smooth scroll; this only adds a scroll-spy that marks
     the link for the section currently in view with aria-current="true". ---- */
  function initSecnav() {
    if (!('IntersectionObserver' in window)) return;
    document.querySelectorAll('.s3-secnav').forEach(function (nav) {
      var map = {}, links = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
      links.forEach(function (a) {
        var h = a.getAttribute('href') || '', i = h.indexOf('#');
        if (i >= 0 && h.length > i + 1) { var el = document.getElementById(h.slice(i + 1)); if (el) map[el.id] = a; }
      });
      var ids = Object.keys(map);
      if (!ids.length) return;
      var io = new IntersectionObserver(function (ents) {
        var vis = ents.filter(function (e) { return e.isIntersecting; });
        if (!vis.length) return;
        vis.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        map[vis[0].target.id].setAttribute('aria-current', 'true');
      }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
      ids.forEach(function (id) { io.observe(document.getElementById(id)); });
    });
  }

  /* Fill every [data-site] element from data/gigw/site.json — the SINGLE SOURCE of the site's
     identity (org name, address, phones, EMAIL, Web-Information-Manager). S3WaaS chrome is inline,
     so this is the s3 equivalent of the GIGW includes.js binder: change site.json in ONE place and
     every contact / footer-WIM / policy-Contact value updates. Email is stored PLAIN in the JSON and
     rendered OBFUSCATED + styled (comm-gsec.goa@nic.in -> comm[dash]gsec[dot]goa[at]nic[dot]in). */
  function tokenizeEmail(v) {
    return String(v).replace(/_/g, '[underscore]').replace(/-/g, '[dash]').replace(/@/g, '[at]').replace(/\./g, '[dot]');
  }
  /* ---- Missing site-data handling (DEV-facing; visitors never see a warning) ----
     A binding can declare itself REQUIRED with data-site-drop="<ancestor selector>":

       <tr><td>Phone</td><td><a data-site="wim.phone" data-site-drop="tr"
                               data-site-href="tel:{}" href="#">…</a></td></tr>

     If data/site.json has no usable value at that path (absent, empty, or an unresolved
     {token}), the named ancestor — here the whole <tr> — is REMOVED, so the field simply
     does not appear rather than showing a stale placeholder such as the field's own name.
     Every drop is collected and reported ONCE to the console with the exact JSON path and
     a ready-to-paste snippet, and exposed as window.s3MissingSiteData. ---- */
  var missingSiteData = [];
  function reportMissingSiteData() {
    if (!missingSiteData.length) return;
    window.s3MissingSiteData = missingSiteData.slice();
    if (!window.console || !console.groupCollapsed) return;
    console.groupCollapsed('%c[site] ' + missingSiteData.length + ' detail(s) missing from data/site.json — those fields were hidden', 'color:#b26a00;font-weight:700');
    missingSiteData.forEach(function (m) {
      console.warn('MISSING  ' + m.path + '   — field "' + m.label + '" removed from ' + location.pathname);
    });
    console.info('HOW TO FIX — open data/site.json and fill these in:\n' +
      JSON.stringify(missingSiteData.reduce(function (a, m) {
        var ks = m.path.split('.'), o = a, i;
        for (i = 0; i < ks.length - 1; i++) { o[ks[i]] = o[ks[i]] || {}; o = o[ks[i]]; }
        o[ks[ks.length - 1]] = '<' + m.label + ' here>'; return a;
      }, {}), null, 2) +
      '\nSave and reload — no rebuild needed. Leaving a key out (or empty) keeps the field hidden on purpose.');
    console.groupEnd();
  }
  function dropSiteField(el, path) {
    var sel = el.getAttribute('data-site-drop'), label = el.getAttribute('data-site-label'), row;
    if (!label && el.closest) { row = el.closest('tr'); if (row && row.cells && row.cells[0]) label = row.cells[0].textContent.trim(); }
    missingSiteData.push({ path: path, label: label || path });
    var host = (sel && el.closest) ? el.closest(sel) : null;
    if (host && host.parentNode) host.parentNode.removeChild(host);
    else if (el.parentNode) el.parentNode.removeChild(el);
  }
  function fillSiteDetails() {
    var nodes = document.querySelectorAll('[data-site],[data-site-src],[data-site-link]');
    if (!nodes.length) return;
    fetch((s3base() || '/resources') + '/data/site.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        function get(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
        Array.prototype.forEach.call(nodes, function (el) {
          var lp = el.getAttribute('data-site-link');
          if (lp != null) { var lv = get(s, lp); if (lv == null || lv === '') { el.style.display = 'none'; return; } el.setAttribute('href', lv); el.style.display = ''; return; }
          var sp = el.getAttribute('data-site-src');
          if (sp != null) { var sv = get(s, sp);
            if (sv == null || sv === '') { el.style.display = 'none'; el.removeAttribute('src'); return; }
            el.src = sv; el.style.display = ''; var ap = el.getAttribute('data-site-alt'); if (ap) { var av = get(s, ap); if (av != null) el.alt = av; } return; }
          var path = el.getAttribute('data-site'), v = get(s, path);
          if (el.hasAttribute('data-site-drop')) {                 // required field
            var rv = (typeof v === 'string' && typeof resolveTpl === 'function') ? resolveTpl(v, s) : v;
            if (rv == null || (typeof rv === 'string' && (rv.trim() === '' || /^\{[\w.]+\}$/.test(rv.trim())))) {
              dropSiteField(el, path); return;
            }
          }
          if (v == null) return;
          if (/(^|\.)email$/i.test(path) || (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
            el.textContent = tokenizeEmail(v); el.classList.add('s3-email'); el.removeAttribute('href'); el.removeAttribute('data-site-href');
          } else {
            // Self-heal a polluted identity value: an intake/bake bug can leave a
            // phone/name/address carrying stray anchor markup (e.g. `0832-2232631"
            // href="tel:0832-2232631">0832-2232631`). A plain identity value never
            // legitimately contains a tag or an attribute fragment, so for a NON-html
            // binding, reduce it to its clean leading token so it can NEVER render as
            // raw markup. (data-site-html is opt-in rich content — left untouched.)
            var cv = v;
            if (!el.hasAttribute('data-site-html') && typeof v === 'string' && /<|"\s*(href|src)\s*=|">/i.test(v)) {
              cv = v.split(/["<]/)[0].trim();
            }
            if (el.hasAttribute('data-site-html')) el.innerHTML = v; else el.textContent = cv;
            var tpl = el.getAttribute('data-site-href'); if (tpl) el.setAttribute('href', tpl.replace('{}', cv));
          }
        });
        reportMissingSiteData();
      }).catch(function () {});
  }

  // ---- LIVE chrome from JSON: footer (data/footer.json) + social icons
  //      (data/site.json social) rebuild on every load, so editing the JSON
  //      updates the site with no rebuild — exactly like the masthead text.
  function fe(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  // Lenient JSON: allow // and /* */ comments and trailing commas in the JSON
  // files (string-aware, so URLs' "//" are preserved). Lets an editor comment
  // out a line (e.g. a social link) without breaking the whole file.
  function sjson(t){
    var s='',i=0,n=t.length,q=false,e=false,a,b;
    while(i<n){a=t.charAt(i);b=t.charAt(i+1);
      if(q){s+=a; if(e){e=false;} else if(a==='\\'){e=true;} else if(a==='"'){q=false;} i++; continue;}
      if(a==='"'){q=true;s+=a;i++;continue;}
      if(a==='/'&&b==='/'){i+=2;while(i<n&&t.charAt(i)!=='\n')i++;continue;}
      if(a==='/'&&b==='*'){i+=2;while(i<n&&!(t.charAt(i)==='*'&&t.charAt(i+1)==='/'))i++;i+=2;continue;}
      s+=a;i++;}
    return JSON.parse(s.replace(/,(\s*[}\]])/g,'$1'));
  }
  function fetchJ(url){return fetch(url,{cache:'no-store'}).then(function(r){return r.ok?r.text():Promise.reject();}).then(sjson);}
  /* URL of a file under data/. A page that ships <base href> pointing at the site root already
     resolves a page-relative 'data/x.json' there — prefixing s3base() on top of that walks up
     TWICE and 404s on every sub-page (silently: each caller keeps its baked markup). Pages with
     no <base> still need the prefix, or a relative URL follows spa-nav's pushed path instead.
     See BUILD-ERRORS §141. */
  function dataUrl(p){ return document.querySelector('base[href]') ? p : ((s3base()||'')+'/'+p); }
  // Resolve {site.json.path} placeholders in footer.json text, so shared data
  // (org name, contact, etc.) is REFERENCED from site.json, never duplicated.
  function resolveTpl(str, site){
    return String(str==null?'':str).replace(/\{([a-z0-9_.]+)\}/gi, function(_m,p){
      var v=p.split('.').reduce(function(a,k){return a==null?undefined:a[k];}, site);
      return v==null?'':v;
    });
  }
  function buildSocial(soc, cls){
    soc=soc||{};
    var S=[['facebook','fa-brands fa-facebook-f','Facebook'],['instagram','fa-brands fa-instagram','Instagram'],['twitter','fa-brands fa-x-twitter','Twitter']];
    return S.filter(function(x){return soc[x[0]];}).map(function(x){return '<a'+(cls?' class="'+cls+'"':'')+' href="'+fe(soc[x[0]])+'" target="_blank" rel="noopener" aria-label="'+x[2]+'"><i class="'+x[1]+'" aria-hidden="true"></i></a>';}).join('');
  }
  function buildFooter(f, site){
    f=f||{}; site=site||{};
    var fn=site.full_name||site.name||'', a=f.about||{};
    // "simple" variant — the S3WaaS-theme footer look (action links + owned/visits/badges),
    // built from JSON so identity is single-sourced while the theme's UI is unchanged.
    if(f.variant==='simple'){
      var slinks=(f.topLinks||f.policies||[]).map(function(l){return '<a href="'+fe(l.href)+'"'+(l.external?' target="_blank" rel="noopener noreferrer"':'')+'>'+fe(l.label)+'</a>';}).join('');
      var sbadges=(f.badges||[]).map(function(b){return '<img src="'+fe(b.src)+'" alt="'+fe(b.alt||'')+'">';}).join('');
      var sowned=fe(resolveTpl((a&&a.owned)||f.owned||'',site));
      return '<div class="s3-foot-top"><div class="container">'+slinks+'</div></div>'+
        '<div class="s3-foot-bottom"><div class="container">'+
        '<span>'+sowned+' Last updated: <strong id="s3-last-updated">&mdash;</strong>.</span>'+
        '<span class="s3-visits">Visitor count: <strong id="s3-visit-count">&mdash;</strong></span>'+
        (sbadges?'<span class="s3-foot-badges">'+sbadges+'</span>':'')+
        '</div></div>';
    }
    var social=buildSocial(site.social,'');
    var aHead=fe(resolveTpl(a.heading,site)||fn), aText=fe(resolveTpl(a.text,site)), aOwned=fe(resolveTpl(a.owned,site));
    var about='<div class="footer-col">'+(aHead?'<h2 class="footer-h">'+aHead+'</h2>':'')+(aText?'<p>'+aText+'</p>':'')+(aOwned?'<p class="footer-owned">'+aOwned+'</p>':'')+(social?'<div class="footer-social">'+social+'</div>':'')+'</div>';
    var cols=(f.columns||[]).map(function(c){var lis=(c.links||[]).filter(function(l){return l&&(l.href||l.label);}).map(function(l){return '<li><a href="'+fe(l.href)+'"'+(l.external?' target="_blank" rel="noopener noreferrer"':'')+'>'+fe(l.label)+'</a></li>';}).join('');return (!fe(c.heading)&&!lis)?'':'<div class="footer-col">'+(fe(c.heading)?'<h2 class="footer-h">'+fe(c.heading)+'</h2>':'')+(lis?'<ul class="footer-list">'+lis+'</ul>':'')+'</div>';}).join('');
    var ph=site.phone||[], lbl=site.phoneLabels||[], phLine=ph.map(function(n,i){return (lbl[i]?fe(lbl[i])+': ':'')+fe(n);}).join('<br>');
    var w=site.wim||{}, wrows='';
    function wr(ic,v){return v?'<li><i class="'+ic+'" aria-hidden="true"></i><span>'+v+'</span></li>':'';}
    wrows+=wr('fa-solid fa-user', w.name?fe(resolveTpl(w.name,site)):'');
    wrows+=wr('fa-solid fa-id-badge', w.designation?fe(resolveTpl(w.designation,site)):'');
    var waddr=w.address?resolveTpl(w.address,site):site.address;
    wrows+=wr('fa-solid fa-location-dot', waddr?(fe(fn)+', '+fe(waddr)):'');
    var pl=[], wp=w.phone;
    if(Array.isArray(wp)) pl=wp.filter(Boolean).map(function(x){return fe(resolveTpl(x,site));});
    else if(wp) pl.push(fe(resolveTpl(wp,site)));
    if(Array.isArray(w.mobile)) w.mobile.filter(Boolean).forEach(function(x){pl.push('Mobile: '+fe(resolveTpl(x,site)));});
    else if(w.mobile) pl.push('Mobile: '+fe(resolveTpl(w.mobile,site)));
    if(pl.length)wrows+='<li><i class="fa-solid fa-phone" aria-hidden="true"></i><span>'+pl.join('<br>')+'</span></li>';
    var wfax=w.fax?resolveTpl(w.fax,site):(site.fax||''); wrows+=wr('fa-solid fa-fax', wfax?('Fax: '+fe(wfax)):'');
    var wem=w.email?resolveTpl(w.email,site):(site.email||'');
    if(wem)wrows+='<li><i class="fa-solid fa-envelope" aria-hidden="true"></i><span class="s3-email">'+fe(tokenizeEmail(wem))+'</span></li>';
    var wim='<div class="footer-col"><h2 class="footer-h">'+fe(resolveTpl(f.contactHeading,site)||resolveTpl(w.name,site)||'Web Information Manager')+'</h2><ul class="footer-contact">'+wrows+'</ul></div>';
    var pol='<div class="footer-policies-bar"><div class="footer-policies-inner"><span class="fp-label">Policies</span>'+(f.policies||[]).map(function(p,i){return (i?'<span class="fp-sep">|</span>':'')+'<a href="'+fe(p.href)+'">'+fe(p.label)+'</a>';}).join('')+'</div></div>';
    var cpctx={}; for(var _k in site){cpctx[_k]=site[_k];} cpctx.copyrightYear=f.copyrightYear;
    var cp=f.copyright?fe(resolveTpl(f.copyright,cpctx)):('Copyright &copy; '+fe(f.copyrightYear)+' '+fe(fn)+'. All rights reserved.');
    var dev=f.developedBy?fe(resolveTpl(f.developedBy,cpctx)):'';
    var cpFull=f.credit?fe(resolveTpl(f.credit,cpctx)):(cp+(dev?' '+dev+'.':''));var _du=(site.developer_url||''),_dn=fe(site.developer_name||'');if(_du&&_dn){cpFull=cpFull.split(_dn).join('<a href="'+fe(_du)+'" target="_blank" rel="noopener noreferrer">'+_dn+'</a>');}
    var bottom='<div class="footer-bottom"><div class="footer-bottom-inner footer-bottom-bar">'+'<div class="footer-bottom-left"><span class="footer-credit-text">'+cpFull+'</span>'+'<span class="footer-meta-item"><i class="fa-solid fa-clock" aria-hidden="true"></i> <span class="footer-meta-label">Last updated:</span> <strong id="s3-last-updated">&mdash;</strong></span></div>'+'<span class="footer-countbox s3-visits"><span class="footer-count-label">Visitor count</span><span class="footer-counter" id="s3-visit-count" data-boxed>&mdash;</span></span>'+'</div></div>';
    return '<div class="footer-grid">'+about+cols+wim+'</div>'+pol+bottom;
  }
  /* CONTACT CARD (policy pages) — every line comes from site.json, so a phone number or an officer
     exists in exactly ONE place instead of once per policy page. A page carries only the container:

         <div data-s3-wimcard="wim"> …baked fallback markup… </div>

     whose value names an entry under site.json "contacts"; an attribute with no value (and any site
     whose JSON predates "contacts") falls back to the legacy "wim" block, so old sites keep working.
     The SAME renderer draws the other officers a GIGW build must name — Security Contact, CISO —
     because they differ only in wording: set "role" and omit "name"/"designation" when none is on
     record. Every string runs through resolveTpl, so an entry says {full_name} / {address} /
     {phone.0} rather than repeating a value that already exists elsewhere in site.json. */
  function buildWimCard(w, site){
    w=w||{}; site=site||{};
    function wr(ic,v){return v?'<li><i class="'+ic+'" aria-hidden="true"></i><span>'+v+'</span></li>':'';}
    var pl=[], wp=w.phone;
    if(Array.isArray(wp)) pl=wp.filter(Boolean).map(function(x){return fe(resolveTpl(x,site));});
    else if(wp) pl.push(fe(resolveTpl(wp,site)));
    if(Array.isArray(w.mobile)) w.mobile.filter(Boolean).forEach(function(x){pl.push('Mobile: '+fe(resolveTpl(x,site)));});
    else if(w.mobile) pl.push('Mobile: '+fe(resolveTpl(w.mobile,site)));
    var waddr=w.address?resolveTpl(w.address,site):(site.address||''), wem=w.email?resolveTpl(w.email,site):(site.email||''), wfax=w.fax?resolveTpl(w.fax,site):(site.fax||'');
    var rows=wr('fa-solid fa-location-dot', waddr?fe(waddr):'')
      +(pl.length?'<li><i class="fa-solid fa-phone" aria-hidden="true"></i><span>'+pl.join('<br>')+'</span></li>':'')
      +(wfax?wr('fa-solid fa-fax','Fax: '+fe(wfax)):'')
      +(wem?'<li><i class="fa-solid fa-envelope" aria-hidden="true"></i><span class="s3-email">'+fe(tokenizeEmail(wem))+'</span></li>':'');
    var name=w.name?fe(resolveTpl(w.name,site)):'', desg=w.designation?fe(resolveTpl(w.designation,site)):'';
    var org=w.org?fe(resolveTpl(w.org,site)):'';
    if(org) rows=wr('fa-solid fa-id-badge', org)+rows;          // department line, above the address
    var role=fe(w.role?resolveTpl(w.role,site):'Web Information Manager');
    if(!role && !name && !rows) return '';                      // nothing to say -> keep the baked fallback
    return '<div class="s3-wimcard"><div class="s3-wimcard-head"><span class="s3-wimcard-ico"><i class="fa-solid '+fe(w.icon||'fa-id-card-clip')+'" aria-hidden="true"></i></span><div class="s3-wimcard-id"><strong class="s3-wimcard-role">'+role+'</strong>'
      +(name?'<span class="s3-wimcard-name">'+name+'</span>':'')+(desg?'<span class="s3-wimcard-desg">'+desg+'</span>':'')
      +'</div></div><ul class="s3-wimcard-rows">'+rows+'</ul></div>'
      +(w.note?'<p>'+resolveTpl(w.note,site)+'</p>':'');        // note is authored HTML: it may carry a link
  }
  /* Cards live inside <main>, which spa-nav swaps wholesale — so this runs with the MAIN widgets,
     not with the once-only chrome. Rendered in initChrome it would go stale (or never render at
     all) on any policy page reached by a partial navigation. */
  function initWimCards(){
    var cards=document.querySelectorAll('[data-s3-wimcard]');
    if(!cards.length) return;
    fetchJ(dataUrl('data/site.json')).then(function(s){
      if(!s) return;
      Array.prototype.forEach.call(cards,function(el){
        var cfg=((s.contacts||{})[el.getAttribute('data-s3-wimcard')||'wim'])||s.wim;
        if(!cfg) return;                                        // unknown key -> keep the baked fallback
        var html=buildWimCard(cfg,s);
        if(html){ el.innerHTML=html; try{ upgradeIcons(el); }catch(e){} }
      });
    }).catch(function(){});
  }
  function initChrome(){
    var footEl=document.querySelector('[data-s3-footer]');
    if(!footEl) return;                                          // contact cards: see initWimCards
    Promise.all([
      fetchJ(dataUrl('data/footer.json')).catch(function(){return null;}),
      fetchJ(dataUrl('data/site.json')).catch(function(){return null;})
    ]).then(function(res){
      var f=res[0], s=res[1];
      // On file:// (or any fetch failure) KEEP the baked footer/cards — never overwrite them
      // with empty data. Only rebuild live when the JSON actually loaded (HTTP).
      if(footEl && f && s){ footEl.innerHTML=buildFooter(f,s); if(window.SGCounter) window.SGCounter(); }
    });
  }

  // CHROME (nav/footer/counter/identity) inits ONCE; MAIN widgets re-run whenever <main> changes
  // (including a client-side partial navigation via spa-nav.js).
  function initChromeOnce() { initChrome(); initSecnav(); fillSiteDetails(); initCount(); }
  /* ------------------------------------------------------------------------------------
     FORM VALIDATION + SECURITY CHECK — ported from the GIGW shell (main.js).
     This shell had NONE of it: no validation, no captcha, no error/status handling, so the
     feedback form rendered its security check but never generated a question. Both shells
     behave the same now. Functions copied whole (brace-walked, not sliced at a text offset —
     an offset cut mid-function and broke the file once already).
     ------------------------------------------------------------------------------------ */
  function contactEndpoint() {
    /* Same convention as every other s3 data fetch: (s3base()||'') + '/data/...'. Defaulting to
       '.' would resolve against the PAGE, not the site root. */
    var base = (typeof s3base === 'function' ? (s3base() || '') : '');
    return base.replace(/\/$/, '') + '/data/contact.php';
  }

  /* The security check. SERVER mode (host has PHP): contact.php issues the sum and VERIFIES the
     answer, so the page never holds it and a bot cannot read it out of the DOM. LOCAL mode is the
     static-host fallback, generated and checked in the browser. Mirrors main.js so both shells
     behave identically. */
  /* ===== Proof-of-work (anti-brute-force) =====
     Self-contained SHA-256 + a chunked solver. The server issues {salt,bits}; the client must find a
     nonce so sha256(salt+nonce) has >=bits leading zero bits before the form is accepted. Cheap to
     VERIFY (1 hash), expensive to FIND (~2^bits) — so brute-forcing the form costs real CPU per try. */
  if (!window.SGPow) window.SGPow = (function () {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotr(n,x){return (x>>>n)|(x<<(32-n));}
    function sha256bytes(msg){                         // msg: array of byte values -> 32-byte array
      var H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
      var l=msg.length, withOne=msg.slice(); withOne.push(0x80);
      while(withOne.length%64!==56) withOne.push(0);
      var bits=l*8; for(var i=7;i>=0;i--) withOne.push((bits/Math.pow(2,i*8))&0xff);
      var w=new Array(64);
      for(var o=0;o<withOne.length;o+=64){
        for(var t=0;t<16;t++) w[t]=(withOne[o+t*4]<<24)|(withOne[o+t*4+1]<<16)|(withOne[o+t*4+2]<<8)|(withOne[o+t*4+3]);
        for(t=16;t<64;t++){var s0=rotr(7,w[t-15])^rotr(18,w[t-15])^(w[t-15]>>>3),s1=rotr(17,w[t-2])^rotr(19,w[t-2])^(w[t-2]>>>10);w[t]=(w[t-16]+s0+w[t-7]+s1)|0;}
        var a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
        for(t=0;t<64;t++){var S1=rotr(6,e)^rotr(11,e)^rotr(25,e),ch=(e&f)^(~e&g),T1=(h+S1+ch+K[t]+w[t])|0,S0=rotr(2,a)^rotr(13,a)^rotr(22,a),maj=(a&b)^(a&c)^(b&c),T2=(S0+maj)|0;h=g;g=f;f=e;e=(d+T1)|0;d=c;c=b;b=a;a=(T1+T2)|0;}
        H[0]=(H[0]+a)|0;H[1]=(H[1]+b)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
      }
      var out=[]; for(i=0;i<8;i++){out.push((H[i]>>>24)&0xff,(H[i]>>>16)&0xff,(H[i]>>>8)&0xff,H[i]&0xff);} return out;
    }
    function lzb(bytes){var n=0;for(var i=0;i<bytes.length;i++){var b=bytes[i];if(b===0){n+=8;continue;}for(var m=7;m>=0;m--){if(b&(1<<m))return n;n++;}}return n;}
    function bytesOf(s){var a=[];for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c<128)a.push(c);else if(c<2048){a.push(192|(c>>6),128|(c&63));}else{a.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}}return a;}
    // Solve in time-sliced chunks so the UI never freezes; resolves the winning nonce (a string).
    function solve(salt,bits){
      return new Promise(function(res){
        var saltB=bytesOf(salt), n=0;
        (function step(){
          var end=n+3000;
          for(;n<end;n++){ if(lzb(sha256bytes(saltB.concat(bytesOf(''+n))))>=bits){ return res(''+n); } }
          (window.requestIdleCallback||function(f){setTimeout(f,0);})(step);
        })();
      });
    }
    return { sha256bytes:sha256bytes, leadingZeroBits:lzb, solve:solve };
  })();

  function setupCaptcha(form) {
    var wrap = form.querySelector('[data-captcha]');
    if (!wrap) return null;
    var qEl = wrap.querySelector('.captcha-q');
    var input = wrap.querySelector('input');
    var refresh = wrap.querySelector('.captcha-refresh');
    if (!qEl || !input) return null;
    var answer = 0, token = '', mode = 'local', powNeeded = false;
    // hidden field that carries the solved proof-of-work nonce to the server
    var powInput = form.querySelector('input[name="pow"]');
    if (!powInput) { powInput = document.createElement('input'); powInput.type = 'hidden'; powInput.name = 'pow'; form.appendChild(powInput); }
    var powPromise = null;   // resolves when the proof-of-work nonce is ready (so submit can wait for it)
    function opSym(op) { return op === '*' ? '\u00d7' : op === '-' ? '\u2212' : '+'; }
    function opWord(op) { return op === '*' ? 'times' : op === '-' ? 'minus' : 'plus'; }
    function calc(a, b, op) { return op === '*' ? a * b : op === '-' ? a - b : a + b; }
    function show(a, b, op) {
      op = op || '+';
      qEl.textContent = a + ' ' + opSym(op) + ' ' + b + ' =';
      input.value = '';
      input.setAttribute('aria-label', 'Security check: what is ' + a + ' ' + opWord(op) + ' ' + b + '?');
    }
    function genLocal() {
      var ops = ['+', '-', '*'], op = ops[Math.floor(Math.random() * 3)], a, b;
      if (op === '*') { a = Math.floor(Math.random() * 8) + 2; b = Math.floor(Math.random() * 8) + 2; }
      else { a = Math.floor(Math.random() * 31) + 10; b = Math.floor(Math.random() * 31) + 10; if (op === '-' && b > a) { var t = a; a = b; b = t; } }
      answer = calc(a, b, op); token = ''; mode = 'local'; show(a, b, op);
    }
    function genServer() {
      powInput.value = '';
      return fetch(contactEndpoint() + '?q=1', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || typeof d.a !== 'number' || !d.token) throw 0;
          token = d.token; mode = 'server'; answer = -1; show(d.a, d.b, d.op);
          // Solve the proof-of-work in the background (non-blocking); fill the hidden field when done.
          // Only REQUIRED if the server actually issued a PoW challenge (salt+bits) — so an older
          // server that doesn't send them still works (no forced block).
          powNeeded = !!(d.salt && d.bits && window.SGPow);
          powPromise = powNeeded ? window.SGPow.solve(d.salt, d.bits).then(function (nonce) { powInput.value = nonce; }) : null;
        })
        .catch(function () { genLocal(); });
    }
    function gen() { return genServer(); }
    if (refresh) refresh.addEventListener('click', function () { gen(); });
    gen();
    return {
      input: input,
      get mode() { return mode; },
      get token() { return token; },
      get powReady() { return !powNeeded || powInput.value !== ''; },
      whenReady: function () { return powPromise || Promise.resolve(); },
      check: function () {
        if (mode === 'server') return (input.value || '').trim() !== '';
        return parseInt((input.value || '').trim(), 10) === answer;
      },
      regen: gen
    };
  }

  function setError(field, msg) {
    field.setAttribute('aria-invalid', 'true');
    var id = field.id + '-err';
    var p = document.getElementById(id);
    if (!p) {
      p = document.createElement('p');
      p.className = 'form-error'; p.id = id;
      field.setAttribute('aria-describedby', id);
      field.parentNode.appendChild(p);
    }
    p.textContent = msg;
  }
  function clearError(field) {
    field.removeAttribute('aria-invalid');
    var p = document.getElementById(field.id + '-err');
    if (p) p.textContent = '';
  }
  function statusEl(form) {
    var s = form.querySelector('.form-status.js');
    if (!s) {
      s = document.createElement('p');
      s.className = 'form-status js';
      // role/aria-live so screen readers announce validation + submit results
      s.setAttribute('role', 'status');
      s.setAttribute('aria-live', 'polite');
      s.setAttribute('aria-atomic', 'true');
      form.insertBefore(s, form.firstChild);
    }
    return s;
  }
  /* Wire every POST form: build its security check, validate on submit. Idempotent via data-wired,
     because spa-nav re-runs the widget init on each <main> swap. */
  function initForms(root) {
    var forms = (root || document).querySelectorAll('form[method="post"], form.feedback-form');
  /* ===== Clipboard lock on the submitting forms =====
     Blocks copy, cut and paste in every field of a POST form, by keyboard, mouse or menu.

     BE CLEAR ABOUT WHAT THIS IS AND IS NOT. It is a DATA-ENTRY policy, not a security control, and it
     must never be counted as one: every check that actually protects this form runs on the server, and
     an attacker skips the browser entirely — tools/attack-captcha.php submits with no client at all and
     is refused by contact.php, which is what stops them. Anyone can defeat this by turning off
     JavaScript. It is here because the department asked for typed entry, and for nothing else.

     The cost is real and falls on legitimate visitors: password managers, screen-reader users, people
     with motor difficulties, and anyone copying a long reference number or an email address now have to
     retype it. Hence the explanatory toast rather than a silent failure — a field that ignores Ctrl+V
     without saying why reads as a broken page.

     Covering all three routes the request named:
       keyboard  Ctrl/Cmd+C/X/V, Shift+Insert and Ctrl+Insert all raise copy/cut/paste events, so
                 cancelling the events covers the shortcuts; the keydown handler is belt-and-braces.
       mouse     middle-click paste (X11) also raises `paste`; contextmenu blocks the right-click menu;
                 drop/dragstart stop text being dragged in or out.
       browser   the Edit menu raises the same clipboard events.
     The captcha answer box is included — it is a field of this form like any other. */
  function lockClipboard(form) {
    var fields = form.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), textarea');
    if (!fields.length) return;
    var warned = 0;
    function refuse(e) {
      e.preventDefault();
      // One toast per gesture, throttled: a held-down Ctrl+V would otherwise stack a dozen.
      var now = Date.now();
      if (now - warned < 1500) return;
      warned = now;
      if (typeof window.__sgToast === 'function')
        window.__sgToast('Copying and pasting are turned off in this form. Please type your details.', 'err', 0);
    }
    Array.prototype.forEach.call(fields, function (f) {
      ['copy', 'cut', 'paste', 'drop', 'dragstart', 'contextmenu'].forEach(function (evt) {
        f.addEventListener(evt, refuse);
      });
      f.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase();
        if ((e.ctrlKey || e.metaKey) && (k === 'c' || k === 'v' || k === 'x')) return refuse(e);
        if (e.shiftKey && k === 'insert') return refuse(e);   // paste
        if (e.ctrlKey && k === 'insert') return refuse(e);    // copy
      });
      /* autocomplete is deliberately LEFT ALONE. Turning it off would look consistent with "type it
         yourself", but the autocomplete tokens on these fields (name/email/tel) are what satisfies
         WCAG 1.3.5 Identify Input Purpose — removing them would trade a data-entry preference for a
         real accessibility failure on a site built to GIGW. Autofill is not the clipboard. */
    });
  }    Array.prototype.forEach.call(forms, function (form) {
      if (form.getAttribute('data-wired')) return;
      form.setAttribute('data-wired', '1');
      var captcha = setupCaptcha(form);
      /* Submit-time validation + client-side security + STACKED toast feedback.
         Each invalid field becomes its OWN toast (they stack + dismiss one-by-one) and the field is
         HIGHLIGHTED via aria-invalid (no inline text). Sending shows a loading toast, then success/error.
         No live/on-type validation, no fetch/console/server load here; the server's guard.php stays the
         authoritative check. CAPTURE phase so it blocks the send below when a field is invalid. */
      var SG_BAD = /<\s*\/?\s*[a-z!][^>]*>|<\s*script|javascript:|\bon[a-z]{3,}\s*=|<\?|\?>|\{\{|\}\}|`|\$\(|\beval\s*\(|\bexec\s*\(|\/\*[\s\S]{0,400}?\*\/|\bmso-[a-z-]+\s*:|@import\s+(?:url\s*\(|["'])|@media\s[^{;]{0,80}\{|@font-face\s*\{|\{[^{}]{0,300}?[a-z-]+\s*:\s*[^{};]{1,120};|\bstyle\s*=\s*["'][^"']*:|\bNormal\s+0\s+false\s+false\b|\bX-NONE\b|\bMso[A-Z][A-Za-z]{2,}\b|\b(?:font-family|font-size|line-height|letter-spacing|text-indent|text-decoration|vertical-align|background-color|border-collapse|white-space|list-style|font-weight|text-transform)\s*:/i;
      function sgFieldMsg(f) {
        var v = (f.value || '').trim();
        if (f.hasAttribute('required') && v === '') return f.name === 'captcha' ? 'Please answer the security check.' : (f.getAttribute('data-label') ? 'Please enter your ' + f.getAttribute('data-label').toLowerCase() + '.' : 'This field is required.');
        if (v !== '' && SG_BAD.test(v)) { var lbl = f.getAttribute('data-label'); return (lbl ? lbl : 'This field') + ' cannot contain code, scripts or markup — please remove it.'; }
        if (f.type === 'email' && v !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Please enter a valid email address, like name@example.com.';
        return '';
      }
      function sgToast(text, type, seq) {
        var wrap = document.querySelector('.sg-toasts');
        if (!wrap) { wrap = document.createElement('div'); wrap.className = 'sg-toasts'; wrap.setAttribute('aria-live', 'polite'); document.body.appendChild(wrap); }
        while (wrap.children.length > 4) wrap.removeChild(wrap.firstChild);
        var t = document.createElement('div');
        t.className = 'sg-toast ' + type;
        t.style.setProperty('--sg-dur', ((type === 'ok' ? 5 : 6) + (seq || 0) * 0.6) + 's');
        t.setAttribute('role', type === 'err' ? 'alert' : 'status');
        t.innerHTML = '<span class="sg-toast-ico" aria-hidden="true"></span><div class="sg-toast-body"><p class="sg-toast-title"></p><p class="sg-toast-msg"></p></div><button type="button" class="sg-toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><span class="sg-toast-bar"></span>';
        t.querySelector('.sg-toast-title').textContent = type === 'ok' ? 'Success' : type === 'err' ? 'Error' : text;
        t.querySelector('.sg-toast-msg').textContent = type === 'info' ? '' : text;
        var done = false;
        function hide() { if (done) return; done = true; t.classList.add('hide'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 340); }
        t.querySelector('.sg-toast-close').addEventListener('click', hide);
        t.querySelector('.sg-toast-bar').addEventListener('animationend', hide);
        t._hide = hide;
        wrap.appendChild(t);
        requestAnimationFrame(function () { t.classList.add('show'); });
        setTimeout(hide, 30000);
        return t;
      }
      var sgStatus = statusEl(form), sgPend = false, sgSending = null;
      new MutationObserver(function () {
        if (sgPend) return; sgPend = true;
        requestAnimationFrame(function () {
          sgPend = false; var txt = (sgStatus.textContent || '').trim(); if (!txt) return;
          var cls = sgStatus.className;
          if (cls.indexOf('err') !== -1) { if (sgSending) { sgSending._hide(); sgSending = null; } sgToast(txt, 'err'); }
          else if (cls.indexOf('ok') !== -1) { if (sgSending) { sgSending._hide(); sgSending = null; } sgToast(txt, 'ok'); }
          else { if (sgSending) sgSending._hide(); sgSending = sgToast(txt, 'info'); }
        });
      }).observe(sgStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      function sgSkip(f) { return f.type === 'hidden' || f.type === 'submit' || f.type === 'button' || f.name === '_honey'; }
      form.addEventListener('submit', function (e) {
        var bad = null, msgs = [];
        Array.prototype.forEach.call(form.querySelectorAll('input, textarea, select'), function (f) {
          if (sgSkip(f)) return; clearError(f); var m = sgFieldMsg(f);
          if (m) { f.setAttribute('aria-invalid', 'true'); msgs.push(m); bad = bad || f; } else { f.removeAttribute('aria-invalid'); }
        });
        if (bad) {
          e.preventDefault(); e.stopImmediatePropagation();
          msgs.forEach(function (m, i) { sgToast(m, 'err', i); });
          bad.focus();
        }
      }, true);
      form.addEventListener('submit', function (e) {
        var ok = true, firstBad = null;
        Array.prototype.forEach.call(form.querySelectorAll('input, textarea, select'), function (f) {
          if (f.type === 'hidden' || f.type === 'submit' || f.type === 'button') return;
          clearError(f);
          var val = (f.value || '').trim();
          if (f.hasAttribute('required') && val === '') {
            setError(f, f.name === 'captcha' ? 'Please answer the security check.' : (f.getAttribute('data-label') ? 'Please enter your ' + f.getAttribute('data-label').toLowerCase() + '.' : 'This field is required.')); ok = false; firstBad = firstBad || f;
          } else if (f.type === 'email' && val !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
            setError(f, 'Please enter a valid email address, like name@example.com.'); ok = false; firstBad = firstBad || f;
          }
        });
        if (captcha && ok && captcha.input.value.trim() !== '' && !captcha.check()) {
          setError(captcha.input, 'That is not quite right — please solve the sum again.');
          ok = false; firstBad = firstBad || captcha.input;
        }
        // Proof-of-work (only when the server issued one) must be solved before we can send —
        var status = statusEl(form);
          if (!ok) {
            e.preventDefault();
            status.className = 'form-status err js';
            status.setAttribute('role', 'alert');
            status.textContent = 'A few details need fixing — please check the highlighted fields below.';
            if (firstBad) firstBad.focus();
        /* A new question on THIS path too, so "the sum changes every time submit is pressed" holds
           without exception — including when the click never reaches the server because a required
           field was empty. Otherwise one challenge could be held open across any number of submit
           attempts simply by leaving a field blank, which is the one way to press submit repeatedly
           without ever spending the token.
           Deliberately AFTER the focus() below: regen() clears the answer box, so telling the visitor
           what to fix first keeps the reason for the reset obvious. */
        if (captcha) captcha.regen();
            return;
          }

          /* Proof-of-work is REQUIRED but must never reject a real person: if it is still solving,
             wait for it (usually <1s), then re-submit — the form is only sent once the nonce is ready. */
          if (captcha && captcha.mode === 'server' && !captcha.powReady) {
            e.preventDefault();
            status.className = 'form-status js'; status.setAttribute('role', 'status');
            status.classList.remove('ok', 'err'); status.textContent = 'Verifying you’re human…';
            captcha.whenReady().then(function () {
              if (form.requestSubmit) form.requestSubmit();
              else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            });
            return;
          }

          /* PREFERRED PATH — the site's OWN data/contact.php: it mails the department AND emails
             the sender an acknowledgement, and checks the captcha server-side. No third party. */
          if (captcha && captcha.mode === 'server') {
            e.preventDefault();
            var fd = new FormData(form);
            fd.append('token', captcha.token);
            status.className = 'form-status ok js';
            status.setAttribute('role', 'status');
            status.classList.remove('ok','err'); status.textContent = 'Sending your message…';
            fetch(contactEndpoint(), { method: 'POST', body: fd })
              .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
              .then(function (d) {
                if (d && d.ok) {
                  status.className = 'form-status ok js';
                  status.textContent = (d.message || 'Thank you! Your message has been sent. We will get back to you soon.');
                  form.reset(); captcha.regen();
                } else {
                  status.className = 'form-status err js';
                  status.setAttribute('role', 'alert');
                  status.textContent = (d && d.error) || 'Sorry, we could not send your message just now. Please try again, or email us directly.';
                  captcha.regen();
                }
              })
              .catch(function () {
                status.className = 'form-status err js';
                status.textContent = 'Sorry, we could not send your message just now. Please try again, or email us directly.';
              });
          }
      });
    });
  }

  /* ===== External links — ↗ arrow + "you are leaving this website" interstitial (COMPULSORY on every
     site: every link to a DIFFERENT host than this site's own canonical domain gets target=_blank +
     rel=noopener + a ↗ arrow (text links) and a confirm popup so a visitor never lands on an external
     site unknowingly). Chrome icon links (social/translate/bhashini) get the new-tab attrs but no
     arrow/interstitial. Idempotent; re-run per <main> swap + after the async footer builds. ===== */
  function extSiteDomain(){ var c=document.querySelector('link[rel="canonical"]')||document.querySelector('meta[property="og:url"]');
    if(c){ try{ return new URL(c.href||c.content).hostname.replace(/^www\./,''); }catch(e){} } return location.hostname.replace(/^www\./,''); }
  function extIsExternal(a){ var href=a.getAttribute('href')||''; if(!/^https?:\/\//i.test(href)) return false;
    var h; try{ h=new URL(a.href).hostname.replace(/^www\./,''); }catch(e){ return false; } return !!h && h!==extSiteDomain(); }
  function extIsChrome(a){ return !!(a.closest && a.closest('.s3-social,.s3-topbar .s3-ico-btn,.s3-ico-btn,[class*="bhashini"],[id*="bhashini"]')); }
  function markExtLinks(root){ root=root||document; var links=root.querySelectorAll('a[href^="http"]');
    for(var i=0;i<links.length;i++){ var a=links[i]; if(a.getAttribute('data-sg-ext')||!extIsExternal(a)) continue;
      a.setAttribute('data-sg-ext','1'); a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer');
      // interstitial popup on EVERY external link (incl. chrome/social); ↗ arrow only on TEXT non-chrome links
      if((a.textContent||'').trim() && !a.querySelector('.s3-ext-ico') && !extIsChrome(a)) a.insertAdjacentHTML('beforeend',' <span class="s3-ext-ico" aria-hidden="true">↗</span>');
      a.setAttribute('data-sg-ext-confirm','1'); } }
  var _extModal=null,_extPrev=null;
  function extSiteName(){ var t=(document.querySelector('.s3-dept-en')||{}).textContent||''; return (t||'This website').trim(); }
  function buildExtModal(){ if(_extModal) return _extModal;
    var m=document.createElement('div'); m.className='s3-extmodal'; m.hidden=true; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); m.setAttribute('aria-labelledby','sg-extm-h');
    m.innerHTML='<div class="s3-extmodal-box"><div class="s3-extmodal-head"><span class="s3-extmodal-icon"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></span>'
      +'<h2 id="sg-extm-h" class="s3-extmodal-h">You are leaving this website</h2></div>'
      +'<p class="s3-extmodal-p">You are being redirected to an external website:</p><p class="s3-extmodal-url"></p>'
      +'<p class="s3-extmodal-note">'+s3esc(extSiteName())+' is not responsible for the content, accuracy or privacy policies of external websites.</p>'
      +'<div class="s3-extmodal-actions"><button type="button" class="s3-btn s3-btn--ghost s3-extmodal-cancel">Cancel</button>'
      +'<a class="s3-btn s3-extmodal-go" target="_blank" rel="noopener noreferrer">Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div></div>';
    document.body.appendChild(m); _extModal=m;
    m.addEventListener('click',function(e){ if(e.target===m) closeExtModal(); });
    m.querySelector('.s3-extmodal-cancel').addEventListener('click',closeExtModal);
    m.querySelector('.s3-extmodal-go').addEventListener('click',function(){ setTimeout(closeExtModal,60); }); return m; }
  function openExtModal(url){ var m=buildExtModal(); m.querySelector('.s3-extmodal-url').textContent=url; var go=m.querySelector('.s3-extmodal-go'); go.href=url;
    _extPrev=document.activeElement; m.hidden=false; document.body.classList.add('s3-extmodal-open'); setTimeout(function(){ try{ go.focus(); }catch(e){} },30); }
  function closeExtModal(){ if(!_extModal) return; _extModal.hidden=true; document.body.classList.remove('s3-extmodal-open'); if(_extPrev&&_extPrev.focus){ try{ _extPrev.focus(); }catch(e){} } }
  document.addEventListener('keydown',function(e){ if(_extModal&&!_extModal.hidden&&e.key==='Escape') closeExtModal(); });
  document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a[data-sg-ext-confirm]'); if(!a) return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button) return; e.preventDefault(); openExtModal(a.href); },true);
  function initExtLinks(){ try{ markExtLinks(document); }catch(e){} }

  /* PRINT titles for tabs: on screen a tab shows one panel; in print we stack ALL panels, so copy each
     tab LABEL into its panel as a print-only heading (.s3-tabpanel-ptitle{display:none} on screen, shown
     in @media print). Universal — home builder + every static tabbed doc page. */
  function initTabPrintTitles() {
    document.querySelectorAll('.s3-tabs').forEach(function (tabs) {
      var labels = tabs.querySelectorAll('.s3-tablabels label');
      var panels = tabs.querySelectorAll('.s3-tabpanel');
      panels.forEach(function (panel, i) {
        if (panel.querySelector(':scope > .s3-tabpanel-ptitle')) return;
        var txt = labels[i] ? labels[i].textContent.trim() : '';
        if (!txt) return;
        var h = document.createElement('h3'); h.className = 's3-tabpanel-ptitle'; h.textContent = txt;
        panel.insertBefore(h, panel.firstChild);
      });
    });
  }
  function initMainWidgets() { initWimCards(); initTabPrintTitles(); try { initForms(document); } catch (e) {} initSlider(); initTicker(); initLogos(); initVmarquee(); initMqArrows(); initGallery(); initCarousel(); initReveal(); initSectionTabs(); initExtLinks();; upgradeIcons(document) }
  function initContentWidgets() { initChromeOnce(); initMainWidgets(); }

  /* ---------- bootstrap (RE-CALLABLE for partial navigation) ---------- */
  function bootMain(first) {
    var homeMain = document.querySelector('[data-s3-home]');
    if (homeMain) {
      var family = homeMain.getAttribute('data-s3-layout') || 'services';
      homeMain.classList.add('s3-fam-' + family);
      fetch('/resources' + '/data/home/_index.json', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (parts) {
          return Promise.all((parts || []).map(function (n) {
            return fetch('/resources' + '/data/home/' + n + '.json', { cache: 'no-store' })
              .then(function (r) { return r.ok ? r.json() : {}; })
              .catch(function () { return {}; });
          })).then(function (chunks) {
            var d = {};
            chunks.forEach(function (c) { for (var k in (c || {})) { if (k.charAt(0) !== '_') d[k] = c[k]; } });
            return d;
          });
        })
        .catch(function () {
          return fetch('/resources' + '/data/s3waas/home.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
        })
        .then(function (data) {
          var _hn = (document.querySelector('.s3-dept-en') || {}).textContent || document.title || 'Home';
          var _h1 = homeMain.querySelector('h1');
          homeMain.innerHTML = (_h1 ? _h1.outerHTML : '<h1 class="visually-hidden">' + _hn + '</h1>') + buildHome(data || {}, family);
          stripeSections(homeMain);
          upgradeIcons(homeMain);
        })
        .catch(function () {})
        .then(function () { if (first) { initContentWidgets(); } else { initMainWidgets(); if (window.SGMarkCurrent) window.SGMarkCurrent(); } });
    } else {
      if (first) { initContentWidgets(); } else { initMainWidgets(); if (window.SGMarkCurrent) window.SGMarkCurrent(); }
    }

    window.__sgToast = sgToast;
  }
  bootMain(true);
  window.SGBoot = function () { bootMain(false); };     // spa-nav.js: re-init a swapped-in <main>
  // window.SGMarkCurrent is set by the nav IIFE above (markCurrent is scoped there).
})();

/* ---- back-to-top: same UI + behaviour as the GIGW theme (filled arrow, fade in
   on scroll, smooth scroll to top) ---- */
(function () {
  'use strict';
  var top = document.querySelector('.s3-totop');
  if (!top) return;
  top.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 7.3l8 8-1.6 1.6L12 10.5l-6.4 6.4L4 15.3z"/></svg>';
  function sync() { top.classList.toggle('show', window.scrollY > 80); }
  window.addEventListener('scroll', sync, { passive: true }); sync();
  top.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();

/* ---- skip-link target: <main id="s3-main"> needs tabindex="-1" so "Skip to Main
   Content" actually MOVES FOCUS into it. Without it the browser leaves focus on the
   skip link and the jump bounces back to the top — i.e. the skip link does nothing.
   (The GIGW theme does the same for #main-content in main.js.) ---- */
(function () {
  var m = document.getElementById('s3-main');
  if (m && !m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
})();

/* ============================================================================
   In-page anchor fix for portable pages that use <base href>. A fragment-only
   link (href="#s3-main") resolves against the <base>, NOT the current page, so
   "Skip to Main Content" / "Go to top" would navigate to the base (home) instead
   of jumping within the current page. Handle same-page fragment links here:
   scroll to the target AND move focus to it (accessibility for the skip link).
   Harmless on pages without <base>. ============================================ */
(function () {
  'use strict';
  // Rewrite fragment-only hrefs (#s3-main, #id) to an ABSOLUTE current-page path so
  // native navigation scrolls within THIS page even under <base href> (which would
  // otherwise send #s3-main to the base/home). Portable: uses the live pathname.
  function base() { return location.pathname + location.search; }
  function fixHrefs() {
    // Remember each link's ORIGINAL fragment in data-sg-frag the first time, then always re-point
    // from that. Without this, once "#s3-main" is rewritten to "/path/#s3-main" the selector
    // a[href^="#"] no longer matches it, so a re-run (after spa-nav changes the page) can't update
    // the now-stale href — and spa-nav then treats the skip link as a cross-page link.
    var links = document.querySelectorAll('a[href^="#"], a[data-sg-frag]');
    Array.prototype.forEach.call(links, function (a) {
      var frag = a.getAttribute('data-sg-frag');
      if (!frag) {
        var h = a.getAttribute('href') || '';
        if (h.charAt(0) === '#' && h.length > 1) { frag = h; a.setAttribute('data-sg-frag', frag); }
      }
      if (frag) a.setAttribute('href', base() + frag);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixHrefs);
  else fixHrefs();
  // After a spa-nav partial navigation the URL changes but the persistent chrome's skip link keeps
  // the href fixHrefs wrote for the FIRST page — now stale, so spa-nav would treat "Skip to Main
  // Content" as a cross-page link and navigate away instead of scrolling. Re-run fixHrefs so every
  // fragment link points at the CURRENT page again.
  window.addEventListener('spa:navigated', fixHrefs);
  // Smooth-scroll + move focus for same-page fragment links (covers rewritten ones too).
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var raw = a.getAttribute('href') || '', hash = '';
    if (raw.charAt(0) === '#' && raw.length > 1) hash = raw;
    else { var p = base(), k = location.pathname; if (raw.indexOf(p + '#') === 0) hash = raw.slice(p.length); else if (raw.indexOf(k + '#') === 0) hash = raw.slice(k.length); }
    if (hash.length < 2) return;
    var el = document.getElementById(hash.slice(1));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); }
    try { history.replaceState(null, '', base() + hash); } catch (x) {}
  });
})();

/* ============================================================================
   Hero slider image fit: certificate / document / portrait slides get
   object-fit:contain (whole image visible, never over-cropped); landscape
   photos keep the default cover. Auto-detected by natural aspect ratio, so no
   per-slide markup is needed. Runs after the async home build + on window load.
   ============================================================================ */
(function () {
  'use strict';
  function fit(img) {
    if (img.getAttribute('data-fit')) return;   // explicit per-slide fit set in home.json — leave it
    if (!img.naturalWidth || !img.naturalHeight) return;
    if (img.naturalHeight > img.naturalWidth * 1.02) img.classList.add('s3-fit-contain');
    else img.classList.remove('s3-fit-contain');
  }
  function scan() {
    var imgs = document.querySelectorAll('.s3-hero .s3-slide img');
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.complete) fit(img); else img.addEventListener('load', function () { fit(img); });
    });
    return imgs.length;
  }
  // the hero is built from home.json AFTER this script parses, so poll briefly.
  var tries = 0;
  var iv = setInterval(function () { if (scan() || ++tries > 50) clearInterval(iv); }, 100);
  window.addEventListener('load', scan);
})();

/* ============================================================================
   Mobile/tablet (<=1024px): the S3WaaS top-bar search shows only its icon; the
   first tap opens the input (doesn't submit), a second tap (or Enter) submits.
   It closes again on blur when empty. Desktop is unaffected. S3WaaS top bar only.
   ============================================================================ */
(function () {
  'use strict';
  var form = document.querySelector('.s3-topbar .s3-search');
  if (!form) return;
  var input = form.querySelector('input'), btn = form.querySelector('button');
  var mq = window.matchMedia('(max-width:1024px)');
  // build the mobile dropdown: wrap the input + a JOINED submit button in a white
  // floating "pop" form. It is display:contents on desktop, so desktop search is unchanged.
  if (btn && input && !form.querySelector('.s3-search-pop')) {
    var go = document.createElement('button');
    go.type = 'submit';
    go.className = 's3-search-go';
    go.setAttribute('aria-label', 'Search');
    go.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
    var pop = document.createElement('div');
    pop.className = 's3-search-pop';
    form.insertBefore(pop, input);   // wrapper takes the input's place
    pop.appendChild(input);          // move the input inside
    pop.appendChild(go);             // joined submit button right after it
  }
  if (btn) btn.addEventListener('click', function (e) {
    if (!mq.matches) return;                     // desktop: the row icon submits as normal
    e.preventDefault();                          // mobile/tablet: the row icon TOGGLES the dropdown
    var open = form.classList.toggle('s3-search-open');
    if (open && input) input.focus();            // the in-dropdown button / Enter submit the search
  });
  if (mq.addEventListener) mq.addEventListener('change', function () { if (!mq.matches) form.classList.remove('s3-search-open'); });
})();

/* Responsive data tables show each cell's column label on mobile via the CSS
   `.s3-table td::before{content:attr(data-label)}` rule. But CSS-generated content is NOT a DOM
   text node, so a page translator (Bhashini) can't reach it — pick Konkani and the desktop
   <th> text translates while the mobile card labels stay English. Fix: inject the label as a
   REAL element the translator can see. It's visually identical to the ::before (same
   weight/colour/position) and gated by the .s3-tdlabels root class so the ::before still
   works with JS off. aria-hidden: screen readers already get the header from table semantics.
   Idempotent; re-runs after every <main> swap (spa:navigated). */
(function () {
  'use strict';
  var SELECTOR = '.s3-table td[data-label]';
  function initCellLabels() {
    var tds = document.querySelectorAll(SELECTOR);
    if (!tds.length) return;
    Array.prototype.forEach.call(tds, function (td) {
      if (td.firstElementChild && td.firstElementChild.classList.contains('s3-td-label')) return;
      var lab = td.getAttribute('data-label') || '';
      if (!lab) return;
      var s = document.createElement('span');
      s.className = 's3-td-label';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = lab;
      td.insertBefore(s, td.firstChild);
    });
    document.documentElement.classList.add('s3-tdlabels');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCellLabels);
  else initCellLabels();
  window.addEventListener('spa:navigated', initCellLabels);
  // Data tables arrive asynchronously from data/tables/*.json (tables.js), so their
  // cells miss the passes above — relabel when tables.js says the rows have landed.
  window.addEventListener('sg:tables-rendered', initCellLabels);

  /* Load the shared table renderer. S3WaaS pages list their scripts explicitly, so
     rather than editing every page we pull it in from here, resolving the path from
     THIS script's own src — which keeps working for pages that link assets
     relatively and after the portable theme-demo build rewrites paths. */
  (function loadTables() {
    if (window.SGTables || document.querySelector('script[src*="assets/js/tables.js"]')) return;
    var me = document.querySelector('script[src*="s3waas.js"], script[src*="/s3.js"]');
    var src = (me && me.getAttribute('src')) || '';
    var base = src.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
    var s = document.createElement('script');
    s.src = (base || '/resources/assets/js/') + 'tables.js';
    document.head.appendChild(s);
  })();
})();
