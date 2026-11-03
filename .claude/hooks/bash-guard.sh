#!/usr/bin/env bash
# AES — PreToolUse (Bash y PowerShell). Capa L2: fricción, no garantía.
# La terminal puede escribir archivos aunque Edit/Write estén bloqueados. Este hook intercepta
# los casos evidentes; la garantía real es el guardián de la CI (L3).
set -uo pipefail
source "$(dirname "$0")/lib.sh"

aes_read_input
AES_ROLE=$(aes_role)
cmd=$(aes_get '.tool_input.command')
[[ -z "$cmd" ]] && exit 0

# Rutas que este rol no puede escribir (sin anclar; se combinan abajo).
case "$AES_ROLE" in
  "")                    paths='(src|web|tests)(/|[[:space:]"'\'']|$)' ;;
  qa)                    paths='((src|web|specs|ci|\.github|\.claude)(/|[[:space:]"'\'']|$)|AGENTS\.md|CLAUDE\.md)' ;;
  programmer|mechanic)   paths='((tests/acceptance|specs|ci|\.github|\.claude|docs/ci)(/|[[:space:]"'\'']|$)|AGENTS\.md|CLAUDE\.md)' ;;
  *)                     paths='' ;;
esac

# Solo cuenta como escritura:
#  - una redirección HACIA la ruta (> ruta, >> ruta), no "2>&1" ni "> /dev/null";
#  - una operación de escritura cuyo argumento, en el mismo comando simple, es la ruta.
if [[ -n "$paths" ]]; then
  redirect_re=">{1,2}[[:space:]]*[\"']?(\./)?${paths}"
  ops_re="(\btee\b|\bsed[[:space:]]+-i|\bperl[[:space:]]+-pi|\brm\b|\bmv\b|\bcp\b|\btruncate\b|\btouch\b|\bmkdir\b|Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Move-Item|Copy-Item)[^;&|]*[[:space:]\"'=](\./)?${paths}"
fi

# Git y GitHub: los subagentes no publican, no cambian de rama ni reescriben historia.
if [[ -n "$AES_ROLE" ]]; then
  if [[ "$cmd" =~ (^|[;&|[:space:]])(git[[:space:]]+(push|switch|checkout|reset|rebase|merge|clean|worktree|branch[[:space:]]+-[dDmM])|gh[[:space:]]|agent-gh\.sh) ]]; then
    aes_block "los subagentes no publican, no cambian de rama ni reescriben historia. Eso lo hace el orquestador. Comando: $cmd"
  fi
  if [[ "$cmd" =~ --no-verify ]]; then
    aes_block "no se permite saltarse hooks de git (--no-verify)."
  fi
fi

# El verificador es de solo lectura: no hace commits ni escribe dentro del repo.
if [[ "$AES_ROLE" == "verifier" ]]; then
  if [[ "$cmd" =~ (^|[;&|[:space:]])git[[:space:]]+(add|commit|stash|apply|am|cherry-pick) ]]; then
    aes_block "el verificador es de solo lectura (no hace add/commit/stash)."
  fi
  if [[ "$cmd" =~ (sed[[:space:]]+-i|perl[[:space:]]+-pi|Set-Content|Out-File) ]]; then
    aes_block "el verificador no modifica archivos."
  fi
fi

if [[ -n "$paths" ]] && [[ "$cmd" =~ $redirect_re || "$cmd" =~ $ops_re ]]; then
  aes_block "el comando parece escribir en una ruta que este rol no puede tocar. Si es una lectura, reformúlalo sin redirecciones. Comando: $cmd"
fi
exit 0
