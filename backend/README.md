# backend/ — Relay-Motor von „Die Eine Kette"

Dieser Ordner enthält den **Relay-Motor**: das OpenAI-kompatible `/v1`-Gateway über
~39 LLM-Provider, inkl. Streaming, Token-Zählung und Preis-Ratios, plus die
Basis-Datenmodelle (User, Token, Channel, Quota, Log).

## Herkunft

Der Motor basiert auf **[One API](https://github.com/songquanpeng/one-api)** (MIT).
Der ursprüngliche Lizenztext bleibt in [`LICENSE`](./LICENSE) erhalten. Die darüber
liegenden Werte (B2B-Mandanten, Budgets, doppeltes Kostenmodell, neues Frontend, i18n)
sind Eigencode von „Die Eine Kette" und entstehen in den Phasen 2–6.

## Bauen & Starten

Nicht direkt hier bauen — der Gesamt-Stack läuft über das Compose-File im Repo-Root:

```bash
cp ../.env.example ../.env     # Werte anpassen (SESSION_SECRET, Postgres-Passwort …)
docker compose up -d --build   # App :3000 + PostgreSQL + Redis
```

Lokaler Go-Build (nur Motor, ohne Container) zum Entwickeln:

```bash
mkdir -p web/build && echo '<!doctype html>' > web/build/index.html  # Embed-Platzhalter
go build -o die-eine-kette .
```

## Konfiguration

Der Motor liest klassische ENV-Variablen (`SQL_DSN`, `REDIS_CONN_STRING`,
`SESSION_SECRET`, `PORT`, `TZ`). `docker-compose.yml` im Root setzt sie aus `.env`.
`SQL_DSN` mit `postgres://…` aktiviert PostgreSQL (statt Default-SQLite).

## Geplante Umbauten (Roadmap)

- Phase 1: PostgreSQL als Default, Branding (Binary/Image `die-eine-kette`).
- Phase 3+: `organizations`/`org_id`-Isolation, Rollen, Budgets, Cost-Ledger —
  als neue Module *neben* dem Motor, nicht im Motor.
- Modulpfad-Rebranding (`github.com/songquanpeng/one-api` → eigener Pfad) als
  bewusster, getesteter Schritt.
