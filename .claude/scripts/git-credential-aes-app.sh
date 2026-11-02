#!/usr/bin/env bash
# AES — Credential helper de git que entrega el token de la GitHub App de los agentes.
# Git lo llama con "get", "store" o "erase" y le pasa por stdin líneas clave=valor.
# Solo respondemos a "get" para github.com; lo demás se ignora.
set -euo pipefail

[[ "${1:-}" == "get" ]] || exit 0

host=""
while IFS='=' read -r key value; do
  [[ -z "$key" ]] && break
  [[ "$key" == "host" ]] && host="$value"
done

[[ "$host" == "github.com" ]] || exit 0

token=$(bash "$(dirname "$0")/gh-app-token.sh")
printf 'username=x-access-token\npassword=%s\n' "$token"
