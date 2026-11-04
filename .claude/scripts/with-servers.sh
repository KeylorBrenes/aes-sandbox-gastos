#!/usr/bin/env bash
# AES — Arranca la API (y opcionalmente la web), ejecuta un comando y SIEMPRE detiene lo que arrancó.
#
# Para la prueba manual agéntica del verificador y cualquier rol que necesite servidores
# (FL-007: procesos que sobreviven al rol y contaminan la evidencia del siguiente).
#   - No reutiliza servidores: si un puerto ya está ocupado, falla.
#   - Usa una base SQLite temporal propia.
#   - Al terminar (bien, mal o con Ctrl+C) detiene el árbol de procesos que arrancó, y solo ese.
#
# Uso:
#   bash .claude/scripts/with-servers.sh [--web] -- <comando> [args...]
# Ejemplos:
#   bash .claude/scripts/with-servers.sh -- curl -s http://localhost:5080/api/categories
#   bash .claude/scripts/with-servers.sh --web -- node "$TEMP/manual-check.mjs"
#
# Variables opcionales (útiles para otros stacks o para probar el script):
#   AES_API_CMD, AES_API_HEALTH (por defecto http://localhost:5080/api/health)
#   AES_WEB_CMD, AES_WEB_URL    (por defecto http://localhost:5173/)
#   AES_WAIT_SECONDS            (por defecto 120)
set -uo pipefail

with_web=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --web) with_web=1; shift ;;
    --) shift; break ;;
    *) echo "Uso: with-servers.sh [--web] -- <comando> [args...]" >&2; exit 2 ;;
  esac
done
[[ $# -gt 0 ]] || { echo "Falta el comando a ejecutar después de --" >&2; exit 2; }

root=$(git rev-parse --show-toplevel)
cd "$root" || exit 2
tmp=$(mktemp -d)
is_windows=0
case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) is_windows=1 ;; esac

db="$tmp/gastos-manual.db"
[[ $is_windows == 1 ]] && command -v cygpath >/dev/null && db=$(cygpath -m "$db")
api_cmd="${AES_API_CMD:-dotnet run --project src/Gastos.Api --urls http://localhost:5080}"
api_health="${AES_API_HEALTH:-http://localhost:5080/api/health}"
web_cmd="${AES_WEB_CMD:-npm --prefix web run dev -- --port 5173 --strictPort}"
web_url="${AES_WEB_URL:-http://localhost:5173/}"
wait_s="${AES_WAIT_SECONDS:-120}"

pids=()
# shellcheck disable=SC2329  # se invoca desde trap EXIT
stop_all() {
  local pid winpid
  for pid in "${pids[@]}"; do
    if [[ $is_windows == 1 ]]; then
      # dotnet run / npm crean procesos hijos nativos: hay que detener el árbol completo.
      winpid=$(cat "/proc/$pid/winpid" 2>/dev/null || true)
      [[ -n "$winpid" ]] && taskkill //PID "$winpid" //T //F >/dev/null 2>&1
      kill "$pid" 2>/dev/null
    else
      # Cada servidor arrancó en su propio grupo de procesos (setsid): se detiene el grupo.
      kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
      sleep 1
      kill -KILL -- "-$pid" 2>/dev/null || true
    fi
  done
  rm -rf "$tmp"
}
trap stop_all EXIT
trap 'exit 130' INT TERM

up() { curl -s -o /dev/null --max-time 2 "$1"; }

start() {  # start <nombre> <comando> <url>
  local name="$1" cmd="$2" url="$3" log="$tmp/$1.log" i
  if up "$url"; then
    echo "AES: $url ya responde. Hay un servidor vivo de otro rol o de una sesión anterior; no se reutiliza (FL-007). Detenlo y vuelve a intentar." >&2
    exit 3
  fi
  if [[ $is_windows == 1 ]]; then
    ConnectionStrings__Gastos="Data Source=$db" bash -c "$cmd" >"$log" 2>&1 &
  else
    ConnectionStrings__Gastos="Data Source=$db" setsid bash -c "$cmd" >"$log" 2>&1 &
  fi
  pids+=("$!")
  for ((i = 0; i < wait_s; i++)); do
    up "$url" && { echo "AES: $name lista en $url"; return 0; }
    kill -0 "${pids[-1]}" 2>/dev/null || break
    sleep 1
  done
  echo "AES: $name no arrancó. Últimas líneas de su salida:" >&2
  tail -n 30 "$log" >&2
  exit 4
}

start api "$api_cmd" "$api_health"
[[ $with_web == 1 ]] && start web "$web_cmd" "$web_url"

"$@"
status=$?
echo "AES: comando terminado (código $status); deteniendo servidores."
exit "$status"
