# 🛡️ Push-Schutzwall — „nur Öffentliches"

Diese Schicht stellt sicher, dass **niemals** etwas Privates/Geheimes aus
„Die Eine Kette" ins öffentliche Repo gelangt — weder durch Commit noch durch Push.

## Verteidigungslinien (mehrschichtig)

1. **Trennung auf Ordnerebene** — alles Sensible liegt in `../die-eine-kette-private/`
   (Schwester-Ordner *außerhalb* dieses Repos). Git sieht ihn gar nicht.
2. **`.gitignore`** — ignoriert zusätzlich `.env`, `secrets/`, `*.key`, `*.pem`,
   `*.license`, `die-eine-kette-private/` u. a. (Schutz, falls je verschoben).
3. **`tools/security/check-no-private.sh`** — Scanner, der getrackte/gestagte
   Dateien gegen verbotene **Pfade** *und* **Inhalte** (PEM-Keys, echte LM-Studio-Keys)
   prüft. Portabel: Bash 3.2 + BSD-grep (macOS).
4. **Git-Hooks** (`.githooks/`):
   - `pre-commit` → blockt Commits mit Privatem (prüft gestagte Dateien).
   - `pre-push`  → blockt Pushes, solange irgendeine getrackte Datei privat ist
     (prüft den **gesamten** Stand, nicht nur das Delta).

## Aktivierung nach `git clone` (einmalig, wichtig!)

`core.hooksPath` steht in `.git/config` und wird **nicht** mitgeklont. Nach jedem
frischen Klon einmalig:

```bash
git config core.hooksPath .githooks
```

Danach laufen pre-commit und pre-push automatisch.

## Manuell prüfen

```bash
tools/security/check-no-private.sh            # gesamter getrackter Stand (wie pre-push)
tools/security/check-no-private.sh --staged   # nur gestagte Dateien (wie pre-commit)
```

Exit `0` = sauber. Exit `1` = STOP, etwas Privates entdeckt.

## Notfall-Bypass

Hooks lassen sich mit `--no-verify` umgehen — **nur bewusst und im Ausnahmefall**.
Tu das nicht, um Warnungen „wegzudrücken".
