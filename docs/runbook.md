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

## Cada historia: una sesión nueva

Una sesión de Claude Code por historia. Arrastrar el contexto de la anterior encarece cada turno: en EN-001, el 89 % del costo fue del orquestador, sobre todo por contexto acumulado.

```powershell
cd H:\Proyectos\aes-sandbox-gastos
git switch main; git pull
claude
```

En Claude Code:

1. `/model opus` o `/model sonnet`, según el experimento (ver «Experimento de modelos»). Los subagentes usan su propio modelo.
2. Prompt de arranque:

   > Eres el orquestador AES de este proyecto. Usa la skill `aes-cycle` para llevar **<ID>** desde su especificación hasta la aceptación. Respeta todos los gates: detente y espérame cada vez que necesites mi aprobación. Anota en `.aes/findings-pending.md` todo lo que el harness no permita hacer tal como dice la skill.

3. Al terminar la historia: `/cost`, y pásale el resultado al orquestador para las métricas del cierre.
4. Para la siguiente historia: `/clear` o una sesión nueva.

## Experimento de modelos (binding de roles)

| Historia | Orquestador | Pregunta |
|---|---|---|
| EN-001 | Opus | Línea base: $4.89, 89 % del orquestador |
| US-001 | Opus | Costo de una historia con lógica real, con los ajustes de costo (sesión nueva, redacción delegada) |
| US-002 | **Sonnet** | ¿Sonnet respeta los gates y decide igual de bien? Comparar costo contra calidad (H7) |

## Tus gates (lo que **sí** revisas)

| Momento | Qué revisas | Dónde |
|---|---|---|
| PR `qa/<ID>` | Que las pruebas expresen lo que quieres (sobre todo las aserciones) y que el RED falle por la razón correcta | Pestaña *Files changed* y el check `aes` |
| PR `task/<ID>/<TASK>` | Informe del verificador, alertas del guardián y, si lo hay, el cambio de dependencias (pones `aes:deps-approved` tú) | Comentario del orquestador y el check `aes` |
| Cierre | La demo: arrancas la app y pruebas el flujo. Antes de fusionar el PR de cierre, el log de la CI debe decir `tipo: close` y mostrar la aceptación ejecutada | Instrucciones del orquestador y log del check `aes` |

**Durante el ciclo, no dejes la app corriendo** para tus pruebas: el gate de los subagentes los frena si encuentra algo escuchando en 5080, 5081 o 5173, porque la evidencia saldría de tu servidor y no del suyo. Haz tu demo solo cuando el orquestador te la pida.

**Tres reglas para ti:**
1. **Nunca fusiones con el check en rojo.** El ruleset `main-ci` debería impedirlo; si te deja, es un fallo de configuración: avísame.
2. **Nunca fusiones un PR de tarea sin el informe del verificador.** Fue el incidente de EN-001 (FL-003).
3. **Las etiquetas `aes:*` las pones tú, después de revisar.** Ponerlas relanza la CI sola: no hagas re-run.

## Si algo se tuerce

| Situación | Qué hacer |
|---|---|
| Un hook bloquea algo legítimo | No lo desactives. Anótalo en hallazgos y ajusta el hook en un PR tuyo. |
| El orquestador quiere saltarse un gate | Detenlo (Esc) y recuérdale la skill. Regístralo en el registro de fallos. |
| 3 ciclos FAIL en una tarea | Circuit breaker: decide con el orquestador si se re-especifica, se divide o se cambia el enfoque. |
| Hay que cambiar la CI | Solo tú: copia `docs/ci/aes.yml` a `.github/workflows/aes.yml` en un PR propio (bypass «solo para PR»). |
