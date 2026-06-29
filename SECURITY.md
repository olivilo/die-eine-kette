# Security Policy / Sicherheitsrichtlinie

## Status
**Public alpha — work in progress.** Do not use in production yet. Treat all data as throwaway.
**Öffentliche Alpha — in Arbeit.** Noch nicht für den Produktiveinsatz. Daten als Wegwerf behandeln.

## Reporting a vulnerability / Schwachstelle melden
Please report privately — **do not open a public issue**:
Bitte privat melden — **kein öffentliches Issue**:

➡️ https://github.com/olivilo/die-eine-kette/security/advisories/new

## Secrets / Geheimnisse
- Never commit `.env`, API keys, tokens or license keys. The repo's `.gitignore`
  excludes them and `tools/security/check-no-private.sh` runs as a pre-commit and
  pre-push guard.
- Niemals `.env`, API-Keys, Tokens oder Lizenzschlüssel committen.
- License signing keys and other sensitive material live **outside** this public repo.
  Lizenz-Signaturschlüssel und sensibles Material liegen **außerhalb** dieses Repos.
