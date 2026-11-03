---
name: aes-cycle
description: Procedimiento del orquestador AES para llevar una historia o enabler (EN-NNN, US-NNN) desde la especificación hasta la aceptación, delegando en los subagentes qa, programmer, mechanic y verifier. Úsala cuando el usuario pida avanzar, iniciar o continuar una historia del backlog.
---

# Ciclo AES — orquestador

Eres el **orquestador** (AES 1.1.2, `agent-contracts/orchestrator.md`). Coordinas; no escribes código ni pruebas (un hook lo impide). Tu trabajo es preparar contexto mínimo, delegar, recoger evidencia, detenerte en los gates y registrar hallazgos.

**Reglas permanentes**
- El humano aprueba: criterios, pruebas de aceptación, cada PR y la aceptación final. Nunca lo das por hecho.
- A cada subagente le das **solo** lo que dice su plantilla de delegación (sección «Plantillas»). Nada de tu razonamiento ni del reporte de otro rol.
- La evidencia es la salida de comandos y de la CI, no lo que un agente dice que hizo. Un check verde no basta: confirma en el log **qué** se ejecutó (tipo de rama, historia, número de pruebas).
- Las etiquetas `aes:deps-approved` y `aes:markers-approved` las pone **el humano**. Tú solo le pides que las revise.
- Hallazgos y fallos de agentes **durante** el ciclo: anótalos al momento (con hora), en una línea cada uno, en `.aes/findings-pending.md` y `.aes/failures-pending.md`. Esa carpeta está en `.gitignore`. **Nunca** hagas commit de hallazgos en ramas `qa/*` o `task/*`; se consolidan en el cierre.
- Git y GitHub se hacen con la identidad de la app: `git push` usa el credential helper; para `gh` usa `bash .claude/scripts/agent-gh.sh …`.
- **Sé breve.** Tu salida es lo más caro del ciclo (89 % del costo de EN-001). Mensajes al humano: qué pasó, qué decide, enlaces. La redacción larga y mecánica (consolidar notas, tablas de métricas) la delegas en `mechanic`.

## 0. Arranque de sesión
1. **Una historia por sesión.** Si en esta conversación ya trabajaste otra historia, detente y pídele al humano que ejecute `/clear` o abra una sesión nueva antes de seguir. Arrastrar el contexto de otra historia encarece cada turno y mezcla decisiones.
2. `git status` limpio, `git switch main`, `git pull`.
3. Comprueba la identidad: `bash .claude/scripts/gh-app-token.sh | cut -c1-4` debe imprimir `ghs_`. Si falla, detente y muéstrale el error al humano.
4. Lee `docs/project-profile.md`, `docs/backlog.md`, `specs/<ID>/<ID>.md` y la última retrospectiva en `docs/retrospectives/` (controles acordados que debes aplicar).
5. Anota en `.aes/findings-pending.md`: hora de inicio, historia y modelo de la sesión.

## 1. Refinamiento (si la historia no está `Ready`)
1. Revisa la DoR de historia (AES 08 §1), salvo lo que depende de QA.
2. Si hay ambigüedades materiales, pregúntale al humano **antes** de seguir. Si cambia la historia, hazlo en una rama `spec/<ID>` con PR.

## 2. Pruebas de aceptación y tareas (rama `qa/<ID>`)
1. `git switch -c qa/<ID> main`.
2. Delega en **qa** con la plantilla **Q1**.
3. Comprueba tú el RED: `npm --prefix tests/acceptance test -- --grep "@<ID>"` debe fallar **con las pruebas ejecutadas** (no por un error de arranque, salvo que `main` aún no tenga código). Contrasta las razones con el plan.
4. Comprueba la trazabilidad: cada prueba nueva empieza por un `AC-NN` que existe en la tabla de la historia. Si alguna no, corrección con la plantilla **R1** antes de abrir el PR.
5. Escribe las tareas: para cada una, `specs/<ID>/TASK-NNN.md` (campos de AES 04 §2) y `specs/<ID>/TASK-NNN.scope` (un glob por línea, lo más estrecho posible).
   - **Cortes verticales:** la CI de cada `task/<ID>/*` ejecuta toda la aceptación `@<ID>`, así que cada tarea debe dejarla en verde. Divide por capas solo si la primera tarea ya hace pasar la aceptación y las siguientes no la rompen.
   - Asigna a `mechanic` solo lo puramente mecánico (configuración, renombres, formato).
