# Lernbereich einrichten (Supabase)

Einmalige Einrichtung, danach lädt Robin Dateien einfach im Supabase-Dashboard hoch.
Kostenloser Tarif reicht völlig aus (500 MB Datenbank, 1 GB Dateien).

---

## 1. Projekt anlegen

1. Konto erstellen: <https://supabase.com>
2. **New Project**
   - Name: `mathhood`
   - Datenbank-Passwort: sicheres Passwort erzeugen und **im Passwortmanager speichern**
   - **Region: `Central EU (Frankfurt)`** ← unbedingt, sonst liegen Schülerdaten außerhalb der EU
3. Ein bis zwei Minuten warten, bis das Projekt bereit ist

## 2. Zugangsdaten in die Website eintragen

Im Dashboard: **Settings → API Keys** (oder Knopf **Connect** oben)

Zwei Werte kopieren:

| Feld im Dashboard | trägst du ein in `js/config.js` |
|---|---|
| Project URL | `supabaseUrl` |
| **Publishable key** (`sb_publishable_…`) | `supabaseKey` |

```js
window.MH_CONFIG = {
  supabaseUrl:     'https://abcdefgh.supabase.co',
  supabaseKey: 'sb_publishable_...',
  ...
};
```

> ⚠️ Den **Secret key** (`sb_secret_…`) bzw. **`service_role`** niemals eintragen.
> Der Publishable key dagegen gehört genau dorthin — er ist öffentlich gedacht.

Danach `build.ps1` ausführen.

## 3. Speicher-Ordner anlegen

**Storage → New bucket**

- Name: `lernmaterial`
- **Public bucket: AUS** (privat!)

Darin zwei Arten von Ordnern:

| Ordner | Inhalt |
|---|---|
| `_allgemein` | Material für alle — Formelsammlungen, Übungsaufgaben |
| `max@beispiel.de` | Unterlagen für genau diesen Schüler (Ordnername = seine E-Mail) |

## 4. Sicherheitsregeln setzen ← der wichtigste Schritt

Ohne diese Regeln käme **jeder an alle Dateien**. Im Dashboard:
**SQL Editor → New query** — folgendes einfügen und **Run** drücken:

```sql
-- Jeder Angemeldete darf den gemeinsamen Ordner lesen
create policy "gemeinsamer ordner lesbar"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lernmaterial'
  and (storage.foldername(name))[1] = '_allgemein'
);

-- Jeder darf ausschliesslich seinen EIGENEN Ordner lesen
create policy "eigener ordner lesbar"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lernmaterial'
  and (storage.foldername(name))[1] = (auth.jwt() ->> 'email')
);
```

Es werden bewusst **nur Leserechte** vergeben. Hochladen und Löschen kann
niemand über die Website — das geht ausschließlich über das Dashboard.

## 5. Nur eingeladene Schüler zulassen

Standardmäßig könnte sich jeder mit beliebiger E-Mail anmelden. Das abschalten:

**Authentication → Sign In / Providers → Email**
→ **Allow new users to sign up: AUS**

Danach legst du jeden Schüler von Hand an:
**Authentication → Users → Add user → Send invitation**

Der Schüler bekommt eine Einladung, klickt darauf, ist angemeldet — fertig.

## 6. Weiterleitung erlauben
**Authentication → URL Configuration**

| Feld | zum Entwickeln (localhost) | beim Launch |
|---|---|---|
| **Site URL** | `http://localhost:8817` | `https://deine-domain.de` |
| **Redirect URLs** | `http://localhost:8817/**` | `https://deine-domain.de/**` |

Die zwei Sternchen erlauben alle Unterseiten.

⚠️ **Haeufigster Stolperstein:** Supabase traegt als Site URL standardmaessig
`http://localhost:3000` ein. Bleibt das stehen, landet der Anmeldelink auf
Port 3000 — wo nichts laeuft — und der Browser meldet "localhost kann nicht
gefunden werden".

Anmeldelinks sind **einmalig**. Nach einer Aenderung an diesen Einstellungen
muss ein **neuer** Link angefordert werden; der alte aus der Mail ist verbraucht.

---

## Alltag: Unterlagen hochladen

1. **Storage → lernmaterial**
2. Ordner mit der E-Mail des Schülers öffnen (oder neu anlegen)
3. Datei hineinziehen

Der Schüler sieht sie beim nächsten Aufruf des Lernbereichs sofort.

## Wenn ein Schüler aufhört

**Authentication → Users** → Benutzer löschen, und den zugehörigen Ordner
unter **Storage** ebenfalls. Die Datenschutzerklärung nennt hierfür eine
Frist von zwölf Monaten nach der letzten Stunde.

---

## Wichtige E-Mail-Grenze im Gratis-Tarif

Supabase verschickt Anmeldelinks über einen eingebauten Mailversand mit
**engem Limit (wenige Mails pro Stunde)**. Für eine Handvoll Schüler reicht
das. Wenn es mehr werden oder Mails nicht ankommen:

**Project Settings → Authentication → SMTP Settings** — dort die Zugangsdaten
des eigenen Strato-Postfachs eintragen. Dann kommen die Anmeldelinks von
`robin@deine-domain.de` und landen seltener im Spam.
