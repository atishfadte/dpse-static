/* Site front-end behaviour (WCAG 2.1 AA)
   Keyboard operable nav (A21), pausable slider (A25), no keyboard traps. */

/* ============================================================================
   SG runtime — lets nav.js (the SPA-style router) re-initialise page behaviour
   after it swaps <main>, without reloading the document.

   - "Chrome" code (the header nav, font/dark/language controls, the body-level
     singletons like the video modal and accessibility FAB) is bound ONCE, as
     plain IIFEs, because the header/footer and those singletons persist across
     navigations.
   - "Content" code (sliders, tabs, counters, page forms, …) lives inside
     <main>, which is replaced on every navigation, so it is registered with
     SG.content(): it runs once now (first load) and is re-run by the router
     after each swap.
   - Anything that starts a loop or a global listener registers a matching
     SG.onTeardown() so the router can stop it before leaving the page — no
     orphaned requestAnimationFrame loops or duplicated listeners piling up.
   ========================================================================== */
window.SG = window.SG || {};

/* ============================================================================
   Broken-image safety net — many original photos were removed, so any <img>
   whose file is missing is swapped for a REAL placeholder photo from
   loremflickr.com. A stable lock (derived from the original path) keeps the
   same slot showing the same picture across reloads, and the image's own
   width/height (or sane defaults) drive the requested size. Uses event
   delegation in the capture phase so it also catches images injected later
   by includes.js / nav.js.
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
  function lockFrom(s) {                        // tiny stable hash -> deterministic lock
    var h = 0, i = 0;
    for (; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff; }
    return h % 100000;
  }
  function swap(img) {
    if (!img || img.dataset.imgFallback) return;   // never loop on our own URL
    img.dataset.imgFallback = '1';
    var orig = img.getAttribute('src') || img.alt || 'img';
    var w = img.getAttribute('width') || img.naturalWidth || 640;
    var h = img.getAttribute('height') || img.naturalHeight || 420;
    // Pick a local generic placeholder (square for ~1:1 slots, else landscape),
    // chosen deterministically so the same slot always shows the same image.
    var square = Math.abs(w - h) <= 40;
    var pool = square
      ? ['/resources/assets/media/placeholders/ph-sq-1.jpg','/resources/assets/media/placeholders/ph-sq-2.jpg','/resources/assets/media/placeholders/ph-sq-3.jpg','/resources/assets/media/placeholders/ph-sq-4.jpg']
      : ['/resources/assets/media/placeholders/ph-land-1.jpg','/resources/assets/media/placeholders/ph-land-2.jpg','/resources/assets/media/placeholders/ph-land-3.jpg','/resources/assets/media/placeholders/ph-land-4.jpg','/resources/assets/media/placeholders/ph-land-5.jpg','/resources/assets/media/placeholders/ph-land-6.jpg','/resources/assets/media/placeholders/ph-land-7.jpg','/resources/assets/media/placeholders/ph-land-8.jpg'];
    img.src = pool[lockFrom(orig) % pool.length];
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.tagName === 'IMG') swap(t);
  }, true);   // capture: error events don't bubble
})();

(function () {
  var content = [];      // per-page initialisers — re-run after every swap
  var teardowns = [];    // cleanups for the page being navigated away from

  function run(fn) {
    try { fn(); } catch (e) { if (window.console && console.error) console.error('[SG]', e); }
  }

  // Register a content initialiser AND run it now (so the first page load works
  // without the router being involved).
  SG.content = function (fn) { content.push(fn); run(fn); };

  // Re-run every content initialiser against the freshly-swapped <main>.
  SG.initContent = function () { content.forEach(run); };

  // Register a cleanup for the current page; the router calls SG.teardown()
  // before swapping, which runs and then clears them.
  SG.onTeardown = function (fn) { teardowns.push(fn); };
  SG.teardown = function () { var list = teardowns; teardowns = []; list.forEach(run); };
})();

/* ============================================================================
   CHROME — bound once. The header (top bar + nav) and footer are rendered by
   includes.js and persist across SPA navigations, so their handlers are wired
   a single time here.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Mobile hamburger menu (open/close + Esc + click-outside) ---------- */
  var navToggle = document.querySelector('.nav-toggle');
  var navMenu = document.getElementById('primary-menu');
  var mainnav = document.querySelector('.mainnav');
  if (navToggle && navMenu) {
    function closeMenu() {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      if (mainnav) mainnav.classList.remove('menu-open');
    }
    function openMenu() {
      navMenu.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      if (mainnav) mainnav.classList.add('menu-open');
    }
    navToggle.addEventListener('click', function (e) {
      // DPSE: mark handled so includes.js's fallback toggle (same button) stands down —
      // without this the two handlers open then immediately close the menu.
      e.preventDefault();
      if (navMenu.classList.contains('open')) closeMenu(); else openMenu();
    });
    // Esc closes mobile menu and returns focus to the toggle
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('open')) {
        closeMenu();
        navToggle.focus();
      }
    });
    // Click outside the nav closes the mobile menu
    document.addEventListener('click', function (e) {
      if (!navMenu.classList.contains('open')) return;
      if (e.target.closest('.mainnav')) return;
      closeMenu();
    });
    // When a real navigation link is clicked, close everything so no dropdown/flyout
    // stays open after the page changes — on DESKTOP and mobile. (Parents are <button>s,
    // so a[href] matches only leaf nav/sub links, never the toggles.) Blurring drops the
    // :focus-within that would otherwise hold a hover-dropdown open after the SPA swap.
    navMenu.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      closeAll(null);
      closeFlyouts(navMenu);
      // The submenu also opens purely on CSS :hover — so removing .open isn't enough while
      // the pointer is still over the just-clicked menu. Tag the parent (and any flyout)
      // .click-closed: CSS then force-hides it despite :hover, until the mouse leaves
      // (the parents' mouseleave handler clears the tag, restoring hover-to-open).
      var parentLi = link.closest('.nav-item.has-children');
      if (parentLi) parentLi.classList.add('click-closed');
      var flyLi = link.closest('.has-flyout');
      if (flyLi) flyLi.classList.add('click-closed');
      if (window.matchMedia('(max-width:900px)').matches) closeMenu();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    });
  }

  /* ---------- Dropdown menus (mouse + full keyboard navigation) ----------
     Enter/Space on a top item toggles its submenu; Arrow Down opens + enters it;
     Arrow Up/Down cycle the items; Home/End jump to first/last; Arrow Left/Right
     move between top-level menus; Escape closes and returns focus to the button. */
  var navMenuEl = document.getElementById('primary-menu');
  var parents = document.querySelectorAll('.nav-item.has-children');
  var topItems = [];
  if (navMenuEl) {
    Array.prototype.forEach.call(navMenuEl.children, function (li) {
      var el = li.querySelector('.nav-link, .nav-parent');
      if (el) topItems.push(el);
    });
  }
  function closeFlyouts(within) {
    var scope = within || document;
    Array.prototype.forEach.call(scope.querySelectorAll('.has-flyout.open'), function (o) {
      o.classList.remove('open');
      var sb = o.querySelector('.nav-subparent');
      if (sb) sb.setAttribute('aria-expanded', 'false');
    });
  }
  function closeAll(except) {
    parents.forEach(function (p) {
      if (p === except) return;
      p.classList.remove('open');
      var b = p.querySelector('.nav-parent');
      if (b) b.setAttribute('aria-expanded', 'false');
      closeFlyouts(p);
    });
  }
  function topElOf(node) {
    var li = node && node.closest ? node.closest('.nav-item') : null;
    return li ? li.querySelector('.nav-link, .nav-parent') : null;
  }
  function focusTop(delta) {
    var i = topItems.indexOf(topElOf(document.activeElement));
    if (i < 0) return;
    var n = topItems[(i + delta + topItems.length) % topItems.length];
    if (n) { closeAll(null); n.focus(); }
  }
  // Mouse / Enter / Space toggle (button fires click natively on Enter & Space).
  // Clicking the parent toggles the menu open AND closed. On desktop the submenu also
  // opens on :hover / :focus-within (see style.css); after an explicit click-to-close
  // the pointer is still over the item and the button still has focus, which would
  // immediately re-open it — so we tag the item `click-closed` to suppress hover/focus
  // opening until the pointer leaves (mouseleave clears it, restoring hover-to-open).
  parents.forEach(function (p) {
    var btn = p.querySelector('.nav-parent');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var willOpen = !p.classList.contains('open');
      closeAll(p);
      p.classList.toggle('open', willOpen);
      p.classList.toggle('click-closed', !willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    p.addEventListener('mouseleave', function () {
      p.classList.remove('click-closed');
      Array.prototype.forEach.call(p.querySelectorAll('.has-flyout.click-closed'), function (f) { f.classList.remove('click-closed'); });
    });
  });
  // Arrow-key navigation, delegated across the whole menu.
  if (navMenuEl) {
    navMenuEl.addEventListener('keydown', function (e) {
      var t = document.activeElement;
      var parent = t && t.closest ? t.closest('.nav-item.has-children') : null;
      var btn = parent ? parent.querySelector('.nav-parent') : null;
      var inSubmenu = !!(t && t.closest && t.closest('.submenu'));
      var items = parent ? Array.prototype.slice.call(parent.querySelectorAll('.submenu a[href]')) : [];
      var idx = items.indexOf(t);
      function open() { if (parent) { closeAll(parent); parent.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); } }
      function close() { if (parent) { parent.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } }
      switch (e.key) {
        case 'ArrowRight': if (!inSubmenu) { e.preventDefault(); focusTop(1); } break;
        case 'ArrowLeft': if (!inSubmenu) { e.preventDefault(); focusTop(-1); } break;
        case 'ArrowDown':
          if (parent) {
            e.preventDefault(); open();
            if (idx < 0) { if (items[0]) items[0].focus(); }
            else { (items[idx + 1] || items[0]).focus(); }
          }
          break;
        case 'ArrowUp':
          if (parent && inSubmenu) { e.preventDefault(); if (idx <= 0) btn.focus(); else items[idx - 1].focus(); }
          break;
        case 'Home': if (parent && items.length) { e.preventDefault(); open(); items[0].focus(); } break;
        case 'End': if (parent && items.length) { e.preventDefault(); open(); items[items.length - 1].focus(); } break;
        case 'Escape': if (parent) { e.preventDefault(); close(); btn.focus(); } break;
      }
    });
    // Close any open menu once focus leaves the nav (Tab out).
    navMenuEl.addEventListener('focusout', function (e) {
      if (!navMenuEl.contains(e.relatedTarget)) closeAll(null);
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item.has-children')) closeAll(null);
  });
  // Third-level flyout: click / tap / Enter toggles it (needed for touch + mobile).
  if (navMenuEl) {
    navMenuEl.addEventListener('click', function (e) {
      var b = e.target.closest('.nav-subparent');
      if (!b) {
        if (!e.target.closest('.has-flyout')) closeFlyouts(navMenuEl);
        return;
      }
      e.preventDefault(); e.stopPropagation();
      var li = b.parentNode;
      var willOpen = !li.classList.contains('open');
      closeFlyouts(li.parentNode);          // close sibling flyouts in same submenu
      li.classList.toggle('open', willOpen);
      b.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  }

  /* ---------- Long dropdowns: fit to viewport + scroll, pause page scroll ----------
     A submenu — or, more often, its THIRD-LEVEL flyout (a "dropdown with its own
     dropdown", e.g. a long list of PDF links) — can be taller than the screen, so
     its lower items get cut off with no way to reach them. For every OPEN dropdown
     panel we cap its height to the space below its own top and let it scroll, so
     ALL items are reachable. `overscroll-behavior:contain` (CSS) keeps that wheel/
     touch scroll INSIDE the panel instead of chaining to the page, and while a
     panel is EXPLICITLY open (click / keyboard set `.open`, never pure hover — so
     desktop hover menus don't freeze) we lock the page scroll via `.nav-scroll-lock`.
     Works for both navbars (GIGW `.submenu`/`.submenu-flyout`, S3 `.s3-sub`/`.s3-flyout`). */
  (function () {
    var PANELS = '.submenu, .submenu-flyout, .s3-sub, .s3-flyout';
    var OPEN_SEL = '.nav-item.has-children.open, .has-flyout.open, .s3-menu > li.open, .s3-nav .open';
    var NAV_SCOPE = '.mainnav, .s3-menu, .s3-nav, .s3-drawer';
    var root = document.documentElement;

    function isFlyout(p) { return p.classList.contains('submenu-flyout') || p.classList.contains('s3-flyout'); }

    function fit(p) {
      var vh = window.innerHeight, margin = 16;   // gap kept between the panel and the viewport edges
      if (isFlyout(p)) {
        // A side-opening flyout is VERTICALLY CENTRED on the parent item it belongs to
        // (not top-aligned), then clamped into the viewport so a long list is never cut
        // off top or bottom — it just scrolls within the clamped height.
        var host = p.parentNode;                                   // .has-flyout / .s3-has-flyout (position:relative)
        var natural = p.scrollHeight;                              // full content height
        var maxH = Math.min(natural, vh - margin * 2);
        p.style.maxHeight = maxH + 'px';
        p.style.overflowY = (natural > maxH + 1) ? 'auto' : '';
        if (host && host.getBoundingClientRect) {
          var hr = host.getBoundingClientRect();
          var itemCenter = hr.top + hr.height / 2;                 // centre of the hovered item
          var top = itemCenter - maxH / 2;                         // viewport-space top to centre the flyout
          top = Math.max(margin, Math.min(top, vh - maxH - margin)); // clamp inside the viewport
          p.style.top = Math.round(top - hr.top) + 'px';           // offset relative to the positioned host
        }
        return;
      }
      var r = p.getBoundingClientRect();
      // Top-level submenu: cap to the space below its own top; never smaller than 160px
      // so a panel opening near the bottom edge is still usably scrollable.
      p.style.maxHeight = Math.max(160, Math.floor(vh - r.top - margin)) + 'px';
      p.style.overflowY = 'auto';
    }
    function clearFit(p) { p.style.maxHeight = ''; p.style.overflowY = ''; if (isFlyout(p)) p.style.top = ''; }

    function sync() {
      var panels = document.querySelectorAll(PANELS);
      // MOBILE / collapsed nav (<=900px): submenus + flyouts are stacked INLINE and the
      // whole menu (or the S3 drawer) scrolls as one panel — so we must NOT cap panels or
      // lock the page (that would trap the expanding menu). Clear any desktop sizing.
      if (window.matchMedia('(max-width:900px)').matches) {
        Array.prototype.forEach.call(panels, clearFit);
        root.classList.remove('nav-scroll-lock');
        return;
      }
      Array.prototype.forEach.call(panels, function (p) {
        var shown = p.offsetParent !== null && getComputedStyle(p).display !== 'none';
        // A panel that CONTAINS a nested flyout must stay overflow:visible so the
        // side-opening flyout isn't clipped — only cap leaf panels + the flyouts.
        var hasNested = !!p.querySelector('.submenu-flyout, .s3-flyout');
        if (shown && !hasNested) fit(p); else clearFit(p);
      });
      // Lock page scroll only on an explicit open (not hover), so scrolling moves the
      // open menu, not the page behind it.
      root.classList.toggle('nav-scroll-lock', !!document.querySelector(OPEN_SEL));
    }

    var raf;
    function schedule(e) {
      // Only react to interactions within a navbar — keep it cheap elsewhere.
      if (e && e.type !== 'resize' && !(e.target && e.target.closest && e.target.closest(NAV_SCOPE))) return;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    }
    ['mouseover', 'mouseout', 'click', 'keyup', 'focusin', 'focusout'].forEach(function (ev) {
      document.addEventListener(ev, schedule, true);
    });
    window.addEventListener('resize', schedule);
  })();

  /* ---------- Close every nav on page open ----------
     Whenever a page OPENS — first load AND after each SPA swap (this runs via
     SG.content, which re-fires post-swap) — make sure no navbar is left hanging
     open: collapse all GIGW dropdowns/flyouts + the mobile menu, all S3 inline
     dropdowns/flyouts + the drawer, drop the scroll locks, and clear any inline
     flyout sizing. So navigating with a menu open lands on a clean, closed nav. */
  SG.content(function closeAllNavOnOpen() {
    // GIGW main nav: dropdowns + third-level flyouts.
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item.has-children.open, .has-flyout.open'), function (li) {
      li.classList.remove('open', 'click-closed');
      var b = li.querySelector('.nav-parent, .nav-subparent');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
    var pm = document.getElementById('primary-menu'); if (pm) pm.classList.remove('open');
    var mn = document.querySelector('.mainnav'); if (mn) mn.classList.remove('menu-open');
    var nt = document.querySelector('.nav-toggle'); if (nt) nt.setAttribute('aria-expanded', 'false');
    // S3 nav: inline dropdowns + flyouts + the slide-in drawer.
    Array.prototype.forEach.call(document.querySelectorAll('.s3-menu > li.open, .s3-has-flyout.open'), function (li) {
      li.classList.remove('open', 'click-closed');
      var b = li.querySelector('button[aria-expanded]'); if (b) b.setAttribute('aria-expanded', 'false');
    });
    var dr = document.querySelector('.s3-drawer.open'); if (dr) dr.classList.remove('open');
    var ov = document.querySelector('.s3-drawer-overlay'); if (ov && !ov.hasAttribute('hidden')) ov.setAttribute('hidden', '');
    var dt = document.querySelector('.s3-nav-toggle'); if (dt) dt.setAttribute('aria-expanded', 'false');
    // Drop scroll locks + any inline flyout sizing left over from the previous page.
    document.documentElement.classList.remove('nav-scroll-lock', 's3-noscroll');
    Array.prototype.forEach.call(document.querySelectorAll('.submenu, .submenu-flyout, .s3-sub, .s3-flyout'), function (p) {
      p.style.maxHeight = ''; p.style.overflowY = ''; p.style.top = '';
    });
  });

  /* ---------- Font size controls ----------
     Scales ONLY the site content (body), not the accessibility bar. The util-bar
     uses absolute px + em internally, so this scale never affects it. */
  var STEP = 0.1, MIN = 0.85, MAX = 1.4;
  function applyFont(scale) {
    /* Content font-sizes are authored in `rem`, which resolves against the ROOT
       (<html>) element — NOT <body>. Scaling body alone did nothing, so scale the
       root. Body is kept proportional for any text that inherits body's size.
       The desktop util-bar is a fixed 14px so the control itself does not scale. */
    document.documentElement.style.fontSize = (scale * 16).toFixed(3) + 'px';
    document.body.style.fontSize = (scale * 17).toFixed(3) + 'px';
    try { localStorage.setItem('sg-font', scale); } catch (e) {}
  }
  var savedFont = 1;
  try { savedFont = parseFloat(localStorage.getItem('sg-font')) || 1; } catch (e) {}
  if (savedFont !== 1) applyFont(savedFont);
  document.querySelectorAll('.font-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var mode = b.getAttribute('data-font');
      var cur = parseFloat(localStorage.getItem('sg-font')) || 1;
      if (mode === 'inc') cur = Math.min(MAX, cur + STEP);
      else if (mode === 'dec') cur = Math.max(MIN, cur - STEP);
      else cur = 1;
      applyFont(cur);
    });
  });

  /* ---------- High-contrast mode removed ----------
     The control was dropped from the accessibility options. Clear any saved
     state so a user who previously enabled it isn't left stuck in it. */
  try {
    document.body.classList.remove('high-contrast');
    localStorage.removeItem('sg-contrast');
  } catch (e) {}

  /* ---------- Dark mode toggle ---------- */
  var dToggle = document.getElementById('dark-toggle');
  function applyDark(on) {
    document.documentElement.classList.toggle('dark-mode', on);
    if (dToggle) {
      dToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      var dl = dToggle.querySelector('.dark-label');
      if (dl) dl.textContent = on ? 'Light' : 'Dark';
    }
    try { localStorage.setItem('sg-dark', on ? '1' : '0'); } catch (e) {}
  }
  try { if (localStorage.getItem('sg-dark') === '1') applyDark(true); } catch (e) {}
  if (dToggle) {
    dToggle.addEventListener('click', function () {
      applyDark(!document.documentElement.classList.contains('dark-mode'));
    });
  }

  /* ---------- Language selector — Bhashini integration (EN / HI / KOK) ---------- */
  /* Drives the Bhashini translation widget (https://bhashini.gov.in/).
     On any select change: stores choice, calls Bhashini's translation API if available,
     and falls back to setting the <html lang> attribute. */
  var lang = document.getElementById('lang-select');
  if (lang) {
    try {
      var saved = localStorage.getItem('sg-lang');
      if (saved && saved !== 'en') {
        lang.value = saved;
        document.documentElement.setAttribute('lang', saved);
      }
    } catch (e) {}
    lang.addEventListener('change', function () {
      var v = lang.value;
      document.documentElement.setAttribute('lang', v === 'en' ? 'en' : v);
      try { localStorage.setItem('sg-lang', v); } catch (e) {}
      // Bhashini plugin hook — if the global is present, dispatch a translation request.
      if (window.BhashiniPlugin && typeof window.BhashiniPlugin.translate === 'function') {
        window.BhashiniPlugin.translate({ targetLanguage: v });
      } else {
        // Fallback: announce change to AT users.
        var live = document.getElementById('lang-live');
        if (!live) {
          live = document.createElement('div');
          live.id = 'lang-live';
          live.className = 'visually-hidden';
          live.setAttribute('aria-live', 'polite');
          document.body.appendChild(live);
        }
        live.textContent = 'Language set to ' + ({ en: 'English', hi: 'Hindi', kok: 'Konkani' }[v] || v);
      }
    });
  }

  /* ============================================================================
     SG.lang — WHICH LANGUAGE IS THE PAGE BEING READ IN?

     Bhashini translates TEXT. It cannot translate a poster whose words are baked
     into the pixels, so a Hindi reader was still shown the English artwork. This
     resolves the active language so those images can be swapped (see the
     language-aware media block below).

     The Bhashini v3 plugin renders its own language list and fires no change
     event, but the list it builds IS a reliable hook — each row carries the
     language code and the plugin keeps the selected one marked:

       <li class="language-option" data-value="gom" role="option" aria-selected="false">
         Goan Konkani <span lang="gom">(गोवा कोंकणी)</span></li>

     So we read data-value (never the visible label, which is prose in two
     scripts and changes with the widget's own translations), and treat
     aria-selected="true" as the live answer. Signals, in priority order:

       1. a click / Enter / Space on a [data-value] row — the user's intent,
          available immediately, before the widget has updated anything;
       2. the row currently marked aria-selected="true" — the widget's own
          published state, watched with a MutationObserver so a selection made
          any other way (restored on load, keyboard, the widget's own code)
          is picked up too;
       3. whatever the plugin persisted, for the moment before its UI exists;
       4. <html lang>, then localStorage 'sg-lang' — our own hidden select;
       5. otherwise English.

     Konkani arrives as both 'gom' (Bhashini, ISO 639-3 Goan Konkani) and 'kok'
     (our header select, ISO 639-2). Same language to a reader — both normalise
     to 'kok', and an image may declare either as its variant suffix.
     ========================================================================== */
  (function () {
    var ALIASES = { gom: 'kok', kok: 'kok', kon: 'kok', hi: 'hi', hin: 'hi', en: 'en', eng: 'en' };
    // Rows in the plugin's listbox, and in our own hidden fallback select.
    var ROW = '[data-value][role="option"], .language-option[data-value], [data-value].language-option';

    function norm(code) {
      var c = String(code || '').toLowerCase().replace(/[_-].*$/, '');
      return ALIASES[c] || (c ? c : 'en');
    }

    var current = 'en';
    var listeners = [];
    var clicked = '';        // language the reader just picked, pre-empting the widget

    // The widget marks its chosen row. This is the authoritative live answer
    // whenever the list has been rendered.
    function fromPluginUI() {
      var el = document.querySelector('.language-option[aria-selected="true"][data-value], [role="option"][aria-selected="true"][data-value]');
      return el ? norm(el.getAttribute('data-value')) : '';
    }

    // Selecting a language makes the plugin RELOAD the page, so on the load that
    // follows, the choice exists only in storage — under 'preferredLanguage' in
    // v3. Its UI (and therefore aria-selected) is injected a second or two later,
    // so without this the banner would flash English on every translated page
    // view. The key has changed between plugin versions, so match a pattern
    // rather than hard-code one, and pull the first recognisable code out.
    function fromPluginStore() {
      var stores = [];
      try { stores.push(localStorage); } catch (e) {}
      try { stores.push(sessionStorage); } catch (e) {}
      for (var s = 0; s < stores.length; s++) {
        var store = stores[s];
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i);
          if (!k || !/bhashini|translat|preferred.?lang/i.test(k)) continue;
          var v = '';
          try { v = store.getItem(k) || ''; } catch (e) { continue; }
          var m = String(v).match(/\b(gom|kok|kon|hin|hi|eng|en)\b/i);
          if (m) return norm(m[1]);
        }
      }
      return '';
    }

    function resolve() {
      if (clicked) return clicked;
      var ui = fromPluginUI();
      if (ui) return ui;
      var stored = fromPluginStore();
      if (stored) return stored;
      var htmlLang = norm(document.documentElement.getAttribute('lang'));
      if (htmlLang && htmlLang !== 'en') return htmlLang;
      try {
        var saved = localStorage.getItem('sg-lang');
        if (saved) return norm(saved);
      } catch (e) {}
      return htmlLang || 'en';
    }

    function settle() {
      var next = resolve();
      if (next === current) return;
      current = next;
      listeners.forEach(function (fn) {
        try { fn(current); } catch (e) { if (window.console && console.error) console.error('[SG.lang]', e); }
      });
    }

    SG.lang = {
      current: function () { return current; },
      normalise: norm,
      // Subscribe AND fire immediately, so a caller never has to handle "before
      // the first change" as a separate case.
      onChange: function (fn) {
        listeners.push(fn);
        try { fn(current); } catch (e) {}
      },
      refresh: settle
    };

    // 1. Picking a language. The rows are rebuilt by the widget, so these are
    //    delegated from the document. They carry tabindex + role="option", so a
    //    keyboard user selects with Enter/Space — bind that as well as click.
    function picked(e) {
      var row = e.target && e.target.closest && e.target.closest(ROW);
      if (!row) return;
      clicked = norm(row.getAttribute('data-value'));
      settle();
      // The widget updates aria-selected a moment later; re-check so its own
      // state, not our guess, is what we end up holding.
      setTimeout(settle, 300);
    }
    document.addEventListener('click', picked, true);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') picked(e);
    }, true);

    // 2. The widget's published selection. Its listbox is injected asynchronously,
    //    so watch for it to appear, then observe just that subtree.
    function watchSelection(node) {
      if (!window.MutationObserver || node.__sgLangWatched) return;
      node.__sgLangWatched = true;
      // NB: this must NOT clear `clicked`. The widget leaves aria-selected on the
      // previously-applied language when a translation does not go through, so
      // deferring to it here threw away the reader's newer choice and pinned the
      // artwork to whatever they picked first.
      new MutationObserver(settle)
        .observe(node, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
      settle();
    }
    function findList() {
      var list = document.getElementById('bhashiniLanguageDropdown')
             || document.querySelector('.bhashini-dropdown-content, [role="listbox"]');
      if (list) watchSelection(list);
      return !!list;
    }
    if (!findList() && window.MutationObserver) {
      var finder = new MutationObserver(function () { if (findList()) finder.disconnect(); });
      finder.observe(document.body || document.documentElement, { childList: true, subtree: true });
      // The widget is third-party and may never load (it only translates on the
      // registered domain); stop watching the whole document rather than leave a
      // subtree observer running for the life of the page.
      setTimeout(function () { finder.disconnect(); }, 30000);
    }

    // 3. <html lang> — set by our own select, and by some translation widgets.
    if (window.MutationObserver) {
      new MutationObserver(function () { settle(); })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }

    // 4. Our own hidden select, and the same choice made in another tab.
    var sel = document.getElementById('lang-select');
    if (sel) sel.addEventListener('change', function () { clicked = ''; settle(); });
    window.addEventListener('storage', function (e) {
      if (!e.key || e.key === 'sg-lang') { clicked = ''; settle(); }
    });

    current = resolve();
  })();

  /* ============================================================================
     LANGUAGE-AWARE IMAGES — one slot, one image per language

     Any <img> may carry a translated variant per language code:

       <img src="/…/poster-en.webp"          <- the DEFAULT, shown when the
            alt="…"                             active language has no variant
            data-src-hi="/…/poster-hi.webp"   <- shown when Hindi is selected
            data-alt-hi="…"                   <- optional matching alt text
            data-src-kok="/…/poster-kok.webp">

     Add as many or as few as exist: a slot with only a Hindi variant falls back
     to the default for Konkani, and a slot with no variants at all is untouched.
     The default src/alt are captured on first run so switching back to English
     (or to a language with no artwork) restores them exactly.

     Bound at chrome level so it survives SPA swaps, and re-applied through
     SG.content() so images inside a freshly-swapped <main> get the same
     treatment without waiting for the next language change.
     ========================================================================== */
  // Attribute suffixes accepted for each language, in preference order. Konkani
  // is spelt 'kok' by our select and 'gom' by Bhashini; an author may reasonably
  // have used either, so look for both rather than make one of them silently dead.
  var LANG_SUFFIXES = { hi: ['Hi'], kok: ['Kok', 'Gom'], en: ['En'] };
  var VARIANT_SELECTOR = 'img[data-src-hi],img[data-src-kok],img[data-src-gom],img[data-src-en],img[data-src-default]';

  /* Swap without a flash.

     Assigning a new src drops what is painted immediately, and .slide img has a
     white background — so the hero went white for the whole time the replacement
     was fetching and decoding. Measured at ~2 frames on localhost; on a real
     connection it is a full image download.

     So the replacement is fetched and DECODED off-DOM first, and only committed
     once it can be painted in a single frame. The reader keeps seeing the old
     artwork until the new one is genuinely ready.

     - A variant that fails to load is never committed: the reader keeps the
       image that works, which is the same fallback rule as a missing variant.
     - Each image carries a generation counter, so if the language changes again
       while a decode is in flight, the stale one cannot land on top of the newer
       choice. */
  function setLangImage(img, src, alt) {
    if (!src || img.getAttribute('src') === src) {
      if (img.getAttribute('alt') !== alt) img.setAttribute('alt', alt || '');
      return;
    }
    var gen = img.__sgLangGen = (img.__sgLangGen || 0) + 1;
    var commit = function () {
      if (img.__sgLangGen !== gen) return;         // a newer choice won while we waited
      img.setAttribute('src', src);
      img.setAttribute('alt', alt || '');
    };
    var pre = new Image();
    pre.src = src;
    if (pre.decode) pre.decode().then(commit, function () {});
    else if (pre.complete) commit();
    else pre.onload = commit;                      // onerror: leave the working image alone
  }

  function applyLangMedia(root) {
    var lang = SG.lang.current();
    var suffixes = LANG_SUFFIXES[lang] || [lang.charAt(0).toUpperCase() + lang.slice(1)];

    var imgs = (root || document).querySelectorAll(VARIANT_SELECTOR);
    Array.prototype.forEach.call(imgs, function (img) {
      if (!img.dataset.srcDefault) {
        img.dataset.srcDefault = img.getAttribute('src') || '';
        img.dataset.altDefault = img.getAttribute('alt') || '';
      }
      // An EMPTY variant (data-src-kok="") is a deliberate placeholder meaning
      // "this language has no artwork yet" — it reads as absent and falls back
      // to the default, so the slot can be declared before the file exists.
      var src = '', alt = '';
      for (var i = 0; i < suffixes.length && !src; i++) {
        src = img.dataset['src' + suffixes[i]] || '';
        alt = img.dataset['alt' + suffixes[i]] || '';
      }
      setLangImage(img, src || img.dataset.srcDefault, alt || img.dataset.altDefault);
    });
  }
  SG.applyLangMedia = applyLangMedia;
  SG.lang.onChange(function () { applyLangMedia(document); });
  SG.content(function () { applyLangMedia(document); });

  /* ============================================================================
     LANGUAGE-AWARE TEXT — wording the machine translator must NOT decide

     The sibling of language-aware images, for the opposite problem: text the
     translator CAN reach but must not touch. A department's name, an officer's
     name, an Act's title, a scheme's name — these have an OFFICIAL wording in
     each language, and Bhashini's guess is not it. Seen in the field: the
     Konkani engine rendered a department masthead as "िव्यांगजन सशक्तीकरण खातें"
     — a string that opens with a vowel sign and cannot be typed, let alone be
     the department's name.

       <span data-text-hi="…" data-text-kok="दिव्यांगजन सशक्तीकरण खातें">
         Department for Empowerment of Persons with Disabilities</span>

     Two halves, and BOTH are needed:
       1. the element is marked `dont-translate`, the class the Bhashini v3
          plugin checks before it touches a text node, so the machine output
          never lands (this is added here, automatically — an author cannot
          forget it and end up with a half-working slot);
       2. we then write the official wording for the active language ourselves.

     The element's own text is the DEFAULT — used for English, and for any
     language with no wording supplied — so a slot that is only half filled in
     degrades to the source text rather than to a machine guess.

     Bound at chrome level and re-applied through SG.content(), same as the
     images, so SPA-swapped content gets it without a language change.
     ========================================================================== */
  var TEXT_VARIANT_SELECTOR = '[data-text-hi],[data-text-kok],[data-text-gom],[data-text-en]';

  function applyLangText(root) {
    var lang = SG.lang.current();
    var suffixes = LANG_SUFFIXES[lang] || [lang.charAt(0).toUpperCase() + lang.slice(1)];

    var els = (root || document).querySelectorAll(TEXT_VARIANT_SELECTOR);
    Array.prototype.forEach.call(els, function (el) {
      // Capture the shipped text once. Read BEFORE anything is written, and
      // guarded on the attribute (not on truthiness), so an empty default is
      // still remembered as the default rather than re-captured every pass.
      if (el.dataset.textDefault == null) el.dataset.textDefault = el.textContent;
      el.classList.add('dont-translate');

      // An EMPTY variant (data-text-kok="") is the same deliberate placeholder
      // as an empty image variant: the slot is declared, the wording has not
      // been supplied yet, so the default stands until someone fills it in.
      var v = '';
      for (var i = 0; i < suffixes.length && !v; i++) v = el.dataset['text' + suffixes[i]] || '';
      if (!v) v = el.dataset.textDefault;
      // textContent, never innerHTML: this wording routinely comes from a
      // spreadsheet or a PDF, and markup there is a mistake, not an intention.
      if (el.textContent !== v) el.textContent = v;
    });
  }
  SG.applyLangText = applyLangText;
  SG.lang.onChange(function () { applyLangText(document); });
  SG.content(function () { applyLangText(document); });
  // Mark + apply immediately as well. main.js is deferred, so the DOM is parsed
  // by now, and on a page that loads already-translated the plugin can start
  // walking text nodes before SG.content() fires — the class has to be in place
  // BEFORE that walk, not after it.
  applyLangText(document);

  /* ---------- Back to top ----------
     Body-level singleton (built once, persists across SPA swaps). Auto-injected
     if the page didn't ship one, so the floating button appears site-wide.
     Fixed at the bottom-right corner (see style.css). */
  var top = document.getElementById('back-to-top');
  if (!top) {
    top = document.createElement('button');
    top.id = 'back-to-top';
    top.type = 'button';
    top.className = 'back-to-top';
    top.setAttribute('aria-label', 'Scroll to top');
    // inline FILLED chevron SVG (no icon-font dependency; clearly visible)
    top.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 7.3l8 8-1.6 1.6L12 10.5l-6.4 6.4L4 15.3z"/></svg>';
    document.body.appendChild(top);
  }
  // Fade in once the user starts scrolling (small offset avoids flicker at the
  // very top). The .show class drives the opacity/visibility transition in CSS.
  function syncBackToTop() { top.classList.toggle('show', window.scrollY > 80); }
  window.addEventListener('scroll', syncBackToTop);
  syncBackToTop();
  top.addEventListener('click', function () {
    // Focus FIRST with preventScroll, THEN smooth-scroll to the very top.
    // Plain main.focus() scrolls <main> (now tabindex="-1") into view, which
    // fights the scrollTo(0) and leaves the page stuck partway down.
    var main = document.getElementById('main-content');
    if (main) { try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); } }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ============================================================================
   CONTENT — everything below lives inside <main> and is re-initialised by the
   router after each page swap (registered via SG.content).
   ========================================================================== */

