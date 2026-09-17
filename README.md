# MATHHOOD Website

Statische Website (HTML/CSS/JS) für die Mathe-Nachhilfe von Robin.

## Lokale Vorschau

**Rechtsklick auf `serve.ps1` → "Mit PowerShell ausführen"**

Oder im Terminal:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Dann im Browser: <http://localhost:8817/>
Das Fenster muss offen bleiben — es zeigt jede Anfrage mit Statuscode,
was bei der Fehlersuche hilft. Beenden mit `Strg + C`.

Der Server speichert bewusst nichts zwischen — geänderte Dateien sind
sofort nach dem Neuladen sichtbar, ohne `Strg + F5`.

## Projektstruktur

```
mathhood-website/
├─ index.html            Startseite (Landingpage)
├─ css/styles.css        komplettes Design-System + alle Seiten
├─ js/main.js            gemeinsame Interaktionen (mobiles Menü …)
├─ assets/img/           Bilder & Logo
│   └─ logo-icon.svg     MATHHOOD-Bildmarke (Vektor, umfärbbar)
└─ serve.ps1             lokaler Vorschau-Server
```

## Bilder

**Eingebaut ✅**

| Datei | Wo |
|---|---|
| `mathhood-logo.png` | Kopfzeile (Hut + Schriftzug) |
| `mathhood-emblem.png` | Startseite, „Wer hinter MATHHOOD steckt" (Bogenschütze) |

Originale liegen unter `assets/img/_original/`.

**Fehlt noch** — mit exakt diesen Namen in `assets/img/` legen:

| Datei | Wo | Format |
|---|---|---|
| `robin-photo.jpg`    | Startseite, großes Hero-Bild | quadratisch, mind. 800 × 800 px |
| `robin-portrait.jpg` | Seite „Über mich" | quadratisch, mind. 800 × 800 px |

## Seiten bearbeiten  ·  WICHTIG

Die fertigen `.html`-Dateien im Stammordner werden **automatisch erzeugt** –
nicht direkt bearbeiten. Stattdessen:

1. Datei in **`src/`** öffnen und Texte/Preise ändern
   (z. B. `src/preise.html` für die Preise)