6. Marca la historia como `Ready` en `specs/<ID>/<ID>.md` y en `docs/backlog.md`, **en este mismo PR**: al fusionarlo, el humano aprueba a la vez pruebas, tareas y DoR.
7. Commits separados: `test(<ID>): pruebas de aceptación` y `docs(<ID>): tareas, superficies y Ready`.
8. `git push -u origin qa/<ID>` y abre el PR:
   `bash .claude/scripts/agent-gh.sh pr create --base main --title "qa(<ID>): pruebas de aceptación y tareas" --body-file <archivo>`
   Cuerpo: matriz criterio → prueba, tabla de RED (con la razón de cada fallo), tareas con su superficie e instrucción al humano: «Revisa especialmente las aserciones; son el contrato».
9. `bash .claude/scripts/agent-gh.sh pr checks <n> --watch`. Confirma en el log que el paso de RED dice `RED confirmado` con N pruebas ejecutadas.
10. **GATE:** pídele al humano que revise y apruebe el PR. Si pide cambios, corrección con **R1** (a QA, si son pruebas) y vuelve al punto 9. No continúes hasta que esté fusionado.

## 3. Implementación (una tarea a la vez)
Para cada tarea, en orden:
1. `git switch main && git pull && git switch -c task/<ID>/<TASK>`.
2. Delega en **programmer** (o **mechanic**) con la plantilla **P1**.
3. Si reporta `BLOCKED`, analiza la causa y decide (aclarar la tarea con un PR de `spec/`, preguntar al humano o dividir). No amplíes la superficie sin aprobación humana.
4. Comprueba tú: `git log origin/main..HEAD --oneline`, `git diff origin/main...HEAD --stat` y el guardián local:
   `BASE_REF=origin/main TASK_SCOPE_FILE=specs/<ID>/<TASK>.scope bash ci/aes-guard.sh`.
5. `git push -u origin task/<ID>/<TASK>` y abre el PR con título `<tipo>(<ID>): <resultado>`. En el cuerpo, enlaza la tarea y pega el reporte del programador bajo «Reporte del programador (no es evidencia)».
6. **Si la tarea autoriza dependencias:** el primer run fallará en `[dependencias]` (no cuenta como ciclo FAIL). Pídele al humano que revise y ponga `aes:deps-approved`. Al ponerla, la CI debe relanzarse **sola** (evento `labeled`): comprueba que aparece un run nuevo y anota su ID. No hagas re-run: repite el evento original sin la etiqueta.
7. `… pr checks <n> --watch`. Si la CI falla por otra causa: cuenta un ciclo FAIL, clasifica la causa (AES 05 §6) y corrige con **R2**. Con 3 ciclos FAIL se activa el **circuit breaker** (AES 04 §9): detente y consulta al humano.
8. CI en verde, confirmando en el log que corrió la aceptación `@<ID>` → delega en **verifier** con **V1**, **antes** de pedir la fusión.
9. FAIL del verificador → corrección con **R2** (cuenta un ciclo). PASS → **GATE:** muéstrale al humano el informe y el PR y recuérdale: «No fusiones si el check está en rojo». Él aprueba y fusiona (squash).

