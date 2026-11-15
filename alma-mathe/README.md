# Almas Lernwelt

Übungs-App für Alma (Login `alma` / `123`, Elternbereich `1234`).
Adresse: https://semmikgs.github.io/private/alma-mathe/

## Aufbau
- `index.html` – Kern: Login, Fächerwahl, Thema-für-Thema / Bunt gemischt, Aufgabenanzeige, Elternstatistik
- `faecher/*.js` – ein Fach pro Datei (`mathe.js`, `musik.js`, …)

## Neues Fach
1. `faecher/<fach>.js` anlegen und am Ende `registerFach({...})` aufrufen
2. In `index.html` eine Zeile ergänzen: `<script src="faecher/<fach>.js"></script>`

```js
(function(){
const TOPICS = [
  { id:"de_nomen", name:"Nomen erkennen", icon:"🔤", gens:[
    { sub:"mc", label:"Nomen auswählen", w:2, f(){ return {q:"Welches Wort ist ein Nomen?", type:"mc", ans:"Hund", opts:shuffle(["Hund","laufen","schnell","und"]), ex:"Nomen schreibt man groß."}; } },
  ]},
];
registerFach({ id:"deutsch", name:"Deutsch", icon:"📖", color:"#2fb36d", info:"…", topics:TOPICS });
})();
```

**Regeln:** Themen-IDs über alle Fächer eindeutig (sie sind Schlüssel der Statistik – nicht umbenennen).
`w` = Häufigkeit eines Aufgabentyps, `label` erscheint in der Elternstatistik.

## Antworttypen (Feld `type`)
| Typ | Eingabe | `ans` |
|---|---|---|
| `num` | Zahlentastatur | Zahl |
| `mc` | Auswahlknöpfe (`opts`, optional `labels` mit HTML, `one:true` einspaltig) | Text |
| `cmp` | `<` `=` `>` | Zeichen |
| `place` | Stellentafel H/Z/E | `[h,z,e]` |
| `tap` | im Bild `extra` antippen (Elemente mit `class="tapme" data-v="…"`) | data-v |
| `custom` | eigene Oberfläche: `mount(el, submit)`, `check(given)` | – |

Weitere Felder: `extra` (Bild/HTML unter der Frage), `ex` (Erklärung nach der Antwort), `small` (kleinere Schrift), `showAns` (Text der richtigen Lösung).
Helfer aus dem Kern: `r(a,b)`, `pick()`, `shuffle()`, `uniqOpts()`, `BOX`, `esc()`.
