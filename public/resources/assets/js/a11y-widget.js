/* =============================================================================
   Accessibility Widget (SGA11y) — OUR OWN implementation.

   A self-contained floating accessibility widget written from scratch in the studio's
   OWN namespace (.sgw-* / #sgw-* / window.SGA11y). It reverse-engineers the LOOK and
   FEATURE SET of the Govt-of-India UX4G accessibility widget — a floating Ctrl+F2
   launcher that opens a slide-in panel of feature cards — but shares NO upstream code,
   needs NO external CDN and NO framework. Every effect is a class / CSS variable on
   <html> (see a11y-widget.css), scoped away from the widget's own UI.

   Features: Bigger Text · Smaller Text · Text Spacing · Line Height · Dyslexia Friendly ·
   ADHD Mode · Saturation · Dark Mode · Invert Colours · Highlight Links · Read Aloud
   (Text-to-Speech) · Big Cursor · Pause Animation · Hide Images · Reset. State persists
   in localStorage and is re-applied on load. Keyboard: Ctrl+F2 toggles, Esc closes.

   Late-load safe: builds itself immediately whether loaded in <head>, deferred, or
   injected after DOMContentLoaded (as includes.js does).

   Exposes window.SGA11y = { open, close, toggle, reset, isOpen }.
   ============================================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.SGA11y) return;

  var LS = 'sgw-a11y-v1';
  var STEP_MAX = 4;
  var doc = document, root = doc.documentElement;

  /* Keyboard shortcut is OS-DEPENDENT. Ctrl+F2 is a macOS SYSTEM shortcut ("move focus to the
     menu bar") AND F-keys need `fn` on Mac laptops, so it never reaches the page there. On Mac
     we use Ctrl+Shift+A instead — Ctrl+Option is reserved by VoiceOver, and Cmd+Shift+A is
     Chrome's tab search, so Ctrl+Shift+A is the safe free combo. Windows/Linux keep Ctrl+F2. */
  var IS_MAC = /mac|iphone|ipad|ipod/i.test((navigator.platform || '') + ' ' +
    ((navigator.userAgentData && navigator.userAgentData.platform) || '') + ' ' + (navigator.userAgent || ''));
  var SHORTCUT = IS_MAC
    ? { label: 'Ctrl+Shift+A', aria: 'Control Shift A', test: function (e) { return e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey && e.code === 'KeyA'; } }
    : { label: 'Ctrl+F2', aria: 'Control F2', test: function (e) { return e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && (e.code === 'F2' || e.key === 'F2'); } };

  /* -------- self-locate our CSS (sibling ../css/a11y-widget.css), so it's drop-in -------- */
  (function () {
    try {
      if (doc.getElementById('sgw-css')) return;
      var s = doc.currentScript || (function () {
        var a = doc.getElementsByTagName('script');
        for (var i = a.length - 1; i >= 0; i--) { if (a[i].src && /a11y-widget(\.min)?\.js/.test(a[i].src)) return a[i]; }
        return null;
      })();
      var base = s && s.src ? s.src.replace(/[^\/]*$/, '') : '';
      var href = base ? base.replace(/js\/$/, 'css/') + 'a11y-widget.css' : 'a11y-widget.css';
      var l = doc.createElement('link'); l.id = 'sgw-css'; l.rel = 'stylesheet'; l.href = href;
      (doc.head || root).appendChild(l);
    } catch (e) {}
  })();

  /* -------- inline SVG icons (no icon-font dependency) -------- */
  function svg(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  // The launcher glyph = the standard "person with arms out" accessibility figure (viewBox 32),
  // matching the familiar UX4G-style accessibility launcher.
  var PERSON = '<svg viewBox="0 0 32 32" aria-hidden="true">'
    + '<path d="M16 7a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/>'
    + '<path d="M27 7.05l-.028.008-.026.008a7.112 7.112 0 0 0-.188.055c-1.163.341-6.808 1.933-10.785 1.933-3.696 0-8.83-1.375-10.472-1.842A4.61 4.61 0 0 0 5 7.05c-1.188-.313-2 .893-2 1.996 0 1.092.98 1.612 1.972 1.985v.017l5.95 1.86c.609.232.771.47.85.677.259.662.053 1.972-.02 2.43l-.363 2.812L9.378 29.84l-.017.092-.014.08c-.145 1.009.596 1.988 2 1.988 1.225 0 1.766-.846 2-1.996.234-1.15 1.75-9.848 2.625-9.848s2.677 9.848 2.677 9.848c.235 1.15.775 1.996 2 1.996 1.408 0 2.15-.984 2-1.996a3.591 3.591 0 0 0-.047-.254l-2.04-10.92-.361-2.813c-.262-1.638-.052-2.18.02-2.306a.07.07 0 0 0 .005-.01c.067-.125.375-.405 1.092-.674l5.58-1.95c.034-.01.068-.02.101-.033 1-.375 2-.894 2-1.996 0-1.102-.811-2.31-1.999-1.998z"/></svg>';
  var I = {
    bigT: '<text x="4" y="19" font-size="15" font-weight="700">A</text><text x="12" y="19" font-size="20" font-weight="700">A</text>',
    smallT: '<text x="3" y="19" font-size="20" font-weight="700">A</text><text x="13" y="19" font-size="12" font-weight="700">A</text>',
    space: '<path d="M4 8V6h16v2M4 18v-2h16v2M8 12h8"/><path d="M6 10l-2 2 2 2M18 10l2 2-2 2" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    line: '<path d="M10 6h11v2H10zM10 11h11v2H10zM10 16h11v2H10z"/><path d="M5 4v16M3 6l2-2 2 2M3 18l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    dysl: '<text x="4" y="18" font-size="15" font-weight="700">Df</text>',
    adhd: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 12c1.5-2 3-2 5 0s3.5 2 5 0" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    sat: '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>',
    dark: '<path d="M13 3a9 9 0 108 12 7 7 0 01-8-12z"/>',
    invert: '<path d="M12 3v18a9 9 0 000-18z"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    links: '<path d="M3.9 12a3.1 3.1 0 013.1-3.1h4V7H7a5 5 0 000 10h4v-1.9H7A3.1 3.1 0 013.9 12zm4.1 1h8v-2H8v2zm9-6h-4v1.9h4a3.1 3.1 0 010 6.2h-4V17h4a5 5 0 000-10z"/>',
    tts: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 010 8M18.5 6a8 8 0 010 12" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    cursor: '<path d="M6 3l14 8-6 1.5 3 7-3 1.3-3-7-5 5z"/>',
    pause: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 8v8M14 8v8" stroke="currentColor" stroke-width="1.8"/>',
    hideimg: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="1.7"/>',
    reset: '<path d="M12 5V2L7 6l5 4V7a5 5 0 11-5 5H5a7 7 0 107-7z"/>'
  };

  /* -------- feature registry -------- */
  // type: 'step' (0..4), 'toggle' (on/off), 'cycle' (0..n labels)
  var FEATURES = [
    { key: 'bigger',  name: 'Bigger Text',   icon: I.bigT,   type: 'step' },
    { key: 'smaller', name: 'Smaller Text',  icon: I.smallT, type: 'step' },
    { key: 'space',   name: 'Text Spacing',  icon: I.space,  type: 'step' },
    { key: 'line',    name: 'Line Height',   icon: I.line,   type: 'step' },
    { key: 'dyslexia',name: 'Dyslexia Friendly', icon: I.dysl, type: 'toggle' },
    { key: 'adhd',    name: 'ADHD Mode',     icon: I.adhd,   type: 'toggle' },
    { key: 'sat',     name: 'Saturation',    icon: I.sat,    type: 'cycle', steps: ['', 'low', 'high', 'gray'] },
    { key: 'dark',    name: 'Dark Mode',     icon: I.dark,   type: 'toggle' },
    { key: 'invert',  name: 'Invert Colours',icon: I.invert, type: 'toggle' },
    { key: 'hlinks',  name: 'Highlight Links', icon: I.links, type: 'toggle' },
    { key: 'tts',     name: 'Read Aloud',    icon: I.tts,    type: 'toggle' },
    { key: 'cursor',  name: 'Big Cursor',    icon: I.cursor, type: 'toggle' },
    { key: 'pauseanim', name: 'Pause Animation', icon: I.pause, type: 'toggle' },
    { key: 'hideimg', name: 'Hide Images',   icon: I.hideimg,type: 'toggle' }
  ];

  /* -------- state -------- */
  var state = load();
  state.tts = 0;   // Read-aloud is a per-session ACTION, never auto-started on load (don't persist it).
  function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }

  /* -------- build UI -------- */
  var panel, launch, mask = { top: null, bot: null }, ttsUtter = null;

  function el(html) { var d = doc.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    if (doc.getElementById('sgw-panel')) return;

    launch = el('<button id="sgw-launch" class="sgw-launch" type="button" aria-label="Accessibility options (' + SHORTCUT.aria + ')" aria-keyshortcuts="' + SHORTCUT.aria + '" aria-controls="sgw-panel" aria-expanded="false" aria-haspopup="dialog">'
      + '<span class="sgw-ic">' + PERSON + '</span>'
      + '<span class="sgw-launch-key">' + SHORTCUT.label + '</span></button>');

    var cards = FEATURES.map(function (f) {
      var steps = (f.type === 'step' || f.type === 'cycle')
        ? '<span class="sgw-steps" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : '';
      return '<button class="sgw-item" type="button" data-feat="' + f.key + '" aria-pressed="false">'
        + svg(f.icon) + '<span class="sgw-item-name">' + f.name + '</span>' + steps + '</button>';
    }).join('');

    panel = el('<div id="sgw-panel" class="sgw-panel" role="dialog" aria-modal="false" aria-labelledby="sgw-title">'
      + '<div class="sgw-head"><h2 id="sgw-title">Accessibility options <span class="sgw-key">' + SHORTCUT.label + '</span></h2>'
      + '<button class="sgw-close" type="button" aria-label="Close accessibility panel">✕</button></div>'
      + '<div class="sgw-body"><div class="sgw-grid">' + cards + '</div></div>'
      + '<div class="sgw-foot"><button class="sgw-reset" type="button">' + svg(I.reset) + ' Reset all</button>'
      + '<span class="sgw-credit">Accessibility widget</span></div></div>');

    doc.body.appendChild(launch);
    doc.body.appendChild(panel);

    launch.addEventListener('click', toggle);
    panel.querySelector('.sgw-close').addEventListener('click', close);
    panel.querySelector('.sgw-reset').addEventListener('click', reset);
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('.sgw-item'); if (!b) return;
      activate(b.getAttribute('data-feat'));
    });
    doc.addEventListener('keydown', function (e) {
      if (SHORTCUT.test(e)) { e.preventDefault(); toggle(); }
      else if (e.key === 'Escape' && isOpen()) { close(); launch.focus(); }
    });

    applyAll();     // re-apply persisted state + reflect it on the buttons
  }

  /* -------- open / close (CSS `visibility` handles tab-order + AT when closed; no `hidden` attr) -------- */
  function isOpen() { return panel && panel.classList.contains('sgw-open'); }
  function open() { if (!panel) return; panel.classList.add('sgw-open'); launch.setAttribute('aria-expanded', 'true'); var f = panel.querySelector('.sgw-item'); if (f) f.focus(); }
  function close() { if (!panel) return; panel.classList.remove('sgw-open'); launch.setAttribute('aria-expanded', 'false'); }
  function toggle() { isOpen() ? close() : open(); }

  /* -------- activate a feature (click) -------- */
  function activate(key) {
    var f = feat(key); if (!f) return;
    if (f.type === 'toggle') { state[key] = !state[key]; }
    else if (f.type === 'step') { state[key] = ((state[key] || 0) + 1) % (STEP_MAX + 1); }
    else if (f.type === 'cycle') { state[key] = ((state[key] || 0) + 1) % f.steps.length; }
    // Bigger and Smaller are mutually exclusive; so are the two cursors etc.
    if (key === 'bigger' && state.bigger) state.smaller = 0;
    if (key === 'smaller' && state.smaller) state.bigger = 0;
    save();
    applyOne(f);
    reflect(f);
  }
  function feat(k) { for (var i = 0; i < FEATURES.length; i++) if (FEATURES[i].key === k) return FEATURES[i]; return null; }

  /* -------- reflect state onto a button -------- */
  function reflect(f) {
    var b = panel.querySelector('.sgw-item[data-feat="' + f.key + '"]'); if (!b) return;
    var v = state[f.key] || 0, on = !!v;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var dots = b.querySelectorAll('.sgw-steps i');
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < v);
  }

  /* -------- apply effects -------- */
  function applyAll() { FEATURES.forEach(applyOne); FEATURES.forEach(reflect); }

  function applyOne(f) {
    var v = state[f.key] || 0;
    switch (f.key) {
      case 'bigger':
        setText(v ? 1 + v * 0.12 : (state.smaller ? 1 - state.smaller * 0.08 : 0)); break;
      case 'smaller':
        setText(v ? 1 - v * 0.08 : (state.bigger ? 1 + state.bigger * 0.12 : 0)); break;
      case 'line':
        root.classList.toggle('sgw-lineadj', !!v);
        if (v) root.style.setProperty('--sgw-lh', (1.5 + v * 0.35).toFixed(2)); break;
      case 'space':
        root.classList.toggle('sgw-spaceadj', !!v);
        if (v) { root.style.setProperty('--sgw-ls', (v * 0.06).toFixed(3) + 'em'); root.style.setProperty('--sgw-ws', (v * 0.12).toFixed(3) + 'em'); } break;
      case 'dyslexia': root.classList.toggle('sgw-dyslexia', !!v); break;
      case 'adhd': setAdhd(!!v); break;
      case 'sat': setFilter(); break;
      case 'invert': setFilter(); break;
      case 'dark': setDark(!!v); break;
      case 'hlinks': root.classList.toggle('sgw-hlinks', !!v); break;
      case 'tts': setTts(!!v); break;
      case 'cursor': root.classList.toggle('sgw-cursor', !!v); break;
      case 'pauseanim': root.classList.toggle('sgw-pauseanim', !!v); break;
      case 'hideimg': root.classList.toggle('sgw-hideimg', !!v); break;
    }
  }

  function setText(scale) {
    if (!scale) { root.classList.remove('sgw-textadj'); root.style.removeProperty('--sgw-textz'); return; }
    root.classList.add('sgw-textadj'); root.style.setProperty('--sgw-textz', scale.toFixed(3));
  }

  // Saturation + Invert compose into one filter on <html>
  function setFilter() {
    var f = [], sat = state.sat || 0, inv = state.invert;
    if (sat === 1) f.push('saturate(.5)'); else if (sat === 2) f.push('saturate(1.8)'); else if (sat === 3) f.push('grayscale(1)');
    if (inv) f.push('invert(1) hue-rotate(180deg)');
    if (f.length) { root.classList.add('sgw-filter'); root.style.setProperty('--sgw-filter', f.join(' ')); }
    else { root.classList.remove('sgw-filter'); root.style.removeProperty('--sgw-filter'); }
  }

  // Dark mode reuses the theme's own dark stylesheet (html.dark-mode + body.dark-mode + s3 variants).
  function setDark(on) {
    root.classList.toggle('dark-mode', on);
    var body = doc.body; if (body) { body.classList.toggle('dark-mode', on); if (body.classList.contains('s3') || root.classList.contains('s3')) body.classList.toggle('s3-dark', on); }
    root.classList.toggle('s3-dark', on && (root.classList.contains('s3') || (doc.body && doc.body.classList.contains('s3'))));
  }

  // ADHD reading strip: two dim bands leaving a clear ~120px reading window that follows the cursor.
  function setAdhd(on) {
    if (on) {
      if (!mask.top) { mask.top = el('<div class="sgw-adhd-mask sgw-adhd-top"></div>'); mask.bot = el('<div class="sgw-adhd-mask sgw-adhd-bot"></div>'); doc.body.appendChild(mask.top); doc.body.appendChild(mask.bot); doc.addEventListener('mousemove', moveAdhd); moveAdhd({ clientY: window.innerHeight / 2 }); }
    } else if (mask.top) { doc.removeEventListener('mousemove', moveAdhd); mask.top.remove(); mask.bot.remove(); mask.top = mask.bot = null; }
  }
  function moveAdhd(e) { if (!mask.top) return; var y = e.clientY, h = 70; mask.top.style.height = Math.max(0, y - h) + 'px'; mask.bot.style.height = Math.max(0, window.innerHeight - y - h) + 'px'; }

  // Read Aloud (browser TTS) — reads the main content; toggling off cancels. NOT a screen reader.
  function setTts(on) {
    if (!('speechSynthesis' in window)) return;
    if (on) {
      var main = doc.querySelector('main, #main-content, #s3-main, [role="main"]') || doc.body;
      var txt = (main.innerText || main.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 6000);
      if (!txt) { state.tts = false; save(); return; }
      try { window.speechSynthesis.cancel(); ttsUtter = new SpeechSynthesisUtterance(txt); ttsUtter.rate = 1; ttsUtter.onend = function () { state.tts = false; save(); var f = feat('tts'); if (f) reflect(f); }; window.speechSynthesis.speak(ttsUtter); } catch (e) {}
    } else { try { window.speechSynthesis.cancel(); } catch (e) {} ttsUtter = null; }
  }

  /* -------- reset -------- */
  // Clear state, then re-apply every feature with value 0 (each applyOne handles its own OFF path,
  // incl. cancelling TTS and removing the ADHD strip), then remove any lingering CSS vars.
  function reset() {
    state = {}; save();
    applyAll();
    ['--sgw-textz', '--sgw-lh', '--sgw-ls', '--sgw-ws', '--sgw-filter'].forEach(function (p) { root.style.removeProperty(p); });
  }

  window.SGA11y = { open: open, close: close, toggle: toggle, reset: reset, isOpen: isOpen };

  // Stop any read-aloud speech cleanly on navigation (full or SPA).
  window.addEventListener('pagehide', function () { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} });

  /* -------- late-load safe init -------- */
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build);
  else build();
})();