/* ---------- Skip-link target ----------
   <main> gets tabindex="-1" so "Skip to Main Content" (and the back-to-top button /
   the SPA router) can actually MOVE FOCUS into it — without it the browser leaves
   focus on the skip link and the jump bounces back to the top of the page. */
SG.content(function () {
  var root = document.getElementById('main-content');
  if (!root) return;
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
});


/* ---------- Email obfuscation ----------
   Emails are rewritten to test[at]gmail[dot]com form (dash -> [dash]) and any
   harvestable mailto: link is turned into plain text, so crawlers can't lift a
   usable address out of the DOM. Runs on the page content on every load/swap. */
SG.content(function () {
  var root = document.getElementById('main-content');
  if (!root) return;

  function obfuscateEmail(addr) {
    return String(addr || '')
      .replace(/-/g, '[dash]').replace(/@/g, '[at]').replace(/\./g, '[dot]');
  }

  /* Write the tokenised address so it can only break BETWEEN tokens.
     `dir[dash]iphb[dot]goa[at]nic[dot]in` is one unbroken string, so with overflow-wrap:break-word the
     browser breaks it wherever it runs out of room — mid-token, e.g. "…nic[d / ot]in", which reads
     like a typo (real bug on the Contact cards: the text needs 253px in a 221px card). A <wbr> before
     each `[` gives legal break points, so it wraps to "dir[dash]iphb[dot]goa / [at]nic[dot]in".
     <wbr> contributes NO text, so textContent — and therefore the screen-reader pronunciation pass —
     is unchanged. Built as DOM nodes, never innerHTML: the address comes from an href and must never
     be parsed as markup. */
  function setObfEmail(el, text) {
    el.textContent = '';
    String(text).split(/(?=\[)/).forEach(function (part, i) {
      if (i) el.appendChild(document.createElement('wbr'));
      el.appendChild(document.createTextNode(part));
    });
  }
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  // Separate, stateless copy for .test() — a /g regex carries lastIndex between
  // calls, which would make the TreeWalker filter skip matches intermittently.
  var EMAIL_TEST = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

  // mailto: anchors -> plain obfuscated text (drops the harvestable href).
  root.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
    var addr = a.getAttribute('href').replace(/^mailto:/i, '').split('?')[0];
    var span = document.createElement('span');
    span.className = 'email-obf';
    setObfEmail(span, obfuscateEmail(decodeURIComponent(addr) || a.textContent));
    a.parentNode.replaceChild(span, a);
  });

  // Plain-text emails sitting in the prose.
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      if (!n.nodeValue || n.nodeValue.indexOf('@') < 0) return NodeFilter.FILTER_REJECT;
      var p = n.parentNode;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE')) return NodeFilter.FILTER_REJECT;
      return EMAIL_TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  var hits = [], node;
  while ((node = walker.nextNode())) hits.push(node);
  hits.forEach(function (n) {
    n.nodeValue = n.nodeValue.replace(EMAIL_RE, obfuscateEmail);
  });
});


