/* ============================================================================
   map.js — the contact-page location map, in three tiers.

   The page used to carry OpenStreetMap's `export/embed.html` in an <iframe>. That
   embed moved to a WEBGL renderer, so any machine without WebGL — hardware
   acceleration off, an older or locked-down government desktop, a headless check —
   got "WebGL is required to display this map" or a blank white box, and nothing on
   our side could fix it. The lesson was not "WebGL is bad"; it was that a single
   renderer with no fallback is.

   So the map now tries the best thing the browser can actually do, and steps down
   until something works. Every tier is a REAL map; none of them is a placeholder:

     1. WEBGL — MapLibre GL (BSD-3-Clause, vendored) drawing OpenFreeMap vector
        tiles. Smooth continuous zoom, crisp labels at any scale, rotate and tilt.
        This is the renderer the modern OSM embed uses, on our terms rather than
        theirs: the library is ours, so it cannot change under us.
     2. NO WEBGL — Leaflet (BSD-2-Clause, vendored) drawing raster tiles as plain
        <img> elements. Pans and zooms; no GPU needed at all.
     3. NO JS, OR BOTH LIBRARIES FAILED — the baked PNG that ships in the markup
        (tools/make-map.py), wrapped in a link to openstreetmap.org.

   A tier is only taken down when the next one is genuinely up: the still image is
   hidden after the live map has drawn, never before, so a failure part-way leaves
   the visitor with a map rather than an empty box.

   Attribution is a licence condition of the tiles, not decoration — every tier
   carries it.
   ========================================================================== */
