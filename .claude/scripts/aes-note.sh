#!/usr/bin/env bash
# AES — Añade una fila a las notas pendientes del orquestador con la HORA REAL (FL-009).
#
# Uso:
#   bash .claude/scripts/aes-note.sh finding "<fase / rol>" "<hallazgo>" "<tipo>" "<impacto en AES>"
#   bash .claude/scripts/aes-note.sh failure "<agente / modelo>" "<síntoma>" "<detectado por>" "<control propuesto>"
#   bash .claude/scripts/aes-note.sh decision "<ID historia>" "<pregunta>" "<decisión>" "<impacto>"
#
# Tipos de hallazgo: Confirmación · Fricción · Fallo de agente · Hueco de control · Diseño · Costo.
# Escribe en .aes/ (ignorado por git). Se consolida en docs/ en el cierre de la historia.
set -euo pipefail

kind="${1:-}"; shift || true
root=$(git rev-parse --show-toplevel)
dir="$root/.aes"
mkdir -p "$dir"
now=$(date '+%Y-%m-%d %H:%M')
esc() { local s="${1//|/\\|}"; printf '%s' "${s//$'\n'/ }"; }

case "$kind" in
  finding)
    file="$dir/findings-pending.md"
    [[ -s "$file" ]] || printf '# Hallazgos pendientes de consolidar\n\n| Fecha y hora | Fase / rol | Hallazgo | Tipo | Impacto en AES |\n|---|---|---|---|---|\n' > "$file"
    (( $# >= 3 )) || { echo "Uso: aes-note.sh finding <fase/rol> <hallazgo> <tipo> [impacto]" >&2; exit 1; }
    printf '| %s | %s | %s | %s | %s |\n' "$now" "$(esc "$1")" "$(esc "$2")" "$(esc "$3")" "$(esc "${4:-—}")" >> "$file"
    ;;
  failure)
    file="$dir/failures-pending.md"
    [[ -s "$file" ]] || printf '# Fallos de agentes pendientes de consolidar\n\n| Fecha y hora | Agente / modelo | Síntoma | Detectado por | Control propuesto |\n|---|---|---|---|---|\n' > "$file"
    (( $# >= 3 )) || { echo "Uso: aes-note.sh failure <agente/modelo> <síntoma> <detectado por> [control]" >&2; exit 1; }
    printf '| %s | %s | %s | %s | %s |\n' "$now" "$(esc "$1")" "$(esc "$2")" "$(esc "$3")" "$(esc "${4:-—}")" >> "$file"
    ;;
  decision)
    file="$dir/decisions-pending.md"
    [[ -s "$file" ]] || printf '# Decisiones pendientes de transcribir a la historia\n\n| Fecha y hora | Historia | Pregunta | Decisión | Impacto |\n|---|---|---|---|---|\n' > "$file"
    (( $# >= 3 )) || { echo "Uso: aes-note.sh decision <ID> <pregunta> <decisión> [impacto]" >&2; exit 1; }
    printf '| %s | %s | %s | %s | %s |\n' "$now" "$(esc "$1")" "$(esc "$2")" "$(esc "$3")" "$(esc "${4:-—}")" >> "$file"
    ;;
  *)
    echo "Uso: aes-note.sh finding|failure|decision ..." >&2; exit 1 ;;
esac
echo "Anotado en ${file#"$root"/} ($now)"