/* ---------- File-link metadata ----------
   Every in-content link to a downloadable file gets a visible "(PDF, 144 KB)" tag —
   the file type and (when the host reports Content-Length via a HEAD request) its
   size. A .dl-btn keeps the meta INSIDE the button; a prose link gets a parenthesised
   tag after it. Skipped inside embeds/viewers and whenever a size is already shown. */
SG.content(function () {
  var root = document.getElementById('main-content');
  if (!root) return;

  var FILE_EXT = /\.(pdf|docx?|xlsx?|pptx?|odt|ods|odp|csv|rtf|txt|zip|rar|7z)(?:[?#].*)?$/i;
  function fmtSize(bytes) {
    if (!(bytes > 0)) return '';
    if (bytes < 1024) return bytes + ' B';
    var kb = bytes / 1024;
    if (kb < 1024) return (Math.round(kb * 10) / 10) + ' KB';
    return (Math.round(kb / 1024 * 10) / 10) + ' MB';
  }
  // Cache HEAD lookups (a form can be linked many times on one page / site-wide).
  SG._fileSizes = SG._fileSizes || {};
  function getSize(href) {
    if (href in SG._fileSizes) return Promise.resolve(SG._fileSizes[href]);
    return fetch(href, { method: 'HEAD' }).then(function (r) {
      var len = r.ok ? r.headers.get('content-length') : null;
      var bytes = len ? parseInt(len, 10) : null;
      SG._fileSizes[href] = bytes;
      return bytes;
    }).catch(function () { SG._fileSizes[href] = null; return null; });
  }

  root.querySelectorAll('a[href]').forEach(function (a) {
    if (a.getAttribute('data-fm')) return;
    var href = a.getAttribute('href') || '';
    var m = href.match(FILE_EXT);
    if (!m) return;
    a.setAttribute('data-fm', '1');
    // Never tag links INSIDE an embed/viewer (PDF/map iframe boxes, the scrollable
    // .pdf-doc, the image lightbox) — a grey "(PDF, …)" floating on a dark viewer is
    // unreadable and pointless there.
    if (a.closest('.pdf-doc') || a.closest('.pdf-embed') || a.closest('.map-embed') || a.closest('.img-lightbox')) return;
    // Already shows a size anywhere in its text — a bare "PDF, 67 KB" (e.g. a
    // .dl-link's .dl-meta) or a parenthesised "(PDF, 87.9 KB)"? Leave it, so the
    // size is never printed twice.
    if (/[\d.]+\s*[KMG]?B\b/i.test(a.textContent)) return;
    if (a.nextElementSibling && a.nextElementSibling.classList &&
        a.nextElementSibling.classList.contains('file-meta')) return;
    // In a downloads table the type/size already live in their own columns, so a
    // tag after the "Download" button is redundant. If this link's table ROW
    // already states a file size, don't add one.
    var row = a.closest('tr');
    if (row && /[\d.]+\s*[KMG]?B\b/i.test(row.textContent)) return;

    var type = (a.getAttribute('data-file-type') || m[1]).toUpperCase();
    var sameOrigin = /^\//.test(href) || !/^[a-z]+:\/\//i.test(href) ||
                     href.indexOf(location.origin) === 0;
    var sizeP = sameOrigin ? getSize(href) : Promise.resolve(null);
    sizeP.then(function (bytes) {
      if (!a.isConnected) return;
      var size = fmtSize(bytes);
      var typeSize = type + (size ? ', ' + size : '');
      var span = document.createElement('span');
      span.className = 'file-meta';
      var accName = a.getAttribute('aria-label') || a.textContent || '';
      if (a.classList.contains('dl-btn')) {
        // A download BUTTON keeps the meta INSIDE itself (one cohesive control),
        // never floating outside and never in brackets: a small dot separates the
        // "Download" text from the white "PDF, 67 KB". (Only reached when the
        // table/row has no Size column — the row check above skips it otherwise.)
        var dot = document.createElement('span');
        dot.className = 'file-meta-dot';
        dot.setAttribute('aria-hidden', 'true');
        dot.textContent = '•';
        span.appendChild(dot);
        span.appendChild(document.createTextNode(' ' + typeSize));
        if (/[\d.]+\s*[KMG]?B/i.test(accName)) span.setAttribute('aria-hidden', 'true');
        a.appendChild(span);
      } else {
        // Prose links keep the parenthesised tag appended after the link.
        span.textContent = ' (' + typeSize + ')';
        if (/[\d.]+\s*[KMG]?B/i.test(accName)) span.setAttribute('aria-hidden', 'true');
        a.insertAdjacentElement('afterend', span);
      }
    });
  });
});

/* ===== Download tables: fold the Type + Size columns INTO the download button =====
   A separate Type and Size column pair eats horizontal space. Where a download table
   carries them, move the values into the .dl-btn as the button-design meta (a dot +
   "PDF, 785 KB") and drop the now-redundant columns. If a table can't be folded (no
   .dl-btn) it's left alone and CSS keeps those columns narrow. */
SG.content(function () {
  document.querySelectorAll('table.data-table').forEach(function (table) {
    if (table.dataset.sgFold) return;
    var headRow = table.querySelector('thead tr');
    if (!headRow || !table.querySelector('.dl-btn')) return;     // need a button to fold into
    var heads = Array.prototype.slice.call(headRow.children);
    var typeIdx = -1, sizeIdx = -1;
    heads.forEach(function (th, i) {
      var t = (th.textContent || '').trim().toLowerCase();
      if (t === 'type') typeIdx = i; else if (t === 'size') sizeIdx = i;
    });
    if (typeIdx < 0 && sizeIdx < 0) return;
    table.dataset.sgFold = '1';
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    rows.forEach(function (tr) {
      var cells = tr.children;
      var typeVal = (typeIdx >= 0 && cells[typeIdx]) ? cells[typeIdx].textContent.trim() : '';
      var sizeVal = (sizeIdx >= 0 && cells[sizeIdx]) ? cells[sizeIdx].textContent.trim() : '';
      var meta = [typeVal, sizeVal].filter(Boolean).join(', ');
      var btn = tr.querySelector('.dl-btn');
      if (btn && meta && !btn.querySelector('.file-meta')) {
        var span = document.createElement('span'); span.className = 'file-meta';
        var dot = document.createElement('span'); dot.className = 'file-meta-dot'; dot.setAttribute('aria-hidden', 'true'); dot.textContent = '•';
        span.appendChild(dot); span.appendChild(document.createTextNode(' ' + meta));
        btn.appendChild(span);
        btn.setAttribute('data-fm', '1');   // stop the auto file-meta tagger from re-adding it
      }
    });
    // Remove the Type/Size columns (header + each row), highest index first so the
    // lower index stays valid.
    [typeIdx, sizeIdx].filter(function (i) { return i >= 0; }).sort(function (a, b) { return b - a; }).forEach(function (idx) {
      if (headRow.children[idx]) headRow.removeChild(headRow.children[idx]);
      rows.forEach(function (tr) { if (tr.children[idx]) tr.removeChild(tr.children[idx]); });
    });
  });
});

/* ---------- Hero slider(s) (auto, pausable, keyboard) ----------
   Initialises EVERY [data-slider] on the page — a page may hold several (e.g. the
   Other Components catalogue: caption, image-only and text+video sliders). Arrows
   STAY in the bottom-centre .slider-controls cluster (GFDC-style). Slides that hold
   a video (iframe/<video>) pause the auto-advance while shown and stop playing the
   moment you leave them, so audio never carries over a crossfade. */
SG.content(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-slider]'), function (slider) {
    if (slider.dataset.sgSlider) return;   // never double-init the same element
    slider.dataset.sgSlider = '1';
    buildFromJSON(slider);                 // JSON-driven slides (clickable / CTA slider)
    initSlider(slider);
  });

  /* Build slides from an inline JSON array (no fetch, CSP-safe). Each slide object:
       { "img":"…", "alt":"…", "title":"…", "text":"…", "link":"…", "btn":"…", "align":"center" }
     Rules the user asked for: the WHOLE slide is clickable when "link" is set (else a plain
     non-clickable slide); the "btn" CTA renders ONLY when there is BOTH a btn label AND a link;
     any empty field simply renders nothing (no empty caption/button). Per-slide links differ.
     Markup: <section class="cta-slider" data-slider><div class="hero"><div class="slides"></div>
     </div><div class="slider-controls">…</div><script type="application/json" class="slide-json">
     [...]</script></section>  — controls live OUTSIDE .hero so they never overlap a centred CTA. */
  function buildFromJSON(slider) {
    var src = slider.querySelector('script[type="application/json"].slide-json');
    var slidesWrap = slider.querySelector('.slides');
    if (!src || !slidesWrap) return;
    var data; try { data = JSON.parse(src.textContent || '[]'); } catch (e) { data = null; }
    if (!data || !data.length) return;
    function e(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    // Slider-level defaults (fill in when a slide omits a key); still empty -> CSS default (contain/center).
    var dft = { fit: slider.dataset.slideFit, position: slider.dataset.slidePosition, height: slider.dataset.slideHeight };
    slidesWrap.innerHTML = data.map(function (s, i) {
      var link = (s.link || '').toString().trim();
      var external = /^https?:/i.test(link);
      var tag = link ? 'a' : 'div';
      var attrs = 'class="slide' + (i === 0 ? ' active' : '') + '" role="group" aria-roledescription="slide" aria-label="Slide ' + (i + 1) + ' of ' + data.length + '"';
      if (link) { attrs += ' href="' + e(link) + '"'; if (external) attrs += ' target="_blank" rel="noopener"'; }
      // Per-slide image controls from the slide JSON: fit ('cover'|'contain'|'fill'|'scale-down'),
      // position (object-position focal point, e.g. 'center top' / '50% 20%'), height.
      // Empty on a slide -> fall back to the slider defaults above; still empty -> CSS default.
      var _fit = s.fit || dft.fit, _pos = s.position || dft.position, _h = s.height || dft.height;
      var _st = [];
      if (_fit) _st.push('object-fit:' + _fit);
      if (_pos) _st.push('object-position:' + _pos);
      if (_h) _st.push('height:' + _h);
      var _imgStyle = _st.length ? ' style="' + e(_st.join(';')) + '"' : '';
      var img = s.img ? '<img src="' + e(s.img) + '" alt="' + e(s.alt || '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '"' + _imgStyle + '>' : '';
      var cap = '';
      if (s.title) cap += '<span class="slide-cap-title">' + e(s.title) + '</span>';
      if (s.text)  cap += '<span class="slide-cap-text">' + e(s.text) + '</span>';
      if (s.btn && link) cap += '<span class="slide-btn">' + e(s.btn) + '</span>';
      if (cap) cap = '<span class="slide-caption' + (s.align === 'center' ? ' slide-caption--center' : '') + '">' + cap + '</span>';
      return '<' + tag + ' ' + attrs + '>' + img + cap + '</' + tag + '>';
    }).join('');
    var dotsWrap = slider.querySelector('.slider-dots');
    if (dotsWrap) {
      dotsWrap.innerHTML = data.map(function (s, i) {
        return '<button type="button" class="slider-dot" role="tab" aria-current="' + (i === 0 ? 'true' : 'false') + '" aria-label="Go to slide ' + (i + 1) + '"></button>';
      }).join('');
    }
  }

  function initSlider(slider) {
    var slides = Array.prototype.slice.call(slider.querySelectorAll('.slide'));
    var dots = Array.prototype.slice.call(slider.querySelectorAll('.slider-dot'));
    // Respect the OS "reduce motion" preference (WCAG 2.2.2): start paused.
    var reduceM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0, timer = null, playing = !reduceM;
    var pauseBtn = slider.querySelector('.slider-pause');
    var interval = 6000;

    function hasVideo(s) { return !!(s && s.querySelector('iframe, video')); }
    function stopMedia(s) {              // reload an embed / pause a <video> to stop playback
      var m = s && s.querySelector('iframe, video');
      if (!m) return;
      if (m.tagName === 'VIDEO') { try { m.pause(); } catch (e) {} }
      else { var src = m.getAttribute('src'); if (src) m.setAttribute('src', src); }
    }
    function show(n) {
      var prev = idx;
      idx = (n + slides.length) % slides.length;
      if (prev !== idx) stopMedia(slides[prev]);   // kill audio on the slide we leave
      slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
      dots.forEach(function (d, i) {
        d.setAttribute('aria-current', i === idx ? 'true' : 'false');
      });
      if (hasVideo(slides[idx])) stop();           // don't crossfade away from a video
    }
    function next() { show(idx + 1); }
    function start() { stop(); if (playing && !hasVideo(slides[idx])) timer = setInterval(next, interval); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { show(i); start(); });
    });
    var prevBtn = slider.querySelector('[data-slide="prev"]');
    var nextBtn = slider.querySelector('[data-slide="next"]');
    if (prevBtn) prevBtn.addEventListener('click', function () { show(idx - 1); start(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(idx + 1); start(); });
    if (pauseBtn) {
      // Icon-only (the ⏸/▶ glyph is a CSS ::before driven by aria-pressed); we only
      // update aria-pressed + aria-label, never the visible text.
      var setPauseLabel = function () {
        pauseBtn.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
      };
      if (!playing) pauseBtn.setAttribute('aria-pressed', 'true');
      setPauseLabel();
      pauseBtn.addEventListener('click', function () {
        playing = !playing;
        pauseBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
        setPauseLabel();
        if (playing) start(); else stop();
      });
    }
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', function () { if (playing) start(); });
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', function () { if (playing) start(); });
    show(0); start();
    SG.onTeardown(stop);   // stop the auto-advance timer when leaving the page
  }
});

/* ===== Logo marquee — duplicate items for seamless infinite scroll =====
   Duplicated items are aria-hidden AND tabindex="-1" so they're skipped
   by assistive tech and keyboard navigation (fixes axe aria-hidden-focus). */
SG.content(function () {
  document.querySelectorAll('.lm-track').forEach(function (track) {
    if (track.dataset.sgInit) return;          // never double-duplicate the items
    track.dataset.sgInit = '1';
    var html = track.innerHTML;
    track.innerHTML = html + html;
    var allItems = track.querySelectorAll('.lm-item');
    var half = allItems.length / 2;
    allItems.forEach(function (el, i) {
      if (i >= half) {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
      }
    });
  });
});

/* ===== Latest-notices ticker — seamless duplication + constant readable speed + pause ===== */
// CONSTANT reading pace in pixels/second — comfortable to read, NOT too slow / not
// too fast, and the SAME on every device (no mobile/desktop split). Because the
// duration is derived from the content width at this fixed px/s, the visual speed
// is identical no matter HOW MANY items or HOW MUCH text there are — a longer feed
// just takes proportionally longer to loop; it NEVER speeds up. There is NO ceiling
// (a cap would make a long feed run faster); only a small floor so a near-empty
// feed doesn't whip past. Override per instance with data-px-per-sec.
function initTicker(t) {
    var PX_PER_SEC = 50;     // calm readable ticker pace (constant px/s, item-count independent)
    var MIN_DURATION = 5;    // seconds floor for a near-empty feed only
    if (t.dataset.sgInit) return;              // never double-duplicate the items
    t.dataset.sgInit = '1';
    t.innerHTML = t.innerHTML + t.innerHTML;
    var items = t.querySelectorAll('.latest-item');
    var half = items.length / 2;
    items.forEach(function (el, i) {
      if (i >= half) {
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
      }
    });
    // Measure half-width (one full loop = scrollWidth/2 because we duplicated content)
    function setDuration() {
      var halfWidth = t.scrollWidth / 2;
      if (!halfWidth) return;
      var pps = parseFloat(t.closest('[data-ticker]') && t.closest('[data-ticker]').getAttribute('data-px-per-sec')) || PX_PER_SEC;
      // Loop by an EXACT integer px (one set) so the seam is pixel-perfect — no
      // sub-pixel rounding jump when the list end wraps to the start.
      t.style.setProperty('--lt-loop', Math.round(halfWidth) + 'px');
      // Constant velocity on ALL devices; floor only, NEVER a ceiling — so adding
      // items lengthens the loop but never changes the reading speed.
      var d = Math.max(MIN_DURATION, halfWidth / pps);
      t.style.setProperty('--lt-dur', d.toFixed(1) + 's');
      var _feed = t.parentElement, _fw = (_feed ? _feed.clientWidth : 0) || window.innerWidth || 400;
      t.style.setProperty('--lt-intro', _fw + 'px'); t.style.setProperty('--lt-intro-dur', Math.max(1, _fw / pps).toFixed(1) + 's');
    }
    setDuration();
    // Recompute on resize (font scaling, viewport changes can affect text width)
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setDuration, 200);
    }
    window.addEventListener('resize', onResize);
    SG.onTeardown(function () { window.removeEventListener('resize', onResize); clearTimeout(resizeTimer); });
}
SG.content(function () {
  document.querySelectorAll('[data-ticker] .latest-track').forEach(initTicker);
  document.querySelectorAll('.latest-pause').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var paused = btn.getAttribute('aria-pressed') === 'true';
      var next = !paused;
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
      btn.setAttribute('aria-label', next ? 'Play the latest news' : 'Pause the latest news');
      var ticker = btn.closest('.latest-ticker');
      if (ticker) {
        ticker.classList.toggle('paused', next);     // arrow controls + manual cleanup read .paused
        var vp = ticker.querySelector('.latest-feed');
        var wasManual = ticker.classList.contains('mq-manual');
        var off = (vp && wasManual) ? vp.scrollLeft : 0;   // where the user manually scrolled to
        if (!next) ticker.classList.remove('mq-manual');   // leave manual mode so the CSS animation runs
        ticker.querySelectorAll('.latest-track').forEach(function (t) {
          if (!next && wasManual && off) {
            // RESUME from the manual position (no restart / no intro replay): run the loop ALONE,
            // offset INTO it with a negative animation-delay; then zero the native scroll. §90
            var gcs = getComputedStyle(t);
            var oneSet = parseFloat(gcs.getPropertyValue('--lt-loop')) || (t.scrollWidth / 2);
            var ltDur = parseFloat(gcs.getPropertyValue('--lt-dur')) || 30;
            var frac = oneSet ? ((off % oneSet) / oneSet) : 0;
            t.style.animation = 'lt-scroll ' + ltDur.toFixed(2) + 's linear ' + (-frac * ltDur).toFixed(2) + 's infinite';
          }
          t.style.animationPlayState = next ? 'paused' : 'running';
        });
        if (!next && vp) { try { vp.scrollTo({ left: 0 }); } catch (e) { vp.scrollLeft = 0; } }
      }
    });
  });
});

