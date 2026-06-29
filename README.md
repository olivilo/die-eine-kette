<p align="center">
  <img src="./brand/logo.svg" alt="Die Eine Kette" width="460">
</p>

<p align="center">
  <b>Deutsch</b> ·
  <a href="./README.en.md">English</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.it.md">Italiano</a> ·
  <a href="./README.hr.md">Hrvatski</a> ·
  <a href="./README.bs.md">Bosanski</a> ·
  <a href="./README.sl.md">Slovenščina</a> ·
  <a href="./README.sr.md">Српски</a> ·
  <a href="./README.mk.md">Македонски</a> ·
  <a href="./README.sq.md">Shqip</a> ·
  <a href="./README.zh.md">中文</a>
</p>

# ⛓️ Die Eine Kette (DieEineKette)

> ⚠️ **Öffentliche Alpha.** Dies ist **nur der kostenlose, öffentliche Teil** von Die Eine
> Kette und steckt **mitten in der Entwicklung** — er kann Fehler enthalten, unfertige
> Funktionen zeigen und sich jederzeit ändern. **Noch nicht für den Produktiveinsatz.**
> Rückmeldungen und Issues sind ausdrücklich willkommen.

> **Ein Tor, sie alle zu verbinden.**
> Ein mandantenfähiges (B2B) LLM-Gateway mit voller Mehrsprachigkeit, Kostenkontrolle
> über *eingekaufte* und *selbst gehostete* Tokens, sowie einem modernen UI.
>
> *Leitmotiv: eine Kette aus Ringen — jeder Ring ein Dienst, sein Name innen graviert.*

Die Eine Kette bündelt beliebig viele LLM-Anbieter (OpenAI, Anthropic, Gemini, Azure,
AWS Bedrock, Ollama, DeepSeek, Mistral, lokale Modelle …) hinter **einer** einzigen
OpenAI-kompatiblen `/v1`-Schnittstelle — und legt darüber eine B2B-Verwaltungsschicht
für mehrere Enterprises, Abteilungen, Nutzer und Budgets.

---

## ✨ Ziele

- **Mehrmandanten-B2B**: Mehrere Enterprises, je mit Abteilungen, Nutzern und Tokens.
- **Kostenkontrolle**: Budgets, Reset-Zyklen, Timer pro Enterprise / Gruppe / Nutzer.
- **Zwei Kostenquellen**: extern eingekaufte Tokens **und** selbst gehostete Modelle
  (Strom + Hardware-Amortisation + Wartung) in *einer* Abrechnung.
- **Volle Mehrsprachigkeit**: jede Nav, jeder Button, jede Funktion übersetzt —
  Übersetzungen lokal via **LM Studio** generiert (keine Cloud-Kosten).
- **Modernes UI**: eigene Marke, eigenes Logo, neues Design.
- **Ein Docker-Befehl**: `docker compose up` — fertig nutzbar für jeden.

## 🧱 Status

🚧 **Öffentliche Alpha.** Architektur, Kostenmodell und Sprach-Plan stehen; der Stack
läuft per `docker compose up` (App, PostgreSQL, Redis). Der Funktionsumfang wird laufend
ausgebaut — rechne mit Fehlern, Lücken und Änderungen.

## 🚀 Loslegen

```bash
cp .env.example .env       # Provider-Keys, LM-Studio-Token, Strompreis usw. setzen
tools/preflight-check.sh   # Ressourcen vor dem Build prüfen
docker compose up -d       # App :3000, PostgreSQL, Redis
```

> 💡 **LM Studio:** läuft die App im Container, ist `localhost` der *Container*, nicht dein
> Rechner. In `.env` daher `http://host.docker.internal:1234/v1` verwenden. Verlangt deine
> LM-Studio-Version einen API-Token, in LM Studio einen Token erzeugen und als
> `LMSTUDIO_API_KEY` eintragen (oder die Token-Pflicht in LM Studio deaktivieren).

## 📚 Dokumentation

| Dokument | Inhalt |
|---|---|
| [docs/01-architecture.md](./docs/01-architecture.md) | Tech-Stack, Schichten, Deployment (Überblick) |
| [docs/04-languages.md](./docs/04-languages.md) | Zielsprachen, i18n-Strategie, LM-Studio-Übersetzung |
| [docs/05-roadmap.md](./docs/05-roadmap.md) | Umsetzungs-Reihenfolge in Phasen |
| [docs/internal-notes.md](./docs/internal-notes.md) | Codex: Dienste als Ringe der Kette (Free/Enterprise) |
| [docs/licensing.md](./docs/licensing.md) | Lizenzmodell & Preise (öffentliche Fassung) |

> 🔒 **Detaillierte interne Doku** — Architektur-Internals, Mandanten-Schema,
> Kostenformeln, Lizenz-Durchsetzung, Provenienz/Fingerabdruck — liegt **nur im
> privaten lokalen Teil** (`../die-eine-kette-private/`), **nicht** in diesem
> öffentlichen Repo.

## 📐 Projekt-Konventionen

- **Keine KI-/Fremdautor-Nennung** in Code, Doku, Kommentaren, Commit-Trailern oder
  Metadaten. Anbieter (Anthropic, OpenAI, Gemini …) erscheinen nur als unterstützte
  LLM-Provider, nie als Urheber. Urheber ist allein *Die Eine Kette*.
- **Lizenz-Fingerabdruck** ab Tag 1 mitgedacht — Details im privaten Teil
  (`../die-eine-kette-private/`).

## 🛠️ Tools

- [`tools/translate/`](./tools/translate) — Übersetzt fehlende UI-Strings lokal über
  LM Studio (OpenAI-kompatibel). Platzhalter wie `{{name}}` bleiben erhalten.

---

## 🙏 Herkunft & Lizenz

Die Eine Kette basiert auf **[One API](https://github.com/songquanpeng/one-api)**
von JustSong (MIT-Lizenz) — insbesondere auf dessen bewährtem Relay-Motor mit
~45 Anbieter-Integrationen. Vielen Dank an das One-API-Projekt.

Diese Herkunft wird in allen sprachspezifischen READMEs genannt. Der ursprüngliche
MIT-Lizenztext bleibt unter [`backend/LICENSE`](./backend/LICENSE) erhalten — wie die
Lizenz es verlangt.

**Dual-Lizenz für Die-Eine-Kette-Eigencode** (UI, B2B, Kostenmodell):
**frei für private, studentische, akademische und nicht-kommerzielle Nutzung** —
**kommerzielle Nutzung erfordert eine kostenpflichtige Lizenz**.
Lizenzmodell & Preise (öffentlich): [docs/licensing.md](./docs/licensing.md).
Die technische Durchsetzung (Internals) liegt im privaten Teil.
