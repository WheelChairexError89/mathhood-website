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
