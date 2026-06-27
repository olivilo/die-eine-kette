#!/usr/bin/env bash
#
# preflight-check.sh — Ressourcen-Gate VOR schweren Builds (Docker-Image-Build).
# Bricht sauber ab, statt den Rechner durch zu wenig Speicher/RAM zu erdrücken.
#
# Verwendung:
#   tools/preflight-check.sh           # prüfen + Empfehlung
#   tools/preflight-check.sh --strict  # bei Warnung ebenfalls mit Fehler beenden
#
# Schwellen (anpassbar via ENV): DISK_MIN_GB, DISK_WARN_GB, RAM_WARN_GB
#
set -euo pipefail

DISK_MIN_GB="${DISK_MIN_GB:-8}"     # darunter: harter Abbruch
DISK_WARN_GB="${DISK_WARN_GB:-15}"  # darunter: Warnung
RAM_WARN_GB="${RAM_WARN_GB:-3}"     # darunter verfügbar: Warnung
STRICT=0; [[ "${1:-}" == "--strict" ]] && STRICT=1

WARN=0; FAIL=0
echo "── Preflight: Ressourcen-Check vor Build ──────────────────────────"

# Hilfsfunktion: freie GB auf dem Volume, das einen Pfad enthält
free_gb() { df -g "$1" 2>/dev/null | awk 'NR==2{print $4}'; }

# 1a) Projekt-Volume (Repo) — relevant für nativen Build & Bind-Mount-Daten
REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
REPO_FREE_GB="$(free_gb "$REPO_DIR")"
printf "Projekt-Volume:  %s GB frei  (%s)\n" "${REPO_FREE_GB:-?}" "$REPO_DIR"

# 1b) Docker-Speicher (Image/Build-Cache) — der eigentliche Engpass beim Image-Build.
# Docker.raw kann verschoben sein; wir prüfen schnelle Kandidatenpfade (set -e-sicher).
DOCKER_RAW=""
for cand in \
  /Volumes/*/Docker/DockerDesktop/Docker.raw \
  /Volumes/*/DockerDesktop/Docker.raw \
  /Volumes/*/Docker.raw \
  "$HOME/Library/Containers/com.docker.docker/Data/vms/0/data/Docker.raw"; do
  if [[ -f "$cand" ]]; then DOCKER_RAW="$cand"; break; fi
done
if [[ -n "${DOCKER_RAW:-}" ]]; then
  DOCKER_FREE_GB="$(free_gb "$(dirname "$DOCKER_RAW")")"
  printf "Docker-Speicher: %s GB frei  (%s)\n" "${DOCKER_FREE_GB:-?}" "$DOCKER_RAW"
  DISK_FREE_GB="$DOCKER_FREE_GB"      # Image-Build wird gegen DIESES Volume geprüft
else
  printf "Docker-Speicher: Ort unbekannt — prüfe interne Platte als Fallback\n"
  DISK_FREE_GB="$(free_gb /)"
fi

if [[ -n "${DISK_FREE_GB:-}" ]]; then
  if (( DISK_FREE_GB < DISK_MIN_GB )); then
    echo "  ✗ Zu wenig Platz für einen Image-Build (Docker-Volume)."; FAIL=1
  elif (( DISK_FREE_GB < DISK_WARN_GB )); then
    echo "  ⚠ Knapp — Image-Build könnte scheitern. Vorher aufräumen empfohlen."; WARN=1
  fi
fi

# 2) Verfügbarer RAM (free + inactive + speculative)
RAM_AVAIL_GB=$(vm_stat | awk '
  /page size of/{ps=$8}
  /Pages free/{gsub(/\./,"",$3); f=$3}
  /Pages inactive/{gsub(/\./,"",$3); i=$3}
  /Pages speculative/{gsub(/\./,"",$3); s=$3}
  END{ printf "%.1f", (f+i+s)*ps/1024/1024/1024 }')
printf "RAM verfügbar:   %s GB  (Warnung <%s)\n" "$RAM_AVAIL_GB" "$RAM_WARN_GB"
awk -v a="$RAM_AVAIL_GB" -v w="$RAM_WARN_GB" 'BEGIN{exit !(a<w)}' && { echo "  ⚠ Wenig freier RAM."; WARN=1; }

# 3) Swap-Puffer
SWAP=$(sysctl -n vm.swapusage 2>/dev/null | sed -E 's/.*total = ([0-9.]+M).*/\1/')
printf "Swap gesamt:     %s\n" "${SWAP:-?}"
if [[ "${SWAP:-0.00M}" == "0.00M" ]]; then
  echo "  ⚠ Kein Swap — bei RAM-Druck kein Puffer (OOM-Risiko)."; WARN=1
fi

# 4) Docker erreichbar? + zugeteilter RAM
if docker info >/dev/null 2>&1; then
  DOCKER_RAM=$(docker info --format '{{.MemTotal}}' 2>/dev/null \
    | awk '{printf "%.1f", $1/1024/1024/1024}')
  printf "Docker:          erreichbar ✓  (%s GB RAM zugeteilt)\n" "${DOCKER_RAM:-?}"
  awk -v r="${DOCKER_RAM:-0}" 'BEGIN{exit !(r<4)}' \
    && { echo "  ⚠ Docker hat <4 GB RAM — npm/Go-Build könnte eng werden."; WARN=1; }
else
  echo "Docker:          NICHT erreichbar — Docker Desktop starten."
  echo "  (Für einen Image-Build zwingend nötig.)"; WARN=1
fi

echo "───────────────────────────────────────────────────────────────────"
if (( FAIL == 1 )); then
  echo "⛔ ABBRUCH: Ressourcen reichen nicht. Platz schaffen, dann erneut."
  echo "   Tipps: 'docker system prune -a', große Caches/Downloads löschen."
  exit 1
fi
if (( WARN == 1 )); then
  echo "⚠ Mit Warnungen. Empfehlung: leichter Weg statt vollem Image-Build —"
  echo "   Go-Binary nativ bauen + nur Postgres/Redis als (kleine) Container."
  (( STRICT == 1 )) && { echo "   (--strict aktiv → Abbruch)"; exit 1; }
  exit 0
fi
echo "✓ Genug Ressourcen für einen Image-Build."
exit 0
