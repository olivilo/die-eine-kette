<p align="center">
  <img src="./brand/logo.svg" alt="Die Eine Kette" width="460">
</p>

<p align="center">
  <a href="./README.md">Deutsch</a> ·
  <a href="./README.en.md">English</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.it.md">Italiano</a> ·
  <b>Српски</b> ·
  <a href="./README.zh.md">中文</a>
</p>

# ⛓️ Die Eine Kette (DieEineKette)

> **Једна капија да их све повеже.**
> Вишекорисничка (B2B) LLM капија, потпуно вишејезична, са контролом трошкова над
> *купљеним* и *самостално хостованим* токенима, и модерним интерфејсом.

Die Eine Kette обједињује произвољан број LLM провајдера (OpenAI, Anthropic, Gemini,
Azure, AWS Bedrock, Ollama, DeepSeek, Mistral, локални модели …) иза **једног**
OpenAI-компатибилног `/v1` интерфејса, са B2B слојем за управљање изнад (предузећа,
одељења, корисници, буџети).

> 🚧 Фаза темеља — види [`docs/`](./docs). Покретање: `docker compose up`.

---

## 🙏 Порекло и лиценца

Die Eine Kette се заснива на пројекту **[One API](https://github.com/songquanpeng/one-api)**
аутора JustSong (MIT лиценца) — посебно на његовом провереном relay механизму са ~45
интеграција провајдера. Хвала пројекту One API. Оригинални текст MIT лиценце сачуван је у
[`backend/LICENSE`](./backend/LICENSE).

**Двострука лиценца за сопствени код пројекта Die Eine Kette**: **бесплатно за приватну,
студентску, академску и некомерцијалну употребу** — **комерцијална употреба захтева плаћену
лиценцу**. Види [docs/licensing.md](./docs/licensing.md).
