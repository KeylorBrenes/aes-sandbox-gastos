#!/usr/bin/env bash
# AES — SubagentStop. Capa L2.
# Antes de que un subagente AES termine:
#   - todos (qa, programmer, mechanic, verifier): no deben dejar servidores escuchando en los
#     puertos del proyecto (FL-007: contaminan la evidencia del siguiente rol);
#   - programmer y mechanic: además, guardián AES local y validaciones.
# Bloquea UNA vez (stop_hook_active evita bucles): si siguen fallando, el agente debe
# terminar reportando BLOCKED **para el humano**, y el orquestador lo verá.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

aes_read_input
AES_ROLE=$(aes_role)
case "$AES_ROLE" in qa|programmer|mechanic|verifier) ;; *) exit 0 ;; esac
[[ "$(aes_get '.stop_hook_active')" == "true" ]] && exit 0

cwd=$(aes_get '.cwd'); [[ -z "$cwd" ]] && cwd=$PWD
root=$(aes_repo_root "$cwd")
[[ -z "$root" ]] && exit 0
cd "$root" || exit 0

failures=()
log=$(mktemp)

# 0. Servidores vivos en los puertos del proyecto.
#    Linux: /proc/net/tcp(6) (no depende de ss/netstat). Windows/macOS: netstat.
AES_PORTS="${AES_PORTS:-5080 5081 5173}"
port_listening() {
  local port="$1" hex
  if [[ -r /proc/net/tcp ]]; then
    local files=(/proc/net/tcp)
    [[ -r /proc/net/tcp6 ]] && files+=(/proc/net/tcp6)
    hex=$(printf '%04X' "$port")
    awk -v h=":${hex}" '$4 == "0A" && substr($2, length($2) - 4) == h { found = 1 } END { exit !found }' \
      "${files[@]}" 2>/dev/null
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ano 2>/dev/null | grep -iE "[:.]${port}[[:space:]].*(LISTENING|ESCUCHANDO|LISTEN)" >/dev/null
  else
    return 1
  fi
}
listening=""
for port in $AES_PORTS; do
  port_listening "$port" && listening+=" $port"
done
if [[ -n "$listening" ]]; then
  failures+=("quedan servidores escuchando en los puertos:$listening. Usa .claude/scripts/with-servers.sh, que los detiene solo; si no puedes detenerlos, reporta BLOCKED para el humano (no le pidas a otro agente que lo haga)")
fi

if [[ "$AES_ROLE" == "qa" || "$AES_ROLE" == "verifier" ]]; then
  if (( ${#failures[@]} > 0 )); then
    printf 'AES [%s]: no puedes terminar todavía. %s\n' "$AES_ROLE" "${failures[*]}" >&2
    rm -f "$log"; exit 2
  fi
  rm -f "$log"; exit 0
fi

# 1. Guardián AES local (mismas reglas que la CI) contra origin/main.
#    Las dependencias no se juzgan aquí: su aprobación es humana y vive en la CI
#    (etiqueta aes:deps-approved). Rutas protegidas, superficie, pruebas borradas y
#    marcadores sí bloquean.
branch=$(aes_branch "$root")
scope=$(aes_scope_file "$branch")
if [[ -n "$scope" ]]; then
  if ! AES_ALLOW_DEPS=1 BASE_REF=origin/main TASK_SCOPE_FILE="$scope" bash ci/aes-guard.sh >>"$log" 2>&1; then
    failures+=("guardián AES")
  fi
fi

# 2. Cambios sin commit: el trabajo debe quedar en commits.
if [[ -n "$(git status --porcelain --untracked-files=normal -- . ':!**/bin/**' ':!**/obj/**')" ]]; then
  failures+=("hay cambios sin commit (git status no está limpio)")
fi

# 3. Validaciones del proyecto, si existen. Solo en ramas de tarea: en el cierre
#    (spec/<ID>-close) mechanic solo toca documentación.
if [[ -n "$scope" ]]; then
  if compgen -G "*.slnx" >/dev/null || compgen -G "*.sln" >/dev/null; then
    { dotnet build -warnaserror -nologo -v q && dotnet test --no-build -nologo -v q; } >>"$log" 2>&1 \
      || failures+=(".NET (build -warnaserror / test)")
  fi
  if [[ -f web/package.json ]]; then
    { npm --prefix web run lint --silent && npm --prefix web test --silent && npm --prefix web run build --silent; } >>"$log" 2>&1 \
      || failures+=("web (lint / test / build)")
  fi
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
