#!/usr/bin/env bash
#
# check-no-private.sh — Schutzwall gegen das versehentliche Veröffentlichen
# privater/geheimer Inhalte aus „Die Eine Kette".
#
# Verwendung:
#   tools/security/check-no-private.sh            # prüft ALLE getrackten Dateien (für pre-push)
#   tools/security/check-no-private.sh --staged   # prüft nur gestagte Dateien (für pre-commit)
#
# Exit 0 = sauber (nur Öffentliches). Exit 1 = STOP, etwas Privates entdeckt.
#
set -euo pipefail

MODE="${1:-tracked}"

# ── Welche Dateien betrachten? ───────────────────────────────────────────────
# Hinweis: kein `mapfile` — macOS liefert nur Bash 3.2. Diese while-read-Schleife
# ist portabel (Bash 3.2+) und verträgt Leerzeichen in Pfaden.
FILES=()
if [[ "$MODE" == "--staged" ]]; then
  # Nur neu hinzukommende/geänderte, gestagte Dateien (Added/Copied/Modified/Renamed)
  while IFS= read -r line; do FILES+=("$line"); done \
    < <(git diff --cached --name-only --diff-filter=ACMR)
  CONTEXT="gestagte Dateien (pre-commit)"
else
  while IFS= read -r line; do FILES+=("$line"); done < <(git ls-files)
  CONTEXT="getrackte Dateien (pre-push)"
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "✓ check-no-private: keine $CONTEXT zu prüfen."
  exit 0
fi

# ── Verbotene PFADE (ERE; case-insensitiv via grep -iE — portabel auf macOS) ──
# .env.example ist ausdrücklich erlaubt (Allowlist unten); echte .env / .env.* nicht.
PATH_PATTERNS=(
  '(^|/)die-eine-kette-private/'
  '(^|/)secrets/'
  '(^|/)\.env$'
  '(^|/)\.env\.'              # .env.local, .env.prod … (.env.example wird vorab erlaubt)
  '\.key$'
  '\.pem$'
  '\.license$'
  '(^|/)license\.key$'
  '(^|/)PROVENANCE-private'
)

# ── Verbotene INHALTE (Datei-Inhalt; ERE) ────────────────────────────────────
CONTENT_PATTERNS=(
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'   # PEM-Privatschlüssel
  'sk-lm-[A-Za-z0-9]{8,}'                # echter LM-Studio-Key (nicht der xxxx-Platzhalter)
)

VIOLATIONS=0

for f in "${FILES[@]}"; do
  # .env.example ist die ausdrücklich erlaubte Vorlage (nur Platzhalter) → überspringen
  case "$(basename "$f")" in
    .env.example) continue ;;
  esac

  # 1) Pfad-Prüfung
  for pat in "${PATH_PATTERNS[@]}"; do
    if printf '%s\n' "$f" | grep -qiE "$pat"; then
      echo "✗ VERBOTENER PFAD: $f   (Muster: $pat)"
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done

  # 2) Inhalts-Prüfung (nur existierende, nicht-binäre Dateien)
  if [[ -f "$f" ]] && grep -Iq . "$f" 2>/dev/null; then
    for cpat in "${CONTENT_PATTERNS[@]}"; do
      if grep -qE "$cpat" "$f" 2>/dev/null; then
        echo "✗ VERBOTENER INHALT in $f   (Muster: $cpat)"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    done
  fi
done

if [[ $VIOLATIONS -gt 0 ]]; then
  echo ""
  echo "⛔ STOP: $VIOLATIONS Verstoß/Verstöße in $CONTEXT."
  echo "   Es darf NUR Öffentliches ins Repo. Privates gehört nach ../die-eine-kette-private/."
  echo "   Entferne die Datei(en) aus dem Index:  git rm --cached <datei>"
  echo "   (Notfall-Bypass nur bewusst:  git ... --no-verify)"
  exit 1
fi

echo "✓ check-no-private: $CONTEXT sauber — nur Öffentliches."
exit 0
