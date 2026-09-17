/* =====================================================================
   MATHHOOD — admin.js
   Admin-Panel für Robin: Schüler-Verwaltung
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

  function zeige(el, text) {
    if (!el) return;
    if (text) el.textContent = text;
    el.classList.add('is-visible');
  }
  function verstecke(el) {
    if (el) el.classList.remove('is-visible');
  }

  /* Zufälliges Passwort generieren (12 Zeichen) */
  function generierePasswort() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    var pwd = '';
    for (var i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  /* ---------- Admin-Login ------------------------------------- */
  var adminPanel = document.querySelector('[data-mh-admin]');
  var loginForm = adminPanel ? adminPanel.querySelector('[data-admin-login-form]') : null;
  var adminContent = adminPanel ? adminPanel.querySelector('[data-admin-content]') : null;
  var loginErr = adminPanel ? adminPanel.querySelector('[data-admin-login-err]') : null;
  var logoutBtn = adminPanel ? adminPanel.querySelector('[data-admin-logout]') : null;
  /* Muss VOR dem Login-Check stehen, weil der ladeStuedenten() sofort
     aufruft — sonst ist diese Variable zu dem Zeitpunkt noch undefined. */
  var studentsList = adminPanel ? adminPanel.querySelector('[data-students-list]') : null;
  var uploadTargetSelect = adminPanel ? adminPanel.querySelector('#upload-target') : null;
  /* Ebenfalls VOR dem Login-Check: wird von ladeHochgeladeneDateien()
     gebraucht, die ladeStuedenten() beim Login sofort mit aufruft. */
  var uploadedList = adminPanel ? adminPanel.querySelector('[data-admin-uploaded-list]') : null;

  /* Admin-Passwort wird NICHT dauerhaft in localStorage gehalten, sondern
     nur für die Dauer der Browser-Sitzung (sessionStorage) — es wird bei
     jeder geschützten Aktion (Liste laden, Schüler anlegen/löschen)
     serverseitig neu geprüft, siehe admin_list_students() etc. */
  function adminPasswort() { return sessionStorage.getItem('adminPwd') || ''; }

  if (loginForm) {
    /* Schon angemeldet? */
    if (sessionStorage.getItem('adminAuth')) {
      loginForm.parentElement.hidden = true;
      if (adminContent) adminContent.hidden = false;
      ladeStuedenten();
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (loginErr) verstecke(loginErr);
      if (!db) { if (loginErr) zeige(loginErr, 'Datenbankverbindung fehlgeschlagen.'); return; }

      var pwd = loginForm.querySelector('[name="password"]').value;
      var submitBtn = loginForm.querySelector('button[type="submit"]');
      var submitBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.textContent = 'Wird geprüft …'; submitBtn.disabled = true; }

      /* Passwort wird serverseitig gegen den gespeicherten Hash geprüft —
         steht nie im Klartext im JS-Code. */
      db.rpc('verify_admin_password', { p_password: pwd }).then(function (r) {
        if (submitBtn) { submitBtn.textContent = submitBtnText; submitBtn.disabled = false; }
        if (r.error) { if (loginErr) zeige(loginErr, 'Fehler bei der Anmeldung.'); return; }
        if (r.data === true) {
          sessionStorage.setItem('adminAuth', 'true');
          sessionStorage.setItem('adminPwd', pwd);
          loginForm.parentElement.hidden = true;
          if (adminContent) adminContent.hidden = false;
          ladeStuedenten();
        } else {
          if (loginErr) zeige(loginErr);
        }
      }).catch(function () {
        if (submitBtn) { submitBtn.textContent = submitBtnText; submitBtn.disabled = false; }
        if (loginErr) zeige(loginErr, 'Keine Verbindung zum Server.');
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      sessionStorage.removeItem('adminAuth');
      sessionStorage.removeItem('adminPwd');
      location.reload();
    });
  }

  /* ---------- Schüler hinzufügen ------------------------------------- */
  var addForm = adminPanel ? adminPanel.querySelector('[data-admin-add-student]') : null;
  var genPwdBtn = adminPanel ? adminPanel.querySelector('[data-generate-pwd]') : null;
  var pwdField = adminPanel ? adminPanel.querySelector('#student-pwd') : null;
  var studentOk = adminPanel ? adminPanel.querySelector('[data-student-ok]') : null;
  var studentErr = adminPanel ? adminPanel.querySelector('[data-student-err]') : null;

  var templateField = adminPanel ? adminPanel.querySelector('#pwd-template') : null;
  var copyPwdBtn = adminPanel ? adminPanel.querySelector('[data-copy-pwd]') : null;
  var copyTemplateBtn = adminPanel ? adminPanel.querySelector('[data-copy-template]') : null;
  var emailField = adminPanel ? adminPanel.querySelector('[name="email"]') : null;

  function updateTemplate() {
    if (!templateField || !pwdField || !emailField) return;
    templateField.value =
      'Hallo!\n\n' +
      'Du kannst dich jetzt im Lernbereich anmelden:\n\n' +
      'E-Mail: ' + (emailField.value || '[E-Mail]') + '\n' +
      'Passwort: ' + pwdField.value + '\n\n' +
      'Besuche: https://mathhood.de/login.html\n\n' +
      'Viele Grüße,\nRobin';
  }

  if (genPwdBtn && pwdField) {
    genPwdBtn.addEventListener('click', function (e) {
      e.preventDefault();
      pwdField.value = generierePasswort();
      updateTemplate();
    });
    /* Initial password */
    pwdField.value = generierePasswort();
    updateTemplate();
  }

  if (emailField) {
    emailField.addEventListener('input', updateTemplate);
  }

  if (copyPwdBtn && pwdField) {
    copyPwdBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var pwd = pwdField.value;
      if (!pwd) return;
      navigator.clipboard.writeText(pwd).then(function () {
        copyPwdBtn.textContent = '✓';
        setTimeout(function () { copyPwdBtn.textContent = '📋'; }, 1500);
      });
    });
  }

  if (copyTemplateBtn && templateField) {
    copyTemplateBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var text = templateField.value;
      if (!text) return;
      navigator.clipboard.writeText(text).then(function () {
        copyTemplateBtn.textContent = 'Template kopiert! ✓';
        setTimeout(function () { copyTemplateBtn.textContent = 'Template kopieren →'; }, 1500);
      });
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!addForm.reportValidity()) return;
      if (!db) { if (studentErr) zeige(studentErr, 'Datenbankverbindung fehlgeschlagen.'); return; }

      var email = addForm.querySelector('[name="email"]').value.trim();
      var password = pwdField ? pwdField.value : '';

      if (!password) {
        if (studentErr) zeige(studentErr, 'Passwort erforderlich.');
        return;
      }

      var submitBtn = addForm.querySelector('button[type="submit"]');
      var submitBtnText = submitBtn ? submitBtn.textContent : '';

      addForm.classList.add('is-sending');
      if (submitBtn) submitBtn.textContent = 'Wird hinzugefügt …';
      if (studentOk) verstecke(studentOk);
      if (studentErr) verstecke(studentErr);

      function fertig() {
        addForm.classList.remove('is-sending');
        if (submitBtn) submitBtn.textContent = submitBtnText;
      }

      /* Account serverseitig anlegen — das Passwort wird dort gehasht,
         nie im Klartext gespeichert oder client-seitig verarbeitet. Das
         Admin-Passwort wird bei jedem Aufruf erneut serverseitig geprüft. */
      db.rpc('create_student_account', { p_email: email, p_password: password, p_admin_password: adminPasswort() })
        .then(function (r) {
          fertig();
          if (r.error) {
            var msg = r.error.message || '';
            if (/duplicate key|unique constraint/i.test(msg)) {
              msg = 'Diese E-Mail-Adresse ist bereits registriert.';
            }
            if (studentErr) zeige(studentErr, msg || 'Fehler beim Hinzufügen.');
            return;
          }
          if (studentOk) zeige(studentOk);
          addForm.reset();
          if (pwdField) { pwdField.value = generierePasswort(); updateTemplate(); }
          setTimeout(function () {
            if (studentOk) verstecke(studentOk);
            ladeStuedenten();
          }, 1500);
        })
        .catch(function (e) {
          fertig();
          if (studentErr) zeige(studentErr, 'Fehler: ' + (e.message || 'unbekannt'));
        });
    });
  }

  /* ---------- Schüler-Liste laden ------------------------------------- */
  function ladeStuedenten() {
    if (!studentsList || !db) return;
    studentsList.innerHTML = '<li class="mh-datei mh-datei--leer">Wird geladen …</li>';

    /* Sicherheits-Timeout: falls die Anfrage aus irgendeinem Grund nie
       antwortet, bleibt die Liste nach spätestens 8s nicht ewig hängen. */
    var erledigt = false;
    var timeoutId = setTimeout(function () {
      if (erledigt) return;
      erledigt = true;
      studentsList.innerHTML = '<li class="mh-datei mh-datei--leer">'
        + 'Zeitüberschreitung beim Laden. Bitte Seite neu laden.</li>';
    }, 8000);

    db.rpc('admin_list_students', { p_admin_password: adminPasswort() })
      .then(function (r) {
        if (erledigt) return; /* Timeout kam zuerst — Antwort ignorieren */
        erledigt = true;
        clearTimeout(timeoutId);

        /* Dropdown für den Datei-Upload befüllen: "Für alle" bleibt fix an
           erster Stelle, danach alle Schüler-E-Mails. */
        if (uploadTargetSelect) {
          var bisherigeWahl = uploadTargetSelect.value;
          uploadTargetSelect.innerHTML = '<option value="_allgemein">Für alle Schüler (allgemein)</option>';
          (r.data || []).forEach(function (s) {
            var opt = document.createElement('option');
            opt.value = s.email;
            opt.textContent = s.email;
            uploadTargetSelect.appendChild(opt);
          });
          if (bisherigeWahl) uploadTargetSelect.value = bisherigeWahl;
          ladeHochgeladeneDateien();
        }

        if (r.error) {
          /* Admin-Passwort wurde zwischenzeitlich geändert oder die
             Sitzung ist ungültig — zurück zum Login zwingen. */
          if (/ungueltiges passwort/i.test(r.error.message || '')) {
            sessionStorage.removeItem('adminAuth');
            sessionStorage.removeItem('adminPwd');
            location.reload();
            return;
          }
          studentsList.innerHTML = '<li class="mh-datei mh-datei--leer">Fehler beim Laden: ' + r.error.message + '</li>';
          return;
        }
        if (!r.data || !r.data.length) {
          studentsList.innerHTML = '<li class="mh-datei mh-datei--leer">Noch keine Schüler hinzugefügt.</li>';
          return;
        }
        studentsList.innerHTML = '';
        r.data.forEach(function (student) {
          var li = document.createElement('li');
          li.className = 'mh-datei';
          li.style.cssText = 'padding:12px 16px; border-bottom:1px solid var(--mh-border); display:flex; justify-content:space-between; align-items:center';

          var d = new Date(student.created_at);
          var dateStr = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

          li.innerHTML =
            '<div>' +
            '<div style="font-weight:500">' + student.email + '</div>' +
            '<div style="font-size:12px; color:var(--mh-text-muted); margin-top:4px">Hinzugefügt: ' + dateStr + '</div>' +
            '</div>' +
            '<button class="mh-btn mh-btn--ghost mh-btn--small" type="button" data-delete-student style="white-space:nowrap">Löschen</button>';

          var delBtn = li.querySelector('[data-delete-student]');
          delBtn.addEventListener('click', function () {
            if (!confirm('Schüler ' + student.email + ' wirkllich löschen?')) return;
            delBtn.disabled = true;
            db.rpc('admin_delete_student', { p_admin_password: adminPasswort(), p_student_id: student.id }).then(function (r) {
              if (r.error) { delBtn.disabled = false; alert('Fehler: ' + r.error.message); return; }
              if (r.data !== true) {
                delBtn.disabled = false;
                alert('Löschen fehlgeschlagen: Schüler wurde nicht gefunden.');
                return;
              }
              li.remove();
            }).catch(function (e) {
              delBtn.disabled = false;
              alert('Fehler: ' + (e.message || 'Verbindung fehlgeschlagen'));
            });
          });

          studentsList.appendChild(li);
        });
      })
      .catch(function (e) {
        if (erledigt) return;
        erledigt = true;
        clearTimeout(timeoutId);
        studentsList.innerHTML = '<li class="mh-datei mh-datei--leer">Fehler beim Laden: '
          + (e.message || 'Verbindung fehlgeschlagen') + '</li>';
      });
  }

  /* ---------- Datei für Schüler hochladen ------------------------------ */
  var uploadForm = adminPanel ? adminPanel.querySelector('[data-admin-upload]') : null;
  var uploadOk = adminPanel ? adminPanel.querySelector('[data-admin-upload-ok]') : null;
  var uploadErr = adminPanel ? adminPanel.querySelector('[data-admin-upload-err]') : null;

  function dateigroesse(b) {
    if (!b && b !== 0) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return Math.round(b / 1024) + ' KB';
    return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
  }

  function ladeHochgeladeneDateien() {
    if (!uploadedList || !db || !uploadTargetSelect) return;
    var ordner = uploadTargetSelect.value;
    if (!ordner) {
      uploadedList.innerHTML = '<li class="mh-datei mh-datei--leer">Wähle oben einen Empfänger aus.</li>';
      return;
    }
    uploadedList.innerHTML = '<li class="mh-datei mh-datei--leer">Wird geladen …</li>';

    db.storage.from(CFG.bucket).list(ordner, {
      limit: 100, sortBy: { column: 'created_at', order: 'desc' }
    }).then(function (r) {
      /* Supabase legt in jedem Ordner automatisch eine unsichtbare
         .emptyFolderPlaceholder-Datei an — die muss VOR der Leer-Prüfung
         rausgefiltert werden, sonst hält Supabase den Ordner fälschlich
         für "nicht leer" und die Liste bleibt ohne Hinweistext leer. */
      var dateien = (r.data || []).filter(function (f) { return f.name !== '.emptyFolderPlaceholder'; });

      if (r.error || !dateien.length) {
        uploadedList.innerHTML = '<li class="mh-datei mh-datei--leer">Für "' + ordner + '" wurde noch nichts hochgeladen.</li>';
        return;
      }
      uploadedList.innerHTML = '';
      dateien.forEach(function (f) {
        var li = document.createElement('li');
        li.className = 'mh-datei';
        li.style.cssText = 'padding:12px 16px; border-bottom:1px solid var(--mh-border); display:flex; justify-content:space-between; align-items:center';
        li.innerHTML =
          '<div>' +
          '<div style="font-weight:500"></div>' +
          '<div style="font-size:12px; color:var(--mh-text-muted); margin-top:4px">' +
          (f.metadata && f.metadata.size ? dateigroesse(f.metadata.size) : '') +
          '</div></div>' +
          '<button class="mh-btn mh-btn--ghost mh-btn--small" type="button" data-delete-upload style="white-space:nowrap">Löschen</button>';
        li.querySelector('div div').textContent = f.name;

        li.querySelector('[data-delete-upload]').addEventListener('click', function () {
          var btn = this;
          if (!confirm('Datei "' + f.name + '" wirklich löschen?')) return;
          btn.disabled = true;
          db.storage.from(CFG.bucket).remove([ordner + '/' + f.name]).then(function (r2) {
            if (r2.error) { btn.disabled = false; alert('Fehler: ' + r2.error.message); return; }
            li.remove();
          });
        });

        uploadedList.appendChild(li);
      });
    }).catch(function (e) {
      uploadedList.innerHTML = '<li class="mh-datei mh-datei--leer">Fehler beim Laden: ' + (e.message || 'unbekannt') + '</li>';
    });
  }

  if (uploadTargetSelect) {
    uploadTargetSelect.addEventListener('change', ladeHochgeladeneDateien);
  }

  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!uploadForm.reportValidity()) return;
      if (!db) { if (uploadErr) zeige(uploadErr, 'Datenbankverbindung fehlgeschlagen.'); return; }

      var ordner = uploadTargetSelect ? uploadTargetSelect.value : '_allgemein';
      var fileInput = uploadForm.querySelector('input[type="file"]');
      var file = fileInput.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        if (uploadErr) zeige(uploadErr, 'Datei ist zu groß (max. 10 MB).');
        return;
      }

      var submitBtn = uploadForm.querySelector('button[type="submit"]');
      var submitBtnText = submitBtn ? submitBtn.textContent : '';
      uploadForm.classList.add('is-sending');
      if (submitBtn) submitBtn.textContent = 'Wird hochgeladen …';
      if (uploadOk) verstecke(uploadOk);
      if (uploadErr) verstecke(uploadErr);

      db.storage.from(CFG.bucket)
        .upload(ordner + '/' + file.name, file, { upsert: true })
        .then(function (r) {
          uploadForm.classList.remove('is-sending');
          if (submitBtn) submitBtn.textContent = submitBtnText;
          if (r.error) {
            if (uploadErr) zeige(uploadErr, r.error.message || 'Upload fehlgeschlagen.');
            return;
          }
          uploadForm.reset();
          if (uploadTargetSelect) uploadTargetSelect.value = ordner; /* reset() setzt select zurück auf erste Option */
          if (uploadOk) zeige(uploadOk);
          setTimeout(function () { if (uploadOk) verstecke(uploadOk); }, 1500);
          ladeHochgeladeneDateien();
        })
        .catch(function (e) {
          uploadForm.classList.remove('is-sending');
          if (submitBtn) submitBtn.textContent = submitBtnText;
          if (uploadErr) zeige(uploadErr, 'Fehler: ' + (e.message || 'Verbindung fehlgeschlagen'));
        });
    });
  }

})();
