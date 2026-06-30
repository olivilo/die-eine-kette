# Changelog

Alle nennenswerten Änderungen an **Die Eine Kette**. Format lose angelehnt an
[Keep a Changelog](https://keepachangelog.com/). Da das Projekt in **öffentlicher Alpha**
ist, gibt es noch keine festen Versionen — alles unter „Unveröffentlicht".

## [Unveröffentlicht]

### Sicherheit
- **Startup-Guard:** Der Start wird abgebrochen, wenn `SESSION_SECRET` ein Beispiel-/Trivialwert
  oder kürzer als 16 Zeichen ist; Warnung, wenn es ungesetzt ist.
- **Default-Passwort-Warnung:** Lautes Log + roter UI-Banner (für Admin/Root), solange der
  `root`-Account noch das Standard-Passwort nutzt. Neuer Endpoint `GET /api/security_status`
  (nur Admin, nicht öffentlich).
- **Harte Limit-Durchsetzung im Relay (vor dem Provider-Call):**
  - **Token-Limit** wird unabhängig von der User-Quota geprüft (HTTP 403 `insufficient_token_quota`).
  - **Budget-Sperre** bei erschöpftem Budget mit `on_exhaust=block` (HTTP 403 `budget_exhausted`).
  - **Org-Vererbung:** Ein erschöpftes **Organisations-Budget** sperrt alle Mitglieder der Org —
    Deckel auf den Gesamt-Org-Verbrauch, auch wenn das eigene Nutzer-Budget noch Luft hätte.
- **Nutzer-Deaktivierung** macht alle Tokens des Nutzers sofort wirkungslos (über die Blacklist,
  ohne Cache-Verzögerung). Verifiziert.
- **401-Auto-Logout:** Läuft die Session ab, wird der Nutzer automatisch ausgeloggt und auf
  `/login` geleitet (nur bei aktiver Session — die öffentliche Landing bleibt unberührt).

### Hinzugefügt
- **Tokens:** Anlegen mit **Limit (Quota)**, **Ablaufdatum** und „Unbegrenzt"; Zwei-Schritt-
  **Lösch-Bestätigung**.
- **Budgets:** Warnschwellen bei **75 % / 90 %**, **Auto-Stop** bei Erschöpfung (`on_exhaust=block`),
  **periodischer Auto-Reset** (täglich/wöchentlich/monatlich) über einen Wartungs-Loop;
  UI zeigt Auto-Stop-Status und Schwellen-Farben.
- **Anbieter:** **LM Studio**-Preset (lokaler OpenAI-kompatibler Endpunkt).
- **Doku:** READMEs in **12 Sprachen** (de, en, fr, es, it, hr, bs, sl, sr, mk, sq, zh) mit
  Alpha-Hinweis; **grafische Roadmap** (Module & Status, ohne Datumsangaben); `SECURITY.md`,
  Issue-/PR-Templates.

### Geändert
- `LICENSE-DieEineKette.md` → `LICENSE.md` (GitHub-Lizenzerkennung).

### Tests
- Go-Tests für Budget-Burndown, Auto-Stop, Auto-Reset, Token-/Budget-Sperre
  (`backend/model/*_test.go`).
