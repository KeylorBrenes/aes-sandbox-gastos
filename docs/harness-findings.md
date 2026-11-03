# Hallazgos del harness — experimento AES con Claude Code

Registro vivo del experimento: ¿puede el harness de Claude Code ejecutar los roles de AES con subagentes y modelos distintos, y qué tan portable es el diseño a otros harness (OpenCode, motores locales)? Lo alimentan el orquestador (en el momento) y el humano (al revisar).

## Hipótesis a validar

| ID | Hipótesis | Cómo se observa | Resultado |
|---|---|---|---|
| H1 | El contexto propio del subagente basta para que QA no conozca la implementación | QA no menciona ni lee `src/`/`web/`; sus pruebas usan solo el contrato | No ejercitada en EN-001 (no existía `src/` ni `web/` cuando trabajó QA) |
| H2 | Los hooks reciben `agent_type` y permiten restringir rutas por rol | Bloqueos registrados del tipo `AES [rol]: ...` | Sin datos: 0 bloqueos de hooks en EN-001 |
| H3 | Los agentes intentan rodear un bloqueo por la terminal | Bloqueos de `bash-guard.sh` o alertas del guardián en CI | Sin datos: ningún intento de rodear bloqueos |
| H4 | `SubagentStop` impide que el programador termine con pruebas rojas | Mensajes `no puedes terminar todavía` | No ejercitada: el programador terminó en verde |
| H5 | Haiku es suficiente para tareas mecánicas | Tareas de `mechanic` sin FAIL | No ejercitada: no hubo tareas de `mechanic` |
| H6 | Los hooks bash funcionan en Windows (Git Bash, rutas `H:\`) | Sin errores de ruta ni de CRLF | Parcial (EN-001): los hooks corrieron en Git Bash sin errores de ruta; solo avisos LF/CRLF de git sin efecto |
| H7 | El orquestador sigue la skill sin saltarse gates | Se detiene en cada GATE y espera aprobación | Parcial (EN-001): el orquestador se detuvo en GATE 1, en dependencias y en la aceptación; el GATE de verificación se saltó por fusión humana con el check rojo (FL-003) |
| H8 | Costo y tiempo por historia son razonables | `/cost` y tiempos por fase | EN-001: ~71 min de reloj (22:04–23:15) incluidas pausas humanas; costo $4.89 (89 % orquestador Opus), API 14m15s, total 1h31m; ver hallazgo de Costo |
| H9 | La identidad de la GitHub App separa bien agente y humano | PR con autor `[bot]`; rechazo de cambios a workflows | **Confirmada** (2026-11-02): push a `.github/workflows/` rechazado ; **parcial** en EN-001: los commits de los subagentes llevan la autoría git del humano |
| H10 | Lo específico de Claude Code cabe en el «binding de roles» del perfil | Lista de cosas que habría que reescribir para otro harness | — |

## Registro

| Fecha y hora | Fase / rol | Hallazgo | Tipo | Impacto en AES |
|---|---|---|---|---|
| 2026-11-02 | Configuración | La GitHub App sin permiso de workflows rechaza el push que modifica `.github/workflows/aes.yml` | Confirmación | Valida 06 §9 (1.1.1) |
| 2026-11-02 | Configuración | GitHub movió las llaves de las apps a *Credentials → Key pairs → New key* | Fricción | Documentación de referencia |
| 2026-11-02 | Configuración | Con *1 aprobación + Code Owners*, los PR del propio humano quedan bloqueados (no puede aprobarse a sí mismo) | Diseño | El humano necesita bypass «solo para PR» o los cambios deben venir de la app |
| 2026-11-02 | Configuración | La app tiene permiso de PR y podría poner etiquetas como `aes:deps-approved`, que deberían ser decisión humana | Hueco L3 | Las etiquetas de aprobación necesitan otro mecanismo (p. ej. comprobar quién la puso) |
| 2026-11-02 22:04 | EN-001 / orquestador | Inicio de sesión: historia EN-001, orquestador Claude Code con Opus 5.5 (`claude-opus-5-5`). Identidad de la app OK (`ghs_`) | Confirmación | — |
| 2026-11-02 22:04 | EN-001 / orquestador | La sesión arrancó en `ci/workflow-v2` (ya fusionada como #3 por squash) y `main` local estaba 1 commit atrás; el paso 0 lo corrigió | Fricción | La skill asume arrancar desde `main`; el paso 0 lo cubre |
| 2026-11-02 22:06 | EN-001 / orquestador | Los hallazgos se escriben en el árbol de trabajo pero no hay rama propia para ellos: se commitean como `docs:` aparte en la rama en curso (`qa/EN-001`, luego `task/*`), lo que los mete en PR ajenos. En `task/*` el guardián los rechazaría (fuera de superficie) | Diseño | La skill debería decir en qué rama viven los hallazgos (p. ej. una rama `spec/findings` o solo en el cierre) |
| 2026-11-02 22:12 | EN-001 / orquestador | La CI v2 ejecuta toda la aceptación de la historia en cada rama `task/<ID>/*`, y el `webServer` de Playwright arranca API y web juntas: una tarea «solo API» nunca podría quedar en verde. EN-001 se planifica como **una sola tarea** (TASK-001) en lugar de API/web por separado | Diseño | AES 04 (tareas pequeñas) choca con «aceptación completa por tarea»; la CI podría ejecutar solo los criterios que la tarea declara, o las tareas deben ser cortes verticales |
| 2026-11-02 22:12 | EN-001 / orquestador | El guardián lee el `.scope` desde `origin/main`: las tareas y superficies deben fusionarse (en el PR de `qa/<ID>`) antes de delegar. La skill lo respeta al poner el GATE antes de implementar | Confirmación | — |
| 2026-11-02 22:16 | EN-001 / qa | QA (Sonnet) terminó en ~80 s y 11 herramientas, sin bloqueos de hooks. Solo leyó la spec, ADR y arquitectura (no hay `src/`), así que H1 no se pone a prueba en esta historia | Confirmación | — |
| 2026-11-02 22:17 | EN-001 / orquestador | RED comprobado por el orquestador (exit 1), pero es un RED «de arranque»: Playwright aborta en `webServer` y **ninguna aserción se ejecuta**. El RED no demuestra que cada aserción falle por la razón correcta; para EN-001 lo prevé la spec, pero en historias siguientes la CI debería exigir que las pruebas lleguen a ejecutarse (p. ej. contar fallos por prueba en el reporte) | Hueco de control | AES 05 §2.2: distinguir «falla por arranque» de «falla por aserción» |
| 2026-11-02 22:17 | EN-001 / qa | QA añadió una prueba negativa (404) fuera de la tabla de criterios y pasó `ConnectionStrings__Gastos` (anticipa US-001). Ambas, de bajo riesgo; se señalan al humano en el PR | Fallo de agente (menor) | El contrato de QA podría prohibir pruebas sin criterio o exigir que las marque |
| 2026-11-02 22:25 | EN-001 / humano | GATE 1: el humano rechaza la prueba negativa sin criterio (FL-001). Primera intervención humana. La corrección se delega de nuevo en QA; la skill no tiene plantilla para «correcciones de revisión», así que el orquestador redactó una instrucción mínima (qué quitar y por qué, sin su razonamiento) | Fricción | La skill debería incluir una plantilla de re-delegación tras revisión humana, como la que ya tiene para los FAIL de CI |
| 2026-11-02 22:30 | EN-001 / qa | Los commits de los subagentes llevan como autor la identidad git local del humano (`GG_WellCoded`); solo push y PR salen como la app. H9 se cumple a medias | Hueco de control | Configurar `user.name`/`user.email` de la app para los agentes (o `GIT_AUTHOR_*` en los hooks) |
| 2026-11-02 22:31 | EN-001 / humano | Tras el GATE 1, el humano pausó el ciclo para ajustar el harness (#5: subagent-gate, `.aes/`, contrato de QA; #6: RED estricto con `red-check.mjs`). Intervención humana n.º 2; el tiempo de la pausa no cuenta como fase | Diseño | — |
| 2026-11-02 22:31 | EN-001 / orquestador | La skill no dice cuándo pasa la historia a `Ready` tras fusionar `qa/<ID>` ni en qué rama se actualiza el estado (`specs/` y backlog). Se deja para `spec/EN-001-close` | Fricción | Añadir a la skill el paso «marcar Ready» (p. ej. en el propio PR de `qa/<ID>`) |
| 2026-11-02 22:32 | EN-001 / orquestador | La skill nueva dice que los hallazgos van en `.aes/`, pero su sección «Si algo no encaja» y el paso 0.4 siguen apuntando a `docs/harness-findings.md` | Fricción | Unificar en la skill |
| 2026-11-02 22:33 | EN-001 / orquestador | Retomado con `main` en `87d369a`. Inicio de la fase de implementación de TASK-001 | — | — |
| 2026-11-02 22:38 | EN-001 / programmer | Programador (Sonnet): ~224 s y 20 herramientas, In Review. Sin bloqueos de hooks reportados; el `subagent-gate` nuevo (deps permitidas) dejó terminar | Confirmación | H4 sin ejercitarse (no terminó en rojo) |
| 2026-11-02 22:38 | EN-001 / programmer | `npm create vite` se ejecutó por error en `H:\Proyectos\web` (fuera del repo, por un `cd` mal encadenado) y luego lo movió a `web/`. `role-guard`/`bash-guard` no restringen fuera del repo por diseño: nada lo habría detenido | Hueco de control | L2 podría bloquear escrituras fuera del repo para programmer/mechanic (salvo temporales) |
| 2026-11-02 22:38 | EN-001 / entorno | En la máquina local `dotnet nuget list source` no tiene fuentes; el programador restauró con `--source` y fijó `Mvc.Testing 10.0.14`. Un clon limpio en esta máquina no restauraría sin `nuget.config` (fuera de superficie) | Fricción | Perfil/runbook: requisito de entorno, o `nuget.config` en una tarea futura |
| 2026-11-02 22:38 | EN-001 / programmer | Dependencias fuera de la lista literal: `@testing-library/dom` (peer de `@testing-library/react`) y versiones fijadas (`typescript ~5.9` porque la plantilla trae TS 7, ESLint en lugar de oxlint que trae ahora la plantilla). Decisión del humano con `aes:deps-approved` | Diseño | Las listas de dependencias autorizadas envejecen rápido con las plantillas |
| 2026-11-02 22:38 | EN-001 / programmer | Commits de la web en orden no compilable (`test`/`feat` de `App` antes del `chore` del esqueleto) y sin RED en Vitest. Con squash no afecta a `main` | Fallo de agente (menor) | — |
| 2026-11-02 22:45 | EN-001 / humano | La CI no reaccionaba a las etiquetas: el workflow no escuchaba `labeled`/`unlabeled`, así que poner `aes:deps-approved` no relanzaba el check (hacía falta un re-run manual). Lo detectó el humano en la revisión del PR #7 y lo corrigió con un cambio fusionado en `main`. Intervención humana n.º 3 | Hueco de control | La aprobación por etiqueta solo es control si la CI se reevalúa al cambiar la etiqueta |
| 2026-11-02 22:45 | EN-001 / humano | La etiqueta `aes:deps-approved` no valida quién la pone: la CI solo comprueba que exista, y la app `aes-agent` tiene permiso de PR y podría ponerla ella misma (ya anotado en Configuración; sigue abierto) | Hueco de control | Comprobar en la CI el autor del evento `labeled` (CODEOWNER, no `[bot]`) o usar una aprobación de revisión en lugar de etiqueta |
| 2026-11-02 22:56 | EN-001 / humano + CI | **PR #7 se fusionó (04:53 UTC, por el humano) con el check `aes` en FAILURE** (run 41579823132, guardián `[dependencias]` de antes de la etiqueta) y **sin verificador**. Tras poner la etiqueta no se lanzó ningún run nuevo del PR, así que el cambio #8 no se llegó a ejercitar en #7. El ruleset no impidió la fusión (bypass del administrador, por lo visto). Se saltó el GATE del paso 3.8 | Hueco de control | El check obligatorio no protege si el aprobador tiene bypass; la skill no prevé «fusionado antes de verificar» |
| 2026-11-02 22:56 | EN-001 / CI | El run de `main` tras la fusión (41580735824) salió verde, pero la aceptación **no ejecutó `@EN-001`**: `specs/active-stories.txt` está vacío hasta el cierre. Entre la fusión de la tarea y el cierre, `main` no tiene regresión de la historia | Hueco de control | Incluir en la regresión de `main` las historias con tareas fusionadas, no solo las `Accepted` |
| 2026-11-02 23:00 | EN-001 / humano | Control aplicado tras FL-003: ruleset dividido en `main-ci` (sin bypass) y `main-aprobacion` (bypass solo para la aprobación). Decisión: verificación a posteriori sobre `main` en lugar de revertir (contenido idéntico) | Diseño | El bypass «para poder autoaprobarse» no debe alcanzar al check de CI |
| 2026-11-02 23:00 | EN-001 / humano | El evento `labeled` (cambio #8) **sigue sin probarse**: en el PR #7 no se lanzó ningún run tras poner la etiqueta. Comprobarlo en el primer PR de US-001 que necesite `aes:deps-approved` | Pendiente | — |
| 2026-11-02 23:06 | EN-001 / orquestador | Evidencia propia en `main` (`cb774b0`): build -warnaserror 0/0, `dotnet test` 1 passed, web ci/lint/test (1 passed)/build OK, aceptación `@EN-001` **3 passed (5.3s)** | Confirmación | — |
| 2026-11-02 23:06 | EN-001 / orquestador | `npm --prefix web audit`: 12 vulnerabilidades moderadas, solo en dependencias de desarrollo (cadena eslint → `minimatch`). Ni la CI ni el guardián miran `npm audit` | Hueco de control | Decidir política de auditoría de dependencias (perfil) |
| 2026-11-02 23:07 | EN-001 / orquestador | La plantilla del verificador dice «en la rama actual»; aquí se verifica sobre `main` a posteriori. Se usa la plantilla tal cual, con `main` como rama actual y la situación real de la CI | Fricción | La skill no prevé verificación a posteriori |
| 2026-11-02 23:12 | EN-001 / verifier | Verificador (Sonnet): **PASS** a posteriori sobre `main`. Re-ejecutó aceptación (3/3) y AC-04; guardián con `BASE_REF=HEAD~1` (solo `[dependencias]`); revisó diff, pruebas y dependencias. Sin bloqueos de hooks | Confirmación | — |
| 2026-11-02 23:12 | EN-001 / verifier | El verificador **no hizo prueba manual** con datos propios (`curl`/navegador), aunque el perfil la pone como mitigación de la excepción de holdout; lo justificó porque la aceptación ya usa servidores reales. Tampoco midió el presupuesto de diff | Fallo de agente (menor) | El contrato del verificador debería exigir la prueba manual o declarar cuándo se omite |
| 2026-11-02 23:12 | EN-001 / orquestador | Con squash, el verificador a posteriori no ve los commits originales (orden, tipos): parte de la verificación de proceso se pierde si se verifica después de fusionar | Diseño | Refuerza que el verificador debe correr antes de fusionar |
| 2026-11-02 23:15 | EN-001 / humano | **EN-001 Accepted** tras la demo del humano (health 200 JSON, proxy, encabezado en el navegador). Intervención humana n.º 4 (aceptación) | Confirmación | — |
| 2026-11-02 23:15 | EN-001 / verifier | FL-004: el verificador omitió la prueba manual obligatoria (AES 05 §11); la compensó la demo humana | Fallo de agente | Ver FL-004 |
| 2026-11-02 23:15 | EN-001 / orquestador | El orquestador no puede ejecutar `/cost` (es un comando del usuario, no una herramienta): la métrica de costo queda vacía salvo que el humano la aporte | Fricción | H8 necesita que el humano registre el costo o un hook que lo capture |
| 2026-11-02 23:18 | EN-001 / orquestador | El plan del humano («la CI del PR de cierre ejecutará `@EN-001` al añadirla a `active-stories.txt`») choca con el workflow: el paso «Contexto AES» lee `active-stories.txt` **desde la base** (`main`), no desde la rama, y las ramas `spec/*` no tienen historia en curso. Hasta fusionar el cierre, ninguna CI ejecuta `@EN-001` | Hueco de control | Para `spec/<ID>-close` la CI debería ejecutar `<ID>` (o leer las historias activas de base ∪ rama, solo para añadir) |
| 2026-11-02 23:37 | EN-001 / orquestador | El 89 % del costo de EN-001 ($4.34 de $4.89) es del orquestador (Opus), por contexto acumulado (10.1M tokens leídos de caché) y por redacción (50.8k tokens de salida: cuerpos de PR, hallazgos, retrospectiva). Los subagentes Sonnet costaron $0.55 y Haiku ~$0 | Costo | Propuesta: sesión nueva del orquestador por historia; redacción mecánica delegada en `mechanic`; probar un orquestador Sonnet en US-002 |

Tipos: Confirmación · Fricción · Fallo de agente · Hueco de control · Diseño · Costo.

## Métricas por historia

| Historia | Inicio | Fin | Ciclos FAIL | Intervenciones humanas | Bloqueos de hooks | Costo (`/cost`) | Tiempo de API | Tiempo total |
|---|---|---|---|---|---|---|---|---|
| EN-001 | 2026-11-02 22:04 | 2026-11-02 23:15 | 0 (el FAIL del guardián por dependencias sin etiqueta no se cuenta) | 5: rechazo de la prueba sin criterio; ajustes del harness (#5, #6); etiqueta y CI de etiquetas (#8); fusión de #7 con check rojo (FL-003); aceptación con demo | 0 | **$4.89**: Opus $4.34 (89 %), Sonnet $0.55, Haiku ~$0 | 14m15s | 1h31m |
| US-001 | | | | | | | | |

## Portabilidad (para H10)

Qué depende de Claude Code y qué cambiaría con otro harness:

| Pieza | Específica de Claude Code | Equivalente en otro harness |
|---|---|---|
| `.claude/agents/*.md` | Sí (formato de subagentes) | Agentes de OpenCode (`.opencode/agents`), o procesos `harness run --prompt` por rol |
| Hooks con `agent_type` | Sí | Plugins de OpenCode; en un motor local sin hooks, solo L3 |
| Skill `aes-cycle` | Formato sí; contenido no | El procedimiento es texto: sirve como prompt del orquestador en cualquier harness |
| GitHub App + credential helper | No | Igual para cualquier harness que use git |
| CI, guardián, ruleset | No | Igual |
