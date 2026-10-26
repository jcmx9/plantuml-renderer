#!/usr/bin/env bash
# Prüft Versions- und README-Konsistenz (lokal und in der CI).
#
#   scripts/check-consistency.sh
#
# Exit 0 = konsistent, Exit 1 = Abweichung gefunden.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly root
failures=0

fail() {
  echo "✗ $*" >&2
  failures=$((failures + 1))
}

main() {
  local version
  version="$(tr -d '[:space:]' < "${root}/VERSION")"
  echo "VERSION: ${version}"

  # Version an allen vier Stellen gleich
  grep -q ">v${version}</div>" "${root}/plantuml-renderer.html" || fail "HTML-Footer zeigt nicht v${version}"
  grep -q "^> Aktuelle Version: \*\*v${version}\*\*" "${root}/README.md" || fail "README.md: Versionszeile ≠ v${version}"
  grep -q "^> Current version: \*\*v${version}\*\*" "${root}/README.en.md" || fail "README.en.md: Versionszeile ≠ v${version}"

  # README-Parität: gleiche Struktur (Überschriften, Codeblöcke, Tabellenzeilen) und gleicher Code
  local what de en
  for what in '^#' '^```' '^|'; do
    de="$(grep -c -- "${what}" "${root}/README.md" || true)"
    en="$(grep -c -- "${what}" "${root}/README.en.md" || true)"
    [ "${de}" = "${en}" ] || fail "README-Parität: '${what}' DE=${de} EN=${en}"
  done
  if ! diff <(grep -- '^```' "${root}/README.md") <(grep -- '^```' "${root}/README.en.md") >/dev/null; then
    fail "README-Parität: Codeblock-Sprachen unterscheiden sich"
  fi

  if [ "${failures}" -gt 0 ]; then
    echo "${failures} Abweichung(en)" >&2
    exit 1
  fi
  echo "✓ Versionen und README-Struktur konsistent"
}

main "$@"
