# Übungsleiter-Abrechnung MTV Schwarmstedt (Vereinsversion)

Seite: https://semmikgs.github.io/private/abrechnung/

- Jeder Nutzer: Name, beliebig viele Gruppen (Sportangebot, Sportstätte, Anlass, €/h, Trainingstage mit eigenen Zeiten)
- Termine je Gruppe und Quartal, Ferien/Feiertage Niedersachsen werden beim Vorbelegen ausgelassen
- PDF füllt `lib/vorlage.pdf` (Original-Formular); **IBAN wird nur beim Druck abgefragt und nie gespeichert**
- Daten: Supabase-Projekt „Handball“, Tabelle `user_docs`, Schlüssel `abrechnung_verein` (RLS: jeder sieht nur seine Daten)
- Beim ersten Start wird angeboten, die Daten aus dem Trainer-Cockpit (`abrechnung`) als Gruppe zu übernehmen – das Cockpit bleibt unverändert

## Einmalige Einrichtung in Supabase

1. **Registrierung sperren:** Authentication → Sign In / Providers → „Allow new users to sign up“ **aus**.
2. **URL erlauben:** Authentication → URL Configuration → Redirect URLs: `https://semmikgs.github.io/private/abrechnung/` hinzufügen.
3. **Mail-Vorlagen** (Authentication → Emails), damit die Links direkt auf die Abrechnung zeigen:
   - *Invite user*: Link ersetzen durch
     `https://semmikgs.github.io/private/abrechnung/?token_hash={{ .TokenHash }}&type=invite`
   - *Reset password*: Link ersetzen durch
     `https://semmikgs.github.io/private/abrechnung/?token_hash={{ .TokenHash }}&type=recovery`
4. **Mailversand:** Der eingebaute Supabase-Mailer schickt nur an Mitglieder des Supabase-Teams und nur wenige Mails pro Stunde. Für Einladungen an Vereinsmitglieder unter Project Settings → Authentication → SMTP einen eigenen Mail-Server eintragen.

## Nutzer anlegen

- **Mit SMTP:** Authentication → Users → „Invite user“ → E-Mail eintragen. Der Nutzer klickt den Link und legt sein Passwort fest.
- **Ohne SMTP:** Authentication → Users → „Create new user“ → E-Mail + Startpasswort, „Auto Confirm User“ an. Startpasswort weitergeben; der Nutzer ändert es unter ⚙︎ → Passwort ändern.
- **Entfernen:** Nutzer in Authentication → Users löschen – seine Daten werden automatisch mitgelöscht.
