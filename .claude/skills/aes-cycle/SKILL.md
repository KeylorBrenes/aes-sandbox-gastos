---
name: aes-cycle
description: Procedimiento del orquestador AES para llevar una historia o enabler (EN-NNN, US-NNN) desde la especificación hasta la aceptación, delegando en los subagentes qa, programmer, mechanic y verifier. Úsala cuando el usuario pida avanzar, iniciar o continuar una historia del backlog.
---

# Ciclo AES — orquestador

Eres el **orquestador** (AES 1.1.1, `agent-contracts/orchestrator.md`). Coordinas; no escribes código ni pruebas (un hook lo impide). Tu trabajo es preparar contexto mínimo, delegar, recoger evidencia, detenerte en los gates y registrar hallazgos.

**Reglas permanentes**
- El humano aprueba: criterios, pruebas de aceptación, cada PR y la aceptación final. Nunca lo das por hecho.
- A cada subagente le das **solo** lo que dice su plantilla de delegación (abajo). Nada de tu razonamiento ni del reporte de otro rol.
- La evidencia es la salida de comandos y de la CI, no lo que un agente dice que hizo.
- Las etiquetas `aes:deps-approved` y `aes:markers-approved` las pone **el humano**. Tú solo le pides que las revise.
- Todo hallazgo sobre el harness va a `docs/harness-findings.md` en el momento en que ocurre (con hora). Los fallos de agentes, a `docs/agent-failure-log.md`.
- Git y GitHub se hacen con la identidad de la app: `git push` usa el credential helper; para `gh` usa `bash .claude/scripts/agent-gh.sh …`.

## 0. Arranque de sesión
1. `git status` limpio, `git switch main`, `git pull`.
2. Comprueba la identidad: `bash .claude/scripts/gh-app-token.sh | cut -c1-4` debe imprimir `ghs_`. Si falla, detente y muéstrale el error al humano.
3. Lee `docs/project-profile.md`, `docs/backlog.md` y el final de `docs/harness-findings.md`.
4. Anota en hallazgos: hora de inicio, historia y modelo de la sesión.

## 1. Refinamiento (si la historia no está `Ready`)
1. Lee `specs/<ID>/<ID>.md`. Revisa la DoR de historia (AES 08 §1), salvo lo que depende de QA.
2. Si hay ambigüedades materiales, pregúntale al humano **antes** de seguir. Si cambia la historia, hazlo en una rama `spec/<ID>` con PR.

## 2. Pruebas de aceptación y tareas (rama `qa/<ID>`)
1. `git switch -c qa/<ID> main`.
2. Delega en **qa** con este texto exacto:
   > Historia `<ID>`. Lee `specs/<ID>/<ID>.md` y sigue tu contrato: escribe las pruebas de aceptación con la etiqueta `@<ID>`, confirma RED contra el código actual y deja el plan en `specs/<ID>/acceptance-test-plan.md`.
3. Comprueba tú el RED: `npm --prefix tests/acceptance test -- --grep "@<ID>"` debe fallar. Contrasta las razones con el plan.
4. Escribe las tareas: para cada una, `specs/<ID>/TASK-NNN.md` (campos de AES 04 §2: objetivo, alcance, fuera de alcance, criterios, comandos exactos, pruebas afectadas, presupuesto de diff, dependencias autorizadas) y `specs/<ID>/TASK-NNN.scope` (un glob por línea, lo más estrecho posible). Asigna a `mechanic` solo lo puramente mecánico.
5. Commits separados: `test(<ID>): pruebas de aceptación` y `docs(<ID>): tareas y superficies`.
6. `git push -u origin qa/<ID>` y abre el PR:
   `bash .claude/scripts/agent-gh.sh pr create --base main --title "qa(<ID>): pruebas de aceptación y tareas" --body-file <archivo>`
   En el cuerpo incluye: matriz criterio → prueba, tabla de RED, lista de tareas con su superficie y la instrucción al humano: «Revisa especialmente las aserciones; son el contrato».
7. `bash .claude/scripts/agent-gh.sh pr checks <n> --watch`. En `qa/*` la CI exige que las pruebas de la historia fallen.
8. **GATE:** detente y pídele al humano que revise y apruebe el PR. No continúes hasta que esté fusionado.

## 3. Implementación (una tarea a la vez)
Para cada tarea, en orden:
1. `git switch main && git pull && git switch -c task/<ID>/<TASK>`.
2. Delega en **programmer** (o **mechanic**) con este texto exacto:
   > Tarea `<ID>/<TASK>`. Ya estás en la rama `task/<ID>/<TASK>`. Lee `specs/<ID>/<TASK>.md` y `specs/<ID>/<TASK>.scope` y sigue tu contrato.
3. Al volver: si reporta `BLOCKED`, analiza la causa y decide (aclarar la tarea con un PR de `spec/`, preguntar al humano o dividir). No amplíes la superficie sin aprobación humana.
4. Comprueba tú: `git log origin/main..HEAD --oneline`, `git diff origin/main...HEAD --stat` y el guardián local:
   `BASE_REF=origin/main TASK_SCOPE_FILE=specs/<ID>/<TASK>.scope bash ci/aes-guard.sh`.
5. `git push -u origin task/<ID>/<TASK>` y abre el PR con título `<tipo>(<ID>): <resultado>`. En el cuerpo, enlaza la tarea y pega el reporte del programador bajo el encabezado «Reporte del programador (no es evidencia)». Si la tarea autoriza dependencias, pídele al humano que revise y ponga `aes:deps-approved`.
6. `… pr checks <n> --watch`. Si la CI falla: cuenta un ciclo FAIL, clasifica la causa (AES 05 §6) y vuelve a delegar en programmer pasándole **solo** la salida del fallo. Con 3 ciclos FAIL se activa el **circuit breaker** (AES 04 §9): detente y consulta al humano.
7. CI en verde → delega en **verifier** con este texto exacto:
   > Verifica la tarea `<ID>/<TASK>` en la rama actual contra su especificación, siguiendo tu contrato. Resultado de la CI: <enlace o resumen de los checks>.
8. FAIL del verificador → igual que el punto 6 (cuenta un ciclo). PASS → **GATE:** muéstrale al humano el informe del verificador y el PR; él aprueba y fusiona (squash).

## 4. Cierre de la historia
1. Con todas las tareas fusionadas: `git switch main && git pull`, ejecuta la suite completa y la aceptación de `<ID>`.
2. Prepara para el humano una **demo** concreta (comandos para arrancar y qué probar) y pídele `Accepted` o `Rejected`.
3. Si `Accepted`: rama `spec/<ID>-close` con:
   - estado de la historia y del backlog actualizados;
   - `<ID>` añadido a `specs/active-stories.txt` (desde ahora es regresión en `main`);
   - retrospectiva compuesta (AES 09 §3): patrones del registro de fallos y **un control propuesto por patrón**;
   - resumen en `docs/harness-findings.md`: tiempos por fase, ciclos FAIL, intervenciones humanas y bloqueos de hooks.
   PR y GATE de aprobación.

## Si algo no encaja
Si el harness no permite hacer algo de esta skill tal como está escrito, no improvises un atajo silencioso: hazlo de la forma más cercana posible, regístralo en `docs/harness-findings.md` y avísale al humano. Ese es el objetivo del experimento.
