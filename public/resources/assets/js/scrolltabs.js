/* ============================================================================
   Scrollable tabs — a drop-in, framework-free component.
   Add class "sg-scrolltabs" to any horizontal tab-label strip (the element that
   holds the <label>/<button>/<a> tabs). When the tabs are wider than the strip it
   scrolls HORIZONTALLY with:
     • NO visible scrollbar
     • a fade mask at the scrollable edge(s)  (via sg-can-scroll / sg-at-start / sg-at-end)
     • an animated pulsing chevron hint on the parent (pure CSS, see scrolltabs.css / *.css)
     • mouse-WHEEL (vertical) → horizontal scroll
   Self-initialising. Re-run window.SGScrollTabs() after you inject tabs dynamically
   (e.g. a partial/SPA navigation). No config, no dependencies.
   ============================================================================ */
(function () {
  'use strict';
  function wire(bar) {
    function upd() {
      var can = bar.scrollWidth - bar.clientWidth > 4;
      bar.classList.toggle('sg-can-scroll', can);
      bar.classList.toggle('sg-at-start', bar.scrollLeft <= 2);
      bar.classList.toggle('sg-at-end', bar.scrollLeft >= bar.scrollWidth - bar.clientWidth - 2);
    }
    if (!bar.__sgScrollWired) {
      bar.__sgScrollWired = 1;
      bar.addEventListener('scroll', upd, { passive: true });
      // vertical wheel scrolls the strip horizontally (there is no visible scrollbar)
      bar.addEventListener('wheel', function (e) {
        if (bar.scrollWidth - bar.clientWidth > 4 && e.deltaY && !e.shiftKey) {
          bar.scrollLeft += (e.deltaY > 0 ? 1 : -1) * Math.max(40, Math.abs(e.deltaY));
          e.preventDefault();
        }
      }, { passive: false });
      // click-and-DRAG (grab) to scroll horizontally
      var down = false, sx = 0, sl = 0, moved = false;
      bar.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || bar.scrollWidth - bar.clientWidth <= 4) return;
        down = true; moved = false; sx = e.clientX; sl = bar.scrollLeft;
        bar.classList.add('sg-grabbing');
      });
      bar.addEventListener('pointermove', function (e) {
        if (!down) return; var dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true;
        bar.scrollLeft = sl - dx;
      });
      function end() { if (down) { down = false; bar.classList.remove('sg-grabbing'); } }
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
      bar.addEventListener('pointerleave', end);
      // a drag must NOT also select the tab under the pointer
      bar.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    }
    upd();
    // keep the checked/current tab in view after a (re)init
    var act = bar.querySelector('input:checked, .is-active, [aria-selected="true"], .is-current');
    var lab = act && (act.id ? bar.querySelector('label[for="' + act.id + '"]') : act);
    if (lab && lab.scrollIntoView) { try { lab.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) {} }
  }
  function run() { Array.prototype.forEach.call(document.querySelectorAll('.sg-scrolltabs'), wire); }
  window.SGScrollTabs = run;
  if (!window.__sgScrollTabsBound) {
    window.__sgScrollTabsBound = 1;
    window.addEventListener('resize', run);
    if (document.readyState !== 'loading') run();
    else document.addEventListener('DOMContentLoaded', run);
    // re-run when the theme's SPA/partial nav swaps content
    window.addEventListener('spa:navigated', run);
    document.addEventListener('spa:navigated', run);
  }
})();
