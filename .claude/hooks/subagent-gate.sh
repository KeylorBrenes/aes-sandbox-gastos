#!/usr/bin/env bash
# AES — SubagentStop. Capa L2.
# Antes de que programmer o mechanic terminen, ejecuta el guardián AES local y las validaciones.
# Bloquea UNA vez (stop_hook_active evita bucles): si siguen fallando, el agente debe
# terminar reportando BLOCKED con la causa, y el orquestador lo verá.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

aes_read_input
AES_ROLE=$(aes_role)
[[ "$AES_ROLE" == "programmer" || "$AES_ROLE" == "mechanic" ]] || exit 0
[[ "$(aes_get '.stop_hook_active')" == "true" ]] && exit 0

cwd=$(aes_get '.cwd'); [[ -z "$cwd" ]] && cwd=$PWD
root=$(aes_repo_root "$cwd")
[[ -z "$root" ]] && exit 0
cd "$root" || exit 0

failures=()
log=$(mktemp)

# 1. Guardián AES local (mismas reglas que la CI) contra origin/main.
branch=$(aes_branch "$root")
scope=$(aes_scope_file "$branch")
if [[ -n "$scope" ]]; then
  if ! BASE_REF=origin/main TASK_SCOPE_FILE="$scope" bash ci/aes-guard.sh >>"$log" 2>&1; then
    failures+=("guardián AES")
  fi
fi

# 2. Cambios sin commit: el trabajo debe quedar en commits.
if [[ -n "$(git status --porcelain --untracked-files=normal -- . ':!**/bin/**' ':!**/obj/**')" ]]; then
  failures+=("hay cambios sin commit (git status no está limpio)")
fi

# 3. Validaciones del proyecto, si existen.
if compgen -G "*.slnx" >/dev/null || compgen -G "*.sln" >/dev/null; then
  { dotnet build -warnaserror -nologo -v q && dotnet test --no-build -nologo -v q; } >>"$log" 2>&1 \
    || failures+=(".NET (build -warnaserror / test)")
fi
if [[ -f web/package.json ]]; then
  { npm --prefix web run lint --silent && npm --prefix web test --silent && npm --prefix web run build --silent; } >>"$log" 2>&1 \
    || failures+=("web (lint / test / build)")
fi

if (( ${#failures[@]} > 0 )); then
  {
    echo "AES [$AES_ROLE]: no puedes terminar todavía. Falló: ${failures[*]}."
    echo "Corrige sin tocar pruebas protegidas ni salir de la superficie, o termina reportando BLOCKED con la causa."
    echo "--- últimas líneas ---"
    tail -n 40 "$log"
  } >&2
  rm -f "$log"
  exit 2
fi
rm -f "$log"
exit 0