/* Bhashini translate: the top-bar Translate icon opens a dropdown panel and
   lazy-loads the official Bhashini v3 plugin, which renders its own language UI.
   That wiring lives in assets/js/includes.js (wireBhashini). */

/* Site stats (visitor count + "last updated") moved to the shared
   assets/js/counter.js (loaded by includes.js), so GIGW + S3WaaS share ONE counter. */


/* ===== Regional tabs — tablist switcher + name filter ===== */
SG.content(function () {
  var container = document.querySelector('.region-tabs');
  if (!container) return;
  var tabs = Array.prototype.slice.call(container.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(container.querySelectorAll('.region-panel'));
  var filterInput = container.querySelector('#region-filter-input');
  var filterMeta = container.querySelector('.filter-meta');

  function activate(id, fromKb) {
    tabs.forEach(function (t) {
      var sel = t.getAttribute('data-tab') === id;
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
      t.setAttribute('tabindex', sel ? '0' : '-1');
      if (sel && fromKb) t.focus();
    });
    panels.forEach(function (p) {
      p.setAttribute('data-active', p.id === ('panel-' + id) ? 'true' : 'false');
    });
    try { sessionStorage.setItem('sg-region', id); } catch (e) {}
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { activate(t.getAttribute('data-tab'), false); });
    t.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') next = tabs[0];
      else if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); activate(next.getAttribute('data-tab'), true); }
    });
  });
  try {
    var saved = sessionStorage.getItem('sg-region');
    if (saved && tabs.some(function (t) { return t.getAttribute('data-tab') === saved; })) {
      activate(saved, false);
    }
  } catch (e) {}

  // Name-search filter applied to currently-visible panel rows
  if (filterInput) {
    filterInput.addEventListener('input', function () {
      var q = filterInput.value.trim().toLowerCase();
      var total = 0, shown = 0;
      panels.forEach(function (p) {
        p.querySelectorAll('tbody tr').forEach(function (tr) {
          total++;
          var match = !q || tr.textContent.toLowerCase().indexOf(q) !== -1;
          tr.style.display = match ? '' : 'none';
          if (match) shown++;
        });
      });
      if (filterMeta) filterMeta.textContent = q
        ? shown + ' of ' + total + ' matching'
        : total + ' total entries';
    });
  }
});

/* ===== Video grid + YouTube popup modal =====
   Every .video-card opens the in-site modal — videos with a known
   data-video-id embed that video; cards without an ID embed the
   the official playlist so users stay on-site.

   The modal element lives on <body> and is built ONCE (it persists across
   navigations); only the per-page card bindings are redone on each swap. */
SG.content(function () {
  var cards = document.querySelectorAll('.video-card');
  if (!cards.length) return;

  if (!SG._video) {
    // Build the modal once and reuse
    var modal = document.createElement('div');
    modal.className = 'video-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'video-modal-title-text');
    modal.innerHTML =
      '<div class="video-modal-inner">' +
        '<button type="button" class="video-modal-close" aria-label="Close video"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
        '<div class="video-modal-frame"></div>' +
        '<div class="video-modal-title">' +
          '<span id="video-modal-title-text"></span>' +
          '<a target="_blank" rel="noopener noreferrer" class="video-modal-yt">Open on YouTube &#8599;</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    var frame = modal.querySelector('.video-modal-frame');
    var titleEl = modal.querySelector('#video-modal-title-text');
    var ytLink = modal.querySelector('.video-modal-yt');
    var closeBtn = modal.querySelector('.video-modal-close');
    var lastFocus = null;

    // Fallback: the official playlist for cards without a known ID.
    var FALLBACK_PLAYLIST = 'PL0MKwFrpnO5gKJLgqNmvdajqFpEK_ytYT';
    var CHANNEL_URL = 'https://www.youtube.com/@example';

    /* ---- Self-hosted MP4: play it on servers that fight the <video> element ----
       A <video> always fetches with a Range header. Some hosts (or a WAF in front
       of one) reject Range outright and answer 403 with an HTML body; others send
       the file with a wrong Content-Type. In both cases the element reports
       "No video with supported format and MIME type found", which reads as a codec
       fault and is not one.

       So: try native playback first — it streams, seeks, and costs nothing extra
       where the server behaves. Only if that fails, re-fetch the file in ONE plain
       GET (fetch sends no Range unless asked) and play it from a blob. That also
       lets us declare the MIME type ourselves, so a wrong Content-Type stops
       mattering. The trade is that the blob path buffers the whole file before it
       plays, which is why it is the fallback and not the default. */
    var blobUrls = [];

    function makeVideo(src) {
      var v = document.createElement('video');
      v.setAttribute('controls', '');
      v.setAttribute('autoplay', '');
      v.setAttribute('playsinline', '');       // iOS: play inline, not fullscreen
      v.setAttribute('webkit-playsinline', '');
      v.style.cssText = 'width:100%;height:100%;background:#000';
      v.src = src;
      return v;
    }

    function mp4Failed(frame, url) {
      frame.innerHTML = '<p class="video-modal-msg">Loading video&hellip;</p>';
      fetch(url, { credentials: 'same-origin' })   // deliberately no Range header
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.blob();
        })
        .then(function (blob) {
          // Re-type it: the server may have labelled it text/html or octet-stream.
          if (blob.type.indexOf('video/') !== 0) {
            blob = blob.slice(0, blob.size, 'video/mp4');
          }
          var obj = URL.createObjectURL(blob);
          blobUrls.push(obj);
          frame.innerHTML = '';
          frame.appendChild(makeVideo(obj));
        })
        .catch(function () {
          frame.innerHTML =
            '<p class="video-modal-msg">This video cannot be played in the browser here. ' +
            '<a href="' + url + '" download>Download the video</a> to watch it.</p>';
        });
    }

    var stallTimer = null;

    function mountMp4(frame, url) {
      frame.innerHTML = '';
      var v = makeVideo(url);
      var switched = false;

      function recover() {
        if (switched) return;
        switched = true;
        clearInterval(stallTimer);
        mp4Failed(frame, url);
      }

      // Refusing the range request, a 404, or a body the decoder rejects all raise
      // `error` — that is the live sotto.goa.gov.in case, where the edge answers the
      // range request with a 403 HTML page.
      v.addEventListener('error', recover);

      // But a server can also just... stop, leaving the element stuck at
      // HAVE_METADATA with no error ever fired. Nothing recovers that on its own.
      //
      // A plain deadline is the wrong tool: it punishes a slow connection that is
      // downloading perfectly well. Watch for PROGRESS instead, and only step in
      // when the element has been silent — no bytes, no events — for a stretch AND
      // still cannot play through. A slow-but-working download keeps firing
      // `progress`, so it is never interrupted.
      var lastActivity = Date.now();
      ['progress', 'loadeddata', 'canplay', 'playing', 'timeupdate', 'seeking']
        .forEach(function (ev) {
          v.addEventListener(ev, function () { lastActivity = Date.now(); });
        });
      clearInterval(stallTimer);
      stallTimer = setInterval(function () {
        if (switched || v.readyState >= 3) { clearInterval(stallTimer); return; }
        if (Date.now() - lastActivity > 6000) { clearInterval(stallTimer); recover(); }
      }, 1000);

      frame.appendChild(v);
    }

    function releaseBlobs() {
      clearInterval(stallTimer);
      while (blobUrls.length) URL.revokeObjectURL(blobUrls.pop());
    }


    function openModal(videoId, playlistId, title, wistiaId, mp4Url, fbUrl, wistiaUrl) {
      lastFocus = document.activeElement;
      titleEl.textContent = title || '';
      if (fbUrl) {
        // Facebook video — embed via the official FB video plugin iframe.
        // Stored URLs are usually already plugins/video.php?href=… embeds; if a
        // bare video URL is given, wrap it.
        var fbSrc, fbHref;
        if (/plugins\/video\.php/.test(fbUrl)) {
          fbSrc = fbUrl + (/[?&]autoplay=/.test(fbUrl) ? '' : '&autoplay=true');
          var hm = fbUrl.match(/[?&]href=([^&]+)/);
          fbHref = hm ? decodeURIComponent(hm[1]) : fbUrl;
        } else {
          fbSrc = 'https://www.facebook.com/plugins/video.php?href=' +
            encodeURIComponent(fbUrl) + '&show_text=false&autoplay=true';
          fbHref = fbUrl;
        }
        ytLink.href = fbHref;
        ytLink.textContent = 'Open on Facebook ↗';
        frame.innerHTML =
          '<iframe src="' + fbSrc + '" title="' + (title || 'Facebook video') + '" ' +
          'allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ' +
          'style="width:100%;height:100%;border:0;background:#000"></iframe>';
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        setTimeout(function () { closeBtn.focus(); }, 50);
        return;
      }
      if (mp4Url) {
        // self-hosted MP4 — play inline in the modal (same look as the testimonials)
        ytLink.href = mp4Url;
        ytLink.textContent = 'Open video ↗';
        mountMp4(frame, mp4Url);
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        setTimeout(function () { closeBtn.focus(); }, 50);
        return;
      }
      var src, ytHref, linkLabel;
      if (wistiaId) {
        src = 'https://fast.wistia.net/embed/iframe/' + wistiaId + '?autoPlay=1';
        ytHref = wistiaUrl || ('https://rialetsapp.wistia.com/medias/' + wistiaId);
        linkLabel = 'Open on Wistia ↗';
      } else if (videoId) {
        src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&cc_load_policy=1&cc_lang_pref=en&enablejsapi=1';
        ytHref = 'https://www.youtube.com/watch?v=' + videoId;
        linkLabel = 'Open on YouTube ↗';
      } else {
        var pl = playlistId || FALLBACK_PLAYLIST;
        src = 'https://www.youtube.com/embed/videoseries?list=' + pl + '&autoplay=1';
        ytHref = CHANNEL_URL;
        linkLabel = 'Open channel ↗';
      }
      ytLink.href = ytHref;
      ytLink.textContent = linkLabel;
      frame.innerHTML =
        '<iframe src="' + src + '" ' +
        'title="' + (title || 'Video') + '" allowfullscreen ' +
        'allow="autoplay; encrypted-media; picture-in-picture"></iframe>';
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      setTimeout(function () { closeBtn.focus(); }, 50);
    }
    function closeModal() {
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      frame.innerHTML = '';  // stops video playback
      releaseBlobs();        // and frees any buffered MP4 held in memory
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    /* Pause whatever is playing in the modal without tearing it down. Used when the
       user follows the "Open video / Open on …" link, which opens a new tab — the
       modal stays behind, so it must not keep playing audio under the new tab. */
    function pausePlayback() {
      var vid = frame.querySelector('video');
      if (vid && typeof vid.pause === 'function') { vid.pause(); return; }
      var iframe = frame.querySelector('iframe');
      if (!iframe) return;
      var src = iframe.getAttribute('src') || '';
      if (/youtube(-nocookie)?\.com/.test(src)) {
        // enablejsapi=1 is set on the embed, so the player accepts command messages.
        try {
          iframe.contentWindow.postMessage(
            '{"event":"command","func":"pauseVideo","args":[]}', '*');
        } catch (err) { /* cross-origin hiccup — nothing else to do */ }
        return;
      }
      // Wistia / Facebook have no cross-origin pause command: reload the embed with
      // autoplay stripped, which lands it back on a paused poster.
      var paused = src.replace(/([?&])(autoPlay|autoplay)=[^&]*/gi, '$1$2=0');
      if (paused !== src) iframe.setAttribute('src', paused);
    }

    ytLink.addEventListener('click', pausePlayback);

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
    });

    SG._video = { open: openModal };
  }

  var open = SG._video.open;
  cards.forEach(function (card) {
    var openIt = function (e) {
      e.preventDefault();
      var id = card.getAttribute('data-video-id') || null;
      var pl = card.getAttribute('data-playlist-id') || null;
      var wid = card.getAttribute('data-wistia-id') || null;
      var wurl = card.getAttribute('data-wistia-url') || null;
      var mp4 = card.getAttribute('data-mp4') || null;
      var fb = card.getAttribute('data-fb-url') || null;
      var t = card.getAttribute('data-video-title') || (card.querySelector('h3') || {}).textContent || '';
      open(id, pl, t, wid, mp4, fb, wurl);
    };
    card.addEventListener('click', openIt);
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') openIt(e);
    });
  });
});

