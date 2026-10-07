# Calliope-Blöcke

Eine Blockumgebung für den **Calliope mini 3**, aufgebaut wie Scratch. Alles steckt in der
einzelnen Datei `index.html` (ca. 1,9 MB): Editor, Simulator und die MicroPython-Firmware.
Die Datei lässt sich herunterladen und per Doppelklick ohne Internet öffnen.

**Online:** https://semmikgs.github.io/private/calliope-bloecke/

## Für den Unterricht

Gedacht für Klasse 10, wenn die Schüler Scratch aus Klasse 9 kennen. Die Kategorien heißen
wie dort: Ereignisse, Steuerung, Aussehen, Klang, Fühlen, Funk, Operatoren, Variablen.
Ein Klick auf ein Skript startet es, die grüne Flagge startet alles.

## Was die Umgebung kann

- **Simulator:** 5×5-LED-Matrix mit der Schrift der echten Firmware, Knöpfe A/B/A+B,
  drei RGB-LEDs, Lautsprecher, Mikrofon, Helligkeit, Temperatur, Lagesensor mit Gesten,
  Kompass mit Kalibrierung und Funk. Die Sensoren werden über Schieberegler eingestellt.
- **Funk:** ein zweiter Calliope lässt sich zuschalten, beide führen dasselbe Programm aus.
  Ein Monitor zeigt alle Nachrichten mit Kanal und Empfängern und kann selbst senden.
- **Projekte:** Speichern und Laden als `.calliope.json`, dazu eine automatische Sicherung
  im Browser gegen versehentliches Schließen.
- **Auf das Gerät:** direkt per USB (Chrome oder Edge am Computer) oder als `.hex`-Datei
  zum Ziehen auf das Laufwerk MINI. Die Blöcke werden dafür nach MicroPython übersetzt.

## Selbst bauen

```
node build.js
```

Das fügt `src/index.html` mit den Teilen aus `src/` und `vendor/` zu `index.html` zusammen.
Es werden keine Pakete nachgeladen, Node genügt.

| Ordner    | Inhalt                                                                   |
|-----------|--------------------------------------------------------------------------|
| `src/`    | Gerüst, Blöcke, Simulator, Python-Export, USB-Übertragung, Projektverwaltung |
| `vendor/` | Blockly, Continuous-Toolbox, Flash-Bibliothek, gepackte Calliope-Firmware |

## Herkunft und Lizenzen

Enthalten sind: [Blockly](https://github.com/google/blockly) (Apache-2.0, Google LLC),
[@blockly/continuous-toolbox](https://github.com/google/blockly-samples) (Apache-2.0),
[MicroPython für den Calliope mini 3](https://github.com/calliope-edu/micropython-calliope-mini-v3)
(MIT), [microbit-fs](https://github.com/microbit-foundation/microbit-fs) (MIT),
[dapjs](https://github.com/ARMmbed/dapjs) (MIT, Arm), die WebUSB-Übertragung aus dem
[Calliope-Python-Editor](https://github.com/calliope-edu/calliope-mini-python-editor) (MIT)
und die Displayschrift aus [CODAL](https://github.com/lancaster-university/codal-core)
(MIT, Lancaster University).

Die Platine im Simulator ist eine eigene Darstellung und bildet die Calliope-Platine nicht nach.