2. **`build.ps1`** ausführen (Rechtsklick → „Mit PowerShell ausführen")
3. Vorschau neu laden

Navigation & Fußzeile liegen in **`partials/header.html`** bzw.
`partials/footer.html` – einmal ändern, `build.ps1` läuft für alle Seiten.

## Projektstruktur (aktualisiert)

```
src/            <- HIER bearbeiten (Seiteninhalte)
partials/       <- gemeinsame Bausteine (header, footer, head)
build.ps1       <- baut src/ + partials/ -> fertige Seiten im Stammordner
*.html          <- erzeugt, nicht von Hand ändern
```

## Lernbereich (Supabase) — läuft ✅

Projekt angelegt (Region Frankfurt), verbunden, Anmeldung getestet.
Zugangsdaten in `js/config.js`. Anleitung: [SUPABASE-EINRICHTUNG.md](SUPABASE-EINRICHTUNG.md).

**Geprüft:** Selbstregistrierung aus ✅ · öffentlicher Dateizugriff blockiert ✅
· Anmeldung per E-Mail-Link funktioniert ✅

### Stolpersteine, die uns Zeit gekostet haben

| Problem | Lösung |
|---|---|
| Anmeldung wurde immer abgelehnt | `shouldCreateUser: false` in `auth.js` — ohne das lehnt Supabase bei abgeschalteter Registrierung ALLES ab |
| Vorschau-Server starb ständig | fehlendes try/catch pro Anfrage in `serve.ps1` |
| Link nur im selben Browser gültig | `flowType: 'implicit'` statt PKCE — nötig für Links per E-Mail |
| Einladungsmail zeigte auf `:3000` | **Site URL** in Supabase (nicht nur die Redirect-URLs!) |
| Link auf dem Handy tot | `localhost` gibt es nur auf dem Rechner mit dem Server |

⚠️ **Anmeldelinks gelten genau einmal.** Ein Klick auf einem Gerät ohne
laufenden Server verbrennt den Link trotzdem — Supabase löst den Token
schon vor der Weiterleitung ein.

## Formulare (Formspree) — läuft ✅

Beide Formulare sind angeschlossen und getestet:

| Formular | Adresse | Status |
|---|---|---|
| Kontakt | `formspree.io/f/mkjnnvkb` | getestet ✅ |
| Buchung | `formspree.io/f/mnpqqgag` | getestet ✅ |

**Empfänger-Adresse ändern:** im [Formspree-Dashboard](https://formspree.io)
beim jeweiligen Formular unter „Send emails to" — nicht im Code.

Gratis-Tarif: 50 Einsendungen/Monat. Formspree warnt automatisch bei
50 %, 75 % und 90 % der Grenze.

## Platzhalter, die noch ersetzt werden müssen

### Rechtsseiten — von Robin auszufüllen

In `src/impressum.html`, `src/datenschutz.html`, `src/agb.html` und
`src/widerruf.html` ist **jede offene Stelle gelb hinterlegt** (CSS-Klasse
`mh-todo`). Einfach die Seiten im Browser öffnen — was gelb leuchtet, muss weg.

Gebraucht werden: Anschrift, Telefon, E-Mail, Finanzamt, Steuerstatus
(§ 19 UStG / § 4 Nr. 21 UStG / USt-IdNr.), Zahlungsweise, Kündigungsfrist, Datum.

```bash
grep -c mh-todo impressum.html datenschutz.html agb.html widerruf.html
```

### Sonstige Platzhalter

| Wo | Aktuell | Muss werden |
|---|---|---|
| `src/kontakt.html` (Seitenspalte) | `hallo@mathhood.de` | echte E-Mail |
| `src/kontakt.html` (Seitenspalte) | `+49 000 0000000` | echte Telefonnummer |
| `js/forms.js` (Fehlermeldungen) | `hallo@mathhood.de` | echte E-Mail |
| `robots.txt`, `sitemap.xml` | `DEINE-DOMAIN.de` | echte Domain |
| `assets/img/` | fehlt | `robin-photo.jpg` (Hero), `robin-portrait.jpg` (Über mich) |

## Datenschutz — was bereits umgesetzt ist

- **Schriften lokal** unter `assets/fonts/` — keine Verbindung zu Google Fonts
- **Leaflet lokal** unter `assets/vendor/leaflet/` — kein CDN
- **Karte lädt erst auf Klick** — ohne Zustimmung geht keine IP an CARTO
- **Keine Cookies, kein Tracking, keine Analyse-Werkzeuge**
- Ohne Nutzerklick werden **keinerlei externe Ressourcen** geladen

Prüfen lässt sich das so: Seite öffnen, Entwicklertools → Netzwerk → alle
Anfragen müssen auf die eigene Domain zeigen.

## Status

- [x] P1 Design-System
- [x] P2 Navigation + Fußzeile (+ mobiles Menü)
- [x] P3 Landingpage (responsive: Handy / Tablet / Desktop)
- [x] P4 Über mich · Dienstleistungen · Preise (+ partials-/Build-System)
- [x] P5 Produktseiten (Online / 10er-Lernpaket / Vor Ort) + Preisrechner + Leaflet-Umkreiskarte
- [x] P7 Formulare — Kontakt (+ FAQ) und Buchung
- [x] P8 Login + Lernbereich — Anmeldung getestet ✅
- [x] P9 Impressum, Datenschutz, AGB, Widerruf + lokale Schriften + robots/sitemap
- [x] P10 Responsive-Endkontrolle (14 Seiten × 6 Breiten, Tippflächen, Überschriften)
- [ ] P11 **Launch** (Seite geht online, „Anfragen"-Buttons)
- [ ] P6 Bezahlung per Stripe — **nachgerüstet nach dem Launch**
