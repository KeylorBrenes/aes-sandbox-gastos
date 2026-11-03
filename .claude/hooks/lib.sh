#!/usr/bin/env bash
# AES — funciones compartidas por los hooks. Se carga con: source "$(dirname "$0")/lib.sh"

# Rutas que ningún rol de implementación puede tocar (se usa en role-guard.sh).
# shellcheck disable=SC2034
AES_PROTECTED_RE='^(tests/acceptance/|specs/|ci/|\.github/|\.claude/|docs/ci/|AGENTS\.md$|CLAUDE\.md$)'

# Lee la entrada JSON del hook una sola vez.
aes_read_input() { AES_INPUT=$(cat); }
aes_get() { jq -r "$1 // empty" <<< "$AES_INPUT"; }

# Rol: vacío = sesión principal (orquestador). Si no, el nombre del subagente.
aes_role() { aes_get '.agent_type'; }

# Normaliza una ruta (Windows o POSIX) a forma con "/" y sin "./".
aes_norm() { local p="${1//\\//}"; printf '%s' "${p#./}"; }

# Raíz del repositorio que contiene una ruta (o el cwd del hook).
aes_repo_root() {
  local dir="$1"
  [[ -d "$dir" ]] || dir=$(dirname "$dir")
  while [[ ! -d "$dir" && "$dir" != "." && "$dir" != "/" ]]; do dir=$(dirname "$dir"); done
  git -C "$dir" rev-parse --show-toplevel 2>/dev/null || git rev-parse --show-toplevel 2>/dev/null
}

# Convierte una ruta absoluta en relativa a la raíz del repo (comparación sin distinguir mayúsculas,
# porque en Windows "h:/" y "H:/" son la misma unidad). Imprime vacío si está fuera del repo.
aes_rel_path() {
  local file root lf lr
  file=$(aes_norm "$1"); root=$(aes_norm "$2")
  # Git Bash puede devolver /h/Proyectos en lugar de H:/Proyectos: unificar.
  if [[ "$root" =~ ^/([a-zA-Z])/(.*)$ ]]; then root="${BASH_REMATCH[1]}:/${BASH_REMATCH[2]}"; fi
  if [[ "$file" =~ ^/([a-zA-Z])/(.*)$ ]]; then file="${BASH_REMATCH[1]}:/${BASH_REMATCH[2]}"; fi
  # Ruta relativa: ya es relativa al repo.
  if [[ ! "$file" =~ ^([a-zA-Z]:)?/ ]]; then printf '%s' "$file"; return; fi
  lf=$(tr '[:upper:]' '[:lower:]' <<< "$file"); lr=$(tr '[:upper:]' '[:lower:]' <<< "$root")
  if [[ "$lf" == "$lr"/* ]]; then printf '%s' "${file:${#root}+1}"; fi
}

# Rama actual y archivo .scope asociado (task/<ID>/<TASK> → specs/<ID>/<TASK>.scope).
aes_branch() { git -C "$1" rev-parse --abbrev-ref HEAD 2>/dev/null; }
aes_scope_file() {
  local branch="$1"
  if [[ "$branch" =~ ^task/([^/]+)/([^/]+)$ ]]; then
    printf 'specs/%s/%s.scope' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
  fi
}

# ¿La ruta relativa coincide con algún glob del .scope?
aes_in_scope() {
  local rel="$1" scope="$2" glob
  while IFS= read -r glob || [[ -n "$glob" ]]; do
    glob="${glob%%#*}"; glob="${glob//[[:space:]]/}"; glob="${glob//$'\r'/}"
    [[ -z "$glob" ]] && continue
    # shellcheck disable=SC2053  # el glob debe evaluarse como patrón
    [[ "$rel" == $glob ]] && return 0
  done < "$scope"
  return 1
}

aes_block() { printf 'AES [%s]: %s\n' "${AES_ROLE:-orquestador}" "$*" >&2; exit 2; }
