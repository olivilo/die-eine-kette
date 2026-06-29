# 04 · Sprachen & i18n-Strategie

## Quelle der Wahrheit

**Englisch (`en`)** ist die Basis-Sprache. Jeder UI-String ist ein Key in
`en/translation.json`. Alle anderen Sprachen werden daraus generiert/gepflegt.
Kein hartkodierter Text in Navs, Buttons, Tabellen oder Dialogen — Regel im Code-Review.

## Schon vorhanden

`de` · `en` · `sr` · `zh`

## Empfohlene Zielsprachen (gestaffelt)

Für ein europäisch ausgerichtetes B2B-Produkt mit Balkan-Wurzeln:

| Tier | Sprachen | Begründung |
|---|---|---|
| **1 – Launch** | de, en, fr, es, it | Kern-Geschäftssprachen EU; größte Enterprise-Reichweite |
| **2 – Ausbau** | pt-BR, nl, pl, ru, tr | Große Märkte; ru/tr ergänzen Balkan-Region |
| **3 – Balkan (fast gratis dank `sr`)** | hr, bs, sl, mk, sq | Sehr nah an Serbisch → schnelle LM-Studio-Wins |
| **4 – Global/Enterprise** | zh, ja, ko, ar | Asien-Konzerne; **ar = RTL** (Layout muss RTL können) |

**Empfehlung Start:** Tier 1 + bereits vorhandene = `de, en, fr, es, it, sr, zh`.
Tier 3 (Balkan) lohnt sich früh, weil die Übersetzung aus `sr` lokal kaum Aufwand ist.

> ⚠️ **RTL**: Sobald `ar` (oder `he`) dazukommt, muss das UI-Layout `dir="rtl"`
> unterstützen. Tailwind + shadcn/ui können das — früh einplanen, später teuer.

## Übersetzungs-Workflow (lokal, kostenlos)

1. Entwickler fügt neue Keys nur in **`en/translation.json`** hinzu.
2. `tools/translate/lmstudio_translate.py` findet **fehlende** Keys je Zielsprache
   und übersetzt sie über **LM Studio** (lokal, OpenAI-kompatibel).
3. Platzhalter (`{{name}}`, `{count}`) und ICU-Formate bleiben unangetastet.
4. `tools/translate` schreibt nur fehlende Keys — bestehende Übersetzungen
   (z. B. handgeprüfte) werden **nicht** überschrieben.

### Empfohlene lokale Modelle (LM Studio)

Faustregel: lokales Übersetzungsmodell passend zum verfügbaren RAM wählen
(z. B. ~16 GB RAM → Modelle bis ~9 GB).

| Modell (LM-Studio-ID) | RAM (ca.) | Stärke |
|---|---|---|
| **`aya-expanse-8b-mlx`** ⭐ | ~5 GB | speziell mehrsprachig/Übersetzung — **Standard** |
| `qwen2.5-7b-instruct-uncensored` | ~5 GB | stark EU-Sprachen + Zh, gutes JSON |
| `mlx-community/gemma-4-e4b-it` | ~4 GB | leichtgewichtig, solide EU-Sprachen |
| `qwen/qwen3-8b` | ~6 GB | guter Allrounder |

**Empfehlung:** `aya-expanse-8b-mlx` (per `LMSTUDIO_MODEL` in `.env` wählbar). Cohere Aya Expanse ist auf
Übersetzung über 23 Sprachen trainiert (inkl. de, fr, es, it) und liefert für
Balkansprachen (hr/bs/sl/mk/sq) aus `sr` die saubersten Ergebnisse. Kurze Stichprobe
je Sprache von Muttersprachlern prüfen lassen.
