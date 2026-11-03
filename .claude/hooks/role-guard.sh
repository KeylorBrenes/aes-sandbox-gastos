#!/usr/bin/env bash
# AES — PreToolUse (Edit|Write|MultiEdit|NotebookEdit). Capa L2.
# Decide según el rol (agent_type) qué archivos del repo puede escribir.
#   orquestador (sin agent_type): documentación y especificaciones; NO código ni pruebas.
#   qa:                          solo tests/acceptance/** y specs/<ID>/acceptance-test-plan.md
#   programmer / mechanic:       solo dentro de la superficie de la tarea (rama task/<ID>/<TASK>)
#   verifier y cualquier otro:   nada dentro del repo
# Fuera del repo (p. ej. /tmp) no se restringe: el verificador puede crear scripts temporales.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

aes_read_input
AES_ROLE=$(aes_role)
file=$(aes_get '.tool_input.file_path')
[[ -z "$file" ]] && file=$(aes_get '.tool_input.notebook_path')
[[ -z "$file" ]] && exit 0

cwd=$(aes_get '.cwd'); [[ -z "$cwd" ]] && cwd=$PWD
root=$(aes_repo_root "$(aes_norm "$file")")
[[ -z "$root" ]] && root=$(aes_repo_root "$cwd")
[[ -z "$root" ]] && exit 0
rel=$(aes_rel_path "$file" "$root")
[[ -z "$rel" ]] && exit 0   # fuera del repositorio

case "$AES_ROLE" in
  "")
    if [[ "$rel" =~ ^(src|web|tests)/ ]]; then
      aes_block "el orquestador no escribe código ni pruebas ('$rel'). Delega en programmer, mechanic o qa."
    fi
    ;;
  qa)
    if [[ ! "$rel" =~ ^tests/acceptance/ && ! "$rel" =~ ^specs/[^/]+/acceptance-test-plan\.md$ ]]; then
      aes_block "QA solo escribe en tests/acceptance/ y en specs/<ID>/acceptance-test-plan.md ('$rel')."
    fi
    ;;
  programmer|mechanic)
    if [[ "$rel" =~ $AES_PROTECTED_RE ]]; then
      aes_block "'$rel' es una ruta protegida. Si necesitas cambiarla, detente y reporta BLOCKED con el motivo."
    fi
    branch=$(aes_branch "$root")
    # mechanic consolida documentación en el cierre: en spec/<ID>-close solo puede tocar docs/.
    if [[ "$AES_ROLE" == "mechanic" && "$branch" =~ ^spec/[^/]+-close$ ]]; then
      [[ "$rel" =~ ^docs/ ]] && exit 0
      aes_block "en la rama de cierre '$branch' solo puedes escribir en docs/ ('$rel')."
    fi
    scope_rel=$(aes_scope_file "$branch")
    if [[ -z "$scope_rel" ]]; then
      aes_block "estás en la rama '$branch'. Solo se implementa en ramas task/<ID>/<TASK>. Reporta BLOCKED."
    fi
    if [[ ! -f "$root/$scope_rel" ]]; then
      aes_block "no existe la superficie '$scope_rel'. El orquestador debe publicarla antes. Reporta BLOCKED."
    fi
    if ! aes_in_scope "$rel" "$root/$scope_rel"; then
      aes_block "'$rel' está fuera de la superficie de la tarea ($scope_rel). No amplíes el alcance: reporta BLOCKED y explica por qué lo necesitas."
    fi
    ;;
  *)
    aes_block "el rol '$AES_ROLE' no puede escribir archivos del repositorio ('$rel')."
    ;;
esac
exit 0