(function () {
  'use strict';

  var GL_CSS = '/resources/assets/vendor/maplibre/maplibre-gl.css';
  var GL_JS = '/resources/assets/vendor/maplibre/maplibre-gl.js';
  var GL_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  var CSS = '/resources/assets/vendor/leaflet/leaflet.css';
  var JS = '/resources/assets/vendor/leaflet/leaflet.js';
  var TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" ' +
               'rel="noopener">OpenStreetMap</a> contributors';

  /* Paths resolve against the page's <base href>, so this works at a domain root,
     in a sub-folder, and from file:// — the same rule as every other asset here. */
  function baseUrl(rel) {
    if (rel.charAt(0) === '/') return rel;           // already root-absolute
    var b = document.querySelector('base');
    var href = b && b.getAttribute('href');
    return href ? href.replace(/\/+$/, '') + '/' + rel : rel;
  }

  /* Load a stylesheet or script once. The guard is keyed by URL, NOT by a shared attribute: with
     one marker for both libraries, asking for Leaflet after MapLibre found MapLibre's tag, called
     back "ready", and Leaflet never loaded — so a WebGL failure fell straight past tier 2 to the
     still image. A fallback that silently doesn't exist is worse than no fallback. */
  function loadOnce(tag, attrs, done) {
    var url = attrs.src || attrs.href;
    var got = document.head.querySelector(tag + '[data-map-asset="' + url + '"]');
    if (got) { got.dataset.ready === '1' ? done() : got.addEventListener('load', done); return; }
    var el = document.createElement(tag);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    el.setAttribute('data-map-asset', url);
    el.addEventListener('load', function () { el.dataset.ready = '1'; done(); });
    el.addEventListener('error', function () { done(new Error('could not load ' + attrs.src || attrs.href)); });
    document.head.appendChild(el);
  }

  /* Can this browser actually draw WebGL? Asking for the context is the only honest test —
     `'WebGLRenderingContext' in window` is true on machines whose driver then refuses, which is
     exactly the population that saw the blank OSM embed. */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
                (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function frame(box) {
    var live = document.createElement('div');
    live.className = 'map-live';
    live.setAttribute('role', 'application');
    live.setAttribute('aria-label', box.getAttribute('data-label') || 'Location map');
    // Height comes from CSS (.map-live), NOT from the still image: one rule to change, and the
    // live map is exactly as tall as the picture it replaces, so nothing on the page jumps.
    box.insertBefore(live, box.querySelector('.map-credit') || null);
    return live;
  }

  /* Hide the still image only once the live map has actually drawn. Doing it any earlier is how
     a half-failed upgrade leaves an empty box where a perfectly good picture used to be. */
  function promote(box) {
    /* The still image's link is a DIRECT child. `box.querySelector('a')` is not the same thing:
       once the live map is inserted, the first anchor in document order is the map library's own
       zoom-in button — which this promptly hid, leaving a zoom control with only a minus sign. */
    var still = null, kids = box.children;
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].tagName === 'A') { still = kids[i]; break; }
    }
    if (still) still.style.display = 'none';
    var credit = box.querySelector('.map-credit');
    if (credit) credit.style.display = 'none';      // each library draws its own attribution
    box.classList.add('is-live');
  }

  var PIN_SVG = '<svg viewBox="0 0 25 41" width="25" height="41" aria-hidden="true" focusable="false">' +
    '<path d="M12.5 40C10 33 0 24.6 0 12.5A12.5 12.5 0 0 1 25 12.5C25 24.6 15 33 12.5 40z" ' +
    'fill="#c50000" stroke="#fff" stroke-width="2"/>' +
    '<circle cx="12.5" cy="12.5" r="4.4" fill="#fff"/></svg>';

  /* TIER 1 — WebGL vector map. */
  function buildGL(box, next) {
    var lat = parseFloat(box.getAttribute('data-lat'));
    var lon = parseFloat(box.getAttribute('data-lon'));
    var zoom = parseInt(box.getAttribute('data-zoom') || '16', 10);
    var live = frame(box);
    var map;
    try {
      map = new maplibregl.Map({
        container: live, style: GL_STYLE, center: [lon, lat], zoom: zoom,
        attributionControl: { compact: false }, scrollZoom: false, cooperativeGestures: true
      });
    } catch (e) { box.removeChild(live); next(); return; }

    /* Watchdog. It must measure PROGRESS, not elapsed time: on a machine with only software
       WebGL the first frame legitimately takes many seconds, and a plain timeout would throw
       away a map that was about to appear. `styledata` means the style JSON arrived and the
       renderer is alive — from then on, let it finish. */
    var died = setTimeout(function () {
      try { map.remove(); } catch (e) {}
      if (live.parentNode) live.parentNode.removeChild(live);
      next();                                       // nothing came back at all -> tier 2
    }, 9000);
    map.on('styledata', function () { clearTimeout(died); });

    map.on('error', function () {});                // a single tile error is not a dead map
    map.on('load', function () {
      clearTimeout(died);
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
      var el = document.createElement('div');
      el.className = 'map-pin';
      el.innerHTML = PIN_SVG;
      new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup({ offset: 30 })
          .setText(box.getAttribute('data-label') || 'Our location'))
        .addTo(map);
      promote(box);
      map.resize();
    });
  }

  function build(box) {
    var lat = parseFloat(box.getAttribute('data-lat'));
    var lon = parseFloat(box.getAttribute('data-lon'));
    var zoom = parseInt(box.getAttribute('data-zoom') || '16', 10);
    if (!isFinite(lat) || !isFinite(lon) || !window.L) return;

    var live = frame(box);
    var keep = box.querySelector('.map-credit');

    var map;
    try {
      map = L.map(live, { scrollWheelZoom: false, attributionControl: true });
    } catch (e) {
      box.removeChild(live); return;                 // anything wrong -> the image stays
    }
    map.setView([lat, lon], zoom);
    L.tileLayer(TILES, { maxZoom: 19, attribution: CREDIT }).addTo(map);

    /* The pin is DRAWN, not fetched. Leaflet's default marker points at three PNGs beside its
       CSS (marker-icon, marker-icon-2x, marker-shadow); vendoring the library without them
       leaves a broken-image icon on the map — which is exactly what happened here. A divIcon
       needs no files at all, matches the pin on the static fallback, and stays sharp on any
       display. */
    var PIN = '<svg viewBox="0 0 25 41" width="25" height="41" aria-hidden="true" focusable="false">' +
      '<path d="M12.5 40C10 33 0 24.6 0 12.5A12.5 12.5 0 0 1 25 12.5C25 24.6 15 33 12.5 40z" ' +
      'fill="#c50000" stroke="#fff" stroke-width="2"/>' +
      '<circle cx="12.5" cy="12.5" r="4.4" fill="#fff"/></svg>';
    L.marker([lat, lon], {
      icon: L.divIcon({ html: PIN, className: 'map-pin', iconSize: [25, 41], iconAnchor: [12, 40],
                        popupAnchor: [0, -34] }),
      title: box.getAttribute('data-label') || 'Our location',
      alt: box.getAttribute('data-label') || 'Our location'
    }).addTo(map).bindPopup(box.getAttribute('data-label') || 'Our location');

    // scroll-wheel zoom is off by default so the page still scrolls over the map;
    // clicking the map turns it on, which is the behaviour people expect.
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    map.on('mouseout', function () { map.scrollWheelZoom.disable(); });

    // the still image was the fallback; the live map is up, so retire it
    var still = box.querySelector('a');
    if (still) still.style.display = 'none';
    box.classList.add('is-live');
    if (keep) keep.style.display = 'none';           // Leaflet draws its own attribution
    setTimeout(function () { map.invalidateSize(); }, 60);
  }

  /* TIER 2 — raster map, no GPU required. */
  function raster(box) {
    loadOnce('link', { rel: 'stylesheet', href: baseUrl(CSS) }, function () {});
    loadOnce('script', { src: baseUrl(JS) }, function (err) {
      if (err || !window.L) return;                  // both libraries gone -> the image stays
      build(box);
    });
  }

  function init() {
    var boxes = document.querySelectorAll('.map-embed[data-lat]');
    if (!boxes.length) return;                       // no map here -> nothing is fetched
    var gl = hasWebGL();
    Array.prototype.forEach.call(boxes, function (b) {
      if (b.dataset.mapReady) return;
      b.dataset.mapReady = '1';
      if (!gl) { raster(b); return; }                // no WebGL -> straight to tier 2
      loadOnce('link', { rel: 'stylesheet', href: baseUrl(GL_CSS) }, function () {});
      loadOnce('script', { src: baseUrl(GL_JS) }, function (err) {
        if (err || !window.maplibregl) { raster(b); return; }
        buildGL(b, function () { raster(b); });      // GL failed at runtime -> tier 2
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  // re-run after a spa-nav swap, so an in-site navigation gets a live map too
  if (window.SG && typeof SG.content === 'function') SG.content(init);
  document.addEventListener('depd:content', init);
})();
