# Übungsleiter-Abrechnung MTV Schwarmstedt (Vereinsversion)

- **App:** https://semmikgs.github.io/private/abrechnung/
- **Zugänge verwalten (Admin):** https://semmikgs.github.io/private/abrechnung/admin.html – Login mit dem Trainer-Cockpit-Konto

## So funktioniert der Zugang
- Kein Konto, keine E-Mail: Jeder Übungsleiter bekommt einen **Code** (`MTV-XXXX-XXXX`) bzw. einen **Link mit Code**.
- Link einmal öffnen → das Gerät merkt sich den Zugang. Weiteres Gerät: gleicher Link oder Code eingeben.
- Code verloren → Admin-Seite → „Neuer Code“. Der alte Code ist sofort ungültig, die Daten bleiben.
- In der Datenbank liegt nur eine Prüfsumme (SHA-256) des Codes, nie der Code selbst.

## Inhalt
- Je Nutzer: Name, beliebig viele Gruppen (Sportangebot, Sportstätte, Anlass, €/h, Trainingstage mit eigenen Zeiten)
- Termine je Gruppe und Quartal; Ferien/Feiertage Niedersachsen werden beim Vorbelegen ausgelassen
- PDF füllt `lib/vorlage.pdf` (Original-Formular); **IBAN wird nur beim Druck abgefragt und nie gespeichert**
- Admin kann die eigene Cockpit-Abrechnung (`user_docs` / `abrechnung`) in einen Zugang kopieren

## Einrichtung (einmalig)
`setup.sql` im Supabase-Projekt „Handball“ → SQL Editor ausführen – vorher im Abschnitt **ADMIN** die eigene Login-Mail eintragen.

| Datei | Zweck |
|---|---|
| `index.html` | App für Übungsleiter |
| `admin.html` | Zugänge anlegen, neuer Code, umbenennen, löschen |
| `lib/store.js` | Speicher per Code (Funktionen `ul_get`, `ul_save`) mit Offline-Kopie |
| `lib/cloud.js` | Admin-Login + `ul_admin_*`-Funktionen |
| `lib/kalender.js` | Ferien & Feiertage Niedersachsen (bis Sommer 2028) |
| `setup.sql` | Tabellen `ul_users`, `ul_admins` und Funktionen |
