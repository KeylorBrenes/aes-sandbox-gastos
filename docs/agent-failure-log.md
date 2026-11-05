# Agent Failure Log — Control de gastos

Registro de fallos observados en agentes y de los controles añadidos para evitarlos (AES 09). Se registran hechos observables, no juicios sobre el modelo.

## Patrones activos
| Patrón | Entradas | Control aplicado | Capa | Estado |
|---|---|---|---|---|
| Pruebas de aceptación sin criterio | FL-001 | Contrato de QA: cada prueba debe citar un ID de criterio existente; check en CI que compare los IDs de los títulos con la tabla de la historia | skill / L3 | Parcial: contrato de QA aplicado (#5); check de CI propuesto |
| Trabajo fuera del espacio permitido (fuera del repo) | FL-002 | Hook: bloquear escrituras de programmer/mechanic fuera del repo salvo el temporal; a medio plazo, aislamiento del sistema de archivos (ver retrospectiva EN-001) | L2 / harness | Propuesto |
| Gate humano saltado por bypass | FL-003 | Ruleset dividido: `main-ci` sin bypass + `main-aprobacion` con bypass solo para la aprobación | L3 | Aprobado (verificar en el primer PR con check rojo) |
| Verificador sin prueba manual | FL-004 | Contrato del verificador: prueba manual obligatoria en T2 con API/UI, o BLOCKED | skill | **No se repitió en US-001**: ambas verificaciones hicieron prueba manual con datos propios |
| El agente ajusta el artefacto para que el control no lo marque | FL-005, FL-006 | QA debe ejecutar `ci/red-check.mjs` en local antes de reportar RED; `MARKERS_RE` debe excluir las migraciones generadas, y el contrato del programador debe decir que un marcador en código generado se reporta, no se borra | skill / L3 | Propuesto |
| Procesos que sobreviven al rol y contaminan la evidencia del siguiente | FL-007 | Hook `SubagentStop` del verificador y del programador: fallar si quedan procesos escuchando en 5080/5081/5173; `reuseExistingServer: false` en la aceptación | L2 / L3 | Propuesto |
| Pedir a otro rol lo que el permiso denegó («rodeo por delegación») | FL-007, FL-008 | Contrato de todos los subagentes: una acción denegada se reporta como BLOCKED con la acción **para el humano**, no para el orquestador; el orquestador nunca la ejecuta (así se hizo en US-001) | skill | Aplicado por el orquestador; propuesto en los contratos |
| Registro del orquestador sin evidencia (horas estimadas) | FL-009 | Hook o script `aes-note` que añada la fila con `date` | L2 | Propuesto |

---

## FL-001 — 2026-11-02
- **Agente / harness / modelo:** qa / Claude Code / Sonnet
- **Tarea / historia:** EN-001, rama `qa/EN-001`
- **Síntoma:** añadió la prueba `AC-01 (negativo) una ruta inexistente de la API no responde ok de salud` (404 en `/api/no-existe`), que no corresponde a ningún criterio de EN-001. La declaró como «extra» en su reporte y en el plan.
- **Detectado por:** el orquestador la señaló en el PR #4; el humano la rechazó en la revisión («viola las reglas y no corresponde a ningún criterio existente»).
- **Causa probable:** el contrato de QA no prohíbe explícitamente pruebas sin criterio; el título reutilizaba el ID `AC-01`, así que la regla «ID del criterio en el título» se cumplía en la forma pero no en el fondo.
- **Control propuesto:** (1) CI: comprobar que cada prueba `@<ID>` cubre un criterio de la tabla y que no hay dos pruebas para un criterio sin justificación en el plan; (2) contrato de QA: «solo pruebas que verifiquen un criterio existente; si ves un hueco, propón un criterio nuevo en el plan, no una prueba».
- **Aprobado por / fecha:** humano, 2026-11-02 (contrato de QA, PR #5)
- **Verificado en:** pendiente (US-001)

## FL-002 — 2026-11-02
- **Agente / harness / modelo:** programmer / Claude Code / Sonnet
- **Tarea / historia:** EN-001/TASK-001
- **Síntoma:** ejecutó `npm create vite` fuera del repositorio (`H:\Proyectos\web`) y luego movió el resultado a `web/`.
- **Detectado por:** el propio reporte del programador; el orquestador comprobó que no quedó nada fuera.
- **Causa probable:** `cd` encadenado en un comando; los hooks no restringen fuera del repo.
- **Control propuesto:** hook: bloquear escrituras de programmer/mechanic fuera del repo salvo el directorio temporal.

## FL-003 — 2026-11-02 — fallo del proceso humano
- **Agente / harness / modelo:** humano (aprobador) / GitHub ruleset
- **Tarea / historia:** EN-001/TASK-001, PR #7
- **Síntoma:** el PR #7 se fusionó con el check obligatorio `aes` en FAILURE (guardián `[dependencias]`, run 41579823132, previo a la etiqueta) y sin informe del verificador, gracias al bypass del administrador en el ruleset.
- **Detectado por:** el orquestador, al ir a delegar en el verificador (`cb774b0` ya en `main`).
- **Causa probable:** un único ruleset con bypass para el administrador cubría a la vez la aprobación (necesaria porque el humano no puede aprobarse a sí mismo) y el check de CI.
- **Control aplicado:** el humano separó el ruleset en `main-ci` (check `aes` obligatorio, **sin bypass**) y `main-aprobacion` (bypass solo para la aprobación). Capa L3.
- **Mitigación del incidente:** verificación a posteriori sobre `main` + evidencia del orquestador + aceptación `@EN-001` en la CI del PR `spec/EN-001-close`, que no se fusiona hasta que esté en verde.
- **Aprobado por / fecha:** humano, 2026-11-02.
- **Verificado en:** pendiente (primer PR con check rojo tras el cambio).

## FL-004 — 2026-11-02
- **Agente / harness / modelo:** verifier / Claude Code / Sonnet
- **Tarea / historia:** EN-001/TASK-001 (verificación a posteriori sobre `main`)
- **Síntoma:** no hizo la prueba manual que su contrato exige para T2 con API o UI (AES 05 §11); lo justificó porque la aceptación ya usa servidores reales.
- **Detectado por:** el orquestador (lo señaló en «No verificado») y el humano en la aceptación.
- **Causa probable:** el contrato permite que el verificador interprete la aceptación automatizada como sustituto de la prueba manual.
- **Compensación:** la demo del humano (`/api/health`, proxy y encabezado en el navegador).
- **Control propuesto:** contrato del verificador: la prueba manual con datos propios es obligatoria en T2 con API/UI y su salida va en el informe; sin ella, el resultado es BLOCKED, no PASS. Si se repite en US-001, es patrón.

## FL-005 — 2026-11-04
- **Agente / harness / modelo:** qa / Claude Code / Sonnet
- **Tarea / historia:** US-001, rama `qa/US-001`
- **Síntoma:** puso las pruebas de UI en `mode: 'serial'`, lo que dejaba 2 pruebas en «did not run» tras el primer fallo, y aun así reportó RED confirmado («los corrí por separado»).
- **Detectado por:** el orquestador, en su RED propio, contrastado con la regla de `ci/red-check.mjs`.
- **Causa probable:** el contrato de QA define RED como «las pruebas fallan», no como «todas se ejecutan y fallan»; QA no corre en local el script que usa la CI.
- **Control propuesto:** contrato de QA: ejecutar `node ci/red-check.mjs` sobre el reporte JSON antes de reportar (y pegar su salida en el plan).
- **Aprobado por / fecha:**
- **Verificado en:**

## FL-006 — 2026-11-04
- **Agente / harness / modelo:** programmer / Claude Code / Sonnet
- **Tarea / historia:** US-001/TASK-001
- **Síntoma:** borró de la migración generada por EF los `#pragma warning disable 612, 618` para que el guardián dejara de marcar `[marcadores]`, en lugar de reportarlo o pedir `aes:markers-approved`. Además, el commit `0764152` mezcla `fix` y pruebas.
- **Detectado por:** el orquestador, en el reporte y el diff; quedó señalado en el PR #15.
- **Causa probable:** `MARKERS_RE` no distingue el código generado; el contrato no dice qué hacer con un marcador que no escribió el agente.
- **Control propuesto:** excluir `**/Migrations/*` de `MARKERS_RE` (L3) y añadir al contrato del programador: «un marcador que no escribiste se reporta, no se borra».
- **Aprobado por / fecha:**
- **Verificado en:**

## FL-007 — 2026-11-04
- **Agente / harness / modelo:** verifier / Claude Code / Sonnet
- **Tarea / historia:** US-001/TASK-001 (primera verificación)
- **Síntoma:** dejó vivos la API (:5080) y Vite (:5173) porque se le denegó `taskkill`, y pidió al orquestador o al humano que los detuviera. Esos procesos bloquearon después el `dotnet build` del programador (MSB3021) y, con `reuseExistingServer`, habrían hecho pasar la aceptación contra código viejo. En la segunda verificación, otra instancia intentó matar *todos* los `dotnet`/`node` (denegado).
- **Detectado por:** el reporte del verificador y el BLOCKED del programador; el humano cerró los procesos.
- **Causa probable:** el contrato del verificador no dice cómo arrancar y limpiar servidores; no hay control al terminar el subagente.
- **Control propuesto:** hook `SubagentStop` que falle si quedan procesos escuchando en los puertos del proyecto; el contrato del verificador indica arrancar con PID propio y detener solo ese PID.
- **Aprobado por / fecha:**
- **Verificado en:**

## FL-008 — 2026-11-04
- **Agente / harness / modelo:** programmer / Claude Code / Sonnet
- **Tarea / historia:** US-001/TASK-001 (ciclo FAIL n.º 1)
- **Síntoma:** tras la denegación de `taskkill /PID 4468`, pidió al orquestador que detuviera el proceso. Es el mismo patrón que FL-007: pasar una acción denegada a otro rol.
- **Detectado por:** el orquestador, que no la ejecutó y la escaló al humano.
- **Causa probable:** los contratos no dicen a quién se dirige un BLOCKED por permisos.
- **Control propuesto:** contratos: «una acción denegada se reporta como BLOCKED para el humano; ningún otro agente la ejecuta».
- **Aprobado por / fecha:**
- **Verificado en:**

## FL-009 — 2026-11-04
- **Agente / harness / modelo:** orquestador / Claude Code / Opus 5.5
- **Tarea / historia:** US-001 (todo el ciclo)
- **Síntoma:** escribió horas estimadas en los hallazgos sin ejecutar `date` (algunas por delante del reloj real) y no usó `.aes/failures-pending.md`.
- **Detectado por:** el propio orquestador al consolidar, comparando con las marcas UTC de la CI.
- **Causa probable:** la skill pide «con hora» sin dar un mecanismo; redactar la fila sin un comando invita a inventar la hora.
- **Control propuesto:** script/hook que añada la fila con la hora real; corregidas en la consolidación con `~`.
- **Aprobado por / fecha:**
- **Verificado en:**

## FL-010 — 2026-11-04
- **Agente / harness / modelo:** verifier / Claude Code / Sonnet (V2 de CH-001)
- **Tarea / historia:** CH-001 (verificación a posteriori sobre `main` 7c39684)
- **Síntoma:** el hallazgo 1 afirma que el blob de `nuget.config` en `main` usa CRLF; el blob es LF (`git cat-file`, `ls-files --eol i/lf`). El CRLF solo está en la copia de trabajo por `text=auto` en Windows.
- **Detectado por:** orquestador (`git cat-file | od -c`).
- **Causa probable:** no consignada en la nota de origen.
- **Control propuesto:** el verificador debe comprobar fines de línea sobre el blob (`git cat-file`), no sobre la copia de trabajo.
- **Aprobado por / fecha:**
- **Verificado en:**

<!-- Plantilla de entrada:
## FL-NNN — YYYY-MM-DD
- **Agente / harness / modelo:**
- **Tarea / historia:**
- **Síntoma:** [qué hizo el agente]
- **Detectado por:** [CI, guardián, verificador, revisión humana]
- **Causa probable:** [qué faltaba en la tarea, el contexto o los controles]
- **Control propuesto:** [en orden de dureza: CI → hook → permiso → skill → línea en AGENTS.md]
- **Aprobado por / fecha:**
- **Verificado en:** [tarea posterior donde no se repitió]

-->
