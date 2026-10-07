# private – Projektsammlung

Landing Page: **https://semmikgs.github.io/private/**

## Neues Projekt hinzufügen
1. Neuen Unterordner anlegen, z. B. `mein-projekt/`
2. Startseite als `index.html` hineinlegen (weitere Dateien wie PDFs daneben)
3. Optional `meta.json` für Titel, Beschreibung, Symbol und Schlagwörter:
   ```json
   { "title": "Mein Projekt", "description": "Kurzbeschreibung", "icon": "🚀", "tags": ["Klasse 5"] }
   ```
   Mit `"hidden": true` wird ein Ordner nicht angezeigt.
4. Pushen – die GitHub Action erzeugt `projects.json` neu, die Landing Page zeigt das Projekt automatisch an.

Ordner, die mit `.` oder `_` beginnen, sowie `scripts/` werden ignoriert.
