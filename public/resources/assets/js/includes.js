/* ============================================================================
   Shared includes — single source of truth for the NAV and FOOTER.
   The menu lives in data/nav.json and the footer in data/footer.json, so they
   are defined ONCE and rendered into every page (no more copying markup into
   71 files — edit the JSON and the whole site updates).

   Flow: render nav + footer into their placeholders -> mark the active page
   -> then load main.js so all existing behaviour (toggle, submenus, sliders,
   page-views counter, etc.) binds to the freshly-injected DOM.

   Placeholders expected in each page:
     <nav class="mainnav" data-include="nav" aria-label="Main navigation"></nav>
     <footer class="site-footer" data-include="footer"></footer>
   ========================================================================== */
(function () {
  'use strict';

  /* Accessibility-widget mode. Set true when header.json carries
     "accessibilityWidget":"ux4g" — that theme drops the built-in a11y controls (the
     util-bar Accessibility pill + panel, the A−/A/A+ font controls and the Dark toggle,
     plus read-aloud) and instead loads OUR own floating accessibility widget
     (assets/js/a11y-widget.js — a from-scratch reverse-engineering of the UX4G widget's
     look + feature set, with its own Ctrl+F2 launcher). So a theme carries EXACTLY ONE
     accessibility widget, with no traces of the other. */
  var A11Y_UX4G = false;

  /* tiny DOM helper: el('a', {class:'x', href:'…'}, ['text' or nodes]) */
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
  function extAttrs(label, kind) {
    return {
      target: '_blank', rel: 'noopener noreferrer',
      'aria-label': label + (kind === 'site' ? ' — external site, opens in new window'
                                             : ' — opens in new window')
    };
  }
  /* Obfuscate an email so harvesters can't lift a usable address from the DOM:
     test@gmail.com -> test[at]gmail[dot]com  (dashes become [dash]). The footer
     is outside <main>, so main.js's in-content obfuscation doesn't reach it. */
  function obfuscateEmail(addr) {
    return String(addr || '')
      .replace(/-/g, '[dash]').replace(/@/g, '[at]').replace(/\./g, '[dot]');
  }

  /* ------------------------------------------------------- PRONUNCIATION ---
     Make an EXTERNAL screen reader (NVDA / JAWS / VoiceOver / TalkBack) say these correctly.
     These pronunciations used to live in read-aloud.js and were applied to ITS OWN voice — which
     meant nobody ever heard them (there is no read-aloud button, and a web page cannot drive a real
     screen reader). read-aloud.js is gone; the pronunciations now go where the visitor's OWN screen
     reader actually reads them: aria-label.

     THE RULE (a11y rule 7): this changes ONLY what is ANNOUNCED. The visible text is untouched —
     the page still SHOWS "Sitemap" and the obfuscated "x[at]y[dot]in"; only the spoken form differs.
     Never write the spoken form back into the DOM's text. */
  var SAY = [
    [/\bsitemap\b/gi, 'Site Map'],   // one run-together word -> two, or it is read "sightmap"
    [/\bRTI\b/g, 'R T I'],           // initialisms: spell them out, don't let the SR say "rtee"
    [/\bFAQ\b/g, 'F A Q'],
    [/\bWebmail\b/gi, 'Web mail']
  ];
  function sayAs(s) {
    // Obfuscated emails are the big win: NVDA reads "x[at]y[dot]in" literally as
    // "x bracket at bracket y bracket dot bracket in". Spoken, it becomes "x at y dot in".
    s = String(s || '')
      .replace(/\[at\]/gi, ' at ').replace(/\[dot\]/gi, ' dot ')
      .replace(/\[dash\]/gi, ' dash ').replace(/\[underscore\]/gi, ' underscore ');
    for (var i = 0; i < SAY.length; i++) s = s.replace(SAY[i][0], SAY[i][1]);
    return s.replace(/\s+/g, ' ').trim();
  }
  /* Apply the spoken form ONLY where it differs from the visible text, never clobbering a label
     someone set deliberately. Idempotent — safe to re-run after any DOM change (SPA swap).

     TWO techniques, because aria-label is NOT universally valid:
       (a) INTERACTIVE elements (<a>, <button>) have a role, so aria-label is announced -> use it.
       (b) A PLAIN <span> has NO role, and per the ARIA spec aria-label does not apply to generic
           elements — most screen readers simply IGNORE it. The obfuscated email is exactly this
           case (<span class="email-obf">), so labelling it would look right and do nothing. The
           robust pattern is instead: hide the literal text from AT (aria-hidden) and put the spoken
           form beside it as visually-hidden text. Sighted users still see "x[at]y[dot]in"; a screen
           reader now says "x at y dot in" instead of "x bracket at bracket y bracket dot bracket in". */
  function applyPronunciations(root) {
    root = root || document;
    // (a) interactive
    Array.prototype.forEach.call(root.querySelectorAll('a,button'), function (e) {
      if (e.getAttribute('aria-label')) return;
      var t = (e.textContent || '').trim();
      if (!t || t.length > 120) return;
      var spoken = sayAs(t);
      if (spoken && spoken !== t) e.setAttribute('aria-label', spoken);
    });
    // (b) non-interactive obfuscated text (emails)
    Array.prototype.forEach.call(root.querySelectorAll('.email-obf,.s3-email,.footer-email'), function (e) {
      if (e.getAttribute('data-sg-said') || e.closest('a,button')) return;   // links handled by (a)
      var t = (e.textContent || '').trim();
      var spoken = sayAs(t);
      if (!t || !spoken || spoken === t) return;
      e.setAttribute('aria-hidden', 'true');
      var sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = spoken;
      e.parentNode.insertBefore(sr, e.nextSibling);
      e.setAttribute('data-sg-said', '1');
    });
  }
  window.SGSay = { say: sayAs, apply: applyPronunciations };
  /* Decorate a leaf menu link that points at a downloadable document — any file
     type (pdf, doc/docx, xls/xlsx, ppt/pptx, csv, zip, …), not just PDF. The link
     becomes a two-part row: a left text column holding the TITLE with a small grey
     "(TYPE, SIZE)" meta line underneath, and the download icon pinned to the RIGHT,
     TOP-aligned, and non-shrinking so it never wraps above a long, multi-line title.
     The native download attr makes the browser SAVE the file instead of navigating
     (nav.js also skips SPA-swapping a download link). JSON shape:
        { "label":"Procurement Plan", "href":"/resources/assets/media/docs/…", "download":true,
          "meta":"PDF, 1.9 MB" }   // icon defaults to fa-download; "icon" can override */
  function isPdfHref(h) { return /\.pdf(\?|#|$)/i.test(h || ''); }
  function decorateDownload(a, item) {
    var pdf = isPdfHref(item.href);
    if (item.download || item.meta || pdf) {
      var title = a.textContent;
      var meta = item.meta || (pdf ? 'PDF' : null);
      a.textContent = '';
      var iconEl = el('i', {
        class: 'svg-ico ' + (item.icon || (pdf ? 'fa-solid fa-file-pdf' : 'fa-solid fa-download')) + ' dl-ico', 'aria-hidden': 'true'
      });
      // Icon + size live together in ONE badge that always sits on its OWN line
      // beneath the title — consistent regardless of title length, and themable
      // as a single pill (orange in light, yellow in dark).
      a.appendChild(el('span', { class: 'dl-text' }, [
        el('span', { class: 'dl-title', text: title }),
        meta ? el('span', { class: 'dl-badge' }, [iconEl, el('span', { class: 'dl-meta', text: meta })]) : null
      ]));
      if (!meta) a.appendChild(iconEl);
      a.classList.add('nav-download');
      if (item.download || pdf) a.setAttribute('download', '');
    } else if (item.icon) {
      a.insertBefore(el('i', { class: 'svg-ico ' + item.icon, 'aria-hidden': 'true' }), a.firstChild);
      a.classList.add('has-ico');
    }
    return a;
  }

  /* ---------------------------------------------------------------- NAV --- */
  function renderNav(host, items) {
    var ul = el('ul', { id: 'primary-menu', class: 'nav-menu', role: 'menubar', 'aria-label': 'Primary' });
    var submenuId = 0;

    items.forEach(function (item) {
      if (item.children && item.children.length) {
        submenuId += 1;
        var sid = 'submenu-' + submenuId;
        var caret = el('span', { class: 'caret', 'aria-hidden': 'true' }, '▾');
        var btn = el('button', {
          type: 'button', class: 'nav-link nav-parent', role: 'menuitem',
          'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': sid
        }, [item.label + ' ', caret]);
        var sub = el('ul', { id: sid, class: 'submenu', role: 'menu', 'aria-label': item.label });
        item.children.forEach(function (c) {
          if (c.group) {
            sub.appendChild(el('li', { role: 'none', class: 'submenu-group' },
              el('span', { class: 'submenu-group-h', text: c.group })));
          } else if (c.children && c.children.length) {
            // Third level — a flyout submenu opening to the side.
            submenuId += 1;
            var fid = 'submenu-' + submenuId;
            var caretR = el('span', { class: 'caret caret-right', 'aria-hidden': 'true' }, '▸');
            var fbtn = el('button', {
              type: 'button', class: 'nav-sublink nav-subparent', role: 'menuitem',
              'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': fid
            }, [el('span', { text: c.label }), caretR]);
            var fly = el('ul', { id: fid, class: 'submenu submenu-flyout', role: 'menu', 'aria-label': c.label });
            c.children.forEach(function (g) {
              var ga = el('a', { role: 'menuitem', class: 'nav-sublink', href: g.href, text: g.label });
              decorateDownload(ga, g);
              if (g.external) for (var kg in extAttrs(g.label)) ga.setAttribute(kg, extAttrs(g.label)[kg]);
              fly.appendChild(el('li', { role: 'none' }, ga));
            });
            sub.appendChild(el('li', { role: 'none', class: 'has-flyout' }, [fbtn, fly]));
          } else {
            var a = el('a', { role: 'menuitem', class: 'nav-sublink', href: c.href, text: c.label });
            decorateDownload(a, c);
            if (c.external) for (var k in extAttrs(c.label)) a.setAttribute(k, extAttrs(c.label)[k]);
            sub.appendChild(el('li', { role: 'none' }, a));
          }
        });
        ul.appendChild(el('li', { class: 'nav-item has-children', role: 'none' }, [btn, sub]));
      } else {
        var attrs = { class: 'nav-link', role: 'menuitem', href: item.href, text: item.label };
        var a2 = el('a', attrs);
        decorateDownload(a2, item);
        if (item.external) { var ea = extAttrs(item.label); for (var kk in ea) a2.setAttribute(kk, ea[kk]); }
        ul.appendChild(el('li', { class: 'nav-item', role: 'none' }, a2));
      }
    });

    host.appendChild(el('div', { class: 'container' }, [
      el('button', {
        type: 'button', class: 'nav-toggle', 'aria-expanded': 'false',
        'aria-controls': 'primary-menu', 'aria-label': 'Toggle main menu'
      }, [
        el('span', { class: 'nav-toggle-bars', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]),
        el('span', { class: 'nav-toggle-text', text: 'Menu' })
      ]),
      ul
    ]));

    // Click / tap toggle for the mobile hamburger, the dropdown parents and the 3rd-level
    // flyouts. CSS opens dropdowns on :hover only, which never fires on touch/click, so
    // without this the buttons look dead on the pages that don't load main.js (the majority).
    // Guard on defaultPrevented so if main.js's handler is also present it wins (fires first
    // on the button) and we never double-toggle.
    host.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      var tgl = e.target.closest('.nav-toggle');
      if (tgl) {
        var op = !ul.classList.contains('open');
        ul.classList.toggle('open', op); host.classList.toggle('menu-open', op);
        tgl.setAttribute('aria-expanded', op ? 'true' : 'false'); e.preventDefault(); return;
      }
      var sp = e.target.closest('.nav-subparent');
      if (sp) {
        var fli = sp.closest('.has-flyout');
        if (fli) { var fo = !fli.classList.contains('open'); fli.classList.toggle('open', fo); sp.setAttribute('aria-expanded', fo ? 'true' : 'false'); }
        e.preventDefault(); return;
      }
      var pb = e.target.closest('.nav-parent');
      if (pb) {
        var pli = pb.closest('.nav-item.has-children'); if (!pli) return;
        var wo = !pli.classList.contains('open');
        Array.prototype.forEach.call(ul.querySelectorAll('.nav-item.has-children.open'), function (o) {
          if (o !== pli) { o.classList.remove('open'); o.classList.remove('click-closed'); var b = o.querySelector('.nav-parent'); if (b) b.setAttribute('aria-expanded', 'false'); } });
        pli.classList.toggle('open', wo); pli.classList.toggle('click-closed', !wo);
        pb.setAttribute('aria-expanded', wo ? 'true' : 'false'); e.preventDefault(); return;
      }
    });
    Array.prototype.forEach.call(ul.querySelectorAll('.nav-item.has-children'), function (li) {
      li.addEventListener('mouseleave', function () { li.classList.remove('click-closed'); });
    });
    document.addEventListener('click', function (e) {
      if (host.contains(e.target)) return;
      Array.prototype.forEach.call(ul.querySelectorAll('.nav-item.has-children.open'), function (o) {
        o.classList.remove('open'); o.classList.remove('click-closed'); var b = o.querySelector('.nav-parent'); if (b) b.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* Mark the current page active (and its parent menu), so the active state is
     always correct on whatever page the visitor is on. */
  /* Clean URLs are folder-per-page (/about-us/index.html served at /about-us/), so the
     identifier is the LAST NON-EMPTY path segment — '' on the home page (/). */
  function currentPage() {
    var segs = location.pathname.split('/').filter(Boolean);
    var last = segs.length ? segs[segs.length - 1].toLowerCase() : '';
    return last === 'index.html' ? '' : last;   // home (/ or /index.html) -> ''
  }
  function markActive(host) {
    var here = currentPage();
    var links = host.querySelectorAll('a.nav-link[href], a.nav-sublink[href]');
    Array.prototype.forEach.call(links, function (a) {
      var raw = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
      var segs = raw.split('/').filter(Boolean);
      var href = (segs.length ? segs[segs.length - 1] : '').toLowerCase();
      if (href === here) {
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'page');
        var parentItem = a.closest('.nav-item.has-children');
        if (parentItem) {
          parentItem.classList.add('has-current');
          var pb = parentItem.querySelector('.nav-parent');
          if (pb) pb.classList.add('is-current');
        }
      }
    });
  }

  /* ------------------------------------------------------------- FOOTER --- */
  function footerLink(item) {
    return el('li', null, el('a', { href: item.href, text: item.label }));
  }
  function govLink(item) {
    var a = el('a', { class: 'ext-link', href: item.href }, [
      item.label + ' ', el('span', { class: 'ext-ico', 'aria-hidden': 'true' }, '↗')
    ]);
    var ea = extAttrs(item.label, 'site'); for (var k in ea) a.setAttribute(k, ea[k]);
    return el('li', null, a);
  }
  function socialLink(item) {
    var a = el('a', { href: item.href }, [
      el('i', { class: 'svg-ico ' + item.icon, 'aria-hidden': 'true' }),
      el('span', { class: 'visually-hidden', text: item.label })
    ]);
    var ea = extAttrs(item.label); for (var k in ea) a.setAttribute(k, ea[k]);
    return el('li', null, a);
  }

  function renderFooter(host, d) {
    var grid = el('div', { class: 'container footer-grid' });

    // Col 1 — about + social. Skip any social entry without a real URL
    // (empty, "#", or a javascript: placeholder) so empty icons never show.
    function hasUrl(it) {
      return it && it.href && it.href !== '#' && it.href.indexOf('javascript:') !== 0;
    }
    var social = el('ul', { class: 'social-list', 'aria-label': 'Social media' },
      (d.social || []).filter(hasUrl).map(socialLink));
    grid.appendChild(el('section', { class: 'footer-col', 'aria-labelledby': 'f-about' }, [
      el('h2', { id: 'f-about', class: 'footer-h', text: d.aboutName ? 'About ' + d.aboutName : 'About' }),
      d.about ? el('p', { text: d.about }) : null,
      d.owned ? el('p', { class: 'footer-owned', text: d.owned }) : null,
      social
    ]));

    // Col 2 — important links
    grid.appendChild(el('nav', { class: 'footer-col', 'aria-labelledby': 'f-links1' }, [
      el('h2', { id: 'f-links1', class: 'footer-h', text: 'Important Links' }),
      el('ul', { class: 'footer-list' }, (d.importantLinks || []).filter(hasUrl).map(footerLink))
    ]));

    // Col 3 — government links
    grid.appendChild(el('nav', { class: 'footer-col', 'aria-labelledby': 'f-links2' }, [
      el('h2', { id: 'f-links2', class: 'footer-h', text: 'Government Links' }),
      el('ul', { class: 'footer-list' }, (d.governmentLinks || []).filter(hasUrl).map(govLink))
    ]));

    // Col 4 — Web Information Manager
    var w = d.webInformationManager || {};
    var addr = el('address', { class: 'wim' }, [
      el('strong', { text: w.name }), el('br'),
      w.role, el('br'),
      w.address, el('br'),
      'Phone: ', el('a', { href: 'tel:' + (w.phone || ''), text: w.phone }), el('br'),
      // Email shown obfuscated (anti-harvest): @ -> [at], . -> [dot], - -> [dash].
      'Email: ', el('span', { class: 'email-obf', text: obfuscateEmail(w.email || '') })
    ]);
    grid.appendChild(el('section', { class: 'footer-col', 'aria-labelledby': 'f-wim' }, [
      el('h2', { id: 'f-wim', class: 'footer-h', text: 'Web Information Manager' }), addr
    ]));

    host.appendChild(grid);

    // Policies bar
    var inner = el('div', { class: 'footer-policies-inner' }, el('span', { class: 'fp-label', text: 'All Policies:' }));
    (d.policiesBar || []).forEach(function (item, i) {
      if (i) inner.appendChild(el('span', { class: 'fp-sep', 'aria-hidden': 'true' }, '|'));
      inner.appendChild(el('a', { href: item.href, text: item.label }));
    });
    host.appendChild(el('div', { class: 'footer-policies-bar', 'aria-label': 'All policies' }, inner));

    // Bottom bar — copyright + credit + (JS-filled) visitor count / last updated
    var credit = el('a', { href: (d.credit || {}).href }, (d.credit || {}).label);
    var ce = extAttrs((d.credit || {}).label || ''); ce['aria-label'] = ((d.credit || {}).label || '') + ', opens in new window';
    for (var k in ce) credit.setAttribute(k, ce[k]);
    // Copyright owner is data-driven so each site/subdomain (e.g. "DSDE", "ITI Mapusa")
    // shows its OWN name. Prefer footer.json's copyrightName, fall back to aboutName.
    // The "Designed & Developed by" wording is also data-driven (creditPrefix) so the
    // line can match the target's live footer exactly; it defaults to the standard text.
    // sec-goa-style bar: copyright + clock "Last updated" grouped LEFT; a boxed
    // visitor-count box RIGHT. counter.js fills #page-views (boxed digits via the
    // data-boxed flag) and #last-updated.
    var creditText = el('span', { class: 'footer-credit-text' }, [
      'Copyright © ' + (d.copyrightYear || '') + ' ', el('strong', { text: d.copyrightName || d.aboutName || '' }),
      '. All rights reserved. ' + (d.creditPrefix || 'Website Designed & Developed by') + ' ', credit, '.'
    ]);
    var lastUpdated = el('span', { class: 'footer-meta-item' }, [
      el('i', { class: 'fa-solid fa-clock', 'aria-hidden': 'true' }), ' ',
      el('span', { class: 'footer-meta-label', text: 'Last updated:' }), ' ',
      el('strong', null, el('time', { id: 'last-updated', datetime: '' }, '…'))
    ]);
    var left = el('div', { class: 'footer-bottom-left' }, [creditText, lastUpdated]);
    var countbox = el('span', { class: 'footer-countbox' }, [
      el('span', { class: 'footer-count-label', text: 'Visitor count' }),
      el('span', { class: 'footer-counter', id: 'page-views', 'data-boxed': '' }, '…')
    ]);
    host.appendChild(el('div', { class: 'footer-bottom' },
      el('div', { class: 'footer-bottom-bar' }, [left, countbox])));
  }

  /* ------------------------------------------------------------- HEADER --- */
  function buildUtilBar(h) {
    A11Y_UX4G = (h.accessibilityWidget === 'ux4g');
    var tr = h.translate || {}, langs = tr.languages || [], s = h.search || {};

    var navLinks = (h.accessibilityLinks || []).map(function (l) {
      return el('a', { href: l.href, class: 'util-item' }, [
        el('i', { class: 'svg-ico ' + l.icon, 'aria-hidden': 'true' }),
        el('span', { text: l.label })
      ]);
    });
    var utilNav = el('nav', { class: 'util-nav', 'aria-label': 'Accessibility quick links' }, navLinks);

    var form = el('form', { class: 'util-search', role: 'search', action: s.action, method: 'get' }, [
      el('label', { class: 'visually-hidden', for: 'site-q', text: s.label }),
      el('input', { id: 'site-q', name: 'q', type: 'search', placeholder: s.placeholder, autocomplete: 'off' }),
      el('button', { type: 'submit', 'aria-label': 'Search' }, el('i', { class: 'svg-ico fa-solid fa-magnifying-glass', 'aria-hidden': 'true' }))
    ]);

    // Official Bhashini v3 plugin mount point. The plugin REQUIRES an element with
    // class "bhashini-plugin-container" and renders its own language UI (Translate
    // icon + native language list + "Powered by Bhashini") into it. The script is
    // injected by setupTranslate(), driven by attributes on the script tag.
    var bhWrap = el('div', { class: 'bhashini-wrap-new bhashini-plugin-container', 'aria-label': tr.ariaLabel });

    var fontControls = el('div', { class: 'font-controls', role: 'group', 'aria-label': 'Font size controls' }, [
      el('button', { type: 'button', class: 'font-btn', 'data-font': 'dec', 'aria-label': 'Decrease font size', text: 'A−' }),
      el('button', { type: 'button', class: 'font-btn', 'data-font': 'reset', 'aria-label': 'Reset font size', text: 'A' }),
      el('button', { type: 'button', class: 'font-btn', 'data-font': 'inc', 'aria-label': 'Increase font size', text: 'A+' })
    ]);

    var dark = el('button', { type: 'button', id: 'dark-toggle', class: 'dark-btn', 'aria-pressed': 'false' }, [
      el('i', { class: 'svg-ico fa-solid fa-moon ico-moon', 'aria-hidden': 'true' }),
      el('i', { class: 'svg-ico fa-solid fa-sun ico-sun', 'aria-hidden': 'true' }),
      el('span', { class: 'dark-label', text: 'Dark' })
    ]);

    var select = el('select', { id: 'lang-select', 'aria-label': 'Select language' },
      langs.map(function (l) {
        var o = el('option', { value: l.code, text: l.selectText });
        if (l.checked) o.setAttribute('selected', 'selected');
        if (l.lang) o.setAttribute('lang', l.lang);
        return o;
      }));
    var langWrap = el('label', { class: 'lang-select-wrap visually-hidden', for: 'lang-select' }, [
      el('span', { class: 'visually-hidden', text: 'Select language' }), select
    ]);

    // Accessibility launcher in the top bar, styled as the same white pill as
    // Bhashini. It opens a dropdown menu of accessibility options (text size,
    // contrast, dark mode); the dropdown panel + behaviour are built by main.js,
    // which mounts into .a11y-wrap. This replaces the old floating FAB.
    var a11yBtn = el('button', {
      type: 'button', id: 'a11y-toggle', class: 'bhashini-toggle a11y-toggle',
      'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': 'a11y-panel',
      'aria-label': 'Accessibility options'
    }, [
      el('i', { class: 'svg-ico fa-solid fa-wheelchair a11y-ico', 'aria-hidden': 'true' }),
      el('span', { class: 'bh-label', text: 'Accessibility' }),
      el('i', { class: 'svg-ico fa-solid fa-chevron-down bh-caret', 'aria-hidden': 'true' })
    ]);
    var a11yWrap = el('div', { class: 'a11y-wrap bhashini-wrap-new' }, a11yBtn);

    // A theme on the UX4G accessibility widget drops ALL built-in a11y controls (the
    // Accessibility pill/panel + the A−/A/A+ font controls + the Dark toggle) — the UX4G
    // floating launcher owns those. Translate (Bhashini + language select) stays; it is not
    // an accessibility control. So the util bar carries no trace of the built-in widget.
    var rightKids = A11Y_UX4G ? [bhWrap, langWrap] : [a11yWrap, bhWrap, fontControls, dark, langWrap];
    var right = el('div', { class: 'util-right', role: 'group', 'aria-label': 'Accessibility and display options' },
      rightKids);

    // Optional MODERN integrated announcement/latest-news ticker (opt-in via
    // header.json "announce":{enabled:true}). Sits between the quick links and the
    // tools, like the Goa-portal top bars; filled from latest-news.json by fillAnnounce().
    var announce = null;
    if (h.announce && h.announce.enabled) {
      var pIcon = el('i', { class: 'svg-ico fa-solid fa-pause', 'aria-hidden': 'true' });
      var pauseBtn = el('button', { type: 'button', class: 'util-announce-pause', 'aria-pressed': 'false', 'aria-label': 'Pause the latest news' }, pIcon);
      pauseBtn.addEventListener('click', function () {
        var tk = announce.querySelector('.util-announce-track');
        var paused = pauseBtn.getAttribute('aria-pressed') === 'true';
        pauseBtn.setAttribute('aria-pressed', paused ? 'false' : 'true');
        pauseBtn.setAttribute('aria-label', paused ? 'Pause the latest news' : 'Play the latest news');
        pIcon.className = 'svg-ico fa-solid ' + (paused ? 'fa-pause' : 'fa-play');
        if (tk) tk.style.animationPlayState = paused ? 'running' : 'paused';
      });
      announce = el('div', { class: 'util-announce', 'aria-label': 'Latest news' }, [
        el('span', { class: 'util-announce-badge' }, [
          el('i', { class: 'svg-ico fa-solid fa-bullhorn', 'aria-hidden': 'true' }),
          el('span', { text: (h.announce.label || 'Latest News') })
        ]),
        el('div', { class: 'util-announce-vp' }, el('div', { class: 'util-announce-track' })),
        pauseBtn
      ]);
    }

    // Mobile-only search launcher: collapses the search field to an icon; tapping
    // it reveals the full field below (toggled by main.js). Hidden on desktop.
    var searchToggle = el('button', { type: 'button', class: 'util-search-toggle bhashini-toggle', 'aria-expanded': 'false', 'aria-controls': 'site-q', 'aria-label': 'Search' }, [
      el('i', { class: 'svg-ico fa-solid fa-magnifying-glass', 'aria-hidden': 'true' }),
      el('span', { class: 'bh-label', text: 'Search' })
    ]);

    // The search FORM is a full-width row INSIDE util-inner (revealed by the
    // toggle), so it shares the bar's centred max-width and never crowds the tools.
    var tools = el('div', { class: 'util-tools' }, [searchToggle, right]);
    var searchRow = el('div', { class: 'util-searchrow' }, form);
    // READING ORDER: searchRow goes BEFORE tools so the DOM order matches the order the bar is
    // SEEN in (quick links > search > accessibility > translate). The CSS lays the bar out with
    // flex `order` (nav:1, searchrow:2, tools:3), and `order` moves the PAINT only — never the
    // DOM — so appending searchRow last made a screen reader and the Tab key reach Accessibility
    // and Translate BEFORE the search box that visually precedes them (WCAG 1.3.2 / 2.4.3).
    // Keep DOM order == visual order; the `order` values already agree, so nothing moves.
    var innerKids = announce ? [utilNav, announce, searchRow, tools] : [utilNav, searchRow, tools];
    return el('div', { class: 'util-bar ' + (announce ? 'util-bar--announce' : 'util-bar--gigw') },
      el('div', { class: 'util-inner' }, innerKids));
  }

  // Fill the integrated top-bar ticker from latest-news.json (two copies for a
  // seamless CSS marquee loop). Fail-safe: hides itself if the feed is empty/missing.
  function fillAnnounce(host) {
    var track = host.querySelector('.util-announce-track');
    var wrap = host.querySelector('.util-announce');
    if (!track) return;
    // SAME feed as the below-hero ticker (data/gigw/feeds/latest-news.json)
    getJSON(dataUrl('feeds/latest-news.json')).then(function (d) {
      var items = (d && d.items) || (Array.isArray(d) ? d : []);
      if (!items.length) { if (wrap) wrap.style.display = 'none'; return; }
      function row() {
        return items.map(function (it) {
          return el('a', { class: 'util-announce-item', href: it.href || '#' }, [
            el('i', { class: 'svg-ico fa-solid fa-angles-right', 'aria-hidden': 'true' }),
            el('span', { text: it.text || '' }),
            (it.type && it.size) ? el('span', { class: 'util-announce-meta', text: '(' + it.type + ', ' + it.size + ')' }) : null
          ]);
        });
      }
      row().concat(row()).forEach(function (n) { track.appendChild(n); });
      track.style.animationDuration = Math.max(20, items.length * 6) + 's';
    }).catch(function () { if (wrap) wrap.style.display = 'none'; });
  }

  function buildMasthead(h) {
    var b = h.brand || {};
    var brand = el('a', { href: b.href, class: 'brand', 'aria-label': b.ariaLabel }, [
      el('img', { src: b.logo, alt: (b.logoAlt || ('Logo of ' + (b.title || b.name || 'the organisation'))), width: b.logoWidth, height: b.logoHeight, class: 'brand-logo' }),
      el('span', { class: 'brand-text' }, [
        el('span', { class: 'brand-title', text: b.title }),
        el('span', { class: 'brand-sub', text: b.sub })
      ])
    ]);
    var emblems = el('div', { class: 'masthead-emblems' },
      (h.emblems || []).map(function (e) { return el('img', { src: e.src, alt: e.alt, class: 'emblem' }); }));
    return el('header', { class: 'masthead' }, el('div', { class: 'masthead-inner' }, [brand, emblems]));
  }

  /* The EXACT S3WaaS navbar (inline bar that overflows into a right-side drawer),
     opt-in via header.json "s3nav":true. Ported from assets/js/s3waas.js so a GIGW
     site can use the identical markup + behaviour; styles live in style.css. */
  function renderS3Nav(host, navItems) {
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    // PDF (document) links get a visible "PDF, <size>" type tag + download — same on every navbar.
    function docTag(it) { var h = it && it.href; if (!isPdfHref(h) && !(it && it.meta)) return ''; var lbl = (it && it.meta) || 'PDF'; return ' <span class="s3-doc-type"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i>' + esc(lbl) + '</span>'; }
    function dlAttr(it) { return isPdfHref(it && it.href) ? ' download' : ''; }
    var items = (navItems && navItems.items) ? navItems.items : (Array.isArray(navItems) ? navItems : []);
    var cur = (location.pathname || '/').replace(/\/+$/, '') || '/';
    function isCur(h) { if (!h) return false; var p = h.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'; return p === cur; }
    var inline = '', draw = '';
    items.forEach(function (it) {
      var kids = it.children && it.children.length ? it.children : null;
      var current = it.current || isCur(it.href) || (kids && kids.some(function (s) { return isCur(s.href); }));
      var car = kids ? ' <i class="fa-solid fa-chevron-down s3-caret" aria-hidden="true"></i>' : '';
      // a sub-item with its OWN children becomes a 3rd-level flyout (like the GIGW nav)
      function subLi(s) {
        if (s.children && s.children.length) {
          var fly = '<ul class="s3-sub s3-flyout">' + s.children.map(function (g) {
            return '<li><a href="' + esc(g.href) + '"' + dlAttr(g) + '>' + esc(g.label) + docTag(g) + '</a></li>'; }).join('') + '</ul>';
          return '<li class="s3-has-flyout"><button type="button" class="s3-subparent" aria-haspopup="true" aria-expanded="false">' +
                 esc(s.label) + ' <i class="fa-solid fa-chevron-right s3-caret-r" aria-hidden="true"></i></button>' + fly + '</li>';
        }
        return '<li><a href="' + esc(s.href) + '"' + dlAttr(s) + '>' + esc(s.label) + docTag(s) + '</a></li>';
      }
      function drawLi(s) {
        var gsub = (s.children && s.children.length) ? '<ul class="s3-drawer-sub2">' + s.children.map(function (g) {
          return '<li><a href="' + esc(g.href) + '"' + dlAttr(g) + '>' + esc(g.label) + docTag(g) + '</a></li>'; }).join('') + '</ul>' : '';
        return '<li><a href="' + esc(s.href || '#') + '"' + dlAttr(s) + '>' + esc(s.label) + docTag(s) + '</a>' + gsub + '</li>';
      }
      var subI = kids ? '<ul class="s3-sub">' + kids.map(subLi).join('') + '</ul>' : '';
      var subD = kids ? '<ul class="s3-drawer-sub">' + kids.map(drawLi).join('') + '</ul>' : '';
      if (!it.drawerOnly) {  // drawerOnly items (e.g. Sitemap, Screen Reader) live in the sidebar only
        // GIGW model: a parent (has children) is a <button> — it never navigates, so
        // Enter/Space cleanly TOGGLE its dropdown. A leaf is a normal <a href>.
        var pin = it.pinned ? ' data-pinned' : '';   // never folded into the drawer by fitMenu()
        if (kids)
          inline += '<li' + pin + '><button type="button" class="s3-parent' + (current ? ' is-current' : '') + '" aria-haspopup="true" aria-expanded="false">' + esc(it.label) + car + '</button>' + subI + '</li>';
        else
          inline += '<li' + pin + '><a' + (current ? ' class="is-current"' : '') + ' href="' + esc(it.href || '#') + '"' + dlAttr(it) + '>' + esc(it.label) + docTag(it) + '</a></li>';
      }
      draw += '<li><a href="' + esc(it.href || '#') + '">' + esc(it.label) + '</a>' + subD + '</li>';
    });
    var nav = document.createElement('nav');
    nav.className = 's3-nav'; nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = '<div class="container"><ul id="s3-menu" class="s3-menu">' + inline + '</ul>' +
      '<button class="s3-nav-toggle" aria-expanded="false" aria-controls="s3-drawer" aria-label="Menu">' +
      '<span class="s3-bars" aria-hidden="true"><span></span><span></span><span></span></span></button></div>';
    var overlay = document.createElement('div'); overlay.className = 's3-drawer-overlay'; overlay.hidden = true; overlay.setAttribute('data-s3-drawer-close', '');
    var drawer = document.createElement('aside'); drawer.id = 's3-drawer'; drawer.className = 's3-drawer'; drawer.setAttribute('aria-hidden', 'true'); drawer.setAttribute('aria-label', 'Menu');
    drawer.innerHTML = '<button class="s3-drawer-close" data-s3-drawer-close><i class="fa-solid fa-xmark" aria-hidden="true"></i> Close</button><ul class="s3-drawer-list">' + draw + '</ul>';
    host.appendChild(nav); host.appendChild(overlay); host.appendChild(drawer);

    var inlineMenu = nav.querySelector('#s3-menu'), navToggle = nav.querySelector('.s3-nav-toggle');
    function openD() { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); overlay.hidden = false; navToggle.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('s3-noscroll'); var f = drawer.querySelector('.s3-drawer-close'); if (f) f.focus(); }
    function closeD() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); overlay.hidden = true; navToggle.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('s3-noscroll'); }
    if (navToggle) navToggle.addEventListener('click', function () { drawer.classList.contains('open') ? closeD() : openD(); });
    [overlay, drawer.querySelector('.s3-drawer-close')].forEach(function (b) { if (b) b.addEventListener('click', closeD); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) closeD(); });
    // sidebar keyboard: Up/Down (+ Home/End) move focus between drawer links
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
    // overflow items collapse into the drawer so the bar stays one line
    // PINNED items (nav.json "pinned": true — Contact Us) are never folded into the drawer:
    // reserve their width first, then fold only the others. Contact Us is the LAST item, so
    // without this it is the first thing overflow hides — exactly backwards.
    function fitMenu() {
      if (!inlineMenu || getComputedStyle(inlineMenu).display === 'none') return;
      var l = inlineMenu.children, i, a = inlineMenu.clientWidth, u = 0, r = 0;
      for (i = 0; i < l.length; i++) l[i].classList.remove('s3-hidden');
      for (i = 0; i < l.length; i++) if (l[i].hasAttribute('data-pinned')) r += l[i].offsetWidth;
      for (i = 0; i < l.length; i++) {
        if (l[i].hasAttribute('data-pinned')) continue;
        u += l[i].offsetWidth;
        if (u + r > a) l[i].classList.add('s3-hidden');
      }
    }
    fitMenu(); window.addEventListener('load', fitMenu); var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(fitMenu, 150); });
    // dropdowns (hover + click toggle, outside-click / Esc close)
    var parents = Array.prototype.filter.call(inlineMenu.children, function (li) { return li.querySelector('.s3-sub'); });
    function closeAll() { parents.forEach(function (p) { p.classList.remove('open'); p.classList.remove('click-closed'); var b = p.querySelector(':scope > button'); if (b) b.setAttribute('aria-expanded', 'false'); }); }
    parents.forEach(function (li) {
      li.addEventListener('mouseleave', function () { li.classList.remove('open'); li.classList.remove('click-closed'); });   // clearing click-closed restores hover-to-open after the pointer leaves
    });
    if (parents.length) {
      document.addEventListener('click', function (e) { if (!inlineMenu.contains(e.target)) closeAll(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });
    }
    // Selecting a link on phone navigates AND closes the drawer; a leaf link in the
    // inline bar closes any open dropdown.
    var dlist = drawer.querySelector('.s3-drawer-list');
    if (dlist) dlist.addEventListener('click', function (e) { if (e.target.closest('a[href]')) closeD(); });
    inlineMenu.addEventListener('click', function (e) {
      // Top-level dropdown parent <button>: click/tap toggles it open + closed. CSS only
      // opens on :hover, which never fires on touch/click — so without this the button
      // does nothing on tap. click-closed suppresses the immediate hover re-open.
      var pbtn = e.target.closest('button');
      if (pbtn && pbtn.parentElement && pbtn.parentElement.parentElement === inlineMenu && pbtn.parentElement.querySelector('.s3-sub')) {
        var pli = pbtn.parentElement, wo = !pli.classList.contains('open');
        closeAll();
        pli.classList.toggle('open', wo);
        pli.classList.toggle('click-closed', !wo);
        pbtn.setAttribute('aria-expanded', wo ? 'true' : 'false');
        e.preventDefault(); return;
      }
      // 3rd-level flyout parent: toggle it (and close sibling flyouts)
      var sp = e.target.closest('.s3-subparent');
      if (sp) {
        var fl = sp.closest('.s3-has-flyout'); var willOpen = !fl.classList.contains('open');
        Array.prototype.forEach.call(fl.parentElement.querySelectorAll('.s3-has-flyout.open'), function (o) {
          if (o !== fl) { o.classList.remove('open'); var b = o.querySelector('.s3-subparent'); if (b) b.setAttribute('aria-expanded', 'false'); } });
        fl.classList.toggle('open', willOpen); sp.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        e.preventDefault(); return;
      }
      var a = e.target.closest('a[href]'); if (!a) return;
      var li = a.closest('li');
      var isParent = li && li.parentElement === inlineMenu && li.querySelector('.s3-sub') && a === li.firstElementChild;
      var href = a.getAttribute('href') || '';
      if (!isParent) {
        closeAll();
        // On a navigating LEAF link, ADD .click-closed to its top-level parent so the dropdown stays
        // shut even while the mouse is still hovering it (closeAll only removes .open, and :hover would
        // re-open it). Cleared on mouseleave. Skip pure # anchors. Also drop :focus-within.
        if (href && href.charAt(0) !== '#') {
          parents.forEach(function (p) { if (p.contains(a)) p.classList.add('click-closed'); });
          if (document.activeElement && document.activeElement.blur) { try { document.activeElement.blur(); } catch (x) {} }
        }
      }
    });
    // Keyboard navigation — mirrors the GIGW .mainnav model: ONE delegated handler.
    // Left/Right move across top items; Down opens a submenu and steps into it (and
    // cycles); Up moves up, returning to the top item from the first sub-item;
    // Home/End jump to first/last; Esc closes & returns focus; Tab-out closes all.
    function topItems() {
      // include BOTH leaf links (<a>) AND dropdown parents (<button class="s3-parent">),
      // otherwise Left/Right arrow nav skips Notices/Gallery/Downloads.
      return Array.prototype.map.call(inlineMenu.children, function (li) { return li.firstElementChild; })
        .filter(function (a) { return a && (a.tagName === 'A' || a.tagName === 'BUTTON'); });
    }
    function focusTop(dir) {
      var tops = topItems(), cur = document.activeElement;
      var topLi = cur && cur.closest ? cur.closest('.s3-menu > li') : null;
      var i = topLi ? tops.indexOf(topLi.firstElementChild) : -1;
      if (i < 0) i = 0; else i = (i + dir + tops.length) % tops.length;
      if (tops[i]) tops[i].focus();
    }
    inlineMenu.addEventListener('keydown', function (e) {
      var t = document.activeElement;
      var topLi = t && t.closest ? t.closest('.s3-menu > li') : null;
      var parent = topLi && topLi.querySelector('.s3-sub') ? topLi : null;
      var a = parent ? parent.firstElementChild : null;
      var inSub = !!(t && t.closest && t.closest('.s3-sub'));
      var items = parent ? Array.prototype.slice.call(parent.querySelectorAll('.s3-sub a[href]')) : [];
      var idx = items.indexOf(t);
      function open() { if (parent) { closeAll(); parent.classList.add('open'); if (a) a.setAttribute('aria-expanded', 'true'); } }
      function close() { if (parent) { parent.classList.remove('open'); if (a) a.setAttribute('aria-expanded', 'false'); } }
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'Spacebar':
          // toggle the dropdown; focus STAYS on the button (ArrowDown steps into the
          // submenu) so a second Enter closes it instead of activating a sub-link
          if (parent && !inSub) { e.preventDefault(); if (parent.classList.contains('open')) close(); else open(); }
          break;
        case 'ArrowRight': if (!inSub) { e.preventDefault(); focusTop(1); } break;
        case 'ArrowLeft': if (!inSub) { e.preventDefault(); focusTop(-1); } break;
        case 'ArrowDown':
          if (parent) { e.preventDefault(); open(); if (idx < 0) { if (items[0]) items[0].focus(); } else { (items[idx + 1] || items[0]).focus(); } }
          break;
        case 'ArrowUp':
          if (parent && inSub) { e.preventDefault(); if (idx <= 0) a.focus(); else items[idx - 1].focus(); }
          break;
        case 'Home': if (parent && items.length) { e.preventDefault(); open(); items[0].focus(); } break;
        case 'End': if (parent && items.length) { e.preventDefault(); open(); items[items.length - 1].focus(); } break;
        case 'Escape': if (parent) { e.preventDefault(); close(); if (a) a.focus(); } break;
      }
    });
    inlineMenu.addEventListener('focusout', function (e) { if (!inlineMenu.contains(e.relatedTarget)) closeAll(); });

    // Active page highlight — recomputed against the CURRENT url, and re-run after
    // every SPA swap (the nav is chrome and renders once) so it never goes stale.
    function markActiveS3() {
      var c = (location.pathname || '/').replace(/\/+$/, '') || '/';
      function mm(h) { if (!h) return false; var p = h.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/'; return p === c; }
      Array.prototype.forEach.call(inlineMenu.children, function (li) {
        var head = li.firstElementChild; if (!head) return;
        var on = head.tagName === 'A' && mm(head.getAttribute('href'));
        Array.prototype.forEach.call(li.querySelectorAll('.s3-sub a[href]'), function (sa) { if (mm(sa.getAttribute('href'))) on = true; });
        head.classList.toggle('is-current', on);
        if (head.tagName === 'BUTTON') { if (on) head.setAttribute('aria-current', 'true'); else head.removeAttribute('aria-current'); }
      });
      Array.prototype.forEach.call(drawer.querySelectorAll('.s3-drawer-list a[href]'), function (a) { a.classList.toggle('is-current', mm(a.getAttribute('href'))); });
    }
    markActiveS3();
    (function reg() { if (window.SG && window.SG.content) window.SG.content(markActiveS3); else setTimeout(reg, 60); })();
  }

  function renderHeader(host, hdr, navItems) {
    var sk = hdr.skipLink || {};
    // Avoid a DOUBLE "Skip to Main Content" (a screen reader / read-aloud would read it twice):
    // if the util bar's accessibilityLinks already carry a VISIBLE skip link, don't also add this
    // hidden one. Guard on sk.label so a page without a visible skip link still gets one.
    var dupSkip = (hdr.accessibilityLinks || []).some(function (l) { return /^\s*skip\s*to\s*main/i.test(l.label || ''); });
    if (sk.label && !dupSkip) host.appendChild(el('a', { class: 'skip-link', href: sk.href, text: sk.label }));
    host.appendChild(buildUtilBar(hdr));
    if (hdr.announce && hdr.announce.enabled) fillAnnounce(host);
    host.appendChild(buildMasthead(hdr));
    if (hdr.s3nav) { renderS3Nav(host, navItems); return; }   // exact S3WaaS navbar (e.g. civic)
    var nav = el('nav', { class: 'mainnav', 'aria-label': 'Main navigation' });
    renderNav(nav, navItems);
    markActive(nav);
    host.appendChild(nav);
  }

  /* Minimal fallback if the JSON can't be fetched (e.g. opened via file://). */
  function navFallback(host) {
    host.appendChild(el('div', { class: 'container' },
      el('ul', { id: 'primary-menu', class: 'nav-menu', role: 'menubar', 'aria-label': 'Primary' }, [
        el('li', { class: 'nav-item', role: 'none' }, el('a', { class: 'nav-link', role: 'menuitem', href: 'index.html', text: 'Home' })),
        el('li', { class: 'nav-item', role: 'none' }, el('a', { class: 'nav-link', role: 'menuitem', href: 'sitemap.html', text: 'Sitemap' }))
      ])));
  }
  function footerFallback(host) {
    // Shown only if footer.json can't be fetched (e.g. file://) — no site name to use,
    // so keep it neutral rather than baking in any one organisation's name.
    host.appendChild(el('div', { class: 'footer-bottom' },
      el('div', { class: 'footer-bottom-bar' },
        el('p', { class: 'fb-left' }, ['All rights reserved.']))));
  }

  /* FRAGMENT LINKS UNDER A PORTABLE <base href>.
     Every page declares <base href="../"> so its paths resolve to the site root. But that also
     governs a bare "#id": the browser resolves it against the BASE, so "Skip to Main Content" on
     /contact/ points at the HOME page's #main-content, not this page's. That is a WCAG 2.4.1 fail
     and it happens at a domain root too — it is not a sub-folder quirk.
     Re-point every fragment-only link at the CURRENT page. The original is kept in data-sg-frag so
     a re-run (after a partial navigation) can still recognise a link whose href is no longer "#…".
     S3WaaS has carried this same fix (fixHrefs) for the same reason. */
  function fixFragments(root) {
    var here = location.pathname + location.search;
    var links = (root || document).querySelectorAll('a[href^="#"], a[data-sg-frag]');
    Array.prototype.forEach.call(links, function (a) {
      var frag = a.getAttribute('data-sg-frag') || a.getAttribute('href') || '';
      if (frag.charAt(0) !== '#' || frag === '#') return;
      a.setAttribute('data-sg-frag', frag);
      a.setAttribute('href', here + frag);
    });
  }
  window.SGFixFragments = fixFragments;

  function headerFallback(host) {
    host.appendChild(el('a', { class: 'skip-link', href: '#main-content', text: 'Skip to Main Content' }));
    var nav = el('nav', { class: 'mainnav', 'aria-label': 'Main navigation' });
    navFallback(nav);
    host.appendChild(nav);
  }

  /* ----------------------------------------------------------- ORCHESTRATE - */
  /* Load main.js (page behaviour), then map.js + pdf.js (the DEDICATED, self-healing
     embed loaders — kept separate so the map / inline PDF paint fast, hot-reload on
     their own, and preload ahead of navigation), then nav.js (the SPA-style router).
     All load AFTER main.js so the SG runtime they depend on already exists; all are
     marked async=false so they execute in insertion order. */
  function loadMain(done) {
    // DPSE (Nuxt): hold the page scripts until Vue has hydrated the SSR markup —
    // see plugins/hydration-signal.client.ts. 6s fail-safe so behaviour always loads.
    if (document.getElementById('__nuxt') && !window.__dpseHydrated) {
      var fired = false;
      var go = function () { if (fired) return; fired = true; loadMain(done); };
      window.addEventListener('dpse:hydrated', go, { once: true });
      setTimeout(function () { window.__dpseHydrated = true; go(); }, 6000);
      return;
    }
    var srcs = ['/resources/assets/js/main.js', '/resources/assets/js/counter.js', '/resources/assets/js/map.js', '/resources/assets/js/pdf.js'];  // DPSE: nav.js (SPA swap) disabled — it replaces Vue-owned DOM; see plugins/full-page-nav.client.ts
    // Load exactly ONE accessibility engine: the self-hosted UX4G widget for a ux4g theme,
    // else the built-in read-aloud reader-aid that the built-in a11y panel drives.
    srcs.push(A11Y_UX4G ? '/resources/assets/js/a11y-widget.js' : '/resources/assets/js/read-aloud.js');
    var left = srcs.length;
    function tick() { if (--left === 0 && done) done(); }
    srcs.forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;                 // execute in insertion order
      s.onload = s.onerror = tick;     // resolve even if one fails (boot.js still fail-safes)
      document.body.appendChild(s);
    });
  }
  // Lenient JSON (JSONC): tolerate // and /* */ comments + trailing commas OUTSIDE strings, so an
  // editor "commenting out" a line (e.g. one footer link or social URL) never invalidates the whole
  // file — the fetch would otherwise fail and EVERYTHING that file drives would vanish. String-aware
  // (URLs' "//" survive). Ported verbatim from s3waas.js sjson so both shells parse data identically.
  function sjson(t) {
    var s = '', i = 0, n = t.length, q = false, e = false, a, b;
    while (i < n) { a = t.charAt(i); b = t.charAt(i + 1);
      if (q) { s += a; if (e) { e = false; } else if (a === '\\') { e = true; } else if (a === '"') { q = false; } i++; continue; }
      if (a === '"') { q = true; s += a; i++; continue; }
      if (a === '/' && b === '/') { i += 2; while (i < n && t.charAt(i) !== '\n') i++; continue; }
      if (a === '/' && b === '*') { i += 2; while (i < n && !(t.charAt(i) === '*' && t.charAt(i + 1) === '/')) i++; i += 2; continue; }
      s += a; i++; }
    return JSON.parse(s.replace(/,(\s*[}\]])/g, '$1'));
  }
  function getJSON(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(sjson); }

  /* Fill any element marked data-site="dot.path" from data/site.json, so the
     Web-Information-Manager details and other contact info (email, phone,
     address, …) on policy pages come from ONE source instead of being hard-coded.
       <td data-site="wim.email"></td>            -> textContent = site.wim.email
       <a  data-site="email" data-site-href="mailto:{}">…</a>  -> text + mailto href
     Paths support array indexes too, e.g. data-site="phone.0". */
  /* Tokenise an email for anti-harvest display: comm-gsec.goa@nic.in ->
     comm[dash]gsec[dot]goa[at]nic[dot]in. The JSON stores the REAL plain address; this
     runs at render so you only ever write the proper email in one place (site-details.json). */
  function tokenizeEmail(v) {
    return String(v).replace(/_/g, '[underscore]').replace(/-/g, '[dash]')
                    .replace(/@/g, '[at]').replace(/\./g, '[dot]');
  }
  function isEmailPath(path, v) {
    return /(^|\.)email$/i.test(path) || (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
  }
  /* Resolve {dot.path} placeholders in a value against site.json, so shared data
     (org name, contact, etc.) is REFERENCED from one place, never duplicated —
     e.g. site.json name:"{full_name}" or footer contactHeading:"{wim.name}". */
  function resolveTpl(str, s) {
    return String(str == null ? '' : str).replace(/\{([a-z0-9_.]+)\}/gi, function (_m, p) {
      var v = p.split('.').reduce(function (a, k) { return (a == null) ? undefined : a[k]; }, s);
      return v == null ? '' : v;
    });
  }
  function fillSiteData(s) {
    if (!s) return;
    function get(o, path) { return path.split('.').reduce(function (a, k) { return (a == null) ? undefined : a[k]; }, o); }
    // data-site-link: set an <a> href from a dot-path, and HIDE the element when the value
    // is empty/absent (e.g. a social icon whose URL is blank or commented out in the JSON).
    Array.prototype.forEach.call(document.querySelectorAll('[data-site-link]'), function (el) {
      var lv = get(s, el.getAttribute('data-site-link'));
      if (lv == null || lv === '') { el.style.display = 'none'; return; }
      el.setAttribute('href', String(lv)); el.style.display = '';
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-site]'), function (el) {
      var path = el.getAttribute('data-site');
      var v = get(s, path);
      if (v == null) return;
      if (typeof v === 'string' && v.indexOf('{') >= 0) v = resolveTpl(v, s);   // interconnect the JSONs
      if (isEmailPath(path, v)) {
        // Render the email OBFUSCATED + styled; drop any mailto (a tokenised address isn't clickable).
        el.textContent = tokenizeEmail(v);
        el.classList.add('s3-email');
        el.removeAttribute('href');
        el.removeAttribute('data-site-href');
      } else if (el.hasAttribute('data-site-html')) {
        el.innerHTML = v;                                       // raw HTML (titles with <sup>, &nbsp;, …)
      } else {
        // Self-heal a polluted identity value: an intake/bake bug can leave a phone/
        // name/address carrying stray anchor markup (e.g. `0832-2232631" href="tel:
        // 0832-2232631">0832-2232631`). A plain identity value never legitimately
        // holds a tag or an attribute fragment, so reduce it to its clean leading
        // token — it can then NEVER render as raw markup. (data-site-html is untouched.)
        var cv = v;
        if (typeof v === 'string' && /<|"\s*(href|src)\s*=|">/i.test(v)) cv = v.split(/["<]/)[0].trim();
        el.textContent = cv;
        var tpl = el.getAttribute('data-site-href');
        if (tpl) el.setAttribute('href', tpl.replace('{}', cv));
      }
    });
  }

  /* Optional client-side content protection (WP-Ghost / WordPress-plugin style). All flags
     default OFF and are read from site.json "security": {...}. These are DETERRENTS only
     (trivially bypassable by any determined user) and must NEVER trap keyboard navigation —
     we only guard the mouse / context-menu / clipboard, never Tab/Enter/arrow keys, so
     accessibility is unaffected. A runtime toggle is exposed as window.SiteGuard, e.g.
       SiteGuard.rightClick(true)   // disable right-click
       SiteGuard.rightClick(false)  // re-enable it                                        */
  var Guard = window.SiteGuard = window.SiteGuard || {};
  function _block(e) { e.preventDefault(); return false; }
  Guard.rightClick = function (off) {                       // off=true → right-click DISABLED
    document.removeEventListener('contextmenu', _block);
    if (off) document.addEventListener('contextmenu', _block);
    Guard.rightClickOff = !!off;
  };
  // Inspect / view-source key deterrent. Blocks ONLY the devtools combos — F12,
  // Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U — never a plain key, never Tab/Enter/arrows/typing,
  // so keyboard navigation and screen readers are completely unaffected. (A deterrent only —
  // devtools can still be opened from the browser menu; nothing on the web can truly block it.)
  function _keyBlock(e) {
    var k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F12') { e.preventDefault(); return false; }
    if (mod && (e.shiftKey || e.altKey) && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); return false; }
    if (mod && !e.shiftKey && k === 'u') { e.preventDefault(); return false; }   // view-source (not Ctrl+C copy)
  }
  Guard.devtools = function (off) {                         // off=true → inspect shortcuts DISABLED
    document.removeEventListener('keydown', _keyBlock, true);
    if (off) document.addEventListener('keydown', _keyBlock, true);
    Guard.devtoolsOff = !!off;
  };
  Guard.imageDrag = function (off) {
    document.removeEventListener('dragstart', _block);
    if (off) document.addEventListener('dragstart', _block);
  };
  Guard.copy = function (off) {
    document.removeEventListener('copy', _block);
    if (off) document.addEventListener('copy', _block);
  };
  Guard.textSelect = function (off) {
    var d = document.documentElement.style;
    d.userSelect = d.webkitUserSelect = d.msUserSelect = off ? 'none' : '';
  };
  Guard.apply = function (sec) {
    sec = sec || {};
    Guard.rightClick(!!sec.disableRightClick);
    // "disable right click or inspect" travel together: the inspect-key deterrent turns on with
    // right-click unless a site explicitly sets disableDevtools:false.
    Guard.devtools(sec.disableDevtools != null ? !!sec.disableDevtools : !!sec.disableRightClick);
    Guard.imageDrag(!!sec.disableImageDrag);
    Guard.copy(!!sec.disableCopy);
    Guard.textSelect(!!sec.disableTextSelection);
  };

  /* Site-specific data lives in the CURRENT subdomain's own folder (window.__siteBase
     is set by boot.js from <html data-base="…">; empty on the main site). The header,
     footer and nav therefore DIFFER per subdomain while the layout/CSS/JS stay shared.
     Site-agnostic data (translate) is read from the ROOT with a plain /data/ path. */
  /* Data layout: GIGW chrome lives in data/gigw/; SHARED/theme-agnostic data (identity, feeds,
     derived indexes, counter) lives directly in data/. dataUrl() routes each file to the right
     place so callers don't care. (S3WaaS chrome is data/s3waas/, fetched by s3waas.js.) */
  var _SHARED_DATA = { 'site.json': 1, 'latest-news.json': 1, 'translate.json': 1, 'routes.json': 1,
                       'search-index.json': 1, 'site-stats.json': 1, 'visitor-count.json': 1, 'counter.php': 1 };
  function dataUrl(file) {
    var root = (window.__siteBase || '/resources') + '/data/';
    // feeds/ and tables/ are SHARED across the GIGW and S3WaaS page sets (both
    // stacks render the same data/tables/*.json), so they sit at the data root.
    return (file.indexOf('feeds/') === 0 || file.indexOf('tables/') === 0 || _SHARED_DATA[file])
      ? root + file : root + 'gigw/' + file;
  }

  /* Client-side 404 guard — also the LOCAL-PREVIEW fallback. If a visitor lands on
     a path that is NOT one of the site's real pages (a mistyped/stale URL, or a plain
     static server like `python -m http.server` that doesn't map unknown URLs to the
     custom 404), we send them to the /404/ folder ourselves — so the friendly 404
     shows instead of a bare server error or directory listing.
     SAFE BY DESIGN: the valid-routes list (data/routes.json) is generated from the
     real folder structure, the check fails OPEN (any fetch/parse problem = do
     nothing), and it is skipped on subdomains (which own their own routes) and on
     the 404 page itself, so a real page can never be wrongly bounced. */
  function routeGuard() {
    if (window.__siteBase) return;                       // subdomains own their routes
    var path = location.pathname.replace(/\/index\.html?$/i, '/');
    if (path === '') path = '/';
    if (path === '/404/' || /\/404\.html?$/i.test(location.pathname)) return;
    if (path === '/200/' || /\/200\.html?$/i.test(location.pathname)) return;  // status page (mirrors /404/)
    if (path === '/403/' || path === '/500/') return;                          // error pages (served by ErrorDocument)
    if (/\.[a-z0-9]+$/i.test(path)) return;              // a file (asset), not a page route
    if (path.indexOf('/resources/') === 0) return;       // catalogues/demos under /resources/ aren't root routes
    // Plain fetch (default HTTP caching, NOT no-store) so this tiny manifest is
    // pulled at most once and then served from cache — no repeat downloads.
    fetch('/resources/data/routes.json').then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        var routes = (data && data.routes) || [];
        // DPSE: trailing slash optional on both sides (Nuxt links omit it; routes.json has it)
        var norm = function (p) { return String(p).replace(/\/+$/, '') || '/'; };
        var hit = routes.some(function (r) { return norm(r) === norm(path); });
        if (!hit) window.location.replace('/resources/404/');
      }).catch(function () { /* fail open — never block a real page */ });
  }

  /* Bhashini translation — official v3 plugin.
     Reads data/translate.json, then injects the official Bhashini v3 script once
     its required mount element (.bhashini-plugin-container) is in the DOM. The
     plugin is driven ENTIRELY by attributes on its own <script> tag
     (data-bhashini, language_order, translation-language-list) and renders its
     own language UI into that container. Translation only runs on the registered
     production domain (your-domain.example); elsewhere the widget shows but may not
     translate. */
  function setupTranslate() {
    getJSON('/resources/data/translate.json')
      .then(function (cfg) { loadBhashini(cfg || {}); })
      .catch(function () {});
  }

  function loadBhashini(cfg, tries) {
    if (!cfg.enabled || !cfg.scriptUrl) return;
    if (document.querySelector('script[data-bhashini]')) return;       // already injected
    if (!document.querySelector('.bhashini-plugin-container')) {        // header may still be rendering
      if ((tries || 0) < 40) setTimeout(function () { loadBhashini(cfg, (tries || 0) + 1); }, 100);
      return;
    }
    // Exactly the official v3 init: attributes on the script tag drive the plugin.
    var s = document.createElement('script');
    s.src = cfg.scriptUrl;
    s.async = true;
    s.setAttribute('data-bhashini', 'true');
    s.setAttribute('language_order', cfg.languageOrder || 'gom,hi,en');
    s.setAttribute('translation-language-list', cfg.translationLanguageList || cfg.languageOrder || 'gom,hi,en');
    document.body.appendChild(s);
  }

  function start() {
    routeGuard();
    var headerHost = document.querySelector('[data-include="header"]');
    var navHost = document.querySelector('nav.mainnav[data-include="nav"]');     // legacy: nav-only placeholder
    var footHost = document.querySelector('footer.site-footer[data-include="footer"]');

    var jobs = [];
    if (headerHost) {
      jobs.push(Promise.all([getJSON(dataUrl('header.json')), getJSON(dataUrl('nav.json'))])
        .then(function (r) { renderHeader(headerHost, r[0], r[1]); })
        .catch(function () { headerFallback(headerHost); }));
    } else if (navHost) {
      jobs.push(getJSON(dataUrl('nav.json')).then(function (j) { renderNav(navHost, j); markActive(navHost); })
        .catch(function () { navFallback(navHost); }));
    }
    if (footHost) jobs.push(getJSON(dataUrl('footer.json')).then(function (j) { renderFooter(footHost, j); })
      .catch(function () { footerFallback(footHost); }));

    /* Data tables (tables.js) render from data/tables/*.json. Loaded HERE rather
       than in loadMain() and awaited with the header/footer, so the rows are in
       place BEFORE reveal — no flash of an empty placeholder. */
    jobs.push(new Promise(function (res) {
      if (window.SGTables) return res();
      var s = document.createElement('script');
      s.src = '/resources/assets/js/tables.js';
      s.onload = s.onerror = function () { res(); };
      document.head.appendChild(s);
    }).then(function () {
      return window.SGTables ? window.SGTables.render(false) : null;
    }));

    // site.json → fill [data-site] bindings (WIM/contact/site name) AND apply the optional
    // content-protection toggles (right-click, etc.). Always fetched so security applies even
    // on a page with no data-site bindings.
    // site.json is the SINGLE SOURCE of the site's identity — org name, address, phones, EMAIL, and
    // Web-Information-Manager details. includes.js fills every [data-site] binding from it (contact,
    // footer WIM, policy Contact, RTI, feedback), so changing site.json in ONE place updates every
    // page. Email is stored PLAIN and rendered OBFUSCATED + styled (see fillSiteData). Always fetched
    // so the security toggles apply even on a page with no data-site bindings.
    jobs.push(getJSON(dataUrl('site.json')).then(function (s) {
      window.__site = s || {};
      if (document.querySelector('[data-site]')) fillSiteData(s);
      Guard.apply(s && s.security);
    }).catch(function () {}));

    /* Header + footer are now in the DOM (or failed over to a fallback). Load
       page behaviour (main.js binds sliders/galleries/etc. to the injected DOM),
       THEN reveal — so the first paint is the fully-assembled, initialised page,
       not a flash of un-bound content. boot.js's load + 1200ms fail-safes still
       reveal if a script is slow or errors, so it can never get stuck hidden.
       Slow third-party iframes (maps, PDF previews) are NOT awaited here — they
       carry their own in-box spinner (see .embed-loading in main.js). */
    function reveal() {
      // Chrome + page content are in the DOM: give an EXTERNAL screen reader the correct
      // pronunciations (Sitemap -> "Site Map", RTI/FAQ/Webmail, obfuscated emails) via aria-label.
      // Announced only — the visible text never changes. Re-runs on SPA swaps (idempotent).
      try { applyPronunciations(document); } catch (e) {}
      if (window.__siteReveal) window.__siteReveal();
    }
    Promise.all(jobs).then(function () {
      try { fixFragments(document); } catch (e) {} loadMain(reveal); },
                           function () { loadMain(reveal); });
    document.addEventListener('spa:navigated', function () {
      try { applyPronunciations(document); } catch (e) {}
    });
    setupTranslate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();


/* ── VIDEO FACADE — a third-party player is never the only thing on the page ────────────────
   An <iframe> to YouTube is a live dependency on another company's renderer, its availability
   and its consent rules; a citizen behind a filter, or on a machine where it simply fails, gets
   an empty black box. So a video ships as a LOCAL POSTER wrapped in a link to the video, and the
   player is loaded only when someone asks for it:

     · with no JS at all, the poster is a working link to the video — the content is reachable;
     · with JS, clicking swaps in the iframe and plays inline, which is what people expect;
     · nothing is requested from the third party until that click, so a page can be read without
       telling anyone else it was read. On a government site that is not a detail.

   Markup: <div class="video-facade" data-video="<embed-url>"> <a href="<watch-url>"> <img …>
           <span class="video-play"></span> </a> </div>                                        */
(function () {
  function upgrade(box) {
    var url = box.getAttribute('data-video');
    if (!url) return;                                  // no embed URL -> stays a plain link
    var f = document.createElement('iframe');
    f.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'autoplay=1';
    f.title = box.getAttribute('data-title') || 'Video';
    f.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; autoplay');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('loading', 'eager');
    box.innerHTML = '';
    box.appendChild(f);
    box.classList.add('is-playing');
  }
  document.addEventListener('click', function (e) {
    var box = e.target.closest && e.target.closest('.video-facade');
    if (!box || box.classList.contains('is-playing')) return;
    if (!box.getAttribute('data-video')) return;       // let the link do its job
    e.preventDefault();
    upgrade(box);
  }, false);
  // keyboard: the facade is a real link, so Enter already fires click — nothing extra needed.
})();
