# Project Profile — Control de gastos (aes-sandbox-gastos)

- **AES version:** 1.1.1
- **Product owner / aprobador humano:** Keylor Brenes (`@KeylorBrenes`)
- **Repositorio / ramas:** `KeylorBrenes/aes-sandbox-gastos`; ver convención de ramas abajo.

## Binding de roles (experimental)

> Propuesta para AES 1.2: el perfil declara, para cada rol, **qué harness y modelo lo ejecutan, cómo se invoca y qué controles ofrece ese harness**. Cambiar de harness (OpenCode, un motor local, otro proveedor) solo cambia esta tabla; las reglas de AES y la CI (L3) no cambian.

| Rol AES | Harness | Modelo | Invocación | Contexto | L1 (permisos) | L2 (hooks) |
|---|---|---|---|---|---|---|
| Orquestador | Claude Code, sesión principal | Opus 5.5 (`/model opus`) | `claude` en la raíz del repo + skill `aes-cycle` | Sesión principal | No edita `src/`, `web/`, `tests/` | `role-guard.sh` (sin `agent_type`) |
| QA | Claude Code, subagente `qa` | Sonnet | El orquestador lo delega con la herramienta de agentes | Propio, sin el contexto del programador | Solo escribe `tests/acceptance/**` y el plan de aceptación | `role-guard.sh`, `bash-guard.sh` |
| Programador | Claude Code, subagente `programmer` | Sonnet | Delegado por el orquestador, en la rama `task/...` | Propio | Solo escribe dentro de la superficie de la tarea | `role-guard.sh` (lee el `.scope` de la rama), `bash-guard.sh`, `subagent-gate.sh` |
| Verificador | Claude Code, subagente `verifier` | Sonnet | Delegado por el orquestador tras la CI | Propio, solo lectura | Sin `Edit`/`Write` | `role-guard.sh`, `bash-guard.sh` |
| Mecánico | Claude Code, subagente `mechanic` | Haiku | Delegado para tareas T0 o mecánicas | Propio | Igual que el programador | Igual que el programador |
| CI | GitHub Actions, job `aes` | — | Automática en PR y en `main` | — | — | **L3:** guardián, aceptación desde `main`, RED automático en `qa/*` |

**Identidad en GitHub:** todas las operaciones de git y `gh` dentro de Claude Code usan la GitHub App `aes-agent-key` (sin permiso de workflows), y los commits se firman como `aes-agent-key[bot]`. Ver `docs/agent-identity.md`.

**Capacidad del harness no prevista en el diseño:** el clasificador de permisos del modo automático de Claude Code actuó como una capa L1 adicional en US-001 (3 denegaciones correctas). Otro harness puede no tenerlo; en el binding de roles de AES 1.2 debe declararse como capacidad del harness.

**Requisitos mínimos de un harness para ocupar un rol** (hipótesis a validar con este proyecto):

1. Ejecución con contexto propio (sin heredar la conversación de otro rol).
2. Invocación con una instrucción y un directorio de trabajo, y salida legible por el orquestador.
3. Posibilidad de trabajar en una rama concreta.
4. Opcional pero deseable: restricción de herramientas o rutas (L1) y hooks (L2).

Un harness que solo cumpla 1–3 sigue siendo válido: los controles fundamentales viven en L3.

## Producto y contexto

- Objetivo: ver `docs/project-brief.md`.
- Usuarios: una persona, uso local.
- Entornos: desarrollo local (Windows + Git Bash); CI en `ubuntu-latest`.

## Stack

- .NET 10 (ASP.NET Core minimal APIs), EF Core + SQLite.
- React + TypeScript + Vite; Vitest.
- Playwright Test (TypeScript) para aceptación.
- Ver ADR-001.

## Arquitectura y convenciones

- Estructura y convenciones de la API: ADR-001.
- Componentes y datos: `docs/architecture-overview.md`.
- Commits: `struct:` / `feat:` / `fix:` / `test:` / `docs:` / `chore:` (AES 04 §8).
- Etiquetas de Playwright: cada prueba de aceptación lleva la etiqueta de su historia (`{ tag: '@US-001' }`).

## Backlog

- Herramienta: `docs/backlog.md` + `specs/<ID>/`.
- Prioridad: P0–P3. Story Points: Fibonacci 1, 2, 3, 5, 8, 13.
- Tracks: T0–T3 según AES 02 §8.
- Historias activas en CI: `specs/active-stories.txt` (una por línea). Solo el orquestador la modifica, mediante PR aprobado.

## Calidad y pruebas

