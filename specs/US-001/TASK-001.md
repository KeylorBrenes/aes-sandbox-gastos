# US-001 / TASK-001 — Registrar gastos y listarlos por mes (API + web)

- **Historia:** US-001 (`specs/US-001/US-001.md`)
- **Rol:** programmer
- **Track:** T2
- **Rama:** `task/US-001/TASK-001`
- **Superficie:** `specs/US-001/TASK-001.scope`

## Objetivo

Implementar US-001 completa: categorías fijas, creación y listado mensual de gastos con validación en la API (EF Core + SQLite, migración inicial), y en la web el formulario y la lista del mes con su total. Al terminar, las pruebas de aceptación `@US-001` pasan, igual que la regresión `@EN-001`.

**Por qué es una sola tarea:** la CI de `task/US-001/*` ejecuta toda la aceptación `@US-001` (API y navegador). Una tarea solo de API no podría terminar en verde.

## Alcance

1. **Datos:** `DbContext` con la entidad `Expense` (`Id`, `Amount` `decimal(18,2)`, `Date` `DateOnly`, `CategoryId`, `Note` nullable de hasta 200 caracteres, `CreatedAt` UTC) y la migración inicial de EF Core (`dotnet-ef`). La cadena de conexión sale de `ConnectionStrings:Gastos`, con un valor por defecto en `appsettings.json` para el uso local. Al arrancar, la API aplica las migraciones pendientes, porque la aceptación usa una base temporal vacía.
2. **Categorías:** las 7 fijas de US-001, con su `id`, su `name` y en el orden del contrato. No se guardan en la base: son una lista fija en el código.
3. **Endpoints** (minimal APIs, agrupados por recurso): `GET /api/categories`, `POST /api/expenses` y `GET /api/expenses?month=YYYY-MM`, exactamente como el «Contrato de interfaz» de US-001. Incluye `Location`, el orden de AC-04, `total` como suma exacta y el mes actual cuando falta `month`.
4. **Validación** (AC-05, AC-06 y «Casos negativos y límites»): `400` `application/problem+json` con `errors` por campo en camelCase (`amount`, `date`, `categoryId`, `note`, `month`). «Hoy» se toma de la zona horaria local de la API. Una nota vacía o ausente se guarda como `null`. Ante cualquier error no se crea nada.
5. **Web (`/`):** formulario y lista del mes actual con los `data-testid` del contrato. `expense-item` y `month-total` llevan el atributo `data-amount` con el valor crudo y muestran el texto con el formato del navegador. El formulario usa `noValidate` y no valida en el cliente: muestra en `field-error-<campo>` los errores del `400`. Al guardar con éxito, el gasto se ve sin recargar la página, el total se actualiza y el formulario se limpia (la fecha vuelve a hoy). Se conserva el título de EN-001.
6. **Pruebas del programador:** unitarias de las reglas de validación (incluidos los límites de la historia), integración de los endpoints con `WebApplicationFactory` sobre un SQLite temporal y Vitest del formulario y la lista.

## Fuera de alcance

- `GET /api/expenses/{id}`, edición y eliminación (US-002). `Location` apunta a esa ruta aunque todavía responda `404`.
- Presupuestos, resúmenes, categorías personalizadas, exportación, paginación, filtros y ordenamiento configurable.
- Patrón repositorio o capas nuevas (ADR-001). Validación en el cliente. Estilos más allá de lo mínimo legible.
- Cualquier archivo fuera de la superficie, en particular `tests/acceptance/`, `specs/`, `ci/`, `.github/`, `.claude/`, `docs/`, `web/package.json` y `web/package-lock.json`. Si necesitas alguno, reporta BLOCKED.

## Criterios (de US-001)

AC-01 a AC-09 (aceptación `@US-001`) y la regresión `@EN-001`.

## Comandos de validación (exactos)

```bash
dotnet build -warnaserror
dotnet test
npm --prefix web ci
npm --prefix web run lint
npm --prefix web test
npm --prefix web run build
npm --prefix tests/acceptance ci
npm --prefix tests/acceptance test -- --grep "@US-001|@EN-001"
BASE_REF=origin/main TASK_SCOPE_FILE=specs/US-001/TASK-001.scope bash ci/aes-guard.sh
```

El guardián local fallará en `[dependencias]` por el `.csproj`. Es lo esperado: en la CI lo cubre la etiqueta `aes:deps-approved`, que pone el humano. Cualquier otro FAIL del guardián debe corregirse.

## Pruebas afectadas

- Aceptación (solo lectura): `tests/acceptance/tests/` con las etiquetas `@US-001` y `@EN-001`, y `tests/acceptance/playwright.config.ts`, que arranca la API con `ConnectionStrings__Gastos` apuntando a una base temporal.
- Existentes del programador: `tests/Gastos.Api.Tests/HealthEndpointTests.cs` y `web/src/App.test.tsx` (el título debe seguir pasando).

## Presupuesto de diff

≈ 500 líneas escritas a mano, **sin contar** los archivos generados de la migración (`Migrations/*`) ni `.config/dotnet-tools.json`. Supera el orientativo de 300 del perfil porque la historia abarca API y web en una sola tarea. Si lo superas, explica por qué en el reporte.

## Dependencias autorizadas

Solo las de US-001: `Microsoft.EntityFrameworkCore.Sqlite` y `Microsoft.EntityFrameworkCore.Design` (en `src/Gastos.Api`), y la herramienta local `dotnet-ef` (`.config/dotnet-tools.json`), en versiones compatibles con .NET 10. Ninguna otra, ni en .NET ni en `web/`.

## Notas

- Commits separados por tipo (`feat:` / `test:` / `chore:`), sin mezclarlos y cada uno compilable.
- Los valores (categorías, mensajes, límites) salen de la historia, no de las pruebas de aceptación.
