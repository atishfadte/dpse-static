/* =============================================================================
   Read aloud — browser text-to-speech (OPTIONAL reader-aid).

   NOT a screen reader. A web page CANNOT drive NVDA / JAWS / VoiceOver / TalkBack /
   Orca — those are OS assistive tech and there is no API for a page to control them.
   This is `window.speechSynthesis` (the BROWSER's own voice) for a DIFFERENT audience:
   sighted users with dyslexia / low literacy who do NOT run a screen reader. It is a
   real, visible, LABELLED "Read aloud" control — never sold as a screen-reader feature.

   Features: reads the WHOLE page (from the top of the main content) OR a SECTION
   (click any block while active to read from there; or select text and press play).
   Floating controls: rewind · play/pause · fast-forward · stop. The current block is
   highlighted and scrolled into view. Self-wires to any `[data-opt="read-aloud"]`
   panel button (GIGW + S3WaaS + built sites), so only the button markup is needed.

   Exposes window.SGReadAloud = { on, off, toggle, isOn }.
   ============================================================================= */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  var synth = window.speechSynthesis;
  // Read the WHOLE page in DOM order — nav bar, links, buttons, main content, footer — not just main.
  var MAIN = 'body';
  var READABLE = 'h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figcaption,td,th,.s3-lead,.lead,summary,a[href],button,[role="button"],label';
  // Skip only what should never be spoken: the read-aloud bar itself, the a11y panel controls, the
  // Bhashini widget, hidden / screen-reader-only text, and the duplicate skip link.
  var SKIP = '[aria-hidden="true"],script,style,[hidden],.sg-ra-bar,.a11y-panel,.s3-a11y-panel,.bhashini-plugin-container,.visually-hidden,.sr-only,.skip-link';

  var chunks = [], idx = -1, active = false, paused = false, bar = null, clickBound = false, voice = null;

  /* Pick the most NATURAL voice available (default browser voices sound robotic). Prefer
     neural / premium / Google / Siri voices, matched to the page language. Voices load async,
     so this is refreshed on `voiceschanged`. */
  function pickVoice() {
    var vs = (synth.getVoices && synth.getVoices()) || [];
    if (!vs.length) return null;
    var lang = ((document.documentElement.lang || 'en').slice(0, 2)).toLowerCase();
    var pool = vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(lang) === 0; });
    if (!pool.length) pool = vs.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf('en') === 0; });
    if (!pool.length) pool = vs;
    var NAT = /natural|neural|premium|enhanced|siri|google|samantha|serena|aria|jenny|libby|sonia|daniel|karen|moira|tessa/i;
    var TOP = /natural|neural|premium|enhanced|siri|google/i;
    pool = pool.slice().sort(function (a, b) {
      var sa = (TOP.test(a.name) ? 2 : 0) + (NAT.test(a.name) ? 1 : 0) + (a.localService ? 0.5 : 0);
      var sb = (TOP.test(b.name) ? 2 : 0) + (NAT.test(b.name) ? 1 : 0) + (b.localService ? 0.5 : 0);
      return sb - sa;
    });
    return pool[0] || null;
  }
  function ensureVoice() { if (!voice) voice = pickVoice(); return voice; }
  if (synth.getVoices && synth.getVoices().length) ensureVoice();
  try { synth.onvoiceschanged = function () { voice = null; ensureVoice(); }; } catch (e) {}

  function root() { return document.querySelector(MAIN) || document.body; }

  function collect() {
    var out = [], seen = [];
    root().querySelectorAll(READABLE).forEach(function (n) {
      if (n.closest(SKIP)) return;
      // skip a block whose text is already covered by an ancestor block we took
      for (var s = 0; s < seen.length; s++) { if (seen[s].contains(n)) return; }
      var t = (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length > 1 && n.getClientRects().length) { out.push({ el: n, text: t }); seen.push(n); }
    });
    return out;
  }

  function clearHi() { chunks.forEach(function (c) { c.el.classList.remove('sg-ra-current'); }); }
  function highlight() {
    clearHi();
    var c = chunks[idx];
    if (c) { c.el.classList.add('sg-ra-current'); try { c.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} }
  }

  function speak(i, opts) {
    opts = opts || {};
    if (i < 0 || i >= chunks.length) { stop(); return; }
    idx = i; highlight();
    var u = new SpeechSynthesisUtterance(opts.text != null ? opts.text : chunks[i].text);
    var v = ensureVoice(); if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = getRate(); u.pitch = 1;   // natural pitch; rate from the speed control
    u.rate = Math.max(0.5, Math.min(2, u.rate));
    u.onend = function () { if (active && !paused && !opts.oneShot) speak(idx + 1); else if (opts.oneShot) { active = active; updateBar(); } };
    synth.cancel(); synth.speak(u); paused = false; updateBar();
  }

  function play() {
    if (paused && synth.paused) { synth.resume(); paused = false; updateBar(); return; }
    // read the current text SELECTION as a one-shot, if any
    var sel = (window.getSelection && window.getSelection().toString().trim()) || '';
    if (sel && sel.length > 1) { active = true; speak(idx < 0 ? 0 : idx, { text: sel, oneShot: true }); return; }
    if (!chunks.length) chunks = collect();
    active = true; speak(idx < 0 ? 0 : idx);
  }
  function pause() { if (synth.speaking && !synth.paused) { synth.pause(); paused = true; updateBar(); } }
  function toggleP() { (paused || !synth.speaking) ? play() : pause(); }
  function next() { if (chunks.length) speak(Math.min(chunks.length - 1, idx + 1)); }
  function prev() { if (chunks.length) speak(Math.max(0, idx - 1)); }
  function stop() { active = false; paused = false; synth.cancel(); clearHi(); idx = -1; updateBar(); }

  // click a block to read from there (only while active)
  function onDocClick(e) {
    if (!active) return;
    // let real interactive controls do their job (navigate / submit / toggle) — never hijack them
    if (e.target.closest('.sg-ra-bar, a[href], button, [role="button"], input, select, textarea, label')) return;
    var el = e.target.closest('h1,h2,h3,h4,h5,h6,p,li,dt,dd,blockquote,figcaption,td,th,.s3-lead,.lead,summary');
    if (!el || el.closest(SKIP)) return;
    var i = -1; for (var k = 0; k < chunks.length; k++) { if (chunks[k].el === el) { i = k; break; } }
    if (i >= 0) { e.preventDefault(); speak(i); }
  }

  function ico(name) { return '<i class="fa-solid ' + name + '" aria-hidden="true"></i>'; }
  function getRate() { var r = parseFloat(localStorage.getItem('sg-ra-rate')); return (r >= 0.5 && r <= 2) ? r : 1; }
  function rateLabel() { return (Math.round(getRate() * 100) / 100) + '×'; }
  function setRate(r) {
    r = Math.max(0.5, Math.min(2, Math.round(r * 4) / 4));   // clamp 0.5–2, step 0.25
    localStorage.setItem('sg-ra-rate', r);
    updateBar();
    if (active && synth.speaking) speak(idx);                // re-read current block at the new speed
  }
  function buildBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'sg-ra-bar'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Read aloud controls');
    bar.innerHTML =
      '<span class="sg-ra-title">Read aloud</span>' +
      '<button type="button" data-ra="prev" aria-label="Previous section">' + ico('fa-backward-step') + '</button>' +
      '<button type="button" data-ra="play" aria-label="Play">' + ico('fa-play') + '</button>' +
      '<button type="button" data-ra="next" aria-label="Next section">' + ico('fa-forward-step') + '</button>' +
      '<button type="button" data-ra="stop" aria-label="Stop">' + ico('fa-stop') + '</button>' +
      '<span class="sg-ra-sep" aria-hidden="true"></span>' +
      '<button type="button" data-ra="slower" aria-label="Slower">' + ico('fa-minus') + '</button>' +
      '<span class="sg-ra-rate" aria-live="polite" title="Reading speed">' + rateLabel() + '</span>' +
      '<button type="button" data-ra="faster" aria-label="Faster">' + ico('fa-plus') + '</button>' +
      '<span class="sg-ra-sep" aria-hidden="true"></span>' +
      '<button type="button" data-ra="close" class="sg-ra-close" aria-label="Close read aloud">' + ico('fa-xmark') + '</button>';
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-ra]'); if (!b) return;
      var a = b.getAttribute('data-ra');
      if (a === 'prev') prev();
      else if (a === 'next') next();
      else if (a === 'stop') stop();
      else if (a === 'slower') setRate(getRate() - 0.25);
      else if (a === 'faster') setRate(getRate() + 0.25);
      else if (a === 'close') off();          // turn Read aloud OFF entirely (remove the bar)
      else toggleP();
    });
    document.body.appendChild(bar);
  }
  function updateBar() {
    if (!bar) return;
    var pb = bar.querySelector('button[data-ra="play"]');
    var playing = synth.speaking && !synth.paused;
    pb.innerHTML = ico(playing ? 'fa-pause' : 'fa-play');
    pb.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    var rl = bar.querySelector('.sg-ra-rate'); if (rl) rl.textContent = rateLabel();
    var sl = bar.querySelector('button[data-ra="slower"]'); if (sl) sl.disabled = getRate() <= 0.5;
    var fa = bar.querySelector('button[data-ra="faster"]'); if (fa) fa.disabled = getRate() >= 2;
  }

  function on() {
    if (active || (bar && document.body.contains(bar))) { }
    chunks = collect();
    buildBar();
    active = true;
    if (!clickBound) { document.addEventListener('click', onDocClick, true); clickBound = true; }
    document.documentElement.classList.add('sg-ra-on');
    play();
    setPressed(true);
  }
  function off() {
    stop();
    if (bar) { bar.remove(); bar = null; }
    if (clickBound) { document.removeEventListener('click', onDocClick, true); clickBound = false; }
    document.documentElement.classList.remove('sg-ra-on');
    setPressed(false);
  }
  function setPressed(v) {
    document.querySelectorAll('[data-opt="read-aloud"]').forEach(function (b) { b.setAttribute('aria-pressed', v ? 'true' : 'false'); });
  }

  window.SGReadAloud = { on: on, off: off, toggle: function () { (active ? off : on)(); }, isOn: function () { return active; } };

  // self-wire: any panel button data-opt="read-aloud" toggles read-aloud (capture, so it
  // runs even if a generic a11y handler also toggles a body class — harmless).
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-opt="read-aloud"]'); if (!b) return;
    window.SGReadAloud.toggle();
  }, false);

  // stop cleanly on navigation (SPA + full)
  window.addEventListener('pagehide', function () { try { synth.cancel(); } catch (e) {} });
})();
