/* =====================================================================
   MATHHOOD — forms.js
   Verschickt Kontakt- und Buchungsformular an Formspree, ohne dass die
   Seite neu lädt. Zeigt die Rückmeldung direkt unter dem Formular.

   Einrichtung: in der jeweiligen HTML-Datei bei <form action="...">
   die eigene Formspree-Adresse eintragen (siehe README).
   ===================================================================== */
(function () {
  'use strict';

  var PLACEHOLDER = 'DEIN_FORMSPREE_CODE';

  document.querySelectorAll('form[data-mh-form]').forEach(function (form) {
    var noteOk  = form.querySelector('[data-note="ok"]');
    var noteErr = form.querySelector('[data-note="err"]');

    function show(el, text) {
      [noteOk, noteErr].forEach(function (n) { if (n) n.classList.remove('is-visible'); });
      if (!el) return;
      if (text) el.textContent = text;
      el.classList.add('is-visible');
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Spam-Falle: von Menschen nie ausgefüllt
      var hp = form.querySelector('[name="_gotcha"]');
      if (hp && hp.value) return;

      if (!form.reportValidity()) return;

      var action = form.getAttribute('action') || '';

      // Noch keine Formspree-Adresse hinterlegt
      if (action.indexOf(PLACEHOLDER) !== -1) {
        show(noteErr, 'Das Formular ist noch nicht mit dem Postfach verbunden. '
          + 'Trage in der HTML-Datei deine Formspree-Adresse ein (siehe README). '
          + 'Schreib uns solange direkt an kontakt@mathhood.de.');
        return;
      }

      form.classList.add('is-sending');

      fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            show(noteOk);
            // Preisfelder u. Ä. wieder auf Startwert bringen
            form.dispatchEvent(new Event('mh:reset'));
          } else {
            return res.json().then(function (d) {
              var msg = (d && d.errors && d.errors.length)
                ? d.errors.map(function (x) { return x.message; }).join(' ')
                : null;
              show(noteErr, msg || undefined);
            });
          }
        })
        .catch(function () {
          show(noteErr, 'Die Nachricht konnte nicht gesendet werden. '
            + 'Bitte prüfe deine Internetverbindung oder schreib uns direkt an kontakt@mathhood.de.');
        })
        .then(function () { form.classList.remove('is-sending'); });
    });
  });

  /* ---- Eingaben prüfen: echte Namen, keine Links, keine Beleidigungen --
     Felder werden über data-pruefe="name|text|telefon" markiert. Die
     Meldung erscheint über die normale Browser-Prüfung beim Absenden.
     Die Wortliste ist bewusst klein und arbeitet mit ganzen Wörtern,
     damit echte Namen und Wörter wie "Marsch" nicht getroffen werden. */
  var GANZE_WOERTER = ['hitler', 'himmler', 'goebbels', 'nazi', 'nazis', 'fuck',
    'fucker', 'scheisse', 'scheiss', 'arsch', 'arschloch', 'hurensohn', 'hurensoehne',
    'wichser', 'fotze', 'schlampe', 'bitch', 'asshole', 'ficken', 'penis', 'vagina',
    'titten', 'hure', 'nutte', 'wixer', 'spast'];
  var AUCH_ZUSAMMENGESCHRIEBEN = ['hitler', 'himmler', 'goebbels', 'siegheil',
    'hurensohn', 'wichser'];

  function normalisiere(s) {
    var t = String(s).toLowerCase()
      .replace(/ß/g, 'ss').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a')
      .replace(/5/g, 's').replace(/7/g, 't')
      /* @, $ und ! nur mitten im Wort als Buchstabe deuten (h!tler),
         am Wortende sind es normale Satzzeichen */
      .replace(/([a-z])@(?=[a-z])/g, '$1a').replace(/([a-z])\$(?=[a-z])/g, '$1s')
      .replace(/([a-z])!(?=[a-z])/g, '$1i');
    return t.replace(/[^a-z]+/g, ' ').trim();
  }

  function unangemessen(wert) {
    var n = normalisiere(wert);
    if (!n) return false;
    var woerter = n.split(' ');
    if (woerter.some(function (w) { return GANZE_WOERTER.indexOf(w) > -1; })) return true;
    var zusammen = woerter.join('');
    return AUCH_ZUSAMMENGESCHRIEBEN.some(function (b) { return zusammen.indexOf(b) > -1; });
  }

  function pruefeFeld(el) {
    var art = el.getAttribute('data-pruefe');
    var v = el.value.trim();
    var meldung = '';
    if (v) {
      if (art === 'name') {
        if (!/^[\p{L}][\p{L}\s'’.\-]*$/u.test(v) || v.replace(/[^\p{L}]/gu, '').length < 2) {
          meldung = 'Bitte gib einen Namen ein, nur mit Buchstaben (keine Zahlen oder Sonderzeichen).';
        }
      } else if (art === 'telefon') {
        if (!/^[0-9+()\/\s-]{5,30}$/.test(v)) {
          meldung = 'Bitte gib eine gültige Telefonnummer ein, z. B. 0152 1234567.';
        }
      } else if (art === 'text') {
        if (/(https?:\/\/|www\.)/i.test(v)) {
          meldung = 'Bitte schreib keine Links in die Nachricht.';
        } else if (/<\/?(script|a|img|iframe|style|svg|object|embed|link|meta|body|html|div|span|form|input|button|p|br)\b[^>]*>/i.test(v)) {
          meldung = 'Bitte schreib keinen Code (HTML) in die Nachricht.';
        }
      }
      if (!meldung && (art === 'name' || art === 'text') && unangemessen(v)) {
        meldung = 'Bitte verwende keine beleidigenden oder unangemessenen Begriffe.';
      }
    }
    el.setCustomValidity(meldung);
  }

  document.querySelectorAll('[data-pruefe]').forEach(function (el) {
    el.addEventListener('input', function () { pruefeFeld(el); });
    el.addEventListener('change', function () { pruefeFeld(el); });
  });
  /* Vor jedem Absenden alle Felder frisch prüfen (auch bei Autofill) */
  document.querySelectorAll('form[data-mh-form], form[data-mh-buchen]').forEach(function (f) {
    f.addEventListener('submit', function () {
      f.querySelectorAll('[data-pruefe]').forEach(pruefeFeld);
    }, true);
  });

  /* ---- Buchung: Vor-Ort-Felder nur bei Bedarf zeigen ------------- */
  var artSel = document.querySelector('[name="unterrichtsart"]');
  var ortBox = document.querySelector('[data-when-vorort]');
  if (artSel && ortBox) {
    var plz = ortBox.querySelector('input');
    var toggle = function () {
      var on = artSel.value === 'vor-ort';
      ortBox.hidden = !on;
      if (plz) plz.required = on;
    };
    artSel.addEventListener('change', toggle);
    toggle();
  }

  /* ---- Wunschtermin: Datum frühestens morgen -------------------- */
  var t = new Date(); t.setDate(t.getDate() + 1);
  var min = t.toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"][data-min-tomorrow]').forEach(function (i) {
    i.min = min;
  });
})();
