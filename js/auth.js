/* =====================================================================
   MATHHOOD — auth.js
   Anmeldung mit E-Mail + Passwort und Lernbereich.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.MH_CONFIG || {};
  var SCHLUESSEL = CFG.supabaseKey || CFG.supabaseAnonKey || '';
  var URL_ = (CFG.supabaseUrl || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  var NICHT_EINGERICHTET = !URL_ || !SCHLUESSEL ||
        URL_.indexOf('DEINE_SUPABASE') === 0 ||
        SCHLUESSEL.indexOf('DEIN_SUPABASE') === 0;

  var db = null;
  if (!NICHT_EINGERICHTET && window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(URL_, SCHLUESSEL, {
      auth: { persistSession: false }
    });
  }

  /* ---------- kleine Helfer ------------------------------------- */
  function zeige(el, text) {
    if (!el) return;
    if (text) el.textContent = text;
    el.classList.add('is-visible');
  }
  function verstecke() {
    document.querySelectorAll('.mh-formnote').forEach(function (n) {
      n.classList.remove('is-visible');
    });
  }
  function hinweisNichtEingerichtet(el) {
    zeige(el, 'Der Lernbereich ist noch nicht eingerichtet. '
      + 'Trage in js/config.js die Supabase-Zugangsdaten ein (siehe README).');
  }

  /* ---------- Passwort Sichtbarkeit Toggle --------------------- */
  var pwdToggles = document.querySelectorAll('.mh-pwdtoggle');
  pwdToggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var field = btn.parentElement.querySelector('input');
      if (!field) return;
      field.type = field.type === 'password' ? 'text' : 'password';
    });
  });

  /* ---------- Kopfzeile: Login ⇄ Lernbereich --------------------- */
  function kopfzeileAnpassen(sitzung) {
    var link = document.querySelector('.mh-header__login');
    if (!link) return;
    if (sitzung) {
      link.setAttribute('href', 'lernbereich.html');
      var txt = link.lastChild;
      if (txt && txt.nodeType === 3) txt.textContent = ' Lernbereich';
    }
  }

  /* ---------- Anmeldeseite --------------------------------------- */
  var loginForm = document.querySelector('[data-mh-login]');
  if (loginForm) {
    var ok = loginForm.querySelector('[data-note="ok"]');
    var err = loginForm.querySelector('[data-note="err"]');

    // Schon angemeldet? Dann direkt weiterleiten.
    if (localStorage.getItem('studentEmail')) {
      location.replace('lernbereich.html');
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      verstecke();
      if (!loginForm.reportValidity()) return;

      if (NICHT_EINGERICHTET) { hinweisNichtEingerichtet(err); return; }
      if (!db) { zeige(err, 'Datenbankverbindung fehlgeschlagen.'); return; }

      var email = loginForm.querySelector('[name="email"]').value.trim();
      var password = loginForm.querySelector('[name="password"]').value;
      loginForm.classList.add('is-sending');

      /* RPC aufrufen um Passwort zu prüfen */
      db.rpc('verify_student_password', {
        p_email: email,
        p_password: password
      }).then(function (r) {
        loginForm.classList.remove('is-sending');
        if (r.error) {
          zeige(err, 'Fehler beim Anmelden. Bitte versuche es später erneut.');
          return;
        }
        if (!r.data) {
          zeige(err, 'E-Mail oder Passwort stimmen nicht. Bitte versuche es nochmal.');
          return;
        }
        /* Erfolgreich! Token setzen und weiterleiten */
        localStorage.setItem('studentEmail', email);
        loginForm.reset();
        zeige(ok);
        setTimeout(function () { location.replace('lernbereich.html'); }, 800);
      }).catch(function (err2) {
        loginForm.classList.remove('is-sending');
        zeige(err, 'Keine Verbindung zum Server. Bitte später erneut versuchen.');
      });
    });
  }

  /* ---------- Lernbereich (geschützt) ---------------------------- */
  var bereich = document.querySelector('[data-mh-lernbereich]');
  if (bereich) {
    var ladeAnzeige = bereich.querySelector('[data-laden]');
    var inhalt      = bereich.querySelector('[data-inhalt]');
    var gesperrt    = bereich.querySelector('[data-gesperrt]');
    var nameFeld    = bereich.querySelector('[data-benutzer]');
    var listeEigene = bereich.querySelector('[data-dateien="eigene"]');
    var listeAlle   = bereich.querySelector('[data-dateien="allgemein"]');
    var abmelden    = bereich.querySelector('[data-abmelden]');

    function zeigeAbschnitt(welcher) {
      [ladeAnzeige, inhalt, gesperrt].forEach(function (el) { if (el) el.hidden = true; });
      if (welcher) welcher.hidden = false;
    }

    if (NICHT_EINGERICHTET) {
      zeigeAbschnitt(gesperrt);
      var h = gesperrt && gesperrt.querySelector('[data-grund]');
      if (h) h.textContent = 'Der Lernbereich ist noch nicht eingerichtet. '
        + 'Trage in js/config.js die Supabase-Zugangsdaten ein (siehe README).';
    } else {
      var studentEmail = localStorage.getItem('studentEmail');
      if (!studentEmail) {
        zeigeAbschnitt(gesperrt);
        var g = gesperrt && gesperrt.querySelector('[data-grund]');
        if (g) g.textContent = 'Du bist nicht angemeldet. Bitte melde dich auf der Anmeldeseite an.';
      } else {
        /* Angemeldet! */
        if (nameFeld) nameFeld.textContent = studentEmail;
        kopfzeileAnpassen(true);
        zeigeAbschnitt(inhalt);
        ladeDateien(studentEmail, listeEigene, 'Für dich wurde noch nichts hinterlegt. '
          + 'Nach der nächsten Stunde findest du hier deine Unterlagen.');
        ladeDateien(CFG.gemeinsamerOrdner, listeAlle, 'Hier ist noch nichts hinterlegt.');
      }
    }

    function dateigroesse(b) {
      if (!b && b !== 0) return '';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
      return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
    }
    function datum(iso) {
      if (!iso) return '';
      var d = new Date(iso);
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    function symbolFuer(name) {
      var e = (name.split('.').pop() || '').toLowerCase();
      if (e === 'pdf') return 'M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM15 3v4h4';
      if (['png','jpg','jpeg','webp','gif','svg'].indexOf(e) > -1) return 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6';
      return 'M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z';
    }

    function ladeDateien(ordner, ziel, leerText) {
      if (!ziel || !db) return;
      db.storage.from(CFG.bucket).list(ordner, {
        limit: 100, sortBy: { column: 'created_at', order: 'desc' }
      }).then(function (r) {
        /* Supabase legt in jedem Ordner automatisch eine unsichtbare
           .emptyFolderPlaceholder-Datei an — die muss VOR der Leer-Prüfung
           rausgefiltert werden, sonst gilt der Ordner fälschlich als
           "nicht leer" und die Liste bleibt ohne Hinweistext leer. */
        var dateien = (r.data || []).filter(function (f) { return f.name !== '.emptyFolderPlaceholder'; });

        if (r.error || !dateien.length) {
          ziel.innerHTML = '<li class="mh-datei mh-datei--leer">' + leerText + '</li>';
          return;
        }
        ziel.innerHTML = '';
        dateien.forEach(function (f) {
          var li = document.createElement('li');
          li.className = 'mh-datei';
          li.innerHTML =
            '<svg class="mh-datei__symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            + 'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            + '<path d="' + symbolFuer(f.name) + '"></path></svg>'
            + '<span class="mh-datei__text"><span class="mh-datei__name"></span>'
            + '<span class="mh-datei__meta">' + datum(f.created_at)
            + (f.metadata && f.metadata.size ? ' · ' + dateigroesse(f.metadata.size) : '')
            + '</span></span>'
            + '<button class="mh-btn mh-btn--ghost mh-datei__knopf" type="button">Öffnen</button>';
          li.querySelector('.mh-datei__name').textContent = f.name;
          li.querySelector('button').addEventListener('click', function () {
            var knopf = this;
            knopf.disabled = true; knopf.textContent = '…';
            db.storage.from(CFG.bucket)
              .createSignedUrl(ordner + '/' + f.name, 60)
              .then(function (u) {
                knopf.disabled = false; knopf.textContent = 'Öffnen';
                if (u.data && u.data.signedUrl) window.open(u.data.signedUrl, '_blank', 'noopener');
              });
          });
          ziel.appendChild(li);
        });
      });
    }

    /* Upload-Formular */
    var uploadForm = document.querySelector('[data-mh-upload]');
    if (uploadForm && studentEmail) {
      var uploadOk = uploadForm.querySelector('[data-upload="ok"]');
      var uploadErr = uploadForm.querySelector('[data-upload="err"]');

      uploadForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!uploadForm.reportValidity()) return;

        var fileInput = uploadForm.querySelector('input[type="file"]');
        var file = fileInput.files[0];
        if (!file) return;

        /* Max 10 MB */
        if (file.size > 10 * 1024 * 1024) {
          if (uploadErr) uploadErr.hidden = false;
          if (uploadErr) uploadErr.textContent = 'Datei ist zu groß (max. 10 MB).';
          return;
        }

        uploadForm.classList.add('is-sending');
        if (uploadOk) uploadOk.hidden = true;
        if (uploadErr) uploadErr.hidden = true;

        var filePath = studentEmail + '/' + file.name;
        db.storage.from(CFG.bucket)
          .upload(filePath, file, { upsert: false })
          .then(function (r) {
            uploadForm.classList.remove('is-sending');
            if (r.error) {
              if (uploadErr) {
                uploadErr.hidden = false;
                uploadErr.textContent = r.error.message || 'Upload fehlgeschlagen.';
              }
              return;
            }
            uploadForm.reset();
            if (uploadOk) uploadOk.hidden = false;
            /* Liste neu laden */
            setTimeout(function () {
              if (uploadOk) uploadOk.hidden = true;
              ladeDateien(studentEmail, listeEigene, 'Für dich wurde noch nichts hinterlegt. '
                + 'Nach der nächsten Stunde findest du hier deine Unterlagen.');
            }, 1500);
          }).catch(function (e) {
            uploadForm.classList.remove('is-sending');
            if (uploadErr) {
              uploadErr.hidden = false;
              uploadErr.textContent = 'Keine Verbindung zum Server.';
            }
          });
      });
    }

    if (abmelden) {
      abmelden.addEventListener('click', function () {
        localStorage.removeItem('studentEmail');
        location.replace('login.html');
      });
    }
  }

  /* ---------- Header Login Link Update ---------- */
  if (!bereich && !loginForm) {
    if (localStorage.getItem('studentEmail')) {
      kopfzeileAnpassen(true);
    }
  }
})();