/* ===== Policies hub — expand all / collapse all + deep-link scroll ===== */
SG.content(function () {
  var expandBtn = document.getElementById('policy-expand-all');
  var collapseBtn = document.getElementById('policy-collapse-all');
  var sections = document.querySelectorAll('.policy-section');
  if (sections.length) {
    if (expandBtn) expandBtn.addEventListener('click', function () {
      sections.forEach(function (s) { s.open = true; });
    });
    if (collapseBtn) collapseBtn.addEventListener('click', function () {
      sections.forEach(function (s) { s.open = false; });
    });
    // If URL has a #policy-... hash, auto-open that section
    if (window.location.hash && window.location.hash.indexOf('#policy-') === 0) {
      var target = document.querySelector(window.location.hash);
      if (target && target.tagName.toLowerCase() === 'details') {
        target.open = true;
        setTimeout(function () { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
      }
    }
  }
});

/* ===== Animated stat counters (count up when scrolled into view) ===== */
SG.content(function () {
  var nums = Array.prototype.slice.call(document.querySelectorAll('.stat .num[data-count],.stat-card .num[data-count],.cta-count .num[data-count]'));
  if (!nums.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function animate(el) {
    var raw = (el.getAttribute('data-count') || '').replace(/[^0-9]/g, '');
    var target = parseInt(raw, 10);
    if (!target) return;                 // nothing to animate (e.g. 0)
    var dur = 1400, start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.floor(p * target).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString('en-IN');
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
    SG.onTeardown(function () { io.disconnect(); });
  } else {
    nums.forEach(animate);
  }
});

/* ===== Static-site form handling (client-side validation) =====
   On a static host there is no server to POST to, so validate in the browser,
   show an accessible status message, and (optionally) hand off to an endpoint
   set via data-endpoint on the <form>. Mirrors the server-side rules. */
SG.content(function () {
  var forms = document.querySelectorAll('form[method="post"]');
  if (!forms.length) return;

  /* ── Numeric (math) captcha — ONE system, and this is only the MARKUP half. ──
     A form that already carries a [data-captcha] block (the contact component ships one) is left
     alone; a form without one gets a block injected in the SAME shape. Either way setupCaptcha()
     below is what generates the sum and checks the answer — nothing here reads or validates it.

     There used to be a second, independent captcha here that stored its own sum in
     form.dataset.captchaSum and validated against it. With both running, the two disagreed and the
     form REJECTED CORRECT ANSWERS on every GIGW theme contact page and both catalogues: this one
     wrote sum 7, setupCaptcha then displayed "8 + 8", and the old validator read `.value` off the
     [data-captcha] WRAPPER (a <div>, so always ""), so it reported "Please answer the security
     check" no matter what the visitor typed. Two systems keyed on one attribute is the bug —
     keep exactly one. */
  function makeCaptcha(form) {
    if (form.querySelector('[data-captcha]')) return;   // already has one — setupCaptcha wires it
    var qid = 'cap-' + Math.random().toString(36).slice(2, 7);
    var wrap = document.createElement('div');
    wrap.className = 'form-field captcha-field';
    wrap.setAttribute('data-captcha', '');
    wrap.innerHTML = '<label for="' + qid + '">Security check <span class="req-star" aria-hidden="true">*</span></label>' +
      '<div class="captcha-row"><span class="captcha-q" aria-hidden="true"></span>' +
      '<button type="button" class="captcha-refresh" aria-label="Get a new security question">' +
      '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button></div>' +
      '<input id="' + qid + '" name="captcha" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" required data-label="Security check" placeholder="Type the answer">';
    var btn = form.querySelector('[type="submit"]');
    if (btn && btn.parentNode) btn.parentNode.insertBefore(wrap, btn); else form.appendChild(wrap);
  }
  forms.forEach(makeCaptcha);

  /* Math security check for any form carrying [data-captcha]. Local-only: the answer is never
     mailed (the field is deleted before submit). Ported from the sotto build, where it was the
     only implementation that existed — the template and iphb had none, despite the house rule
     saying every POST form ships one. */
  /* Resolve the site's own mail endpoint (data/contact.php) the same way every other data file is
     resolved, so it works at a domain root, a sub-folder or the studio path. */
  function contactEndpoint() {
    /* Resolve EXACTLY like every other data file (includes.js: getJSON('/data/header.json')).
       __siteBase is '' on a root-served site and '/org' on a subdomain, so the prefix must default
       to '' — NOT '.'. With '.', './data/contact.php' resolves against the PAGE (…/contact/), giving
       /contact/data/contact.php: a wrong path that answered 200-with-HTML, so r.json() threw and the
       form silently fell back to the local captcha and the third-party endpoint. */
    var base = window.__siteBase || '';
    return base.replace(/\/$/, '') + '/data/contact.php';
  }

  /* The security check.
     SERVER mode (a host with PHP): contact.php issues the sum and VERIFIES the answer. The page
     never knows the answer, so a bot cannot read it out of the DOM — a client-only sum is
     decoration. LOCAL mode is the fallback for a static host with no PHP: the sum is generated and
     checked in the browser, which still stops naive spam and keeps the form usable. */
  /* ===== Proof-of-work (anti-brute-force) — see s3waas.js for the full note. Self-contained SHA-256 +
     a chunked solver; the server issues {salt,bits} and the client must find a nonce so sha256(salt+nonce)
     has >=bits leading zero bits. Cheap to verify, costly to find -> brute-forcing the form is infeasible. */
  if (!window.SGPow) window.SGPow = (function () {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotr(n,x){return (x>>>n)|(x<<(32-n));}
    function sha256bytes(msg){
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
          powNeeded = !!(d.salt && d.bits && window.SGPow);
          powPromise = powNeeded ? window.SGPow.solve(d.salt, d.bits).then(function (nonce) { powInput.value = nonce; }) : null;
        })
        .catch(function () { genLocal(); });   // no PHP (or offline) -> stay usable
    }
    var lastGen = null;
    function gen() { lastGen = genServer(); return lastGen; }

    if (refresh) refresh.addEventListener('click', function () { gen(); });
    gen();
    return {
      input: input,
      get mode() { return mode; },
      get token() { return token; },
      get powReady() { return !powNeeded || powInput.value !== ''; },
      whenReady: function () { return powPromise || Promise.resolve(); },
      settled: function () { return lastGen || Promise.resolve(); },
      // In server mode the browser cannot judge the answer — only that one was given. The server
      // decides, and its error message is shown on submit.
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
  }
  forms.forEach(function (form) {
    // One wiring per form. s3waas.js sets the same flag, so on a page that loads BOTH shells'
    // JS whichever runs first owns the form and the other leaves it alone.
    if (form.getAttribute('data-wired')) return;
    form.setAttribute('data-wired', '1');
    // Security check: only forms that carry a [data-captcha] block get one; returns null otherwise.
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

    window.__sgToast = sgToast;
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
      e.preventDefault();
      var ok = true, firstBad = null;
      var fields = form.querySelectorAll('input, textarea, select');
      fields.forEach(function (f) {
        if (f.type === 'hidden' || f.type === 'submit' || f.type === 'button' || f.hasAttribute('data-captcha')) return;
        clearError(f);
        var val = (f.value || '').trim();
        if (f.hasAttribute('required') && val === '') {
          setError(f, f.name === 'captcha' ? 'Please answer the security check.' : (f.getAttribute('data-label') ? 'Please enter your ' + f.getAttribute('data-label').toLowerCase() + '.' : 'This field is required.')); ok = false; firstBad = firstBad || f;
        } else if (f.type === 'email' && val !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          setError(f, 'Please enter a valid email address, like name@example.com.'); ok = false; firstBad = firstBad || f;
        }
      });

      /* The captcha's own check. An EMPTY answer is already caught by the required-field loop
         above (the input is `required`), so this only has to catch a WRONG one. */
      if (captcha && ok && captcha.input.value.trim() !== '' && !captcha.check()) {
        setError(captcha.input, 'That is not quite right — please solve the sum again.');
        ok = false; firstBad = firstBad || captcha.input;
      }

      var status = statusEl(form);
      if (!ok) {
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

      /* Proof-of-work is REQUIRED but must never reject a real person: if it is still solving, wait for
         it (usually <1s), then re-submit — the form is only sent once the nonce is ready. */
      if (captcha && captcha.mode === 'server' && !captcha.powReady) {
        e.preventDefault();
        status.className = 'form-status js'; status.setAttribute('role', 'status');
        status.textContent = 'Verifying you’re human…';
        captcha.whenReady().then(function () {
          if (form.requestSubmit) form.requestSubmit();
          else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        });
        return;
      }

      var endpoint = form.getAttribute('data-endpoint');
      status.className = 'form-status ok js';
      status.setAttribute('role', 'status');

      /* PREFERRED PATH — the site's OWN data/contact.php. It mails the department AND emails the
         sender an acknowledgement, verifies the security check server-side, and involves no third
         party (a government site should not post citizen messages to an outside service). Used
         whenever the captcha came from the server, i.e. PHP is actually present. */
      if (captcha && captcha.mode === 'server') {
        var fd = new FormData(form);
        fd.append('token', captcha.token);
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
        return;
      }

      if (endpoint) {
        var data = new FormData(form);
        fetch(endpoint, { method: 'POST', body: data })
          .then(function (r) {
            status.textContent = r.ok
              ? 'Thank you! Your message has been sent. We will get back to you soon.'
              : 'Sorry, we could not send your message just now. Please try again, or email us directly.';
            if (r.ok) { form.reset(); if (captcha) captcha.regen(); }
          })
          .catch(function () {
            status.textContent = 'Sorry, we could not send your message just now. Please try again, or email us directly.';
          });
      } else {
        /* No server backend (data/contact.php) is answering and no external endpoint is configured,
           so the message CANNOT be sent. NEVER show success here (a fake "validated" message is the
           "success without the captcha being enforced" a visitor reported). Show a clear error and
           keep what the citizen typed so they can retry or email directly. */
        status.className = 'form-status err js';
        status.setAttribute('role', 'alert');
        status.textContent = 'Sorry, the contact form is temporarily unavailable. Please email us directly, or try again in a moment.';
        if (captcha) captcha.regen();
      }
    });
  });
});

/* ===== Feedback recipient — single source of truth =====
   The inbox the feedback form is delivered to lives in ONE file,
   data/feedback.json. Change "email" there and the form's send endpoint, the
   email subject, and the visible "Email" contact link on feedback.html all
   update — no HTML editing required. Falls back to whatever is hard-coded in
   the markup if the JSON can't be fetched (e.g. a file:// preview). */
SG.content(function () {
  var form = document.querySelector('.feedback-form');
  if (!form) return;

  /* feedback.json may REFERENCE site.json rather than duplicate an address — "email": "{email}" —
     because site.json is the single source of identity. Resolve those {dot.path} tokens here, or the
     fallback endpoint would be built from the literal string "{email}". */
  function resolveVars(str, site) {
    if (typeof str !== 'string' || str.indexOf('{') < 0) return str;
    return str.replace(/\{([a-zA-Z0-9_.]+)\}/g, function (whole, path) {
      var node = site;
      var parts = path.split('.');
      for (var i = 0; i < parts.length; i++) {
        if (node && Object.prototype.hasOwnProperty.call(node, parts[i])) node = node[parts[i]];
        else return whole;                       // unknown token: leave it visible, never blank
      }
      return (node === null || typeof node === 'object') ? whole : String(node);
    });
  }
  function base() { return (window.__siteBase === undefined ? '/resources' : window.__siteBase); }
  function dataUrl(f) {
    var b = base();
    return b + (b === '/resources' ? '/data/gigw/' : '/data/') + f;
  }

  Promise.all([
    fetch(dataUrl('feedback.json'), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }),
    fetch(dataUrl('site.json'), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ])
    .then(function (both) {
      var cfg = both[0], site = both[1] || {};
      var email = resolveVars(((cfg && cfg.email) || '').trim(), site).trim();
      if (!email || email.indexOf('{') >= 0) return;   // unresolved token: never build a broken URL
      /* The form posts to the site's OWN data/contact.php — no third party. This block used to
         rewrite the action to formsubmit.co using the recipient address from feedback.json, which
         also meant every visitor's message left the site. It now only keeps the visible contact
         email in sync; the endpoint is local and fixed. */
      if (cfg.subject) {
        var subj = form.querySelector('input[name="_subject"]');
        if (subj) subj.value = resolveVars(cfg.subject, site);
      }
      // Keep the visible "Email" contact link in sync with the recipient.
      document.querySelectorAll('.feedback-contact a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute('href', 'mailto:' + email);
        a.textContent = email;
      });
    })
    .catch(function () {});
});

/* ===== Accessibility menu — JSON-driven dropdown in the top bar =====
   The menu content lives in ONE file, data/accessibility.json, and is built once
   here. It mounts as a dropdown under the top-bar "Accessibility" pill (built in
   includes.js, alongside Bhashini), so editing that file (labels, which controls
   show, font-size range) updates it site-wide. Behaviours + persistence stay in
   JS. Falls back to the FALLBACK defaults below if the JSON can't be fetched
   (e.g. file:// preview). The legacy top-bar controls are hidden by CSS but kept
   so their handlers stay wired up.

   The pill + dropdown live in the persistent header, so this is built ONCE
   (guarded) and survives SPA navigations — not a per-page content initialiser. */
(function () {
  if (document.getElementById('a11y-panel')) return;

  var FALLBACK = {
    panel: { title: 'Accessibility' },
    fontSize: { label: 'Text size', min: 0.85, max: 1.4, step: 0.1, decLabel: 'A−', resetLabel: 'A', incLabel: 'A+' },
    display: { label: 'Display', dark: { show: true, label: 'Dark mode', labelOn: 'Light mode' } }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function build(cfg) {
    cfg = cfg || FALLBACK;
    var pn = cfg.panel || FALLBACK.panel;
    var fz = cfg.fontSize || FALLBACK.fontSize, dp = cfg.display || FALLBACK.display;
    var dk = dp.dark || {};
    var lk = cfg.links || [];          // optional extra links (e.g. Screen Reader Access)
    var MIN = typeof fz.min === 'number' ? fz.min : 0.85;
    var MAX = typeof fz.max === 'number' ? fz.max : 1.4;
    var STEP = typeof fz.step === 'number' ? fz.step : 0.1;

    // Mount point: the top-bar pill + its positioned wrapper (built in
    // includes.js). If the header used its minimal fallback (no util bar), there
    // is nowhere to anchor the dropdown, so skip building it.
    var toggle = document.getElementById('a11y-toggle');
    var wrap = document.querySelector('.a11y-wrap');
    if (!toggle || !wrap) return;

    var panel = document.createElement('div');
    panel.className = 'a11y-panel';
    panel.id = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility options');

    var displayBtns = '';
    if (dk.show !== false) displayBtns += '<button type="button" id="dark-toggle-fab" class="dark-btn" aria-pressed="false">' + esc(dk.label || 'Dark mode') + '</button>';
    // FULL vs BASIC panel — build option. cfg.readerAids === false → BASIC (Text size + Dark mode only).
    // Default (undefined/true) → FULL: + High contrast + Reading aids + Pointer & motion + Reset.
    var FULL_A11Y = cfg.readerAids !== false;
    function _oib(k, ic, lb) { return '<button type="button" class="a11y-item" data-a11y="opt" data-opt="' + k + '" aria-pressed="false"><i class="fa-solid ' + ic + '" aria-hidden="true"></i> ' + lb + '</button>'; }
    var readerAidsHtml = !FULL_A11Y ? '' : (
      '<div class="a11y-group"><span class="a11y-group-label">Reading aids</span>' +
        _oib('readable-font', 'fa-font', 'Readable font') + _oib('big-spacing', 'fa-text-width', 'Bigger text spacing') +
        _oib('align-left', 'fa-align-left', 'Left-align text') + _oib('tint', 'fa-droplet', 'Reading tint') + _oib('hide-img', 'fa-image', 'Hide images') +
        /* Read aloud (browser TTS, optional). NOT data-a11y="opt" (so it is never a persisted body
           class that would auto-start on load); read-aloud.js self-wires it via [data-opt]. */
        (cfg.readAloud !== false ? '<button type="button" class="a11y-item" data-opt="read-aloud" aria-pressed="false"><i class="fa-solid fa-volume-high" aria-hidden="true"></i> Read aloud</button>' : '') +
      '</div>' +
      '<div class="a11y-group"><span class="a11y-group-label">Pointer &amp; motion</span>' +
        _oib('big-cursor', 'fa-arrow-pointer', 'Large cursor') + _oib('hi-cursor', 'fa-bullseye', 'High-visibility cursor') + _oib('read-guide', 'fa-ruler-horizontal', 'Reading guide') + _oib('read-mask', 'fa-mask', 'Reading mask') +
      '</div>' +
      '<div class="a11y-group"><button type="button" class="a11y-item" data-a11y="a11y-reset"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Reset accessibility</button></div>');

    panel.innerHTML =
      '<div class="a11y-menu-head">' + esc(pn.title || 'Accessibility') + '</div>' +
      '<div class="a11y-group">' +
        '<span class="a11y-group-label">' + esc(fz.label || 'Text size') + '</span>' +
        '<div class="font-controls" role="group" aria-label="Font size controls">' +
          '<button type="button" class="font-btn" data-font="dec" aria-label="Decrease font size">' + esc(fz.decLabel || 'A−') + '</button>' +
          '<button type="button" class="font-btn" data-font="reset" aria-label="Reset font size">' + esc(fz.resetLabel || 'A') + '</button>' +
          '<button type="button" class="font-btn" data-font="inc" aria-label="Increase font size">' + esc(fz.incLabel || 'A+') + '</button>' +
        '</div>' +
      '</div>' +
      (displayBtns
        ? '<div class="a11y-group"><span class="a11y-group-label">' + esc(dp.label || 'Display') + '</span>' + displayBtns + '</div>'
        : '') +
      readerAidsHtml +
      // NOTHING ELSE GOES IN HERE — the panel is Text size + Dark mode (+ contrast) ONLY, so the GIGW
      // panel is identical to the S3WaaS one. See a11y rule 7: the accessibility SURFACES hold ONLY
      // accessibility things. Two items used to be appended below and were both removed:
      //   * a Read-Aloud control — a web page cannot drive NVDA/JAWS/VoiceOver, so the TTS went
      //     entirely (a11y rule 2); pronunciation now lives in includes.js sayAs().
      //   * an `a11y-links` group (Screen Reader Access / Sitemap) — those are NAV LINKS, not a11y
      //     CONTROLS, so they never belonged in a panel of controls. They are NOT orphaned:
      //     nav.json carries them as `drawerOnly:true`, so they stay reachable in the hamburger
      //     drawer (the civic pattern for when the Latest-News ticker occupies the top bar).
      // `accessibilityLinks` in the JSON still feeds the util bar; it just no longer renders here.
      '';

    wrap.appendChild(panel);

    // Accessibility and Bhashini (translate) are mutually exclusive — opening one
    // closes the other, so both never stay open together. `suppress` ignores the
    // synthetic click we fire to close Bhashini, so opening accessibility doesn't
    // immediately re-close its own panel.
    var suppress = false;
    function bhBtnIfOpen() {
      var b = document.querySelector('.bhashini-dropdown-btn');
      if (!b) return null;
      var open = b.getAttribute('aria-expanded') === 'true';
      if (!open) { var dd = document.querySelector('.bhashini-plugin-container [class*="dropdown-content"], .bhashini-plugin-container [class*="content-list"]'); if (dd && dd.offsetParent !== null) open = true; }
      return open ? b : null;
    }
    function closeBhashini() { var b = bhBtnIfOpen(); if (b) { suppress = true; b.click(); suppress = false; } }
    function closePanel() { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    function openPanel() { panel.classList.add('open'); toggle.setAttribute('aria-expanded', 'true'); closeBhashini(); }
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.classList.contains('open')) closePanel(); else openPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) { closePanel(); toggle.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (suppress) return;
      if (!panel.classList.contains('open')) return;
      if (e.target.closest('.a11y-wrap')) return;
      closePanel();
    });
    // Clicking the Bhashini trigger closes the accessibility panel — capture phase,
    // so it fires even though the plugin stops the click from bubbling to document.
    document.addEventListener('click', function (e) {
      if (suppress) return;
      if (e.target.closest && e.target.closest('.bhashini-plugin-container')) closePanel();
    }, true);

    // Font size — same model the legacy controls use.
    panel.querySelectorAll('.font-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-font');
        var cur = parseFloat(localStorage.getItem('sg-font')) || 1;
        if (mode === 'inc') cur = Math.min(MAX, cur + STEP);
        else if (mode === 'dec') cur = Math.max(MIN, cur - STEP);
        else cur = 1;
        document.documentElement.style.fontSize = (cur * 16).toFixed(3) + 'px';
        document.body.style.fontSize = (cur * 17).toFixed(3) + 'px';
        try { localStorage.setItem('sg-font', cur); } catch (e) {}
      });
    });

    // Dark mode
    var dBtn = panel.querySelector('#dark-toggle-fab');
    if (dBtn) {
      var darkOn = dk.labelOn || 'Light mode', darkOff = dk.label || 'Dark mode';
      var setDarkLabel = function (on) { dBtn.lastChild.nodeValue = on ? darkOn : darkOff; };
      dBtn.addEventListener('click', function () {
        var on = !document.documentElement.classList.contains('dark-mode');
        document.documentElement.classList.toggle('dark-mode', on);
        dBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        setDarkLabel(on);
        try { localStorage.setItem('sg-dark', on ? '1' : '0'); } catch (e) {}
      });
      try { if (localStorage.getItem('sg-dark') === '1') { dBtn.setAttribute('aria-pressed', 'true'); setDarkLabel(true); } } catch (e) {}
    }
    // ── Reader aids + High contrast + Reset (universal sg-* classes; 100% client-side, no server).
    var A11Y_OPTS = ['readable-font', 'big-spacing', 'align-left', 'tint', 'hide-img', 'big-cursor', 'hi-cursor', 'read-guide', 'read-mask'];
    var _body = document.body, _root = document.documentElement;
    function _ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function _sv(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    try { _body.classList.remove('sg-contrast'); localStorage.removeItem('sg-contrast'); } catch (e) {}   // High contrast feature removed
    A11Y_OPTS.forEach(function (k) { if (_ls('sg-' + k) === '1') _body.classList.add('sg-' + k); });
    Array.prototype.forEach.call(panel.querySelectorAll('[data-a11y]'), function (x) {
      var a = x.getAttribute('data-a11y');
      if (a === 'opt' && _body.classList.contains('sg-' + x.getAttribute('data-opt'))) x.setAttribute('aria-pressed', 'true');
    });
    var _g = null, _mt = null, _mb = null, _mo = false, _ob = null;
    function _mv(e) { var y = e.clientY; if (_g) _g.style.top = y + 'px'; if (_mt) { _mt.style.height = Math.max(0, y - 26) + 'px'; _mb.style.top = (y + 26) + 'px'; } }
    function _off() { ['read-guide', 'read-mask'].forEach(function (k) { _body.classList.remove('sg-' + k); _sv('sg-' + k, '0'); var pb = panel.querySelector('[data-opt="' + k + '"]'); if (pb) pb.setAttribute('aria-pressed', 'false'); }); _sync(); }
    function _sync() {
      var g = _body.classList.contains('sg-read-guide'), m = _body.classList.contains('sg-read-mask');
      if (g && !_g) { _g = document.createElement('div'); _g.className = 'sg-guideline'; document.body.appendChild(_g); } else if (!g && _g) { _g.parentNode.removeChild(_g); _g = null; }
      if (m && !_mt) { _mt = document.createElement('div'); _mt.className = 'sg-maskpane sg-maskpane-top'; _mb = document.createElement('div'); _mb.className = 'sg-maskpane sg-maskpane-bot'; document.body.appendChild(_mt); document.body.appendChild(_mb); } else if (!m && _mt) { _mt.parentNode.removeChild(_mt); _mb.parentNode.removeChild(_mb); _mt = _mb = null; }
      var need = g || m;
      if (need && !_ob) { _ob = document.createElement('button'); _ob.type = 'button'; _ob.className = 'sg-read-off'; _ob.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Turn Off Reading Aids'; _ob.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); _off(); }); _ob.addEventListener('touchend', function (ev) { ev.preventDefault(); ev.stopPropagation(); _off(); }, { passive: false }); document.body.appendChild(_ob); } else if (!need && _ob) { _ob.parentNode.removeChild(_ob); _ob = null; }
      if (need && !_mo) { document.addEventListener('mousemove', _mv); _mo = true; } else if (!need && _mo) { document.removeEventListener('mousemove', _mv); _mo = false; }
    }
    _sync();
    panel.addEventListener('click', function (e) {
      var t = e.target.closest('[data-a11y]'); if (!t) return; var a = t.getAttribute('data-a11y');
      if (a === 'opt') { var k = t.getAttribute('data-opt'); var o = _body.classList.toggle('sg-' + k); _sv('sg-' + k, o ? '1' : '0'); t.setAttribute('aria-pressed', o ? 'true' : 'false'); if (o && (k === 'big-cursor' || k === 'hi-cursor')) { var _oc = k === 'big-cursor' ? 'hi-cursor' : 'big-cursor'; _body.classList.remove('sg-' + _oc); _sv('sg-' + _oc, '0'); var _ob = panel.querySelector('[data-opt="' + _oc + '"]'); if (_ob) _ob.setAttribute('aria-pressed', 'false'); } _sync(); }
      else if (a === 'a11y-reset') { _root.classList.remove('dark-mode'); _sv('sg-dark', '0'); A11Y_OPTS.forEach(function (k) { _body.classList.remove('sg-' + k); _sv('sg-' + k, '0'); }); if (dBtn) { dBtn.setAttribute('aria-pressed', 'false'); setDarkLabel(false); } _sync(); Array.prototype.forEach.call(panel.querySelectorAll('[data-a11y][aria-pressed]'), function (x) { x.setAttribute('aria-pressed', 'false'); }); document.documentElement.style.fontSize = ''; document.body.style.fontSize = ''; _sv('sg-font', 1); }
    });
    // Bhashini lives in the top utility bar, not in the FAB panel.
  }

  fetch((window.__siteBase || '/resources') + '/data/gigw/accessibility.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (cfg) { build(cfg); })
    .catch(function () { build(FALLBACK); });
})();

