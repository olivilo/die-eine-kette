# 01 · Architektur

## Leitprinzip: „Frischer Mantel, bewährter Motor"

Den schwierigsten und wertvollsten Teil von One API — den **Relay-Motor** mit ~45
Provider-Adaptern (Request/Response-Transformation, Streaming, Token-Zählung,
Preis-Ratios) — schreiben wir **nicht** neu. Wir bauen die *neuen* Werte darüber:
modernes UI, volle i18n, B2B-Mandanten und das doppelte Kostenmodell.

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND  (komplett neu)                                     │
│  Next.js + TypeScript + Tailwind + shadcn/ui                  │
│  i18n ab Zeile 1 (react-i18next) · eigene Marke/Logo          │
└───────────────┬─────────────────────────────────────────────┘
                │ REST/JSON
┌───────────────┴─────────────────────────────────────────────┐
│  B2B-SCHICHT  (komplett neu, Go)                              │
│  Organizations · Budgets · Reset/Timer · Cost-Ledger          │
│  Provider-Presets · Self-Hosted-Cost-Profile                  │
└───────────────┬─────────────────────────────────────────────┘
                │ intern
┌───────────────┴─────────────────────────────────────────────┐
│  RELAY-MOTOR  (wiederverwendet aus One API, Go)               │
│  45 Adapter · Streaming · Token-Zählung · Billing-Ratios      │
│  User/Token/Group/Quota/Log-Modelle                           │
└───────────────┬─────────────────────────────────────────────┘
                │
   ┌────────────┴───────────┐
   │ PostgreSQL   │  Redis    │   (Mandantendaten · Cache/Limits/Timer)
   └────────────────────────┘
```

## Tech-Stack

| Schicht | Wahl | Warum |
|---|---|---|
| Frontend | **Next.js 15 + React 19 + TypeScript** | Modern, schnelles UI, top i18n-Ökosystem |
| UI-Kit | **Tailwind + shadcn/ui** (Alt.: Mantine) | Hübsch out-of-the-box, voll themebar (eigene Marke) |
| i18n | **react-i18next** | Bewährt; passt zu vorhandenen `translation.json`-Keys |
| Backend | **Go** (One-API-Motor + neue Module) | Relay-Motor wiederverwenden, ein Binary |
| DB | **PostgreSQL** | Mehrmandanten-tauglich (Default-SQLite nur für Demo) |
| Cache/Timer | **Redis** | Rate-Limits, Budget-Reset-Timer, Session |
| Deployment | **docker compose** | `docker compose up` → App + Postgres + Redis |

## Frontend-Anforderungen

- **Responsive & Mobile-First:** funktioniert sauber auf **Web, Tablet und Mobil** —
  flüssige Breakpoints, Touch-taugliche Bedienung, keine horizontalen Scrolls.
- **Schnell im Laden:** SSR/Streaming (Next.js), Code-Splitting, Lazy-Loading,
  optimierte Bilder/Assets, kleine Bundles, HTTP-Caching. Ziel: Lighthouse ≥ 90,
  LCP < 2,5 s, interaktiv < 3 s auf Mittelklasse-Mobilgeräten.
- **Zugänglich:** Tastatur/Screenreader, ausreichende Kontraste; RTL-fähig
  (für ar/he später).

## Auth & Sicherheit

- **Login-Optionen:** E-Mail/Passwort & OAuth — plus **2FA per Authenticator-App
  (TOTP, RFC 6238)** als aktivierbare Option für jeden Nutzer (QR-Setup im UI +
  Backup-Codes). *Free verfügbar — Sicherheit für alle.*
- **Enterprise:** SSO/SAML & erweiterte Sicherheit (über die kommerzielle Lizenz).

## Warum nicht „alles neu in anderem Stack"?

- Die 45 Provider-Adapter neu zu bauen = Monate Arbeit + neue Bugs.
- One API hat Streaming, Token-Zählung und Preis-Ratios bereits gelöst.
- Unser Mehrwert liegt in **UI + i18n + B2B + Kosten** — dort bauen wir 100 % neu.

> Wenn später ein vollständiger Backend-Rewrite (z. B. NestJS/TypeScript) gewünscht
> ist, lässt sich der Relay-Motor weiterhin als isolierter Service hinter der
> B2B-Schicht betreiben — die Architektur erzwingt keine Sprachwahl im Frontend.

## Deployment-Ziel

```bash
git clone https://github.com/<dein-user>/die-eine-kette
cp .env.example .env      # Provider-Keys, LM-Studio-Token, Strompreis etc.
docker compose up -d      # App :3000, Postgres, Redis
```

Ein veröffentlichtes Image (`ghcr.io/<dein-user>/die-eine-kette`) macht es für jeden
ohne Build nutzbar.
