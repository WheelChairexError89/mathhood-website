/* =====================================================================
   MATHHOOD — kalender.js
   Wochenkalender mit buchbaren Zeitfenstern.

   Woher die Daten kommen:
     verfuegbarkeit()  Robins wiederkehrende Wochenzeiten (Supabase)
     ausnahmen()       gesperrte Tage (Urlaub, Feiertage)
     belegte_zeiten()  bereits vergebene Termine — liefert bewusst NUR
                       Datum und Uhrzeit, niemals Namen oder E-Mails
   ===================================================================== */
(function () {
  'use strict';

  var wrap = document.querySelector('[data-mh-kalender]');
  if (!wrap) return;

  /* ---- Einstellungen ------------------------------------------- */
  var DAUER   = 70;   // Unterrichtseinheit in Minuten
  var ABSTAND = 90;   // Abstand zwischen zwei Startzeiten (70 + 20 Puffer)
  var WOCHEN  = 8;    // wie viele Wochen im Voraus buchbar sind
  var VORLAUF = 24;   // Stunden Mindestvorlauf bis zum Termin

  var TAGE   = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var TAGKURZ = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var MONATE = ['Januar','Februar','März','April','Mai','Juni',
                'Juli','August','September','Oktober','November','Dezember'];

  /* ---- Bausteine der Seite ------------------------------------- */
  var gitter    = wrap.querySelector('[data-gitter]');
  var titel     = wrap.querySelector('[data-wochentitel]');
  var zurueck   = wrap.querySelector('[data-woche-zurueck]');
  var vor       = wrap.querySelector('[data-woche-vor]');
  var ladeInfo  = wrap.querySelector('[data-kalender-laden]');
  var fehlerBox = wrap.querySelector('[data-kalender-fehler]');
  var formBox   = document.querySelector('[data-buchungsform]');
  var slotAnzg  = document.querySelector('[data-gewaehlter-slot]');
  var slotFeld  = document.querySelector('[name="termin"]');

  /* ---- Supabase ------------------------------------------------- */
  var CFG = window.MH_CONFIG || {};
  var SCHLUESSEL = CFG.supabaseKey || CFG.supabaseAnonKey || '';
  var URL_ = (CFG.supabaseUrl || '').trim()
               .replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  var bereit = URL_ && SCHLUESSEL
            && URL_.indexOf('DEINE_SUPABASE') !== 0
            && window.supabase && window.supabase.createClient;

  var db = bereit ? window.supabase.createClient(URL_, SCHLUESSEL) : null;

  /* ---- Daten ---------------------------------------------------- */
  var zeiten = [];    // Verfuegbarkeit je Wochentag
  var gesperrt = {};  // { '2026-12-24': true }
  var belegt = {};    // { '2026-09-14T15:00': true }
  var wochenOffset = 0;

  /* ---- kleine Helfer -------------------------------------------- */
  function zweistellig(n) { return (n < 10 ? '0' : '') + n; }

  function alsSchluessel(d) {
    return d.getFullYear() + '-' + zweistellig(d.getMonth() + 1) + '-' + zweistellig(d.getDate());
  }
  function montagDerWoche(offset) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var wt = (d.getDay() + 6) % 7;          // Montag = 0
    d.setDate(d.getDate() - wt + offset * 7);
    return d;
  }
  function minutenZuZeit(m) {
    return zweistellig(Math.floor(m / 60)) + ':' + zweistellig(m % 60);
  }
  function zeitZuMinuten(s) {
    var t = s.split(':');
    return parseInt(t[0], 10) * 60 + parseInt(t[1], 10);
  }

  function zeigeFehler(text) {
    if (ladeInfo) ladeInfo.hidden = true;
    if (gitter) gitter.hidden = true;
    if (fehlerBox) {
      fehlerBox.hidden = false;
      fehlerBox.classList.add("is-visible");
      var p = fehlerBox.querySelector('[data-fehlertext]');
      if (p && text) p.textContent = text;
    }
  }

  /* ---- Daten laden ---------------------------------------------- */
  function ladeDaten() {
    if (!db) {
      zeigeFehler('Der Kalender ist noch nicht eingerichtet. '
        + 'Bitte nutze so lange das Formular weiter unten.');
      return;
    }

    Promise.all([
      db.from('verfuegbarkeit').select('wochentag, von_zeit, bis_zeit').eq('aktiv', true),
      db.from('ausnahmen').select('datum'),
      db.rpc('belegte_zeiten')
    ]).then(function (r) {
      var v = r[0], a = r[1], b = r[2];

      if (v.error) {
        zeigeFehler('Die Termine konnten nicht geladen werden. '
          + 'Bitte nutze das Formular weiter unten oder versuch es später erneut.');
        return;
      }

      zeiten = v.data || [];
      (a.data || []).forEach(function (x) { gesperrt[x.datum] = true; });
      (b.data || []).forEach(function (x) {
        belegt[x.datum + 'T' + String(x.uhrzeit).slice(0, 5)] = true;
      });

      if (!zeiten.length) {
        zeigeFehler('Aktuell sind keine Zeiten hinterlegt. '
          + 'Bitte nutze das Formular weiter unten.');
        return;
      }

      if (ladeInfo) ladeInfo.hidden = true;
      if (gitter) gitter.hidden = false;
      zeichne();
    }).catch(function () {
      zeigeFehler('Keine Verbindung zum Terminserver. '
        + 'Bitte nutze das Formular weiter unten.');
    });
  }

  /* ---- Slots eines Tages berechnen ------------------------------ */
  function slotsFuer(datum) {
    var schluessel = alsSchluessel(datum);
    if (gesperrt[schluessel]) return [];

    var wt = datum.getDay();
    var fenster = zeiten.filter(function (z) { return z.wochentag === wt; });
    if (!fenster.length) return [];

    var frueheste = new Date();
    frueheste.setHours(frueheste.getHours() + VORLAUF);

    var liste = [];
    fenster.forEach(function (f) {
      var von = zeitZuMinuten(String(f.von_zeit).slice(0, 5));
      var bis = zeitZuMinuten(String(f.bis_zeit).slice(0, 5));
      for (var m = von; m + DAUER <= bis; m += ABSTAND) {
        var zeit = minutenZuZeit(m);
        var start = new Date(datum);
        start.setHours(Math.floor(m / 60), m % 60, 0, 0);
        liste.push({
          zeit: zeit,
          datum: schluessel,
          belegt: !!belegt[schluessel + 'T' + zeit],
          zuFrueh: start < frueheste
        });
      }
    });
    return liste;
  }

  /* ---- Kalender zeichnen ---------------------------------------- */
  function zeichne() {
    var montag = montagDerWoche(wochenOffset);
    var sonntag = new Date(montag); sonntag.setDate(sonntag.getDate() + 6);

    if (titel) {
      var m1 = MONATE[montag.getMonth()], m2 = MONATE[sonntag.getMonth()];
      titel.textContent = montag.getDate() + '. ' + (m1 === m2 ? '' : m1 + ' ')
        + '– ' + sonntag.getDate() + '. ' + m2 + ' ' + sonntag.getFullYear();
    }
    if (zurueck) zurueck.disabled = wochenOffset <= 0;
    if (vor) vor.disabled = wochenOffset >= WOCHEN - 1;

    gitter.innerHTML = '';
    var heute = alsSchluessel(new Date());
    var irgendwasFrei = false;

    for (var i = 0; i < 7; i++) {
      var tag = new Date(montag);
      tag.setDate(tag.getDate() + i);
      var slots = slotsFuer(tag);

      var spalte = document.createElement('div');
      spalte.className = 'mh-kal__tag';
      if (alsSchluessel(tag) === heute) spalte.classList.add('is-heute');

      var kopf = document.createElement('div');
      kopf.className = 'mh-kal__tagkopf';
      kopf.innerHTML = '<span class="mh-kal__wt">' + TAGKURZ[tag.getDay()] + '</span>'
                     + '<span class="mh-kal__datum">' + tag.getDate() + '.' + (tag.getMonth() + 1) + '.</span>';
      spalte.appendChild(kopf);

      if (!slots.length) {
        var leer = document.createElement('p');
        leer.className = 'mh-kal__leer';
        leer.textContent = '–';
        spalte.appendChild(leer);
      } else {
        slots.forEach(function (s) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'mh-kal__slot';
          b.textContent = s.zeit;
          if (s.belegt) {
            b.classList.add('is-belegt');
            b.disabled = true;
            b.setAttribute('aria-label', s.zeit + ' Uhr, bereits vergeben');
          } else if (s.zuFrueh) {
            b.classList.add('is-zufrueh');
            b.disabled = true;
            b.setAttribute('aria-label', s.zeit + ' Uhr, zu kurzfristig');
          } else {
            irgendwasFrei = true;
            b.setAttribute('aria-label', s.zeit + ' Uhr, frei — jetzt buchen');
            b.addEventListener('click', function () { waehle(s, b); });
          }
          spalte.appendChild(b);
        });
      }
      gitter.appendChild(spalte);
    }

    var hinweis = wrap.querySelector('[data-nichts-frei]');
    if (hinweis) hinweis.hidden = irgendwasFrei;
  }

  /* ---- Slot auswaehlen ------------------------------------------ */
  function waehle(slot, knopf) {
    wrap.querySelectorAll('.mh-kal__slot.is-gewaehlt')
        .forEach(function (e) { e.classList.remove('is-gewaehlt'); });
    knopf.classList.add('is-gewaehlt');

    var d = new Date(slot.datum + 'T' + slot.zeit);
    /* Endzeit mitrechnen, damit unmissverstaendlich ist, wie lange der
       Termin geht. "16:00" allein laesst offen, ob 70 oder 140 Minuten. */
    var ende = minutenZuZeit(zeitZuMinuten(slot.zeit) + DAUER);
    var text = TAGE[d.getDay()] + ', ' + d.getDate() + '. ' + MONATE[d.getMonth()]
             + ' ' + d.getFullYear() + ', ' + slot.zeit + ' bis ' + ende + ' Uhr';

    if (slotAnzg) slotAnzg.textContent = text;
    zeigeUebersicht();
    if (slotFeld) slotFeld.value = text;

    var f = document.querySelector('[data-buchungsform]');
    if (f) {
      f.hidden = false;
      f.dataset.datum = slot.datum;
      f.dataset.uhrzeit = slot.zeit;
      f.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var erstes = f.querySelector('input:not([type=hidden])');
      if (erstes) setTimeout(function () { erstes.focus(); }, 500);
    }
  }

  /* ---- Übersicht über dem Formular ------------------------------
     Fasst zusammen, was tatsaechlich gebucht wird: Dauer, Online oder
     Vor Ort, Anlass und was es kostet. Aktualisiert sich, sobald man
     eine der Auswahlen aendert. */
  var uebersichtBox = document.querySelector('[data-buchungs-uebersicht]');

  var PREIS = {
    probestunde:  { text: 'kostenfrei',            hervor: true },
    einzelstunde: { online: '20 €', vorort: 'ab 35 € je nach Entfernung' },
    lernpaket:    { text: 'aus deinem 10er-Paket' },
    pruefung:     { online: '20 €', vorort: 'ab 35 € je nach Entfernung' }
  };
  var ANLASS_TEXT = {
    probestunde:  'Kostenlose Probestunde',
    einzelstunde: 'Einzelstunde',
    lernpaket:    '10er-Lernpaket',
    pruefung:     'Prüfungsvorbereitung'
  };

  function zeigeUebersicht() {
    if (!uebersichtBox) return;
    var anlassEl = document.querySelector('[name="anlass"]');
    var artEl    = document.querySelector('[name="unterrichtsart"]');
    var anlass = anlassEl ? anlassEl.value : 'probestunde';
    var art    = artEl ? artEl.value : 'online';

    var p = PREIS[anlass] || {};
    var preis = p.text || (art === 'vor-ort' ? p.vorort : p.online) || '';

    var chips = [
      { t: '1 Einheit · 70 Minuten' },
      { t: art === 'vor-ort' ? 'Vor Ort bei dir' : 'Online' },
      { t: ANLASS_TEXT[anlass] || anlass }
    ];
    if (preis) chips.push({ t: preis, hervor: !!p.hervor });

    uebersichtBox.innerHTML = '';
    chips.forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'mh-chip' + (c.hervor ? ' mh-chip--stark' : '');
      s.textContent = c.t;
      uebersichtBox.appendChild(s);
    });
  }

  ['anlass', 'unterrichtsart'].forEach(function (n) {
    var el = document.querySelector('[name="' + n + '"]');
    if (el) el.addEventListener('change', zeigeUebersicht);
  });

  /* ---- Buchung abschicken --------------------------------------- */
  var form = document.querySelector('form[data-mh-buchen]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var box = document.querySelector('[data-buchungsform]');
      var ok  = form.querySelector('[data-note="ok"]');
      var err = form.querySelector('[data-note="err"]');
      [ok, err].forEach(function (n) { if (n) n.classList.remove('is-visible'); });

      if (!db) {
        if (err) { err.textContent = 'Der Kalender ist noch nicht eingerichtet.'; err.classList.add('is-visible'); }
        return;
      }

      var w = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : '';
      };

      form.classList.add('is-sending');

      db.from('buchungen').insert({
        datum:           box.dataset.datum,
        uhrzeit:         box.dataset.uhrzeit,
        schueler:        w('schueler'),
        klasse:          w('klasse'),
        ansprechpartner: w('ansprechpartner'),
        email:           w('email'),
        telefon:         w('telefon'),
        unterrichtsart:  w('unterrichtsart'),
        anlass:          w('anlass'),
        plz:             w('plz'),
        thema:           w('thema')
      }).then(function (r) {
        form.classList.remove('is-sending');

        if (r.error) {
          var m = r.error.message || '';
          if (/duplicate|unique/i.test(m)) {
            if (err) {
              err.textContent = 'Dieser Termin wurde gerade von jemand anderem gebucht. '
                + 'Bitte wähle einen anderen aus.';
              err.classList.add('is-visible');
            }
            belegt[box.dataset.datum + 'T' + box.dataset.uhrzeit] = true;
            zeichne();
          } else if (/Vergangenheit|Unterricht|zu weit/i.test(m)) {
            if (err) { err.textContent = m; err.classList.add('is-visible'); }
          } else {
            if (err) {
              err.textContent = 'Die Buchung konnte nicht gespeichert werden. '
                + 'Bitte versuch es erneut oder nutze das Kontaktformular.';
              err.classList.add('is-visible');
            }
          }
          return;
        }

        // Gebucht. Robin zusaetzlich per E-Mail benachrichtigen.
        benachrichtige(form, box);

        belegt[box.dataset.datum + 'T' + box.dataset.uhrzeit] = true;
        zeichne();
        form.reset();
        if (ok) ok.classList.add('is-visible');
        form.querySelectorAll('.mh-field, .mh-check, button[type=submit]')
            .forEach(function (el) { el.style.display = 'none'; });
      }).catch(function () {
        form.classList.remove('is-sending');
        if (err) {
          err.textContent = 'Keine Verbindung zum Server. Bitte versuch es erneut.';
          err.classList.add('is-visible');
        }
      });
    });
  }

  /* Benachrichtigung an Robin. Schlaegt sie fehl, ist die Buchung
     trotzdem gespeichert — er sieht sie im Supabase-Dashboard. */
  function benachrichtige(form, box) {
    var ziel = form.getAttribute('data-melden-an');
    if (!ziel || ziel.indexOf('DEIN_FORMSPREE_CODE') > -1) return;
    var d = new FormData(form);
    d.append('_subject', 'Neue Terminbuchung: ' + box.dataset.datum + ' ' + box.dataset.uhrzeit);
    fetch(ziel, { method: 'POST', body: d, headers: { Accept: 'application/json' } })
      .catch(function () {});
  }

  /* ---- Wochenwechsel -------------------------------------------- */
  if (zurueck) zurueck.addEventListener('click', function () {
    if (wochenOffset > 0) { wochenOffset--; zeichne(); }
  });
  if (vor) vor.addEventListener('click', function () {
    if (wochenOffset < WOCHEN - 1) { wochenOffset++; zeichne(); }
  });

  /* ---- Vorauswahl aus der Adresse ------------------------------
     Beispiel: buchung.html?art=vor-ort&anlass=lernpaket
     So landet man vom Produkt aus mit passender Vorbelegung hier. */
  (function vorbelegen() {
    var p = new URLSearchParams(location.search);
    ['unterrichtsart', 'anlass'].forEach(function (feld) {
      var wert = p.get(feld === 'unterrichtsart' ? 'art' : feld);
      if (!wert) return;
      var el = document.querySelector('[name="' + feld + '"]');
      if (el && [].some.call(el.options, function (o) { return o.value === wert; })) {
        el.value = wert;
        el.dispatchEvent(new Event('change'));
      }
    });
  })();

  ladeDaten();
})();
