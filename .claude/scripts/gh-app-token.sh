#!/usr/bin/env bash
# AES — Genera (o reutiliza) un token de instalación de la GitHub App de los agentes.
#
# El token dura 1 hora. Se guarda en caché y se renueva cuando le quedan menos de 5 minutos.
# Requiere: bash, openssl, curl, jq (todos vienen con Git for Windows salvo jq).
#
# Variables (definidas en .claude/settings.local.json, que NO va a git):
#   AES_APP_ID               ID numérico de la app (página General de la app → "App ID")
#   AES_APP_INSTALLATION_ID  ID de la instalación (URL .../settings/installations/<id>)
#   AES_APP_PRIVATE_KEY      ruta al .pem, con barras normales: C:/Users/<tú>/.aes/aes-agent.pem
#
# Uso: token=$(bash .claude/scripts/gh-app-token.sh)
set -euo pipefail

: "${AES_APP_ID:?Falta AES_APP_ID}"
: "${AES_APP_INSTALLATION_ID:?Falta AES_APP_INSTALLATION_ID}"
: "${AES_APP_PRIVATE_KEY:?Falta AES_APP_PRIVATE_KEY}"
[[ -r "$AES_APP_PRIVATE_KEY" ]] || { echo "No se puede leer la llave: $AES_APP_PRIVATE_KEY" >&2; exit 1; }

cache_dir="${AES_TOKEN_CACHE_DIR:-$HOME/.aes}"
cache="$cache_dir/token-${AES_APP_INSTALLATION_ID}.json"
mkdir -p "$cache_dir"
chmod 700 "$cache_dir" 2>/dev/null || true

now=$(date +%s)

# 1. Reutilizar el token en caché si le quedan más de 5 minutos.
if [[ -s "$cache" ]]; then
  expires_at=$(jq -r '.expires_at // empty' "$cache" 2>/dev/null || true)
  if [[ -n "$expires_at" ]]; then
    exp_epoch=$(date -d "$expires_at" +%s 2>/dev/null || echo 0)
    if (( exp_epoch - now > 300 )); then
      jq -r '.token' "$cache"
      exit 0
    fi
  fi
fi

# 2. Firmar un JWT (RS256) con la llave privada de la app. Válido 9 minutos.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
header=$(printf '{"alg":"RS256","typ":"JWT"}' | b64url)
payload=$(printf '{"iat":%d,"exp":%d,"iss":"%s"}' "$((now - 60))" "$((now + 540))" "$AES_APP_ID" | b64url)
signature=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -sign "$AES_APP_PRIVATE_KEY" | b64url)
jwt="$header.$payload.$signature"

# 3. Cambiar el JWT por un token de instalación.
response=$(curl -sS -X POST \
  -H "Authorization: Bearer $jwt" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/app/installations/${AES_APP_INSTALLATION_ID}/access_tokens")

token=$(jq -r '.token // empty' <<< "$response")
if [[ -z "$token" ]]; then
  echo "GitHub no devolvió un token: $(jq -r '.message // .' <<< "$response")" >&2
  exit 1
fi

umask 077
jq '{token, expires_at}' <<< "$response" > "$cache"
printf '%s\n' "$token"