| Validación | Comando |
|---|---|
| Restaurar y compilar .NET | `dotnet build -warnaserror` |
| Pruebas .NET | `dotnet test` |
| Web | `npm --prefix web run lint`, `npm --prefix web test`, `npm --prefix web run build` |
| Aceptación (una historia) | `npm --prefix tests/acceptance test -- --grep "@US-001"` |
| Guardián AES | `BASE_REF=origin/main TASK_SCOPE_FILE=specs/<ID>/<TASK>.scope bash ci/aes-guard.sh` |

- Umbrales: sin porcentaje de cobertura obligatorio en esta fase; el verificador revisa que las pruebas sean significativas.
- Test map: el programador lista en su reporte qué pruebas existentes tocan los archivos que modificó.
- Holdout: **no en esta fase** (ver excepciones).
- Presupuesto de diff orientativo por tarea: 300 líneas.
- Prueba manual agéntica: Playwright (navegador) y `curl` contra la API.

## Controles en capas

| Control | L1 — Harness | L2 — Hooks | L3 — Fuera del agente |
|---|---|---|---|
| Suite de aceptación protegida | QA es el único rol que la edita | `role-guard.sh` | Guardián + restauración desde `main` + CODEOWNERS |
| Superficie de cambio | — | `role-guard.sh` lee `specs/<ID>/<TASK>.scope` según la rama | Guardián (`ci/aes-guard.sh`) |
| Configuración de agentes y CI | — | `role-guard.sh` | GitHub App sin permiso de workflows + CODEOWNERS |
| No terminar con pruebas rojas | — | `subagent-gate.sh` (programador) | Check `aes` obligatorio |
| Procesos que sobreviven al rol (FL-007) | Clasificador de permisos del modo automático (deniega `taskkill` y similares) | `subagent-gate.sh` (puertos 5080, 5081 y 5173, todos los roles) + `with-servers.sh` | `reuseExistingServer: false` en la aceptación (QA) |
| Rodeo por delegación (FL-007, FL-008) | — | — | Contratos y skill: lo denegado es BLOCKED para el humano |
| Tareas por criterio | — | — | CI: `specs/<ID>/<TASK>.criteria` → solo esos `@<ID>-AC-NN`; última tarea y cierre, historia completa |
| RED confirmado | — | — | CI en ramas `qa/*` exige que las pruebas de la historia fallen contra `main` |
| Aprobación humana | — | — | Ruleset: 1 aprobación + Code Owners |

## Convención de ramas

| Rama | Quién | Contenido | Controles |
|---|---|---|---|
| `spec/<tema>` | Orquestador | Historias, tareas, `.scope`, docs | CI + tu aprobación |
| `qa/<ID>` | QA (vía orquestador) | Pruebas de aceptación y su plan | CI con RED automático + tu aprobación |
| `task/<ID>/<TASK>` | Programador / mecánico | Código dentro de la superficie | Guardián + CI + verificador + tu aprobación |

## Permisos y operación de agentes

- Rutas protegidas: `tests/acceptance/`, `specs/`, `ci/`, `.github/`, `.claude/`, `docs/ci/`, `AGENTS.md`, `CLAUDE.md`.
- Operaciones que requieren aprobación humana: todas las de AES 06 §8, fusionar cualquier PR, y cualquier cambio de dependencias (etiqueta `aes:deps-approved`).
- Paralelismo: **secuencial** en esta fase (una tarea a la vez, en la copia principal). El paralelismo con worktrees queda como experimento posterior.
- Umbral del circuit breaker: 3 ciclos FAIL.
- Secretos: la llave `.pem` de la app vive fuera del repo; `.claude/settings.local.json` está en `.gitignore`.

## Riesgo y liberación

- Riesgo por defecto: Low/Medium (T2). Nada de T3 en la primera fase.
- Migraciones: EF Core; las destructivas requieren aprobación (no previstas).
- Despliegue: no aplica todavía.

## Mejora del harness

- Registro de fallos: `docs/agent-failure-log.md`.
- Hallazgos del experimento: `docs/harness-findings.md`.
- Retrospectiva compuesta: al cerrar cada historia.

## Excepciones AES

| Regla | Motivo | Riesgo | Mitigación | Aprobador | Revisión/expiración |
|---|---|---|---|---|---|
| 05 §2.3 — holdout (SHOULD) | Fase 1 del experimento; todas las historias son T2 | El programador podría ajustarse a los datos visibles | El verificador revisa valores codificados y hace prueba manual con datos propios | Keylor Brenes | Antes de la primera historia T3 |
| 04 §5 — worktrees para concurrencia | Ejecución secuencial | Ninguno mientras sea secuencial | Una tarea a la vez | Keylor Brenes | Al probar paralelismo |