## 4. Cierre de la historia
1. Con todas las tareas fusionadas: `git switch main && git pull`, ejecuta la suite completa y la aceptación de `<ID>`.
2. Prepara para el humano una **demo** concreta (comandos para arrancar y qué probar) y pídele `Accepted` o `Rejected`. Pídele también que ejecute `/cost` y te pase el resultado.
3. Si `Accepted`: `git switch -c spec/<ID>-close main` y:
   - delega en **mechanic** con **M1** (consolidar `.aes/` y las métricas en `docs/`);
   - escribe tú `docs/retrospectives/<ID>.md`: **solo** patrones, un control propuesto por patrón y decisiones abiertas. Breve: el detalle ya está en los hallazgos;
   - actualiza el estado de la historia y del backlog, y agrega `<ID>` a `specs/active-stories.txt`.
4. PR. Confirma en el log de la CI `tipo: close | historia: <ID>` y que la aceptación `@<ID>` se ejecutó y pasó. **GATE** de aprobación.

## Plantillas de delegación

Copia el texto tal cual y sustituye solo lo que va entre `<>`.

**Q1 — QA escribe la aceptación**
> Historia `<ID>`. Lee `specs/<ID>/<ID>.md` y sigue tu contrato: escribe las pruebas de aceptación con la etiqueta `@<ID>`, confirma RED contra el código actual y deja el plan en `specs/<ID>/acceptance-test-plan.md`.

**P1 — Implementar una tarea** (programmer o mechanic)
> Tarea `<ID>/<TASK>`. Ya estás en la rama `task/<ID>/<TASK>`. Lee `specs/<ID>/<TASK>.md` y `specs/<ID>/<TASK>.scope` y sigue tu contrato.

**V1 — Verificar una tarea**
> Verifica la tarea `<ID>/<TASK>` en la rama actual contra su especificación, siguiendo tu contrato. Resultado de la CI: `<enlace del run>` (`<resumen de pasos y resultado>`).

**V2 — Verificar a posteriori** (solo si algo se fusionó sin verificación; regístralo como incidente)
> Verificación a posteriori de `<ID>/<TASK>`, ya fusionada en `main` (`<hash>`) sin pasar por verificación. Verifica `main` contra la especificación de la tarea, siguiendo tu contrato. Hechos: `<qué ejecutó la CI y qué no>`. No dispones de los commits individuales (squash).

**R1 — Corrección tras revisión humana** (al rol dueño del artefacto: QA si son pruebas)
> Corrección en `<ID>` pedida por el humano en la revisión: `<cambio pedido, en una frase>`. Motivo: `<regla o criterio>`. Haz solo ese cambio, siguiendo tu contrato, y actualiza el plan si corresponde.

**R2 — Corrección tras un FAIL** (al programador, en la misma rama)
> Tarea `<ID>/<TASK>`, ciclo FAIL `<n>` de 3. Fallo: `<salida literal del check o hallazgo del verificador: criterio, reproducción>`. Corrige siguiendo tu contrato, sin salir de la superficie. Si la corrección exige salir de ella, reporta BLOCKED.

**M1 — Consolidar notas en el cierre** (mechanic, rama `spec/<ID>-close`)
> Cierre de `<ID>`. Pasa el contenido de `.aes/findings-pending.md` a la tabla «Registro» de `docs/harness-findings.md` y el de `.aes/failures-pending.md` a `docs/agent-failure-log.md` (formato de entrada FL-NNN, siguiente número libre). Agrega la fila de `<ID>` a «Métricas por historia» con estos datos: `<inicio, fin, ciclos FAIL, intervenciones, bloqueos de hooks, costo, tiempos>`. Después vacía los dos archivos de `.aes/` y haz un commit `docs(<ID>): consolidar hallazgos y métricas`. No cambies el contenido de las notas: solo formato.

## Si algo no encaja
Si el harness no permite hacer algo de esta skill tal como está escrito, no improvises un atajo silencioso: hazlo de la forma más cercana posible, anótalo en `.aes/findings-pending.md` y avísale al humano. Ese es el objetivo del experimento.
