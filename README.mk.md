<p align="center">
  <img src="./brand/logo.svg" alt="Die Eine Kette" width="460">
</p>

<p align="center">
  <a href="./README.md">Deutsch</a> ·
  <a href="./README.en.md">English</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.it.md">Italiano</a> ·
  <a href="./README.hr.md">Hrvatski</a> ·
  <a href="./README.bs.md">Bosanski</a> ·
  <a href="./README.sl.md">Slovenščina</a> ·
  <a href="./README.sr.md">Српски</a> ·
  <b>Македонски</b> ·
  <a href="./README.sq.md">Shqip</a> ·
  <a href="./README.zh.md">中文</a>
</p>

# ⛓️ Die Eine Kette (DieEineKette)

> ⚠️ **Јавна алфа.** Ова е **само бесплатниот, јавен дел** на Die Eine Kette и е **во активен
> развој** — очекувајте грешки, недовршени функции и промени. **Сè уште не е подготвено за
> продукција.** Повратните информации и пријавите се добредојдени.

> **Една порта за да ги поврзе сите.**
> Повеќекорисничка (B2B) LLM-порта, целосно повеќејазична, со контрола на трошоците врз
> *купени* и *самостојно хостирани* токени, и модерен интерфејс.

Die Eine Kette обединува произволен број на LLM-провајдери (OpenAI, Anthropic, Gemini,
Azure, AWS Bedrock, Ollama, DeepSeek, Mistral, локални модели …) зад **еден**
OpenAI-компатибилен `/v1` интерфејс, со B2B слој за управување одозгора (претпријатија,
оддели, корисници, буџети).

> 🚧 Јавна алфа — види [`docs/`](./docs). Стартување: `docker compose up`.

---

## 🙏 Потекло и лиценца

Die Eine Kette се заснива на проектот **[One API](https://github.com/songquanpeng/one-api)**
од JustSong (MIT лиценца) — особено на неговиот проверен relay-механизам со ~45
интеграции на провајдери. Благодарност до проектот One API. Оригиналниот текст на MIT
лиценцата е зачуван во [`backend/LICENSE`](./backend/LICENSE).

**Двојна лиценца за сопствениот код на Die Eine Kette**: **бесплатно за приватна,
студентска, академска и некомерцијална употреба** — **комерцијалната употреба бара платена
лиценца**. Види [docs/licensing.md](./docs/licensing.md).
