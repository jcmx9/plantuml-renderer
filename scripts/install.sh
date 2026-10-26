#!/usr/bin/env bash
# Bootstrap-Installation bzw. -Update des PlantUML Gantt Renderers.
#
#   curl -fsSL https://raw.githubusercontent.com/jcmx9/plantuml-renderer/main/scripts/install.sh | bash
#
# Zielverzeichnis: $PLANTUML_RENDERER_DIR (Default: ~/.local/share/plantuml-renderer).
# Erneuter Aufruf aktualisiert eine bestehende Installation per git pull.
set -euo pipefail

readonly repo_url="https://github.com/jcmx9/plantuml-renderer.git"
readonly install_dir="${PLANTUML_RENDERER_DIR:-${HOME}/.local/share/plantuml-renderer}"

# Alles in main(), damit ein abgebrochener curl-Download kein halbes Skript ausführt.
main() {
  if ! command -v git >/dev/null 2>&1; then
    echo "Fehler: git ist nicht installiert." >&2
    exit 2
  fi

  if [ -d "${install_dir}/.git" ]; then
    echo "Aktualisiere ${install_dir} …"
    git -C "${install_dir}" pull --ff-only
  elif [ -d "${install_dir}" ] && [ -n "$(ls -A "${install_dir}")" ]; then
    echo "Fehler: ${install_dir} existiert, ist aber kein Git-Checkout." >&2
    exit 3
  else
    echo "Installiere nach ${install_dir} …"
    mkdir -p "$(dirname "${install_dir}")"
    git clone --depth 1 "${repo_url}" "${install_dir}"
  fi

  echo "Version: v$(cat "${install_dir}/VERSION")"
  echo "Starten: ${install_dir}/scripts/serve.sh"
}

main "$@"
