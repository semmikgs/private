# Trading-Strategien – Handbuch

Webseite: https://semmikgs.github.io/private/trading-strategien/

## Aufbau
- `index.html` – Seite (Übersicht + Detailansicht per `#id`), rendert alles aus JSON
- `strategien/katalog.json` – Liste aller Strategien (Reihenfolge = Kapitelreihenfolge)
- `strategien/NN-name.json` – Inhalt einer Strategie
- `strategien/bilder/NN-*.svg` – schematische Grafiken (feste Farben, keine CSS-Variablen, weißer Hintergrund → später verlustfrei per Canvas zu PNG für ODT)

## Neue Strategie hinzufügen
1. `strategien/02-name.json` nach dem Muster von `01-pullback-luk.json` anlegen
2. Eintrag in `strategien/katalog.json` ergänzen
3. Grafiken als SVG in `strategien/bilder/`

## Blocktypen (je Abschnitt in `bloecke`)
Jeder Typ ist so gewählt, dass er 1:1 einem ODT-Element entspricht (ODT-Export folgt).

| typ | Felder | ODT-Gegenstück |
|---|---|---|
| `absatz` | `text` | Absatz |
| `aufzaehlung` / `nummeriert` | `punkte[]` | Liste |
| `checkliste` | `titel?`, `punkte[]` | Liste mit ☐ |
| `hinweis` | `art` (`warnung`/`info`), `text` | Absatz mit Rahmen |
| `beispiel` | `text` | Absatz mit Rahmen |
| `formel` | `text` | zentrierter Absatz |
| `tabelle` | `titel?`, `kopf[]`, `zeilen[][]` | Tabelle |
| `bild` | `src`, `unterschrift`, `breite_cm` | Bild + Beschriftung |
| `rechner` | – | nur Web (im ODT ausgelassen) |

Inline-Formatierung: nur `**fett**`.
