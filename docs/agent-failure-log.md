# Agent Failure Log — Control de gastos

Registro de fallos observados en agentes y de los controles añadidos para evitarlos (AES 09). Se registran hechos observables, no juicios sobre el modelo.

## Patrones activos
| Patrón | Entradas | Control aplicado | Capa | Estado |
|---|---|---|---|---|
| Pruebas de aceptación sin criterio | FL-001 | Contrato de QA: cada prueba debe citar un ID de criterio existente; check en CI que compare los IDs de los títulos con la tabla de la historia | skill / L3 | Parcial: contrato de QA aplicado (#5); check de CI propuesto |
| Trabajo fuera del espacio permitido (fuera del repo) | FL-002 | Hook: bloquear escrituras de programmer/mechanic fuera del repo salvo el temporal; a medio plazo, aislamiento del sistema de archivos (ver retrospectiva EN-001) | L2 / harness | Propuesto |
| Gate humano saltado por bypass | FL-003 | Ruleset dividido: `main-ci` sin bypass + `main-aprobacion` con bypass solo para la aprobación | L3 | Aprobado (verificar en el primer PR con check rojo) |
| Verificador sin prueba manual | FL-004 | Contrato del verificador: prueba manual obligatoria en T2 con API/UI, o BLOCKED. Patrón si se repite en US-001 | skill | Propuesto |

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
