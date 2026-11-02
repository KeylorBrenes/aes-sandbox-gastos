# Identidad de los agentes: GitHub App

Los agentes no usan tus credenciales. Empujan ramas y abren PR con una **GitHub App** propia, por tres motivos:

1. **Sin permiso de workflows.** GitHub rechaza cualquier push de la app que toque `.github/workflows/`. Un agente no puede editar la CI para saltarse el guardián (AES 06 §9).
2. **PR con otro autor.** Los PR aparecen como `<app>[bot]`, así que puedes exigir tu aprobación como Code Owner. GitHub no deja aprobar los PR propios.
3. **Tokens de corta duración.** Cada token dura 1 hora. Si se filtra, caduca solo.

Tu terminal normal sigue usando tus credenciales. Solo las sesiones de Claude Code abiertas en este repo usan la app.

## Piezas

| Archivo | Función |
|---|---|
| `.claude/scripts/gh-app-token.sh` | Firma un JWT con la llave de la app y lo cambia por un token de instalación (en caché ~1 h). |
| `.claude/scripts/git-credential-aes-app.sh` | Credential helper: git pide credenciales y recibe el token de la app. |
| `.claude/scripts/agent-gh.sh` | Ejecuta `gh` con el token de la app (para `gh pr create`). |
| `.claude/settings.local.example.json` | Plantilla. La copia real (`settings.local.json`) **no va a git**. |

## Configuración (una vez)

1. Guarda la llave privada fuera del repo, por ejemplo `C:\Users\<tú>\.aes\aes-agent.pem`.
2. Copia la plantilla:
   ```powershell
   Copy-Item .claude\settings.local.example.json .claude\settings.local.json
   ```
3. Edita `.claude/settings.local.json`: pon el App ID y la ruta de la llave **con barras normales** (`C:/Users/...`).
4. Prueba desde Git Bash, en la raíz del repo:
   ```bash
   export AES_APP_ID=... AES_APP_INSTALLATION_ID=177994202 AES_APP_PRIVATE_KEY="C:/Users/<tú>/.aes/aes-agent.pem"
   bash .claude/scripts/gh-app-token.sh | cut -c1-8   # debe imprimir "ghs_...."
   ```

## Cómo funciona el truco de `GIT_CONFIG_*`

Git permite inyectar configuración con variables de entorno: `GIT_CONFIG_COUNT`, `GIT_CONFIG_KEY_n` y `GIT_CONFIG_VALUE_n`. Se aplican **después** de tus archivos de configuración.

- La entrada 0 tiene valor vacío. Eso **vacía la lista de credential helpers**, incluido el de `gh auth setup-git`, que usa tu cuenta.
- La entrada 1 agrega el helper de la app.

Como esas variables solo están en el `env` de Claude Code, solo los procesos que lanza Claude Code (agentes, hooks, comandos) se autentican como la app.

## Si algo falla

| Error | Causa probable |
|---|---|
| `A JSON web token could not be decoded` | El App ID es incorrecto (no confundir con el Client ID, que empieza por `Iv`), o la llave no corresponde a la app. |
| `Not Found` | El Installation ID es incorrecto, o la app no está instalada en este repo. |
| `'exp' is too far in the future` / `iat` | El reloj del PC está desfasado. Sincroniza la hora de Windows. |
| `refusing to allow a GitHub App to create or update workflow` | **Correcto**: el control funciona. |
| `No se puede leer la llave` | La ruta usa `\` o es incorrecta. Usa `C:/Users/...`. |
