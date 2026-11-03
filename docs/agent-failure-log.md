# Agent Failure Log — Control de gastos

Registro de fallos observados en agentes y de los controles añadidos para evitarlos (AES 09). Se registran hechos observables, no juicios sobre el modelo.

## Patrones activos
| Patrón | Entradas | Control aplicado | Capa | Estado |
|---|---|---|---|---|
| Pruebas de aceptación sin criterio | FL-001 | Contrato de QA: cada prueba debe citar un ID de criterio existente; check en CI que compare los IDs de los títulos con la tabla de la historia | skill / L3 | Propuesto |

---

## FL-001 — 2026-11-02
- **Agente / harness / modelo:** qa / Claude Code / Sonnet
- **Tarea / historia:** EN-001, rama `qa/EN-001`
- **Síntoma:** añadió la prueba `AC-01 (negativo) una ruta inexistente de la API no responde ok de salud` (404 en `/api/no-existe`), que no corresponde a ningún criterio de EN-001. La declaró como «extra» en su reporte y en el plan.
- **Detectado por:** el orquestador la señaló en el PR #4; el humano la rechazó en la revisión («viola las reglas y no corresponde a ningún criterio existente»).
- **Causa probable:** el contrato de QA no prohíbe explícitamente pruebas sin criterio; el título reutilizaba el ID `AC-01`, así que la regla «ID del criterio en el título» se cumplía en la forma pero no en el fondo.
- **Control propuesto:** (1) CI: comprobar que cada prueba `@<ID>` cubre un criterio de la tabla y que no hay dos pruebas para un criterio sin justificación en el plan; (2) contrato de QA: «solo pruebas que verifiquen un criterio existente; si ves un hueco, propón un criterio nuevo en el plan, no una prueba».
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
