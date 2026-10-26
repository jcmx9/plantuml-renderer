#!/usr/bin/env bash
# Startet einen lokalen Python-Webserver im Installationsverzeichnis und öffnet den Renderer.
#
#   scripts/serve.sh            # Port 8000
#   PORT=8080 scripts/serve.sh  # anderer Port
#
# Der Server lauscht nur auf 127.0.0.1. Beenden mit Strg+C.
set -euo pipefail

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly app_dir
readonly port="${PORT:-8000}"
readonly url="http://localhost:${port}/plantuml-renderer.html"

open_browser() {
  sleep 1
  if command -v open >/dev/null 2>&1; then
    open "${url}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${url}" >/dev/null 2>&1
  fi
}

main() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Fehler: python3 ist nicht installiert." >&2
    exit 2
  fi

  echo "PlantUML Gantt Renderer: ${url}"
  echo "Beenden mit Strg+C."
  open_browser &
  exec python3 -m http.server "${port}" --bind 127.0.0.1 --directory "${app_dir}"
}

main "$@"
