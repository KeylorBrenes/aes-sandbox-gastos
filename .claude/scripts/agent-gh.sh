#!/usr/bin/env bash
# AES — Ejecuta gh con la identidad de la GitHub App de los agentes.
# Así los PR que abren los agentes aparecen como <app>[bot] y tú puedes aprobarlos.
# Uso: bash .claude/scripts/agent-gh.sh pr create --title "..." --body "..."
set -euo pipefail
GH_TOKEN=$(bash "$(dirname "$0")/gh-app-token.sh")
export GH_TOKEN
exec gh "$@"
