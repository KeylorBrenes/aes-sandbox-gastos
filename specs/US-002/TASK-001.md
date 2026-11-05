# US-002 / TASK-001 — API: consultar, editar y eliminar un gasto

- **Historia:** US-002 (`specs/US-002/US-002.md`)
- **Rol:** programmer
- **Track:** T2
- **Rama:** `task/US-002/TASK-001`
- **Superficie:** `specs/US-002/TASK-001.scope`
- **Criterios que deja en verde:** `specs/US-002/TASK-001.criteria` (AC-01 a AC-07)

## Objetivo

Agregar a la API `GET`, `PUT` y `DELETE` de `/api/expenses/{id}` y corregir BUG-001 (nota solo espacios → `null`), con las mismas validaciones que la creación. Al terminar, las pruebas de aceptación `@US-002-AC-01` a `@US-002-AC-07` pasan y la regresión `@EN-001` y `@US-001` sigue verde.

## Alcance

1. **`GET /api/expenses/{id}`:** `200` con el gasto (mismo formato que la creación) o `404` `ProblemDetails`. El `id` va como entero en la ruta; un valor no numérico, `0` o negativo responde `404` con `ProblemDetails` (D-07).
2. **`PUT /api/expenses/{id}`:** cuerpo igual al de `POST`. Primero se comprueba que el gasto existe (`404`), después se valida con **las mismas reglas que crear** (reutiliza la validación; no la dupliques) y se responde `400` con `errors` por campo o `200` con el gasto actualizado. `id` y `createdAt` no cambian. Reemplaza los cuatro campos: sin `note` → `null` (D-08). El gasto no cambia si hay errores.
3. **`DELETE /api/expenses/{id}`:** `204` sin cuerpo y borrado físico, o `404` `ProblemDetails`. Eliminar dos veces: la segunda da `404`.
4. **BUG-001 (aplica a `POST` y `PUT`):** una nota vacía o con solo espacios se guarda como `null`. La nota con texto se guarda tal cual, sin recortar. El largo máximo (200) se valida sobre el texto original: 201 espacios → `400` en `note` (D-08).
5. **`404` con `ProblemDetails`:** `application/problem+json` con `status: 404` (D-07). Esto también aplica a los `404` nuevos de esta tarea, no al resto de la API.
6. **Pruebas del programador:** unitarias de la nota solo espacios y del largo; integración con `WebApplicationFactory` y SQLite temporal para los tres endpoints.

## Fuera de alcance

- La web (TASK-002), `PATCH`, borrado lógico, control de concurrencia.
- BUG-003 (separador U+00A0 en el mensaje del monto): no cambies los textos de error existentes.
- `GET /api/expenses?month=`: ya responde `400` con vacío; no lo modifiques.
- Migraciones o cambios de esquema (no hay): no toques `src/Gastos.Api/Migrations/`.
- Patrón repositorio o capas nuevas (ADR-001).
- Cualquier archivo fuera de la superficie, en particular `tests/acceptance/`, `specs/`, `ci/`, `.github/`, `.claude/`, `docs/` y los `*.csproj`. Si necesitas alguno, reporta BLOCKED.

## Criterios (de US-002)

AC-01 a AC-07 (aceptación `@US-002-AC-NN`). La regresión `@EN-001` y `@US-001` debe seguir verde.

## Comandos de validación (exactos)

```bash
dotnet build -warnaserror
dotnet test
npm --prefix tests/acceptance ci
npm --prefix tests/acceptance test -- --grep "@US-002-AC-0[1-7]|@US-001|@EN-001"
BASE_REF=origin/main TASK_SCOPE_FILE=specs/US-002/TASK-001.scope bash ci/aes-guard.sh
```

## Pruebas afectadas

- Aceptación (solo lectura): `tests/acceptance/tests/us-002-api.spec.ts` y las de `@US-001`.
- Existentes del programador: `tests/Gastos.Api.Tests/ExpenseEndpointsTests.cs` y `ExpenseValidationTests.cs`.

## Presupuesto de diff

≈ 250 líneas escritas a mano.

## Dependencias autorizadas

Ninguna.

## Notas

- Commits separados por tipo (`feat:` / `fix:` / `test:`), sin mezclarlos y cada uno compilable. La corrección de la nota (BUG-001) es un `fix:` aparte.
- Los valores (límites, mensajes, formato) salen de la historia, no de las pruebas de aceptación.