/* ===== Image lightbox for .gallery-tile (template addition) =====
   The lightbox element lives on <body> and is built ONCE; the per-page tiles
   are re-collected and re-bound on each swap (SG._lb.tiles holds the current
   page's tiles so the prev/next controls operate on them). */
SG.content(function () {
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.gallery-tile'));
  if (!tiles.length) return;

  if (!SG._lb) {
    var lb = document.createElement('div');
    lb.className = 'img-lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = '<button class="ilb-btn ilb-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<button class="ilb-btn ilb-prev" type="button" aria-label="Previous image"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button class="ilb-btn ilb-next" type="button" aria-label="Next image"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('figcaption'), cur = 0, last = null;
    var state = { tiles: tiles };
    // data-full is authored root-relative (e.g. "assets/media/…"); root it with a
    // leading slash so it resolves against the site root, not the current page URL.
    function fullSrc(t) { var s = t.getAttribute('data-full') || ''; return /^(\/|https?:)/i.test(s) ? s : s.replace(/^\.?\//, '');   /* no forced '/': <base href> resolves it */ }
    function show(i) { var ts = state.tiles; cur = (i + ts.length) % ts.length; var t = ts[cur]; img.src = fullSrc(t); var c = t.getAttribute('data-caption') || ''; img.alt = c || 'Gallery image'; cap.textContent = c; }
    function open(i) { last = document.activeElement; show(i); lb.setAttribute('data-open', 'true'); lb.querySelector('.ilb-close').focus(); }
    function close() { lb.setAttribute('data-open', 'false'); img.src = ''; if (last) last.focus(); }
    lb.querySelector('.ilb-close').addEventListener('click', close);
    lb.querySelector('.ilb-prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.ilb-next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
    });
    SG._lb = { open: open, state: state };
  }

  SG._lb.state.tiles = tiles;     // point the controls at this page's tiles
  var openLb = SG._lb.open;
  tiles.forEach(function (t, i) { t.addEventListener('click', function () { openLb(i); }); });
});

/* ===== Album gallery modal — each album opens ONLY its own images =====
   An .album-card carries its photos in a hidden .album-photos block. Clicking any
   .album-open trigger inside the card opens a modal carousel seeded with JUST that
   card's images, so prev/next never stray into another album's photos. The modal
   is a body-level singleton (built once); only the image SET swaps per album. */
SG.content(function () {
  var cards = document.querySelectorAll('.album-card');
  if (!cards.length) return;

  if (!SG._albumModal) {
    var mo = document.createElement('div');
    mo.className = 'album-modal';
    mo.setAttribute('role', 'dialog');
    mo.setAttribute('aria-modal', 'true');
    mo.setAttribute('aria-label', 'Album gallery');
    mo.innerHTML =
      '<button type="button" class="am-close" aria-label="Close gallery"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
      '<h3 class="am-title"></h3>' +
      '<div class="am-stage">' +
        '<button type="button" class="am-nav am-prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>' +
        '<figure class="am-figure"><img class="am-img" alt=""><figcaption class="am-cap"></figcaption></figure>' +
        '<button type="button" class="am-nav am-next" aria-label="Next image"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="am-count" aria-live="polite"></div>';
    document.body.appendChild(mo);

    var st = { el: mo, imgs: [], i: 0, lastFocus: null };
    var imgEl = mo.querySelector('.am-img'), capEl = mo.querySelector('.am-cap'),
        cntEl = mo.querySelector('.am-count'), titleEl = mo.querySelector('.am-title');
    function render() {
      var it = st.imgs[st.i]; if (!it) return;
      imgEl.src = it.src; imgEl.alt = it.alt || '';
      capEl.textContent = it.alt || '';
      cntEl.textContent = (st.i + 1) + ' / ' + st.imgs.length;
    }
    function show(n) { if (!st.imgs.length) return; st.i = (n + st.imgs.length) % st.imgs.length; render(); }
    function close() { mo.classList.remove('open'); document.body.style.overflow = ''; if (st.lastFocus && st.lastFocus.focus) st.lastFocus.focus(); }
    st.open = function (imgs, title, trigger) {
      st.imgs = imgs; st.i = 0; st.lastFocus = trigger || null;
      titleEl.textContent = title || 'Gallery';
      var multi = st.imgs.length > 1;
      mo.querySelector('.am-prev').style.display = multi ? '' : 'none';
      mo.querySelector('.am-next').style.display = multi ? '' : 'none';
      render();
      mo.classList.add('open'); document.body.style.overflow = 'hidden';
      mo.querySelector('.am-close').focus();
    };
    mo.querySelector('.am-prev').addEventListener('click', function () { show(st.i - 1); });
    mo.querySelector('.am-next').addEventListener('click', function () { show(st.i + 1); });
    mo.querySelector('.am-close').addEventListener('click', close);
    mo.addEventListener('click', function (e) { if (e.target === mo) close(); });
    document.addEventListener('keydown', function (e) {
      if (!mo.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(st.i - 1);
      else if (e.key === 'ArrowRight') show(st.i + 1);
    });
    SG._albumModal = st;
  }

  cards.forEach(function (card) {
    if (card.dataset.albumBound) return;
    card.dataset.albumBound = '1';
    var imgs = Array.prototype.map.call(card.querySelectorAll('.album-photos img'), function (im) {
      return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '' };
    });
    var title = card.getAttribute('data-album') ||
                ((card.querySelector('h3') || {}).textContent || 'Gallery');
    card.querySelectorAll('.album-open').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (imgs.length) SG._albumModal.open(imgs, title, btn);
      });
    });
  });
});

/* ===== Vertical marquee (notice board) — readable speed + pause/play button =====
   Speed is set by CONSTANT VELOCITY (pixels/second), not a fixed duration — so
   each notice stays on screen the same comfortable time no matter how many items
   there are, how long they are, or the screen size. The track is duplicated (real
   items + an aria-hidden copy) and animates translateY(-50%), i.e. it travels ONE
   set's height per cycle, so duration = (that height) / pixels-per-second.
   ~40 px/s keeps a notice visible ~5s in the viewport — easy to read, not sleepy.
   Recomputed on resize so font-scaling / mobile widths stay just-right.
   Override with data-px-per-sec on .v-marquee. Also wires the head pause/play
   button (WCAG 2.2.2). */
function initMarquee(m) {
  vMarqueeArrows(m);   // inject up/down scroll arrows (guarded against double-add)
  var MIN_DURATION = 6;    // floor: a tiny list shouldn't loop frantically
  var MAX_DURATION = 90;   // ceiling: a huge list shouldn't crawl forever
  // Vertical reading pace (px/sec) — a touch slower on phones/tablets so it never
  // feels fast on a small screen. data-px-per-sec overrides both.
  function vSpeed() { return window.innerWidth <= 768 ? 25 : 32; }
  {
    var track = m.querySelector('.v-marquee-track');
    if (track && !track.dataset.speedBound) {
      track.dataset.speedBound = '1';
      var override = parseFloat(m.getAttribute('data-px-per-sec'));
      // Seamless loop REQUIRES the track to be exactly two identical halves so
      // translateY(-50%) lands precisely on the copy's start. Rather than trust a
      // hand-authored duplicate (often missing or unequal once a board has many /
      // long items — which is what makes it jump and look slow), REBUILD it here:
      // keep only the real items, then append an aria-hidden clone of the set.
      var reals = Array.prototype.filter.call(track.children, function (li) {
        return li.getAttribute('aria-hidden') !== 'true';
      });
      if (reals.length) {
        // Drop any pre-existing (possibly unequal) duplicate copy.
        Array.prototype.slice.call(track.children).forEach(function (li) {
          if (li.getAttribute('aria-hidden') === 'true') track.removeChild(li);
        });
        reals.forEach(function (li) {
          var c = li.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.querySelectorAll('a,button,[tabindex]').forEach(function (f) { f.setAttribute('tabindex', '-1'); });
          track.appendChild(c);
        });
      }
      var setDuration = function () {
        // One set's height = half the (now guaranteed-even) track's scrollHeight.
        var dist = track.scrollHeight / 2;
        if (!dist) return;
        // Loop by an EXACT integer px so the seam is pixel-perfect (no end-of-list jump).
        track.style.setProperty('--vm-loop', Math.round(dist) + 'px');
        var pps = override || vSpeed();
        var d = Math.min(MAX_DURATION, Math.max(MIN_DURATION, dist / pps));
        track.style.setProperty('--vm-dur', d.toFixed(1) + 's');
        var _vp = m.querySelector('.v-marquee-viewport'), _vph = _vp ? _vp.clientHeight : 0;
        if (_vph) { track.style.setProperty('--vm-intro', _vph + 'px'); track.style.setProperty('--vm-intro-dur', Math.max(1, _vph / pps).toFixed(1) + 's'); }
      };
      setDuration();
      var rt = null;
      var onResize = function () { clearTimeout(rt); rt = setTimeout(setDuration, 200); };
      window.addEventListener('resize', onResize);
      SG.onTeardown(function () { window.removeEventListener('resize', onResize); clearTimeout(rt); });
    }
    var btn = m.querySelector('.v-marquee-pause');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      var paused = btn.getAttribute('aria-pressed') === 'true';
      var next = !paused;   // next === true means: now paused
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
      btn.setAttribute('aria-label', next ? 'Play the notice board' : 'Pause the notice board');
      var ic = btn.querySelector('.svg-ico');
      if (ic) ic.className = 'svg-ico fa-solid ' + (next ? 'fa-play' : 'fa-pause');
      // Drive the play state directly on the track (inline beats the CSS hover
      // rule), so clicking Play ALWAYS resumes even if the pointer/focus is still
      // on the button or marquee. Mirror it on the class for styling hooks.
      // On PLAY after manual (arrow) scrolling, RESUME from the current vertical position rather than
      // restarting at the top / replaying the intro: run the loop ALONE, offset into it via a negative
      // animation-delay to match where the user scrolled; then zero the native scroll. §90
      var _vp = m.querySelector('.v-marquee-viewport');
      var _wasManual = m.classList.contains('mq-manual');
      var _voff = (_vp && _wasManual) ? _vp.scrollTop : 0;
      if (!next && _wasManual) m.classList.remove('mq-manual');
      if (track) {
        if (!next && _wasManual && _voff) {
          var _vg = getComputedStyle(track);
          var _vSet = parseFloat(_vg.getPropertyValue('--vm-loop')) || (track.scrollHeight / 2);
          var _vDur = parseFloat(_vg.getPropertyValue('--vm-dur')) || 18;
          var _vFrac = _vSet ? ((_voff % _vSet) / _vSet) : 0;
          track.style.animation = 'vmarquee-scroll ' + _vDur.toFixed(2) + 's linear ' + (-_vFrac * _vDur).toFixed(2) + 's infinite';
        }
        track.style.animationPlayState = next ? 'paused' : 'running';
      }
      m.classList.toggle('paused', next);
      if (!next && _vp) { try { _vp.scrollTo({ top: 0 }); } catch (e) { _vp.scrollTop = 0; } }
    });
  }
}
SG.content(function () {
  document.querySelectorAll('.v-marquee').forEach(initMarquee);
});

/* Arrow controls for the What's-New vertical marquee AND the Related-Government-Portals strip:
   an arrow switches the block to native manual scroll (.mq-manual/.mq-scroll) and steps ONE item at a
   time; Play resumes the auto-roll. Injected via JS so no template HTML changes. */
function mqMkArrow(dir, axis) {
  var b = document.createElement('button'); b.type = 'button'; b.className = 'mq-arrow';
  b.setAttribute('aria-label', dir < 0 ? (axis === 'Y' ? 'Scroll up' : 'Previous') : (axis === 'Y' ? 'Scroll down' : 'Next'));
  b.innerHTML = '<i class="svg-ico fa-solid fa-chevron-' + (axis === 'Y' ? (dir < 0 ? 'up' : 'down') : (dir < 0 ? 'left' : 'right')) + '" aria-hidden="true"></i>';
  return b;
}
function mqStep(vp, axis, dir) {
  var isY = axis === 'Y', items = vp.querySelectorAll('li'), vr = vp.getBoundingClientRect();
  var cur = isY ? vp.scrollTop : vp.scrollLeft, target = null, i, r, pos;
  for (i = 0; i < items.length; i++) {
    if (items[i].getAttribute('aria-hidden') === 'true') continue;   // skip the seamless-loop clones
    r = items[i].getBoundingClientRect();
    pos = Math.round(isY ? (r.top - vr.top + vp.scrollTop) : (r.left - vr.left + vp.scrollLeft));
    if (dir > 0) { if (pos > cur + 2) { target = pos; break; } } else if (pos < cur - 2) { target = pos; }
  }
  if (target == null) target = dir > 0 ? (isY ? vp.scrollHeight : vp.scrollWidth) : 0;
  var o = { behavior: 'smooth' }; o[isY ? 'top' : 'left'] = target;
  try { vp.scrollTo(o); } catch (e) { vp[isY ? 'scrollTop' : 'scrollLeft'] = target; }
}
// Add up/down arrows to a single .v-marquee (called from initMarquee so async feed-tab marquees get them too)
function vMarqueeArrows(m) {
  var head = m.querySelector('.v-marquee-head'), pauseBtn = m.querySelector('.v-marquee-pause'),
      vp = m.querySelector('.v-marquee-viewport'), track = m.querySelector('.v-marquee-track');
  if (!head || !vp || head.querySelector('.mq-arrow')) return;
  function setPaused(on) {
    if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var ic = pauseBtn.querySelector('.svg-ico'); if (ic) ic.className = 'svg-ico fa-solid ' + (on ? 'fa-play' : 'fa-pause'); }
    if (track) track.style.animationPlayState = on ? 'paused' : 'running';
    m.classList.toggle('paused', on);
  }
  function enterManual() {
    if (m.classList.contains('mq-manual')) return;
    var off = 0, t = track ? getComputedStyle(track).transform : 'none';
    if (t && t.indexOf('matrix') === 0) { var mv = t.slice(t.indexOf('(') + 1, -1).split(', '); off = Math.abs(parseFloat(mv[5])) || 0; }
    m.classList.add('mq-manual'); if (off) vp.scrollTop = off;
  }
  var up = mqMkArrow(-1, 'Y'), dn = mqMkArrow(1, 'Y');
  up.addEventListener('click', function () { enterManual(); setPaused(true); mqStep(vp, 'Y', -1); });
  dn.addEventListener('click', function () { enterManual(); setPaused(true); mqStep(vp, 'Y', 1); });
  var grp = document.createElement('span'); grp.className = 'mq-group';
  grp.appendChild(up); if (pauseBtn) grp.appendChild(pauseBtn); grp.appendChild(dn);
  head.appendChild(grp);
  if (pauseBtn) pauseBtn.addEventListener('click', function () {   // Play -> leave manual, reset to top
    setTimeout(function () { if (!m.classList.contains('paused')) { m.classList.remove('mq-manual'); try { vp.scrollTo({ top: 0 }); } catch (e) {} } }, 0);
  });
}
// Related Government Portals: static grid -> AUTO-SCROLL horizontal slider with pause + prev/next
function govPortalArrows() {
  document.querySelectorAll('.gov-portals').forEach(function (sec) {
    var list = sec.querySelector('.gov-portals-list'), cont = sec.querySelector('.container');
    if (!list || !cont || sec.querySelector('.mq-arrow')) return;
    var vp = document.createElement('div'); vp.className = 'gov-portals-vp';
    list.parentNode.insertBefore(vp, list); vp.appendChild(list);
    // Seamless LOOP: clone the pills enough that the strip is >= 2x the viewport, so as soon as a gap
    // would appear the next pills are already there (no empty space). Force single-line + start-aligned
    // to MEASURE (the resting list is flex-wrap:wrap, justify center — which would give a wrapped/negative
    // width); .mq-scroll re-imposes nowrap/flex-start once we start the animation.
    var reals = Array.prototype.slice.call(list.children);
    list.style.flexWrap = 'nowrap'; list.style.justifyContent = 'flex-start';
    var setW = list.scrollWidth;
    if (setW > 0) {
      var need = vp.clientWidth * 2 + setW, guard = 0;
      while (list.scrollWidth < need && guard < 24) {
        reals.forEach(function (li) {
          var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true');
          c.querySelectorAll('a,button,[tabindex]').forEach(function (f) { f.setAttribute('tabindex', '-1'); });
          list.appendChild(c);
        });
        guard++;
      }
      // Animate by ONE full-set PITCH = where the first clone actually SITS (its offsetLeft), which
      // includes the trailing flex gap. A bare set-width is one gap (14px) short, so the loop snaps
      // back early every cycle -> the first pill jerks half-off the left edge. Re-read after web fonts
      // settle (they change pill widths -> the pitch), so the seam stays invisible.
      var applyShift = function () {
        var fc = list.children[reals.length], base = list.children[0];
        var pitch = fc ? (fc.offsetLeft - (base ? base.offsetLeft : 0)) : setW;
        if (pitch > 0) {
          list.style.setProperty('--gp-shift', pitch + 'px');
          list.style.animationDuration = Math.max(18, Math.round(pitch / 40)) + 's';
        }
      };
      applyShift();
      list.style.flexWrap = ''; list.style.justifyContent = '';  // hand nowrap/flex-start back to .mq-scroll
      sec.classList.add('mq-scroll');                            // start the animation LAST, shift already correct
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(applyShift);
    } else {
      list.style.flexWrap = ''; list.style.justifyContent = '';
    }
    var pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'mq-arrow gov-portals-pause';
    pauseBtn.setAttribute('aria-pressed', 'false'); pauseBtn.setAttribute('aria-label', 'Pause portals');
    pauseBtn.innerHTML = '<i class="svg-ico fa-solid fa-pause" aria-hidden="true"></i>';
    function setPaused(on) {
      pauseBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', on ? 'Play portals' : 'Pause portals');
      var ic = pauseBtn.querySelector('.svg-ico'); if (ic) ic.className = 'svg-ico fa-solid ' + (on ? 'fa-play' : 'fa-pause');
      sec.classList.toggle('paused', on);
    }
    function toManual() {
      if (sec.classList.contains('mq-manual')) return;
      var off = 0, t = getComputedStyle(list).transform;
      if (t && t.indexOf('matrix') === 0) { var mv = t.slice(t.indexOf('(') + 1, -1).split(', '); off = Math.abs(parseFloat(mv[4])) || 0; }
      sec.classList.add('mq-manual'); if (off) vp.scrollLeft = off;
    }
    pauseBtn.addEventListener('click', function () {   // Play -> leave manual, resume auto-scroll
      if (pauseBtn.getAttribute('aria-pressed') === 'true') { sec.classList.remove('mq-manual'); setPaused(false); try { vp.scrollTo({ left: 0 }); } catch (e) {} }
      else { setPaused(true); }
    });
    var prev = mqMkArrow(-1, 'X'), next = mqMkArrow(1, 'X');
    prev.addEventListener('click', function () { toManual(); setPaused(true); mqStep(vp, 'X', -1); });
    next.addEventListener('click', function () { toManual(); setPaused(true); mqStep(vp, 'X', 1); });
    var grp = document.createElement('div'); grp.className = 'mq-group gov-portals-ctrls';
    grp.appendChild(prev); grp.appendChild(pauseBtn); grp.appendChild(next); cont.appendChild(grp);
  });
}
SG.content(govPortalArrows);

