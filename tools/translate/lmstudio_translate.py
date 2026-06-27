#!/usr/bin/env python3
"""
lmstudio_translate.py — Übersetzt fehlende UI-Strings lokal über LM Studio.

Quelle der Wahrheit ist die englische Basis (en/translation.json). Für jede
Zielsprache werden NUR fehlende Keys ergänzt — vorhandene (z. B. handgeprüfte)
Übersetzungen werden nie überschrieben. Platzhalter wie {{name}}, {count} und
ICU-Blöcke bleiben unangetastet.

Konfiguration über Umgebung / .env:
  LMSTUDIO_BASE_URL   z. B. http://localhost:1234/v1
  LMSTUDIO_API_KEY    Bearer-Token aus LM Studio
  LMSTUDIO_MODEL      optional; leer = erstes geladenes Modell

Beispiele:
  python lmstudio_translate.py --check
  python lmstudio_translate.py --targets de,fr,es,it,sr
  python lmstudio_translate.py --locales-dir ../../frontend/src/locales --targets fr
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# ── .env laden (ohne externe Abhängigkeit) ───────────────────────────────────
def load_dotenv(start: Path) -> None:
    for base in [start, *start.parents]:
        env = base / ".env"
        if env.is_file():
            for line in env.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())
            return

# ── Sprachnamen für den Prompt ───────────────────────────────────────────────
LANG_NAMES = {
    "en": "English", "de": "German", "fr": "French", "es": "Spanish",
    "it": "Italian", "pt-BR": "Brazilian Portuguese", "nl": "Dutch",
    "pl": "Polish", "ru": "Russian", "tr": "Turkish", "sr": "Serbian",
    "hr": "Croatian", "bs": "Bosnian", "sl": "Slovenian", "mk": "Macedonian",
    "sq": "Albanian", "zh": "Chinese (Simplified)", "ja": "Japanese",
    "ko": "Korean", "ar": "Arabic",
}

# ── Flache <-> verschachtelte Dict-Umwandlung ────────────────────────────────
def flatten(d: dict, prefix: str = "") -> dict:
    out = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out

def unflatten(flat: dict) -> dict:
    root: dict = {}
    for key, val in flat.items():
        parts = key.split(".")
        node = root
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = val
    return root

def load_json(path: Path) -> dict:
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

# ── LM-Studio-Aufruf (OpenAI-kompatibel) ─────────────────────────────────────
def lm_chat(base_url: str, api_key: str, model: str, system: str, user: str) -> str:
    payload = json.dumps({
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return body["choices"][0]["message"]["content"]

def first_model(base_url: str, api_key: str) -> str:
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/models",
        headers={"Authorization": f"Bearer {api_key}"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["data"][0]["id"]

def extract_json(text: str) -> dict:
    """Robuste JSON-Extraktion (auch wenn das Modell ```json ... ``` drumherum setzt)."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError(f"Keine JSON-Antwort erkennbar:\n{text[:300]}")
    return json.loads(text[start:end + 1])

SYSTEM_PROMPT = (
    "You are a professional software-localization translator. "
    "Translate UI strings from English into {lang}. "
    "Rules: (1) Return ONLY a flat JSON object mapping each given key to its "
    "translation. (2) NEVER translate or alter placeholders like {{{{name}}}}, "
    "{{count}}, %s, or ICU blocks — copy them verbatim. (3) Keep it concise and "
    "natural for buttons, navigation and dialogs. (4) Do not add keys."
)

def chunks(items: list, n: int):
    for i in range(0, len(items), n):
        yield items[i:i + n]

def main() -> int:
    here = Path(__file__).resolve().parent
    load_dotenv(here)

    ap = argparse.ArgumentParser(description="Lokale i18n-Übersetzung via LM Studio")
    ap.add_argument("--locales-dir", default=os.environ.get(
        "LOCALES_DIR", str(here.parent.parent / "frontend" / "src" / "locales")))
    ap.add_argument("--source", default="en", help="Basis-Sprache (Default: en)")
    ap.add_argument("--targets", default="de,fr,es,it,sr,zh",
                    help="Komma-Liste der Zielsprachen")
    ap.add_argument("--batch", type=int, default=40, help="Keys pro LM-Aufruf")
    ap.add_argument("--check", action="store_true",
                    help="Nur fehlende Keys zählen, nichts schreiben")
    args = ap.parse_args()

    base_url = os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    api_key = os.environ.get("LMSTUDIO_API_KEY", "")
    model = os.environ.get("LMSTUDIO_MODEL", "").strip()

    locales = Path(args.locales_dir)
    src_path = locales / args.source / "translation.json"
    src = flatten(load_json(src_path))
    if not src:
        print(f"❌ Basis-Datei fehlt oder leer: {src_path}")
        return 1
    print(f"📖 Basis {args.source}: {len(src)} Keys  ({src_path})")

    if not args.check and not model:
        try:
            model = first_model(base_url, api_key)
            print(f"🤖 Modell automatisch gewählt: {model}")
        except Exception as e:
            print(f"❌ Konnte Modell nicht ermitteln: {e}")
            return 1

    exit_code = 0
    for lang in [t.strip() for t in args.targets.split(",") if t.strip()]:
        tgt_path = locales / lang / "translation.json"
        tgt = flatten(load_json(tgt_path))
        missing = {k: v for k, v in src.items() if k not in tgt and isinstance(v, str)}
        print(f"\n🌍 {lang}: {len(missing)} fehlende Keys")
        if args.check:
            if missing:
                exit_code = 2
            continue
        if not missing:
            continue

        lang_name = LANG_NAMES.get(lang, lang)
        system = SYSTEM_PROMPT.format(lang=lang_name)
        translated = 0
        for batch in chunks(list(missing.items()), args.batch):
            payload = {k: v for k, v in batch}
            user = ("Translate the values of this JSON into " + lang_name +
                    ". Return the same keys with translated values as flat JSON:\n"
                    + json.dumps(payload, ensure_ascii=False, indent=2))
            try:
                out = extract_json(lm_chat(base_url, api_key, model, system, user))
            except Exception as e:
                print(f"   ⚠️  Batch fehlgeschlagen ({len(payload)} Keys): {e}")
                exit_code = 1
                continue
            for k in payload:
                if k in out and isinstance(out[k], str):
                    tgt[k] = out[k]
                    translated += 1
            print(f"   …{translated}/{len(missing)}")

        write_json(tgt_path, unflatten(tgt))
        print(f"   ✅ geschrieben: {tgt_path}")

    return exit_code

if __name__ == "__main__":
    sys.exit(main())
