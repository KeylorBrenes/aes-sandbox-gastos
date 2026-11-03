# Runbook — cómo trabajar en este proyecto

## Una vez por equipo

1. Prerrequisitos: .NET 10, Node LTS, Git for Windows, `gh`, `jq`, Claude Code.
2. Identidad de los agentes configurada (`docs/agent-identity.md`): `.claude/settings.local.json` con App ID, Installation ID y ruta del `.pem`.
3. Navegador de Playwright, la primera vez que exista `tests/acceptance/`:
   ```powershell
   npm --prefix tests/acceptance ci
   npx --prefix tests/acceptance playwright install chromium
   ```
4. En Claude Code, comprueba que carga el proyecto: `/agents` debe listar `qa`, `programmer`, `verifier` y `mechanic`; `/hooks` debe mostrar los de `.claude/settings.json`.

## Cada sesión

```powershell
cd H:\Proyectos\aes-sandbox-gastos
git switch main; git pull
claude
```

En Claude Code:

1. `/model opus`: el orquestador usa Opus; los subagentes usan su propio modelo.
2. Prompt de arranque (primera vez):

   > Eres el orquestador AES de este proyecto. Usa la skill `aes-cycle` para llevar **EN-001** desde su especificación hasta la aceptación. Respeta todos los gates: detente y espérame cada vez que necesites mi aprobación. Registra en `docs/harness-findings.md` todo lo que el harness no permita hacer tal como dice la skill.

   Siguientes historias: el mismo texto, cambiando el ID.

3. Al cerrar la sesión: `/cost`, y anota el resultado en la tabla de métricas de `docs/harness-findings.md`.

## Tus gates (lo que **sí** revisas)

| Momento | Qué revisas | Dónde |
|---|---|---|
| PR `qa/<ID>` | Que las pruebas expresen lo que quieres (sobre todo las aserciones) y que el RED falle por la razón correcta | Pestaña *Files changed* y el check `aes` |
| PR `task/<ID>/<TASK>` | Informe del verificador, alertas del guardián y, si lo hay, el cambio de dependencias (pones `aes:deps-approved` tú) | Comentario del orquestador y el check `aes` |
| Cierre | La demo: arrancas la app y pruebas el flujo | Instrucciones del orquestador |

## Si algo se tuerce

| Situación | Qué hacer |
|---|---|
| Un hook bloquea algo legítimo | No lo desactives. Anótalo en hallazgos y ajusta el hook en un PR tuyo. |
| El orquestador quiere saltarse un gate | Detenlo (Esc) y recuérdale la skill. Regístralo en el registro de fallos. |
| 3 ciclos FAIL en una tarea | Circuit breaker: decide con el orquestador si se re-especifica, se divide o se cambia el enfoque. |
| Hay que cambiar la CI | Solo tú: copia `docs/ci/aes.yml` a `.github/workflows/aes.yml` en un PR propio (bypass «solo para PR»). |