// BELOW-HERO Latest-News ticker (.latest-ticker[data-ticker]) — NOT the top-bar util-announce (which
// stays pause-only). Adds prev/pause/next: an arrow switches to manual scroll + steps one item; Play
// resumes. Items are <a class="latest-item"> (filled async), so snap queries .latest-item.
function latestTickerArrows() {
  document.querySelectorAll('.latest-ticker[data-ticker]').forEach(function (tick) {
    var inner = tick.querySelector('.latest-ticker-inner'), pauseBtn = tick.querySelector('.latest-pause'),
        vp = tick.querySelector('.latest-feed'), track = tick.querySelector('.latest-track');
    if (!inner || !vp || inner.querySelector('.mq-arrow')) return;
    function setPaused(on) {
      if (pauseBtn) pauseBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (track) track.style.animationPlayState = on ? 'paused' : 'running';
      tick.classList.toggle('paused', on);
    }
    function step(dir) {
      if (!tick.classList.contains('mq-manual')) {
        var off = 0, m = track ? getComputedStyle(track).transform : 'none';
        if (m && m.indexOf('matrix') === 0) { var mv = m.slice(m.indexOf('(') + 1, -1).split(', '); off = Math.abs(parseFloat(mv[4])) || 0; }
        tick.classList.add('mq-manual'); if (off) vp.scrollLeft = off;
      }
      setPaused(true);
      var items = vp.querySelectorAll('.latest-item'), vr = vp.getBoundingClientRect(), cur = vp.scrollLeft, target = null, i, r, pos;
      for (i = 0; i < items.length; i++) { r = items[i].getBoundingClientRect(); pos = Math.round(r.left - vr.left + vp.scrollLeft);
        if (dir > 0) { if (pos > cur + 2) { target = pos; break; } } else if (pos < cur - 2) { target = pos; } }
      if (target == null) target = dir > 0 ? vp.scrollWidth : 0;
      try { vp.scrollTo({ left: target, behavior: 'smooth' }); } catch (e) { vp.scrollLeft = target; }
    }
    var prev = mqMkArrow(-1, 'X'), next = mqMkArrow(1, 'X');
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    var grp = document.createElement('span'); grp.className = 'mq-group latest-mq-group';
    grp.appendChild(prev); if (pauseBtn) grp.appendChild(pauseBtn); grp.appendChild(next);
    inner.appendChild(grp);
    if (pauseBtn) pauseBtn.addEventListener('click', function () {   // Play -> leave manual, reset
      setTimeout(function () { if (!tick.classList.contains('paused')) { tick.classList.remove('mq-manual'); try { vp.scrollTo({ left: 0 }); } catch (e) {} } }, 0);
    });
  });
}
SG.content(latestTickerArrows);

/* ===== "What's New" news tabs — switch panels (Notice Board / Recruitment / Tenders) =====
   Generic ARIA tablist on .news-tabs: each [role=tab][data-tab=ID] shows the
   .news-panel[data-panel=ID]; others are hidden. A v-marquee inside a panel that
   was hidden at init measured 0 height, so on switch we fire a resize event to let
   the marquee recompute its (now-visible) speed. */
SG.content(function () {
  document.querySelectorAll('.news-tabs, .feed-tabs').forEach(function (container) {
    if (container.dataset.tabsBound) return;
    container.dataset.tabsBound = '1';
    var tabs = Array.prototype.slice.call(container.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(container.querySelectorAll('.news-panel, .feed-panel'));
    if (!tabs.length) return;
    function activate(id, fromKb) {
      tabs.forEach(function (t) {
        var sel = t.getAttribute('data-tab') === id;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.setAttribute('tabindex', sel ? '0' : '-1');
        if (sel && fromKb) t.focus();
      });
      panels.forEach(function (p) {
        var on = p.getAttribute('data-panel') === id;
        p.hidden = !on;
        p.setAttribute('data-active', on ? 'true' : 'false');
      });
      try { window.dispatchEvent(new Event('resize')); } catch (e) {}
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(t.getAttribute('data-tab'), false); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') n = tabs[0];
        else if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); activate(n.getAttribute('data-tab'), true); }
      });
    });
    var initial = tabs[0].getAttribute('data-tab');
    for (var k = 0; k < tabs.length; k++) {
      if (tabs[k].getAttribute('aria-selected') === 'true') { initial = tabs[k].getAttribute('data-tab'); break; }
    }
    activate(initial, false);
  });
});

/* ===== JSON-driven feeds: "What's New" lists (top N + View all) + archive tables =====
   [data-feed-list="<name>"]  → renders the FIRST N items of data/feeds/<name>.json as
       a clean list with a "View all <title>" link; shows an empty-state card when the
       feed has no items. N defaults to 15 (override with data-limit).
   [data-feed-table="<name>"] → renders ALL items as a table: Sr No. | Description |
       Download (a .dl-btn carrying the type/size). Add data-fields="closing" (tenders)
       to also render Closing Date + Closing Time columns.
   Both read the SAME JSON file, so the home tab and the archive page never drift. */
SG.content(function () {
  var base = (window.__siteBase || '/resources');
  function url(name) { return base + '/data/feeds/' + name + '.json'; }
  function metaText(it) { return (it.type && it.size) ? (it.type + ', ' + it.size) : (it.type || it.size || ''); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(d) {
    if (!d) return '';
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    return m ? (parseInt(m[3], 10) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1]) : d;
  }
  function emptyCard(title, href, archive) {
    var p = document.createElement('p'); p.className = 'feed-empty';
    p.appendChild(document.createTextNode('No ' + title.toLowerCase() + ' listed right now' + (archive ? '. Please check back soon.' : ' — check the ')));
    if (!archive) {
      var a = document.createElement('a'); a.href = href; a.textContent = title; p.appendChild(a);
      p.appendChild(document.createTextNode(' page for the full archive.'));
    }
    return p;
  }
  function ts(it) { var d = (it.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date)) ? Date.parse(it.date) : NaN; return isNaN(d) ? Infinity : d; } // missing/invalid date = treat as newest
  function byNewest(a, b) { return ts(b) - ts(a); }
  function load(name) { return fetch(url(name), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }); }
  function failMsg(host) { host.textContent = ''; var p = document.createElement('p'); p.className = 'feed-empty'; p.textContent = 'Unable to load right now.'; host.appendChild(p); }

  /* ---- LISTS (home / panels): top N + View all ---- */
  document.querySelectorAll('[data-feed-list]').forEach(function (host) {
    if (host.dataset.sgFeed) return; host.dataset.sgFeed = '1';
    var name = host.getAttribute('data-feed-list');
    var limit = parseInt(host.getAttribute('data-limit'), 10) || 15;
    load(name).then(function (feed) {
      var items = (feed.items || []).slice().sort(byNewest).slice(0, limit); // newest first; this is the LIVE file — older items are moved by hand into the separate -archive file
      var title = feed.title || name, viewAll = feed.viewAllHref || '#';
      host.textContent = '';
      if (!items.length) {
        host.appendChild(emptyCard(title, viewAll, false));
      } else {
        // Render a vertical auto-scrolling notice board (same component as the
        // notice board) and hand it to initMarquee for the seamless loop + pause.
        var mq = document.createElement('div'); mq.className = 'v-marquee feed-marquee';
        // Optional speed override: data-px-per-sec on the board host flows to the marquee.
        var pps = host.getAttribute('data-px-per-sec');
        if (pps) mq.setAttribute('data-px-per-sec', pps);
        var head = document.createElement('div'); head.className = 'v-marquee-head';
        var ttl = document.createElement('span'); ttl.className = 'v-marquee-title'; ttl.textContent = title;
        var pause = document.createElement('button'); pause.type = 'button'; pause.className = 'v-marquee-pause';
        pause.setAttribute('aria-pressed', 'false'); pause.setAttribute('aria-label', 'Pause the ' + title.toLowerCase() + ' board');
        var pico = document.createElement('i'); pico.className = 'svg-ico fa-solid fa-pause'; pico.setAttribute('aria-hidden', 'true'); pause.appendChild(pico);
        head.appendChild(ttl); head.appendChild(pause);
        var vp = document.createElement('div'); vp.className = 'v-marquee-viewport';
        var ul = document.createElement('ul'); ul.className = 'v-marquee-track';
        items.forEach(function (it) {
          var li = document.createElement('li');
          var a = document.createElement('a'); a.href = it.href || '#'; a.textContent = it.text || '';
          var mt = metaText(it);
          if (mt) { var s = document.createElement('span'); s.className = 'dl-meta'; s.textContent = ' (' + mt + ')'; a.appendChild(s); }
          li.appendChild(a);
          if (it.closingDate || it.closingTime) {
            var c = document.createElement('span'); c.className = 'feed-close';
            c.textContent = 'Closing: ' + [fmtDate(it.closingDate), it.closingTime].filter(Boolean).join(', ');
            li.appendChild(c);
          }
          ul.appendChild(li);
        });
        vp.appendChild(ul); mq.appendChild(head); mq.appendChild(vp);
        host.appendChild(mq);
        initMarquee(mq);
      }
      var more = document.createElement('a'); more.className = 'feed-viewall'; more.href = viewAll; more.textContent = 'View all ' + title;
      host.appendChild(more);
    }).catch(function () { failMsg(host); });
  });

  /* ---- TABLES (archive pages): every item ---- */
  document.querySelectorAll('[data-feed-table]').forEach(function (host) {
    if (host.dataset.sgFeed) return; host.dataset.sgFeed = '1';
    var name = host.getAttribute('data-feed-table');
    var withClosing = host.getAttribute('data-fields') === 'closing';
    function cell(label, val) { var td = document.createElement('td'); td.setAttribute('data-label', label); td.textContent = val; return td; }
    load(name).then(function (feed) {
      var items = (feed.items || []).slice().sort(byNewest), title = feed.title || name;
      host.textContent = '';
      if (!items.length) { host.appendChild(emptyCard(title, feed.viewAllHref || '#', true)); return; }
      var collapsible = true;   // mobile: every feed table's rows collapse behind a +/- toggle (sgMakeCollapsible self-skips ≤3-col tables)
      var wrap = document.createElement('div'); wrap.className = 'table-wrap';
      var table = document.createElement('table'); table.className = 'data-table dl-table has-actions' + (collapsible ? ' collapsible' : '');
      var thead = document.createElement('thead'), htr = document.createElement('tr');
      ['Sr No.', 'Description'].concat(withClosing ? ['Closing Date', 'Closing Time'] : []).concat(['Download']).forEach(function (h) {
        var th = document.createElement('th'); th.textContent = h; htr.appendChild(th);
      });
      thead.appendChild(htr); table.appendChild(thead);
      var tb = document.createElement('tbody');
      items.forEach(function (it, i) {
        var tr = document.createElement('tr');
        tr.appendChild(cell('Sr No.', String(i + 1)));
        tr.appendChild(cell('Description', it.text || ''));
        if (withClosing) {
          tr.appendChild(cell('Closing Date', fmtDate(it.closingDate) || '—'));
          tr.appendChild(cell('Closing Time', it.closingTime || '—'));
        }
        var td = document.createElement('td'); td.setAttribute('data-label', 'Download');
        var a = document.createElement('a'); a.className = 'dl-btn'; a.href = it.href || '#'; a.setAttribute('download', '');
        var ico = document.createElement('i'); ico.className = 'svg-ico fa-solid fa-download'; ico.setAttribute('aria-hidden', 'true');
        a.appendChild(ico); a.appendChild(document.createTextNode(' Download'));
        var mt = metaText(it);
        if (mt) {
          var span = document.createElement('span'); span.className = 'file-meta';
          var dot = document.createElement('span'); dot.className = 'file-meta-dot'; dot.setAttribute('aria-hidden', 'true'); dot.textContent = '•';
          span.appendChild(dot); span.appendChild(document.createTextNode(' ' + mt)); a.appendChild(span);
        }
        td.appendChild(a); tr.appendChild(td);
        tb.appendChild(tr);
      });
      table.appendChild(tb); wrap.appendChild(table); host.appendChild(wrap);
      if (collapsible) sgMakeCollapsible(table);   // FooTable-style: keep primary cols, + expands a detail row
    }).catch(function () { failMsg(host); });
  });

  /* ---- LATEST NEWS TICKER (combination feed): [data-ticker][data-feed] ---- */
  document.querySelectorAll('[data-ticker][data-feed]').forEach(function (host) {
    if (host.dataset.sgFeed) return; host.dataset.sgFeed = '1';
    var track = host.querySelector('.latest-track');
    if (!track) return;
    load(host.getAttribute('data-feed')).then(function (feed) {
      var items = (feed.items || []).slice().sort(byNewest);
      track.textContent = '';
      items.forEach(function (it) {
        var a = document.createElement('a'); a.className = 'latest-item'; a.href = it.href || it.url || '#'; a.textContent = it.text || '';
        var mt = metaText(it);
        if (mt) { var s = document.createElement('span'); s.className = 'li-meta'; s.textContent = ' (' + mt + ')'; a.appendChild(s); }
        track.appendChild(a);
      });
      track.dataset.sgInit = '';   // allow re-init now that the real items are in
      initTicker(track);
    }).catch(function () {});
  });
});

/* ===== Loading state for misc iframes (not map / not PDF) =====
   The two heavy embeds have their own dedicated, self-healing loaders — the
   OpenStreetMap MAP in map.js and the inline PDF viewer in pdf.js (each does
   eager + high priority + spinner + hot-reload + prefetch). This block deliberately
   SKIPS `.map-embed` and `.pdf-embed` so it never fights those, and just makes any
   OTHER iframe eager so a below-the-fold embed loads immediately instead of staying
   a blank box until the user scrolls. Guarded per iframe so it runs once (SPA swaps
   rebuild the iframe via nav.js, which re-triggers this). */
SG.content(function () {
  var frames = Array.prototype.slice.call(document.querySelectorAll('iframe'));
  if (!frames.length) return;

  frames.forEach(function (f) {
    var box = f.parentNode;
    // .map-embed → map.js, .pdf-embed → pdf.js. Leave both alone here.
    if (box && box.classList && (box.classList.contains('map-embed') || box.classList.contains('pdf-embed'))) return;
    if (f.dataset.embedForced) return;
    f.dataset.embedForced = '1';
    // Make the embed EAGER so it loads immediately even below the fold.
    f.removeAttribute('loading');
  });
});

/* ===== "Salute to the courage" donor slider — smooth continuous auto-loop ===== */
SG.content(function () {
  var wrap = document.querySelector('[data-portrait-slider]');
  if (!wrap) return;
  var row = wrap.querySelector('.portrait-row');
  var pauseBtn = wrap.querySelector('.portrait-pause');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Clone the set once so the scroll loops seamlessly (marquee style).
  var originals = Array.prototype.slice.call(row.children);
  originals.forEach(function (c) { var cl = c.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); row.appendChild(cl); });
  // IMPORTANT: native smooth-scroll would fight per-frame scrollLeft writes — keep it off.
  row.style.scrollBehavior = 'auto';
  var half = 0;                                  // width of one full set
  function measure() { half = row.scrollWidth / 2; }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);      // re-measure once images have sized

  var SPEED = 0.6, raf = null, paused = reduce, hover = false;
  // Track position in a float accumulator. Reading element.scrollLeft back each
  // frame truncates sub-pixel values, so adding 0.6 would round to 0 and freeze.
  var pos = row.scrollLeft;
  function frame() {
    if (!paused && !hover && half > 0) {
      pos += SPEED;
      if (pos >= half) pos -= half;
      row.scrollLeft = pos;
    }
    raf = requestAnimationFrame(frame);
  }
  function jump(dir) {
    if (!half) measure();
    var card = row.firstElementChild;
    var step = (card ? card.offsetWidth + 26 : 240) * dir;
    pos += step;
    if (half) { if (pos >= half) pos -= half; else if (pos < 0) pos += half; }
    row.scrollLeft = pos;
  }
  wrap.querySelectorAll('.portrait-arrow').forEach(function (b) {
    b.addEventListener('click', function () { jump(b.getAttribute('data-dir') === 'prev' ? -1 : 1); });
  });
  function setPaused(p) {
    paused = p;
    if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false'); pauseBtn.setAttribute('aria-label', p ? 'Play donor slider' : 'Pause donor slider'); }
  }
  if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!paused); });
  wrap.addEventListener('mouseenter', function () { hover = true; });
  wrap.addEventListener('mouseleave', function () { hover = false; });
  row.addEventListener('focusin', function () { hover = true; });
  row.addEventListener('focusout', function () { hover = false; });
  if (!reduce) raf = requestAnimationFrame(frame);

  // Stop the rAF loop and drop the window listeners when leaving the page.
  SG.onTeardown(function () {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', measure);
    window.removeEventListener('load', measure);
  });
});

