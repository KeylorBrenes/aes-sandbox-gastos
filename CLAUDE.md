# Control de gastos — instrucciones del proyecto

Proyecto gestionado con **AES 1.1.1** (https://github.com/KeylorBrenes/AES---Agent-Method).

## Roles
- La **sesión principal** es el orquestador AES: para avanzar historias, usa la skill `aes-cycle`.
- Los subagentes `qa`, `programmer`, `verifier` y `mechanic` siguen su propio contrato en `.claude/agents/`.
- Hooks en `.claude/hooks/` restringen qué escribe cada rol. Si uno te bloquea, no lo rodees: reporta BLOCKED con el motivo.

## Estructura
- `src/Gastos.Api/`: API ASP.NET Core 10 (minimal APIs, EF Core + SQLite).
- `tests/Gastos.Api.Tests/`: xUnit (programador).
- `tests/acceptance/`: Playwright, pruebas de aceptación (**solo QA**).
- `web/`: React + TypeScript + Vite.
- `specs/<ID>/`: historias, tareas, `.scope`, planes de aceptación (**solo orquestador y humano**).
- `docs/`: brief, arquitectura, ADRs, perfil, backlog, hallazgos.

## Comandos
- .NET: `dotnet build -warnaserror` · `dotnet test`
- Web: `npm --prefix web run lint` · `npm --prefix web test` · `npm --prefix web run build`
- Aceptación de una historia: `npm --prefix tests/acceptance test -- --grep "@US-001"`
- API local: `dotnet run --project src/Gastos.Api --urls http://localhost:5080`
- Web local: `npm --prefix web run dev -- --port 5173 --strictPort`
- Guardián AES: `BASE_REF=origin/main TASK_SCOPE_FILE=specs/<ID>/<TASK>.scope bash ci/aes-guard.sh`

## Rutas protegidas
`tests/acceptance/`, `specs/`, `ci/`, `.github/`, `.claude/`, `docs/ci/`, `CLAUDE.md`.

## Convenciones que el linter no detecta
- API: JSON camelCase; fechas `YYYY-MM-DD` (`DateOnly`); montos `decimal(18,2)` en CRC; errores `400` con `ProblemDetails` y `errors` por campo (ADR-001).
- Sin patrón repositorio sobre EF Core; sin capas nuevas sin un requisito que las pida.
- Commits: `struct:` (sin cambio de comportamiento) o `feat:` / `fix:` / `test:` / `docs:` / `chore:`. Nunca se mezclan.
- Pruebas de aceptación: cada una lleva la etiqueta de su historia (`{ tag: '@US-001' }`) y el ID del criterio en el título.

## Fallos observados
<!-- Una línea por patrón confirmado en docs/agent-failure-log.md (AES 09). Vacío al inicio, a propósito. -->
