/* =====================================================================
   MATHHOOD — product.js
   Preisrechner der Produktseiten + Leaflet-Umkreiskarte (Vor Ort).
   ===================================================================== */
(function () {
  'use strict';

  function euro(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  function num(v) { return parseInt(v, 10) || 0; }

  /* ---- Online: Stundenzahl × Stundensatz ------------------------- */
  var online = document.querySelector('[data-calc="online"]');
  if (online) {
    var oHours = online.querySelector('[name="hours"]');
    var oOut = online.querySelector('[data-price-out]');
    var oRate = parseFloat(online.getAttribute('data-rate')) || 20;
    var oUpd = function () { oOut.textContent = euro(oRate * Math.max(1, num(oHours.value))); };
    oHours.addEventListener('change', oUpd); oUpd();
  }

  /* ---- Vor Ort: Radius-Preis × Stundenzahl (+ Karte) ------------- */
  var vorort = document.querySelector('[data-calc="vorort"]');
  if (vorort) {
    var vRad = vorort.querySelector('[name="radius"]');
    var vHours = vorort.querySelector('[name="hours"]');
    var vOut = vorort.querySelector('[data-price-out]');
    var vUpd = function () {
      var opt = vRad.options[vRad.selectedIndex];
      var base = opt.getAttribute('data-price');
      if (base === null || base === '') {
        vOut.textContent = 'Nach Absprache';
      } else {
        vOut.textContent = euro(parseFloat(base) * Math.max(1, num(vHours.value)));
      }
      if (window.__mhMap) window.__mhMap.setRadius(num(opt.getAttribute('data-meters')) || 10000);
    };
    vRad.addEventListener('change', vUpd);
    vHours.addEventListener('change', vUpd);
    vUpd();
  }

  /* ---- Lernpaket: Varianten-Preis × Anzahl Pakete --------------- */
  var pkg = document.querySelector('[data-calc="lernpaket"]');
  if (pkg) {
    var pVar = pkg.querySelector('[name="variante"]');
    var pQty = pkg.querySelector('[name="anzahl"]');
    var pOut = pkg.querySelector('[data-price-out]');
    var pUpd = function () {
      var price = parseFloat(pVar.options[pVar.selectedIndex].getAttribute('data-price')) || 0;
      pOut.textContent = euro(price * Math.max(1, num(pQty.value)));
    };
    pVar.addEventListener('change', pUpd);
    pQty.addEventListener('change', pUpd);
    pUpd();
  }

  /* ---- Leaflet-Umkreiskarte --------------------------------------
     Wird ERST auf Klick geladen. Vorher geht keine einzige Anfrage an
     CARTO — es fliesst also keine IP-Adresse ohne Zustimmung ab. */
  var mapEl = document.getElementById('mh-map');
  var consentBox = document.querySelector('[data-map-consent]');
  var loadBtn = document.querySelector('[data-map-load]');

  if (mapEl && loadBtn) {
    loadBtn.addEventListener('click', function () {
      if (consentBox) consentBox.remove();
      buildMap();
    });
  }

  function buildMap() {
    if (!mapEl || !window.L) return;
    var L = window.L;
    // Marker-Icons lokal einbinden
    L.Icon.Default.prototype.options.imagePath = 'assets/vendor/leaflet/images/';
    L.Icon.Default.imagePath = 'assets/vendor/leaflet/images/';

    var CENTER = [
      parseFloat(mapEl.getAttribute('data-lat')) || 48.7166,
      parseFloat(mapEl.getAttribute('data-lng')) || 10.7625
    ];

    var map = L.map(mapEl, { scrollWheelZoom: false }).setView(CENTER, 10);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap-Mitwirkende',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
    L.marker(CENTER).addTo(map).bindPopup('MATHHOOD – Donauwörth');

    var circle = L.circle(CENTER, {
      radius: 10000, color: '#24493a', fillColor: '#3d7a52', fillOpacity: 0.15, weight: 2
    }).addTo(map);

    function fit() { map.invalidateSize(); map.fitBounds(circle.getBounds(), { padding: [20, 20] }); }
    fit();
    // Nachträglich korrigieren, wenn das Layout erst später steht
    setTimeout(fit, 250);
    window.addEventListener('load', fit);

    window.__mhMap = {
      setRadius: function (m) { circle.setRadius(m); setTimeout(fit, 0); }
    };
    // Erststand aus der Auswahl übernehmen
    if (vorort) {
      var o0 = document.querySelector('[data-calc="vorort"] [name="radius"]');
      if (o0) window.__mhMap.setRadius(num(o0.options[o0.selectedIndex].getAttribute('data-meters')) || 10000);
    }
  }
})();
