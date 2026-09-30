/* ============================================================================
   dev-cron.js — a LOCALHOST-ONLY panel for the daily Drive-check cron job.

   The scheduler runs on the developer's own machine. Stopping it from a terminal
   means remembering a crontab incantation months from now, so it gets a button —
   and a button that can stop a scheduled job must never appear on a public site.

   The panel is drawn only when the page is being served from localhost, and the
   endpoint it talks to (dev-cron.php) refuses on any other host regardless of
   what this file does. Client-side hiding is a convenience; the server guard is
   the actual protection. Both are in place because either alone is a single
   point of failure.

   Nothing here is loaded on a built/live site: `clean-site.py` deletes this file
   and dev-cron.php, and .htaccess blocks the path.
   ========================================================================== */
(function () {
  'use strict';

  /* EXACTLY LOOPBACK — nothing else. The site's own sgIsDev() in head.js also counts
     `*.hostingersite.com` as "dev", reasonably, for deciding whether to leave devtools shortcuts
     enabled. This is a different question: a staging host is still a PUBLIC host, reachable by
     anyone with the URL, and so is any `.local` name on a shared network. A control that stops a
     scheduled job belongs to the machine the job runs on, and to nothing else. */
  function isLocal() {
    var h = (location.hostname || '').toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  }
  if (!isLocal()) return;                       // anything else: draw nothing at all

  var ENDPOINT = 'dev-cron.php';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function panel() {
    var box = el('div', 'devcron');
    box.setAttribute('aria-label', 'Developer: scheduled Drive check');

    /* COLLAPSED BY DEFAULT, and it remembers. This is a tool sitting on top of the site being
       built; the site is what you are here to look at, so the tool's resting state is a small
       handle in the corner it is least likely to be over. The header IS the toggle — a button,
       so it works from the keyboard and announces its state. */
    var head = el('button', 'devcron-head');
    head.type = 'button';
    var dot = el('span', 'devcron-dot');
    head.appendChild(dot);
    head.appendChild(el('strong', null, 'Drive check'));
    var caret = el('span', 'devcron-caret', '▸');
    head.appendChild(caret);
    box.appendChild(head);

    var body = el('div', 'devcron-body');
    box.appendChild(body);

    var OPEN_KEY = 'devcron-open';
    function setOpen(open) {
        box.classList.toggle('is-open', open);
        head.setAttribute('aria-expanded', open ? 'true' : 'false');
        caret.textContent = open ? '▾' : '▸';
        try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (e) {}
    }
    head.addEventListener('click', function () { setOpen(!box.classList.contains('is-open')); });
    var wasOpen = false;
    try { wasOpen = localStorage.getItem(OPEN_KEY) === '1'; } catch (e) {}
    setOpen(wasOpen);

    var when = el('p', 'devcron-when', '');
    body.appendChild(when);

    var btn = el('button', 'devcron-btn', '…');
    btn.type = 'button';
    body.appendChild(btn);

    var log = el('pre', 'devcron-log', '');
    body.appendChild(log);

    var note = el('p', 'devcron-note',
      'Local only — this panel and its endpoint never ship to the live site.');
    body.appendChild(note);

    function paint(d) {
      if (!d) {
        dot.className = 'devcron-dot is-off';
        when.textContent = 'endpoint not reachable (is PHP running?)';
        btn.textContent = 'Retry';
        btn.dataset.action = 'status';
        return;
      }
      dot.className = 'devcron-dot ' + (d.scheduled ? 'is-on' : 'is-off');
      when.textContent = d.scheduled ? ('running — ' + d.schedule) : 'paused';
      /* PAUSE/RESUME, not stop/start: removing the crontab line loses nothing — the manifest,
         the log and the script all stay — so the honest words are the reversible ones. */
      btn.textContent = d.scheduled ? '❚❚  Pause the check' : '▶  Resume the check';
      btn.dataset.action = d.scheduled ? 'stop' : 'start';
      log.textContent = d.log || '(the job has not run yet)';
    }

    function call(action) {
      btn.disabled = true;
      var body = new URLSearchParams();
      body.set('action', action || 'status');
      fetch(ENDPOINT, { method: 'POST', body: body, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(paint)
        .catch(function () { paint(null); })
        .then(function () { btn.disabled = false; });
    }

    btn.addEventListener('click', function () { call(btn.dataset.action); });
    call('status');
    return box;
  }

  function mount() {
    if (document.querySelector('.devcron')) return;
    document.body.appendChild(panel());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
