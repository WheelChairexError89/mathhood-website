# Launch: Netlify + Strato

Reihenfolge einhalten. Schritt 0 ist keine Formsache.

---

## Schritt 0 — was VOR dem Launch fertig sein muss

| | Stand |
|---|---|
| Robins Anschrift, Telefon, E-Mail | ❌ offen (34 gelbe Stellen) |
| Steuerstatus vom Steuerberater | ❌ offen |
| Anwaltsblick auf AGB + Widerruf | ❌ offen |
| Robins zwei Fotos | ❌ offen |
| Domain bei Strato | ❌ offen |

**Ein Impressum ohne ladungsfähige Anschrift ist abmahnfähig.** Genauso eine
Widerrufsbelehrung mit `[PLATZHALTER]` drin. Die Seite kann technisch sofort
online, rechtlich sollte sie es erst mit echten Daten.

Wer trotzdem vorher zeigen will: Die Vorschau-Adresse von Netlify
(`…netlify.app`) reicht dafür. Sie steht auf `noindex`, taucht also nicht
bei Google auf.

---

## Schritt 1 — Netlify-Konto anlegen

<https://app.netlify.com/signup> — kostenlos, geht mit E-Mail oder GitHub.

## Schritt 2 — Seite hochladen

1. <https://app.netlify.com/drop>
2. **`mathhood-website-LAUNCH.zip`** ins Fenster ziehen
3. Nach etwa 30 Sekunden ist die Seite live unter einer Adresse wie
   `zufaelliger-name-a1b2.netlify.app`

Diese Adresse funktioniert sofort auf jedem Gerät — auch auf dem Handy.

**Namen ändern:** Site configuration → Change site name → z. B. `mathhood`.
Dann lautet die Adresse `mathhood.netlify.app`.

## Schritt 3 — Domain bei Strato klären

Im [Strato-Kundenlogin](https://www.strato.de/apps/CustomerService):

- Steht die Domain noch im Konto? Dann weiter mit Schritt 4.
- Ist sie weg? Neu bestellen. In den STRATO-Mail-Paketen ist eine
  `.de`-Domain enthalten, siehe die E-Mail-Einrichtung.

## Schritt 4 — Domain bei Netlify eintragen

Netlify: **Domain management → Add a domain** → Domain eingeben
(z. B. `mathhood.de`) → **Verify** → **Add domain**.

Netlify zeigt danach unter **Pending DNS verification** die exakten Werte an.
**Nimm immer die Werte, die Netlify dir zeigt** — die unten sind nur zur
Orientierung, damit du weißt, was dich erwartet.

## Schritt 5 — DNS bei Strato setzen ⚠️ heikelster Schritt

Strato: **Domainverwaltung → deine Domain → DNS-Einstellungen**

| Typ | Name | Wert |
|---|---|---|
| A | `@` (leer / Hauptdomain) | `75.2.60.5` |
| CNAME | `www` | `dein-name.netlify.app` |

Falls Strato **ALIAS** oder **ANAME** anbietet, ist das für die Hauptdomain
besser als der A-Eintrag: Ziel dann `apex-loadbalancer.netlify.com`.

### 🚨 Die MX-Einträge NICHT anfassen

Die MX-Einträge steuern die **E-Mail**. Löschst du sie, kommen keine
Nachrichten mehr an — und das fällt oft erst Tage später auf.

Ändere **ausschließlich** die A- und CNAME-Einträge für die Website.
Alles mit „MX" bleibt, wie es ist. Mach am besten vorher einen Screenshot
der bestehenden Einträge.

## Schritt 6 — warten

DNS-Änderungen brauchen bis zu 24 Stunden, meist sind es ein bis zwei.
Netlify richtet das HTTPS-Zertifikat danach von selbst ein — nichts zu tun.

Fertig ist es, wenn `https://deine-domain.de` die Seite zeigt und ein
Schloss-Symbol im Browser steht.

---

## Nach dem Launch: vier Nacharbeiten

### 1. Suchmaschinen freigeben

In `netlify.toml` diese Zeile **löschen** und neu hochladen:

```toml
X-Robots-Tag = "noindex, nofollow"
```

Solange sie drinsteht, findet Google die Seite nicht.

### 2. Domain in robots.txt und sitemap.xml

In beiden Dateien `DEINE-DOMAIN.de` durch die echte Domain ersetzen.

### 3. Supabase auf die neue Adresse umstellen

**Authentication → URL Configuration**

| Feld | neuer Wert |
|---|---|
| Site URL | `https://deine-domain.de` |
| Redirect URLs | `https://deine-domain.de/**` |

Ohne diesen Schritt funktionieren die Anmeldelinks für den Lernbereich nicht
mehr. Der localhost-Eintrag kann zum Weiterentwickeln stehen bleiben.

### 4. Eigenes Postfach für Anmeldelinks

**Project Settings → Authentication → SMTP Settings** — Zugangsdaten des
Strato-Postfachs eintragen. Damit entfällt die Drosselung von wenigen
Mails pro Stunde, und die Links kommen von `robin@deine-domain.de`.

---

## Änderungen später einspielen

1. In `src/` bearbeiten
2. `build.ps1` ausführen
3. Netlify: **Deploys → Drag and drop** → Ordner erneut hineinziehen

Nach etwa 30 Sekunden ist es online. Jede frühere Fassung bleibt gespeichert,
ein Klick genügt zum Zurückrollen.

---

## Wenn etwas klemmt

| Problem | Ursache |
|---|---|
| „DNS verification failed" | Einträge brauchen Zeit, ein bis zwei Stunden warten |
| Seite lädt, aber ohne Bilder | Ordner statt Inhalt hochgeladen — die HTML-Dateien müssen direkt in der ZIP liegen |
| Keine E-Mails mehr | MX-Einträge bei Strato überschrieben, zurücksetzen |
| Lernbereich-Anmeldung tot | Supabase-URLs noch auf localhost |