/* ===== About Us "Read More" — reveal the remaining sections ===== */
SG.content(function () {
  var btn = document.querySelector('.about-more-toggle');
  if (!btn) return;
  var more = document.getElementById('about-more');
  if (!more) return;
  btn.addEventListener('click', function () {
    var open = more.hasAttribute('hidden');
    if (open) more.removeAttribute('hidden'); else more.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? 'Read Less' : 'Read More';
    if (open) more.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

/* ===== External-link interstitial — warn before leaving to another website =====
   Uses a single delegated document-level click listener, so it is bound ONCE
   and covers links on any swapped-in page automatically. */
(function () {
  var host = location.hostname;
  function isExternal(a) {
    var href = a.getAttribute('href') || '';
    if (/^(#|mailto:|tel:|javascript:)/i.test(href)) return false;
    try {
      var u = new URL(a.href, location.href);
      return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname && u.hostname !== host;
    } catch (e) { return false; }
  }
  var modal = document.createElement('div');
  modal.className = 'ext-interstitial';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'ext-int-title');
  modal.setAttribute('aria-describedby', 'ext-int-desc');
  modal.hidden = true;
  modal.innerHTML =
    '<div class="ext-int-box">' +
      '<h2 id="ext-int-title">You are leaving this website</h2>' +
      '<p id="ext-int-desc">You are about to visit an external website. This site is not responsible for the content, accuracy or privacy practices of external sites. Do you want to continue?</p>' +
      '<p class="ext-int-url"></p>' +
      '<div class="ext-int-actions">' +
        '<button type="button" class="btn ext-int-go">Continue &#8599;</button>' +
        '<button type="button" class="btn btn-navy ext-int-cancel">Cancel</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  var urlEl = modal.querySelector('.ext-int-url'),
      goBtn = modal.querySelector('.ext-int-go'),
      cancelBtn = modal.querySelector('.ext-int-cancel');
  var pending = null, lastFocus = null;
  function open(href) {
    pending = href; urlEl.textContent = href;
    lastFocus = document.activeElement;
    modal.hidden = false; document.body.classList.add('modal-open');
    setTimeout(function () { goBtn.focus(); }, 40);
  }
  function close() {
    modal.hidden = true; document.body.classList.remove('modal-open'); pending = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a || !isExternal(a)) return;
    e.preventDefault();
    open(a.href);
  });
  goBtn.addEventListener('click', function () { if (pending) window.open(pending, '_blank', 'noopener'); close(); });
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
  // simple focus trap + Esc
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      var f = [goBtn, cancelBtn], i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });
})();

/* ===== Press-release article image carousels (manual ‹ › arrows) ===== */
SG.content(function () {
  var carousels = document.querySelectorAll('[data-article-carousel]');
  if (!carousels.length) return;
  carousels.forEach(function (wrap) {
    var track = wrap.querySelector('.ac-track');
    if (!track) return;
    function step(dir) {
      var slide = track.querySelector('.ac-slide');
      var amt = slide ? (slide.offsetWidth + 16) : Math.round(track.clientWidth * 0.8);
      track.scrollBy({ left: amt * dir, behavior: 'smooth' });
    }
    wrap.querySelectorAll('.ac-arrow').forEach(function (b) {
      b.addEventListener('click', function () {
        step(b.getAttribute('data-dir') === 'prev' ? -1 : 1);
      });
    });
    // The WHOLE carousel is ONE focus stop (arrow keys scroll it); the individual
    // images are NOT individually focusable/selectable.
    track.setAttribute('tabindex', '0');
    if (!track.getAttribute('aria-label')) track.setAttribute('aria-label', 'Album photos — use arrow keys to browse');
    Array.prototype.forEach.call(track.querySelectorAll('.ac-slide'), function (s) { s.setAttribute('tabindex', '-1'); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    });
    // Hide an arrow when the track can't scroll further in that direction.
    var prev = wrap.querySelector('.ac-prev'), next = wrap.querySelector('.ac-next');
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 1;
      if (prev) prev.style.visibility = track.scrollLeft > 1 ? 'visible' : 'hidden';
      if (next) next.style.visibility = track.scrollLeft < max ? 'visible' : 'hidden';
    }
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    sync();
    SG.onTeardown(function () { window.removeEventListener('resize', sync); window.removeEventListener('load', sync); });
  });
});

/* ===== Generic manual scroll carousel — galleries, card rows (NO autoplay) =====
   Any <div class="scroller" data-scroller> with a .scroller-track and .scroller-arrow
   prev/next buttons becomes a left/right carousel. It NEVER auto-advances; the track
   moves only on arrow click (or native swipe). An arrow hides when the track can't go
   further that way, and both hide when the content doesn't overflow. */
SG.content(function () {
  var scrollers = document.querySelectorAll('[data-scroller]');
  if (!scrollers.length) return;
  scrollers.forEach(function (wrap) {
    var track = wrap.querySelector('.scroller-track');
    if (!track) return;
    function step(dir) {
      var item = track.firstElementChild;
      var amt = item ? (item.offsetWidth + 14) : Math.round(track.clientWidth * 0.8);
      track.scrollBy({ left: amt * dir, behavior: 'smooth' });
    }
    wrap.querySelectorAll('.scroller-arrow').forEach(function (b) {
      b.addEventListener('click', function () { step(b.getAttribute('data-dir') === 'prev' ? -1 : 1); });
    });
    var prev = wrap.querySelector('.scroller-prev'), next = wrap.querySelector('.scroller-next');
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 1;
      var overflow = track.scrollWidth > track.clientWidth + 1;
      if (prev) prev.style.visibility = (overflow && track.scrollLeft > 1) ? 'visible' : 'hidden';
      if (next) next.style.visibility = (overflow && track.scrollLeft < max) ? 'visible' : 'hidden';
    }
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    sync();
    SG.onTeardown(function () { window.removeEventListener('resize', sync); window.removeEventListener('load', sync); });
  });
});

/* ============================================================================
   Reveal-on-scroll — subtle fade-up. Flash-free (elements already in view are
   shown instantly, never hidden) and reduced-motion / no-IO safe (does nothing,
   so content is always visible). Re-runs per SPA page via SG.content.
   ========================================================================== */
SG.content(function () { /* reveal scroll-fade animations removed — content is always visible instantly */ });

/* ============================================================================
   Mobile top-bar search launcher — the .util-search-toggle icon (shown only on
   mobile via CSS) toggles .search-open on its .util-bar, which reveals the full
   search field below. Delegated so it works regardless of when includes.js
   renders the chrome, and across SPA navigations. (S3WaaS has its own chrome.)
   ========================================================================== */
(function () {
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.util-search-toggle');
    if (!t) return;
    var bar = t.closest('.util-bar'); if (!bar) return;
    var open = bar.classList.toggle('search-open');
    t.setAttribute('aria-expanded', open ? 'true' : 'false');
    t.setAttribute('aria-label', open ? 'Close search' : 'Open search');
    if (open) { var inp = bar.querySelector('#site-q'); if (inp) inp.focus(); }
  });
})();

/* ============================================================================
   Sitemap — turn the flat list into a PARENT → CHILD tree. Any item whose label
   reads "Parent — Child" is nested under its parent card as a sub-list. Runs per
   page via SG.content; idempotent.
   ========================================================================== */
SG.content(function () {
  var list = document.querySelector('.sitemap-list');
  if (!list || list.getAttribute('data-nested')) return;
  list.setAttribute('data-nested', '1');
  var lis = Array.prototype.slice.call(list.children), parents = {};
  lis.forEach(function (li) { var a = li.querySelector('a'); if (!a) return; var t = a.textContent.trim(); if (t.indexOf(' — ') < 0) parents[t] = li; });
  lis.forEach(function (li) {
    var a = li.querySelector('a'); if (!a) return; var t = a.textContent.trim(); var i = t.indexOf(' — ');
    if (i < 0) return;
    var p = parents[t.slice(0, i)]; if (!p) return;
    a.textContent = t.slice(i + 3);                      // keep just the child label
    var sub = p.querySelector('ul.sitemap-sub');
    if (!sub) { sub = document.createElement('ul'); sub.className = 'sitemap-sub'; p.appendChild(sub); }
    sub.appendChild(li);
  });
});

/* ============================================================================
   Collapsible data table — FooTable-style. On mobile the table KEEPS its first
   columns (Sr No + Description); the remaining columns are hidden and revealed in
   a per-row DETAIL panel (a label | value grid) by a + / − toggle in the first
   cell. Works for feed-built tables (called from the renderer) and any static
   .data-table.collapsible. Top-level fn so both can call it; idempotent.
   ========================================================================== */
var SG_KEEP_COLS = 2;   // visible on mobile: Sr No + Description; everything else -> detail panel
function sgMakeCollapsible(table) {
  if (!table || table.getAttribute('data-coll-init')) return;
  // If the table already fits (≤ SG_KEEP_COLS columns) there is nothing to tuck
  // away — strip the class so the mobile toggle-padding CSS doesn't leave an
  // empty 44px gap on the first column, and bail.
  var head = table.tHead && table.tHead.rows[0];
  var ncol = head ? head.cells.length
           : (table.tBodies[0] && table.tBodies[0].rows[0] ? table.tBodies[0].rows[0].cells.length : 0);
  if (ncol <= SG_KEEP_COLS) { table.classList.remove('collapsible'); return; }
  table.setAttribute('data-coll-init', '1');
  var groups = [];   // {tr, detail, tg, set()} for accordion close-others
  Array.prototype.slice.call(table.querySelectorAll('tbody > tr')).forEach(function (tr) {
    if (tr.classList.contains('row-detail')) return;
    var cells = Array.prototype.slice.call(tr.children);
    if (cells.length <= SG_KEEP_COLS) return;
    var dl = '';
    for (var i = 0; i < cells.length; i++) {   // detail repeats EVERY field except the serial number
      var label = (cells[i].getAttribute('data-label') || '').trim();
      if (/^sr\.?\s*no/i.test(label)) continue;
      dl += '<dt>' + label + '</dt><dd>' + cells[i].innerHTML + '</dd>';
    }
    var detail = document.createElement('tr');
    detail.className = 'row-detail';
    var dtd = document.createElement('td'); dtd.colSpan = cells.length;
    dtd.innerHTML = '<dl class="row-detail-list">' + dl + '</dl>';
    detail.appendChild(dtd);
    tr.parentNode.insertBefore(detail, tr.nextSibling);
    var tg = document.createElement('button');
    tg.type = 'button'; tg.className = 'row-toggle'; tg.textContent = '+';
    tg.setAttribute('aria-expanded', 'false'); tg.setAttribute('aria-label', 'Show details');
    var g = { tr: tr, detail: detail, tg: tg };
    function set(open) {
      tr.classList.toggle('open', open);   // .open drives detail visibility via CSS
      tg.textContent = open ? '−' : '+';
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
      tg.setAttribute('aria-label', open ? 'Hide details' : 'Show details');
    }
    g.set = set;
    function toggle(e) {
      if (e && e.target && e.target.closest && e.target.closest('a')) return;   // let links inside the row work
      var willOpen = !tr.classList.contains('open');
      groups.forEach(function (o) { if (o !== g) o.set(false); });   // accordion: close the others
      set(willOpen);
    }
    tr.addEventListener('click', toggle);   // the WHOLE row is clickable (not just the +/-)
    cells[0].insertBefore(tg, cells[0].firstChild);   // toggle inside the Sr No cell
    groups.push(g);
  });
}
SG.content(function () {
  // Make EVERY data table FooTable-collapsible on mobile. Tables that already fit
  // (≤ SG_KEEP_COLS columns) are skipped by sgMakeCollapsible, so narrow tables
  // stay untouched; wide tables collapse their extra columns behind a +/- toggle.
  document.querySelectorAll('table.data-table').forEach(function (t) {
    // Explicit opt-ins win and stay separate:
    //  • .stack-sm   = stacked label:value cards (its own component, no toggle)
    //  • .collapsible = FooTable +/- collapse
    if (t.classList.contains('stack-sm')) return;
    if (t.classList.contains('collapsible')) { sgMakeCollapsible(t); return; }
    var head = t.tHead && t.tHead.rows[0];
    var cols = head ? head.cells.length
             : (t.tBodies[0] && t.tBodies[0].rows[0] ? t.tBodies[0].rows[0].cells.length : 0);
    if (cols <= SG_KEEP_COLS) return;                  // narrow tables already fit
    // Tables with a download/action button → FooTable collapse (the button lives
    // in the detail panel). Every OTHER table → stacked label:value cards.
    if (t.querySelector('.dl-btn, a[download], td[data-label="Download"]')) {
      t.classList.add('collapsible');
      sgMakeCollapsible(t);
    } else {
      t.classList.add('stack-sm');
    }
  });
});

/* Keep every nav dropdown ON SCREEN. `.submenu` is absolutely positioned at left:0, so a dropdown on an
   item near the right end of the bar opens rightward and runs off the viewport, clipping its labels.
   Measure each one and flip the offenders to right-aligned (.flip-right). A static :nth-last-child rule
   would be wrong: WHICH items overflow depends on the viewport width, and a non-dropdown item can sit
   between two offenders. Measured with visibility:hidden so nothing flashes; re-run on resize + once the
   web font settles, because both change the menu geometry. */
function fitDropdowns() {
  var vw = document.documentElement.clientWidth, PAD = 8;
  document.querySelectorAll(".nav-item.has-children > .submenu").forEach(function (sub) {
    sub.classList.remove("flip-right");
    var shown = getComputedStyle(sub).display !== "none";
    if (!shown) { sub.style.visibility = "hidden"; sub.style.display = "block"; }
    var r = sub.getBoundingClientRect();
    if (!shown) { sub.style.display = ""; sub.style.visibility = ""; }
    if (r.width && r.right > vw - PAD) sub.classList.add("flip-right");
  });
}
SG.content(function () {
  fitDropdowns();
  var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(fitDropdowns, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDropdowns);
});

/* Responsive data tables show each cell's column label on mobile via the CSS
   `td::before{content:attr(data-label)}` rule. But CSS-generated content is NOT a DOM
   text node, so a page translator (Bhashini) can't reach it — pick Konkani and the desktop
   <th> text translates while the mobile card labels stay English. Fix: inject the label as a
   REAL element the translator can see. It's visually identical to the ::before (same
   weight/colour/position) and gated by the .gv-celllabels root class so the ::before still
   works with JS off. aria-hidden: screen readers already get the header from table semantics.
   Idempotent; re-runs after every <main> swap (spa:navigated). */
(function () {
  'use strict';
  var SELECTOR = '.data-table.stack-sm td[data-label], .region-panel td[data-label], .si-col-body td[data-label]';
  function initCellLabels() {
    var tds = document.querySelectorAll(SELECTOR);
    if (!tds.length) return;
    Array.prototype.forEach.call(tds, function (td) {
      if (td.firstElementChild && td.firstElementChild.classList.contains('gv-celllabel')) return;
      var lab = td.getAttribute('data-label') || '';
      if (!lab) return;
      var s = document.createElement('span');
      s.className = 'gv-celllabel';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = lab;
      td.insertBefore(s, td.firstChild);
    });
    document.documentElement.classList.add('gv-celllabels');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCellLabels);
  else initCellLabels();
  window.addEventListener('spa:navigated', initCellLabels);
})();


/* ===== Live JSON notices (portable) — edit the JSON, refresh, it shows. NO build step. =====
   Any element with data-news-src="/path/to.json" is filled on every page load straight from
   that file's { "items": [ { title|text, href, type?, size? } ] }:
     • a .latest-track   -> the top ticker's <a class="latest-item"> links
     • a .v-marquee-track -> a notice board's <li> notices
   Added rows appear, removed rows disappear on refresh — the JSON is the single source of
   truth (no static baking, no build step). This complements data-feed / data-feed-list (the
   /data/feeds/*.json system); use whichever fits. Legacy "title" and feed "text" keys both work. */
(function () {
  function boot() {
    var base = (window.__siteBase || '');
    function resolve(src) { return /^https?:/i.test(src) ? src : (src.charAt(0) === '/' ? base + src : base + '/' + src); }
    document.querySelectorAll('[data-news-src]').forEach(function (el) {
      if (el.dataset.sgNews) return; el.dataset.sgNews = '1';
      var isTicker = el.classList.contains('latest-track');
      fetch(resolve(el.getAttribute('data-news-src')), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
          var items = (data && data.items) || [];
          el.textContent = '';
          items.forEach(function (it) {
            var title = it.title || it.text || '';
            var href = it.href || it.url || '#';
            var hasBoth = it.type && it.size;
            var metaTxt = hasBoth ? '' : (it.type || it.size || '');
            if (isTicker) {
              var a = document.createElement('a');
              a.className = 'latest-item'; a.href = href; a.setAttribute('download', ''); a.textContent = title + ' ';
              if (hasBoth || metaTxt) { var s = document.createElement('span'); s.className = 'li-meta'; s.textContent = '(' + (hasBoth ? it.type + ' · ' + it.size : metaTxt) + ')'; a.appendChild(s); }
              el.appendChild(a);
            } else {
              var li = document.createElement('li');
              var la = document.createElement('a'); la.href = href; la.setAttribute('download', ''); la.textContent = title + ' ';
              if (hasBoth || metaTxt) { var m2 = document.createElement('span'); m2.className = 'dl-meta'; m2.textContent = '(' + (hasBoth ? it.type + ', ' + it.size : metaTxt) + ')'; la.appendChild(m2); }
              li.appendChild(la); el.appendChild(li);
            }
          });
          if (isTicker) { el.dataset.sgInit = ''; if (typeof initTicker === 'function') initTicker(el); }
          else { var m = el.closest('.v-marquee'); el.removeAttribute('data-speed-bound'); if (m && typeof initMarquee === 'function') initMarquee(m); }
        })
        .catch(function () {
          el.textContent = '';
          var msg = document.createElement(isTicker ? 'span' : 'li');
          msg.className = isTicker ? 'latest-item' : 'feed-empty';
          msg.textContent = 'Unable to load notices right now.';
          el.appendChild(msg);
        });
    });
  }
  if (window.SG && typeof SG.content === 'function') SG.content(boot);
  else if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();

/* ===== Auto-scroll ONLY while on-screen — also makes the movie-credits intros START on viewport =====
   Continuous CSS-animated scrollers (the latest-notices ticker, the logo marquee and every vertical
   notice-board / What's-New marquee) move only when the user can actually see them. An
   IntersectionObserver adds `.sg-offscreen` whenever a scroller leaves the viewport; CSS then pauses its
   track animation. Because a scroller BEGINS paused (added up-front), its movie-credits intro
   (empty -> first item enters) starts exactly when it is scrolled INTO the viewport. (BUILD-ERRORS §89) */
SG.content(function () {
  if (!('IntersectionObserver' in window)) return;
  var SEL = '[data-ticker], .logo-marquee, .v-marquee';
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var el = en.target, r = en.boundingClientRect, rb = en.rootBounds;
      if (!el.matches('[data-ticker]')) {          // marquees keep the any-part-visible rule
        el.classList.toggle('sg-offscreen', !en.isIntersecting);
        return;
      }
      // The Latest-news ticker rolls ONLY while the WHOLE bar is in view, and pauses again
      // the moment it is partly out: a bar showing a sliver at the edge of the screen would
      // otherwise run its headlines past while nobody can read them. NOT latched. §155
      var whole = rb ? (r.top >= rb.top - 1 && r.bottom <= rb.bottom + 1)
                     : en.intersectionRatio >= 0.99;
      // A bar taller than the viewport can never be wholly inside it; fall back to "nearly all".
      if (rb && r.height > (rb.bottom - rb.top)) whole = en.intersectionRatio >= 0.9;
      // Partly visible while the credits entrance is still running (track parked to the
      // RIGHT, translateX > 0): drop the entrance so the bar shows its headlines instead
      // of being held on a blank frame, which reads as broken (§89, §147).
      if (en.isIntersecting && !whole && !el.classList.contains('sg-nointro')) {
        var tr = el.querySelector('.latest-track');
        var mx = tr && /matrix\([^)]*?,\s*([-\d.]+),\s*[-\d.]+\)\s*$/.exec(getComputedStyle(tr).transform);
        if (mx && parseFloat(mx[1]) > 1) el.classList.add('sg-nointro');
      }
      el.classList.toggle('sg-offscreen', !whole);
    });
  }, { threshold: [0, 0.5, 0.9, 1] });
  function watch(root) {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches(SEL)) { root.classList.add('sg-offscreen'); io.observe(root); }
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll(SEL), function (n) { n.classList.add('sg-offscreen'); io.observe(n); });
  }
  watch(document.body);
  var mo = new MutationObserver(function (muts) { muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, watch); }); });
  mo.observe(document.body, { childList: true, subtree: true });
  var moStop = setTimeout(function () { mo.disconnect(); }, 8000);
  SG.onTeardown(function () { io.disconnect(); mo.disconnect(); clearTimeout(moStop); });
});
