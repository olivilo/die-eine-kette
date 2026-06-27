# tools/translate — Lokale i18n-Übersetzung via LM Studio

Übersetzt **nur fehlende** UI-Strings aus der englischen Basis in alle Zielsprachen.
Vorhandene (handgeprüfte) Übersetzungen bleiben unangetastet. Platzhalter wie
`{{name}}`, `{count}`, `%s` werden verbatim übernommen.

## Voraussetzungen

- LM Studio läuft mit geladenem Modell (empfohlen: `aya-expanse-8b-mlx` —
  passt in 16 GB; `gemma-4-12b` ist dafür zu groß).
- `.env` im Projekt-Root mit `LMSTUDIO_BASE_URL`, `LMSTUDIO_API_KEY`,
  optional `LMSTUDIO_MODEL`.
- Nur Python-Standardbibliothek nötig (keine Installation).

## Nutzung

```bash
# Wieviele Keys fehlen je Sprache? (schreibt nichts)
python tools/translate/lmstudio_translate.py --check --targets de,fr,es,it,sr,zh

# Fehlende Keys übersetzen
python tools/translate/lmstudio_translate.py --targets de,fr,es,it,sr,zh

# Bestimmtes Modell / anderer Locales-Pfad
LMSTUDIO_MODEL="google/gemma-4-12b" \
python tools/translate/lmstudio_translate.py \
  --locales-dir frontend/src/locales --targets fr,es
```

## Workflow-Regel

Neue UI-Texte **nur** in `en/translation.json` hinzufügen → Tool laufen lassen →
Stichprobe je Sprache von Muttersprachlern prüfen lassen (v. a. Balkansprachen).
