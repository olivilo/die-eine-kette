# Beitragen zu Die Eine Kette

Danke für dein Interesse! Dieses Projekt ist in **öffentlicher Alpha** — Feedback,
Bug-Reports und PRs sind willkommen, Schnittstellen können sich noch ändern.

*English: this project is in public alpha. Contributions welcome; APIs may change.
The notes below are in German, but issues/PRs in English are fine.*

## Erste Schritte

- Setup & Start stehen im [README](./README.md) (Backend via Docker Compose,
  Frontend separat mit `npm run dev`).
- Öffne für größere Änderungen bitte zuerst ein Issue, damit wir die Richtung klären,
  bevor Aufwand entsteht.

## Bugs & Feature-Wünsche

Nutze bitte die Vorlagen unter **Issues → New issue**
([Bug](./.github/ISSUE_TEMPLATE/bug_report.yml) /
[Feature](./.github/ISSUE_TEMPLATE/feature_request.yml)). Für Sicherheitsprobleme
siehe [SECURITY.md](./SECURITY.md) bzw. melde sie privat über GitHub
(Security → Report a vulnerability), **nicht** als öffentliches Issue.

## Pull Requests

1. Branch von `main` erstellen (nicht direkt auf `main`).
2. Fokussiert halten — eine Sache pro PR.
3. Die [PR-Vorlage](./.github/pull_request_template.md) ausfüllen.
4. Vor dem Push lokal prüfen:
   - Backend: `go vet ./...` bzw. die betroffenen Pakete; ggf. `go test ./model/...`.
   - Frontend: `npx tsc --noEmit` (im `frontend/`-Verzeichnis).

## Keine Geheimnisse commiten

Ein **Push-Guard** (`tools/security/check-no-private.sh`, als pre-commit- und
pre-push-Hook) blockt versehentliche Secrets. `.env`, Schlüssel, Zertifikate und der
private Projektteil gehören **nicht** ins Repo. Lege echte Werte nur lokal an
(`.env.example` als Vorlage).

## Stil

- Kommentare dürfen deutsch oder englisch sein; bleib beim Stil der umliegenden Datei.
- User-sichtbare Texte laufen über i18n (Frontend `src/i18n/locales`, Backend
  `common/i18n`) — bitte keine neuen hartkodierten, nicht-lokalisierten Strings.

Danke fürs Mitmachen! 🔗
