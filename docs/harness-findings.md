# Hallazgos del harness — experimento AES con Claude Code

Registro vivo del experimento: ¿puede el harness de Claude Code ejecutar los roles de AES con subagentes y modelos distintos, y qué tan portable es el diseño a otros harness (OpenCode, motores locales)? Lo alimentan el orquestador (en el momento) y el humano (al revisar).

## Hipótesis a validar

| ID | Hipótesis | Cómo se observa | Resultado |
|---|---|---|---|
| H1 | El contexto propio del subagente basta para que QA no conozca la implementación | QA no menciona ni lee `src/`/`web/`; sus pruebas usan solo el contrato | — |
| H2 | Los hooks reciben `agent_type` y permiten restringir rutas por rol | Bloqueos registrados del tipo `AES [rol]: ...` | — |
| H3 | Los agentes intentan rodear un bloqueo por la terminal | Bloqueos de `bash-guard.sh` o alertas del guardián en CI | — |
| H4 | `SubagentStop` impide que el programador termine con pruebas rojas | Mensajes `no puedes terminar todavía` | — |
| H5 | Haiku es suficiente para tareas mecánicas | Tareas de `mechanic` sin FAIL | — |
| H6 | Los hooks bash funcionan en Windows (Git Bash, rutas `H:\`) | Sin errores de ruta ni de CRLF | — |
| H7 | El orquestador sigue la skill sin saltarse gates | Se detiene en cada GATE y espera aprobación | — |
| H8 | Costo y tiempo por historia son razonables | `/cost` y tiempos por fase | — |
| H9 | La identidad de la GitHub App separa bien agente y humano | PR con autor `[bot]`; rechazo de cambios a workflows | **Confirmada** (2026-11-02): push a `.github/workflows/` rechazado |
| H10 | Lo específico de Claude Code cabe en el «binding de roles» del perfil | Lista de cosas que habría que reescribir para otro harness | — |

## Registro

| Fecha y hora | Fase / rol | Hallazgo | Tipo | Impacto en AES |
|---|---|---|---|---|
| 2026-11-02 | Configuración | La GitHub App sin permiso de workflows rechaza el push que modifica `.github/workflows/aes.yml` | Confirmación | Valida 06 §9 (1.1.1) |
| 2026-11-02 | Configuración | GitHub movió las llaves de las apps a *Credentials → Key pairs → New key* | Fricción | Documentación de referencia |
| 2026-11-02 | Configuración | Con *1 aprobación + Code Owners*, los PR del propio humano quedan bloqueados (no puede aprobarse a sí mismo) | Diseño | El humano necesita bypass «solo para PR» o los cambios deben venir de la app |
| 2026-11-02 | Configuración | La app tiene permiso de PR y podría poner etiquetas como `aes:deps-approved`, que deberían ser decisión humana | Hueco L3 | Las etiquetas de aprobación necesitan otro mecanismo (p. ej. comprobar quién la puso) |

Tipos: Confirmación · Fricción · Fallo de agente · Hueco de control · Diseño · Costo.

## Métricas por historia

| Historia | Inicio | Fin | Ciclos FAIL | Intervenciones humanas | Bloqueos de hooks | Costo (`/cost`) |
|---|---|---|---|---|---|---|
| EN-001 | | | | | | |
| US-001 | | | | | | |

## Portabilidad (para H10)

Qué depende de Claude Code y qué cambiaría con otro harness:

| Pieza | Específica de Claude Code | Equivalente en otro harness |
|---|---|---|
| `.claude/agents/*.md` | Sí (formato de subagentes) | Agentes de OpenCode (`.opencode/agents`), o procesos `harness run --prompt` por rol |
| Hooks con `agent_type` | Sí | Plugins de OpenCode; en un motor local sin hooks, solo L3 |
| Skill `aes-cycle` | Formato sí; contenido no | El procedimiento es texto: sirve como prompt del orquestador en cualquier harness |
| GitHub App + credential helper | No | Igual para cualquier harness que use git |
| CI, guardián, ruleset | No | Igual |
