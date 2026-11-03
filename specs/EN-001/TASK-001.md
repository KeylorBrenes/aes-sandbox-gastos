# EN-001 / TASK-001 — Esqueleto de API, web y pruebas

- **Historia:** EN-001 (`specs/EN-001/EN-001.md`)
- **Rol:** programmer
- **Track:** T2
- **Rama:** `task/EN-001/TASK-001`
- **Superficie:** `specs/EN-001/TASK-001.scope`

## Objetivo

Dejar una solución compilable con la estructura de ADR-001: `Gastos.slnx`, la API con `GET /api/health`, su prueba de integración xUnit, y `web/` (React + TypeScript + Vite) con el título de la aplicación, su prueba de Vitest y el proxy de `/api`. Al terminar, las pruebas de aceptación `@EN-001` pasan.

**Por qué es una sola tarea:** la CI de las ramas `task/EN-001/*` ejecuta toda la aceptación `@EN-001`, y el `playwright.config.ts` arranca API y web juntas; una tarea solo de API no podría terminar en verde.

## Alcance

1. `Gastos.slnx` en la raíz con `src/Gastos.Api` y `tests/Gastos.Api.Tests`.
2. `src/Gastos.Api`: proyecto ASP.NET Core 10 (minimal APIs, plantilla `web` de `dotnet new`), con `GET /api/health` → `200`, `Content-Type: application/json`, cuerpo `{"status":"ok"}`. Sin código de plantilla sobrante (p. ej. *weatherforecast*). `Program` accesible para `WebApplicationFactory` (`public partial class Program`).
3. `tests/Gastos.Api.Tests`: proyecto xUnit con `Microsoft.AspNetCore.Mvc.Testing` y una prueba de integración de `/api/health` (código y cuerpo).
4. `web/`: React + TypeScript + Vite con:
   - `package.json` con scripts `dev`, `build`, `lint` y `test` (`test` ejecuta Vitest una sola vez, sin modo *watch*: `vitest run`);
   - `package-lock.json` (la CI usa `npm ci`);
   - en `/`, un encabezado con `data-testid="app-title"` y texto «Control de gastos»;
   - `vite.config.ts` con proxy de `/api` hacia `http://localhost:5080`;
   - una prueba de Vitest (`@testing-library/react`, `jsdom`) que comprueba el título;
   - ESLint con la configuración estándar de la plantilla de Vite.
   - Sin el contenido de demostración de la plantilla (contador, logos) más allá de lo mínimo legible.

## Fuera de alcance

- Base de datos, EF Core, entidades, migraciones.
- Cualquier funcionalidad de gastos, categorías o presupuestos.
- Estilos más allá de lo mínimo legible.
- Autenticación, CORS, Docker, despliegue.
- Cualquier archivo fuera de la superficie: `tests/acceptance/`, `.github/`, `ci/`, `specs/`, `.claude/`, `.gitignore`, `docs/`. Si necesitas alguno, reporta BLOCKED.

## Criterios (de EN-001)

AC-01, AC-02, AC-03 (aceptación `@EN-001`) y AC-04 (comandos de abajo con código 0).

## Comandos de validación (exactos)

```bash
dotnet build -warnaserror
dotnet test
npm --prefix web ci
npm --prefix web run lint
npm --prefix web test
npm --prefix web run build
npm --prefix tests/acceptance ci
npm --prefix tests/acceptance test -- --grep "@EN-001"
BASE_REF=origin/main TASK_SCOPE_FILE=specs/EN-001/TASK-001.scope bash ci/aes-guard.sh
```

El guardián local fallará en `[dependencias]` porque esta tarea crea manifiestos; es lo esperado (en la CI lo cubre la etiqueta `aes:deps-approved`). Cualquier otro FAIL del guardián debe corregirse.

## Pruebas afectadas

- Aceptación (solo lectura): `tests/acceptance/tests/en-001.spec.ts` (etiqueta `@EN-001`) y `tests/acceptance/playwright.config.ts`, que arranca API y web con los comandos del contrato. La configuración pasa `ConnectionStrings__Gastos` a la API; en EN-001 no hay base de datos, así que la API puede ignorarlo.
- Nuevas del programador: integración de `/api/health` (xUnit) y título (Vitest).

## Presupuesto de diff

≈ 300 líneas escritas a mano, **sin contar** `package-lock.json` ni los archivos generados sin cambios por las plantillas (`dotnet new`, `npm create vite`). Si lo superas, explica por qué en el reporte.

## Dependencias autorizadas

Solo las de EN-001: plantillas `dotnet new web` y `dotnet new xunit` (con sus paquetes por defecto), `Microsoft.AspNetCore.Mvc.Testing`; `vite`, `react`, `react-dom`, `typescript`, `@vitejs/plugin-react`, `vitest`, `@testing-library/react`, `jsdom`, `eslint` y la configuración estándar de ESLint de la plantilla de Vite (con sus `@types/*` habituales). Ninguna otra.

## Notas

- Commits separados por tipo (`feat:` / `test:` / `chore:`); sin mezclar.
- Los valores de la respuesta y del título salen del contrato de EN-001, no de las pruebas.
