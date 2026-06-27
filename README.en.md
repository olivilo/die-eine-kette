<p align="center">
  <img src="./brand/logo.svg" alt="Die Eine Kette" width="460">
</p>

<p align="center">
  <a href="./README.md">Deutsch</a> ·
  <b>English</b> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.it.md">Italiano</a> ·
  <a href="./README.sr.md">Српски</a> ·
  <a href="./README.zh.md">中文</a>
</p>

# ⛓️ Die Eine Kette (DieEineKette)

> **One gateway to connect them all.**
> A multi-tenant (B2B) LLM gateway with full multilingual support, cost control over
> *purchased* and *self-hosted* tokens, and a modern UI.
>
> *Leitmotif: a chain of rings — each ring a service, its name engraved within.*

Die Eine Kette bundles any number of LLM providers (OpenAI, Anthropic, Gemini, Azure,
AWS Bedrock, Ollama, DeepSeek, Mistral, local models …) behind **one** OpenAI-compatible
`/v1` interface — and layers a B2B management plane on top for multiple enterprises,
departments, users and budgets.

---

## ✨ Goals

- **Multi-tenant B2B**: multiple enterprises, each with departments, users and tokens.
- **Cost control**: budgets, reset cycles, timers per enterprise / group / user.
- **Two cost sources**: externally *purchased* tokens **and** *self-hosted* models
  (electricity + hardware amortization + maintenance) in *one* bill.
- **Full multilingual support**: every nav, button and feature translated —
  translations generated locally via **LM Studio** (no cloud cost).
- **Modern UI**: own brand, own logo, fresh design.
- **One Docker command**: `docker compose up` — ready to use.

## 🧱 Status

🚧 **Foundation phase.** Architecture, cost model and language plan are in place
(see [`docs/`](./docs)). Application code follows after the tech decisions are confirmed.

## 🚀 Run it

```bash
cp .env.example .env       # set provider keys, LM Studio token, electricity price, etc.
tools/preflight-check.sh   # check resources before building
docker compose up -d       # app :3000, PostgreSQL, Redis
```

## 📐 Project conventions

- **No AI / third-party authorship** anywhere in code, docs, comments, commit trailers
  or metadata. Providers (Anthropic, OpenAI, Gemini …) appear only as supported LLM
  providers, never as authors. The sole author is *Die Eine Kette*.
- **License fingerprint** considered from day one (details kept in the private part).

---

## 🙏 Origin & License

Die Eine Kette is based on **[One API](https://github.com/songquanpeng/one-api)** by
JustSong (MIT license) — in particular its proven relay engine with ~45 provider
integrations. Many thanks to the One API project.

This origin is stated in all language-specific READMEs. The original MIT license text is
preserved under [`backend/LICENSE`](./backend/LICENSE), as the license requires.

**Dual license for Die-Eine-Kette original code** (UI, B2B, cost model):
**free for private, student, academic and non-commercial use** — **commercial use
requires a paid license**. License model & pricing (public): [docs/licensing.md](./docs/licensing.md).
