# Marke — Die Eine Kette

Ring-Ketten-Motiv: ineinandergreifende Ringe als **eine Kette** — Symbol für „ein Tor,
sie alle zu verbinden".

## Dateien

| Datei | Verwendung |
|---|---|
| [`logo.svg`](./logo.svg) | Hauptlogo (Wortmarke + Mark), horizontal — README, Header |
| [`mark.svg`](./mark.svg) | Bildmarke (drei Einheits-Ringe) — Favicon, App-Icon, kleine Flächen |

SVG ist die Quelle (skalierbar, scharf in Light/Dark). PNG/ICO bei Bedarf daraus rendern:

```bash
rsvg-convert -b none brand/mark.svg -w 256 -o favicon-256.png
```

## Farben

| Rolle | Wert |
|---|---|
| Gold hell | `#F3DC93` |
| Gold | `#D4AF37` |
| Gold dunkel | `#9C6F1B` |
| Akzent (Leitspruch) | `#B98F3A` |

## Typografie

Wortmarke in einer Serifenschrift (Georgia/Trajan-Fallback) für „gravierte",
monumentale Anmutung; Versalien mit weitem Zeichenabstand.
