/* ============================================================================
   a11y-menu.js — self-contained Accessibility MENU component (no dependencies).
   Wires every toggle in a `.sg-a11y` menu: Text size (A−/A/A+), Dark mode
   and the reader aids (Readable font, Bigger text
   spacing, Large cursor) + Reset. Each preference is a body
   class + a localStorage key (sg-*), so it persists and re-applies on load.
   Drop the `.sg-a11y` markup on a page, load this file (defer), done. The CSS
   ships in style.css / s3waas.css (the `sg-*` reader-aids + `.sg-a11y-*` panel).
   Deliberately NO read-aloud/TTS — a web page cannot drive a screen reader.
   ========================================================================== */
(function () {
  'use strict';
  var OPTS = ['readable-font', 'big-spacing', 'big-cursor', 'hi-cursor', 'read-guide', 'read-mask'];
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var body = document.body, root = document.documentElement;

  // ---- restore saved preferences ----
  var font = parseFloat(ls('sg-font')) || 1;
  function applyFont() { root.style.fontSize = (font * 100) + '%'; save('sg-font', font); }
  if (font !== 1) applyFont();
  var _m0 = document.querySelector('.sg-a11y'); var DARKG = (_m0 && _m0.getAttribute('data-dark-class')) || 'dark-mode';
  if (ls('sg-dark') === '1') { root.classList.add(DARKG); body.classList.add(DARKG); }
  try { body.classList.remove('sg-contrast'); localStorage.removeItem('sg-contrast'); } catch (e) {}   // High contrast feature removed
  OPTS.forEach(function (k) { if (ls('sg-' + k) === '1') body.classList.add('sg-' + k); });

  // Pointer aids that need a cursor-following overlay (Reading guide + Reading mask). Created on
  // demand, follow the mouse, torn down when off. The CSS-only aids need none of this.
  var _guide = null, _maskT = null, _maskB = null, _moveOn = false, _offBtn = null;
  function _onMove(e) { var y = e.clientY; if (_guide) _guide.style.top = y + 'px'; if (_maskT) { _maskT.style.height = Math.max(0, y - 26) + 'px'; _maskB.style.top = (y + 26) + 'px'; } }
  function _turnOffReadAids() {
    ['read-guide', 'read-mask'].forEach(function (k) {
      body.classList.remove('sg-' + k); save('sg-' + k, '0');
      var pb = document.querySelector('[data-a11y="opt"][data-opt="' + k + '"]'); if (pb) pb.setAttribute('aria-pressed', 'false');
    });
    syncPointerAids();
  }
  function syncPointerAids() {
    var g = body.classList.contains('sg-read-guide'), m = body.classList.contains('sg-read-mask');
    if (g && !_guide) { _guide = document.createElement('div'); _guide.className = 'sg-guideline'; document.body.appendChild(_guide); }
    else if (!g && _guide) { _guide.parentNode.removeChild(_guide); _guide = null; }
    if (m && !_maskT) { _maskT = document.createElement('div'); _maskT.className = 'sg-maskpane sg-maskpane-top'; _maskB = document.createElement('div'); _maskB.className = 'sg-maskpane sg-maskpane-bot'; document.body.appendChild(_maskT); document.body.appendChild(_maskB); }
    else if (!m && _maskT) { _maskT.parentNode.removeChild(_maskT); _maskB.parentNode.removeChild(_maskB); _maskT = _maskB = null; }
    var need = g || m;
    if (need && !_offBtn) {
      _offBtn = document.createElement('button'); _offBtn.type = 'button'; _offBtn.className = 'sg-read-off';
      _offBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i> Turn Off Reading Aids';
      _offBtn.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); _turnOffReadAids(); });
      _offBtn.addEventListener('touchend', function (ev) { ev.preventDefault(); ev.stopPropagation(); _turnOffReadAids(); }, { passive: false });
      document.body.appendChild(_offBtn);
    } else if (!need && _offBtn) { _offBtn.parentNode.removeChild(_offBtn); _offBtn = null; }
    if (need && !_moveOn) { document.addEventListener('mousemove', _onMove); _moveOn = true; }
    else if (!need && _moveOn) { document.removeEventListener('mousemove', _onMove); _moveOn = false; }
  }
  if (document.body) syncPointerAids();

  function initMenu(wrap) {
    if (wrap.__sgWired) return; wrap.__sgWired = true;
    var toggle = wrap.querySelector('.sg-a11y-toggle');
    var panel = wrap.querySelector('.sg-a11y-panel');
    // Shell-aware dark class: GIGW uses 'dark-mode'; an S3WaaS theme uses '<slug>-dark'
    // (set data-dark-class="<slug>-dark" on the .sg-a11y element). Applied to <html> AND <body>.
    var DARK = wrap.getAttribute('data-dark-class') || 'dark-mode';

    // reflect restored state on the buttons
    function press(sel, on) { var b = wrap.querySelector(sel); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    press('[data-a11y="dark"]', body.classList.contains(DARK));
    OPTS.forEach(function (k) { press('[data-opt="' + k + '"]', body.classList.contains('sg-' + k)); });
    var dl = wrap.querySelector('.sg-dark-label'); if (dl && body.classList.contains(DARK)) dl.textContent = 'Light mode';

    // open / close
    if (toggle && panel) {
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
      });
    }

    // toggles (delegated)
    wrap.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-a11y]'); if (!btn) return;
      var a = btn.getAttribute('data-a11y');
      if (a === 'font-dec') { font = Math.max(0.85, Math.round((font - 0.1) * 10) / 10); applyFont(); }
      else if (a === 'font-inc') { font = Math.min(1.4, Math.round((font + 0.1) * 10) / 10); applyFont(); }
      else if (a === 'font-reset') { font = 1; applyFont(); }
      else if (a === 'dark') {
        var d = body.classList.toggle(DARK); root.classList.toggle(DARK, d);
        save('sg-dark', d ? '1' : '0'); btn.setAttribute('aria-pressed', d ? 'true' : 'false');
        if (dl) dl.textContent = d ? 'Light mode' : 'Dark mode';
      }
      else if (a === 'opt') { var k = btn.getAttribute('data-opt'); var o = body.classList.toggle('sg-' + k); save('sg-' + k, o ? '1' : '0'); btn.setAttribute('aria-pressed', o ? 'true' : 'false'); if (o && (k === 'big-cursor' || k === 'hi-cursor')) { var _oc = k === 'big-cursor' ? 'hi-cursor' : 'big-cursor'; body.classList.remove('sg-' + _oc); save('sg-' + _oc, '0'); var _ob = document.querySelector('[data-opt="' + _oc + '"]'); if (_ob) _ob.setAttribute('aria-pressed', 'false'); } syncPointerAids(); }
      else if (a === 'a11y-reset') {
        body.classList.remove(DARK); root.classList.remove(DARK);
        OPTS.forEach(function (k) { body.classList.remove('sg-' + k); save('sg-' + k, '0'); });
        save('sg-dark', '0'); font = 1; applyFont(); syncPointerAids();
        Array.prototype.forEach.call(wrap.querySelectorAll('[data-a11y][aria-pressed]'), function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (dl) dl.textContent = 'Dark mode';
      }
    });
  }

  function boot() { Array.prototype.forEach.call(document.querySelectorAll('.sg-a11y'), initMenu); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.SGA11yMenu = boot;   // re-scan if a menu is injected later
})();
