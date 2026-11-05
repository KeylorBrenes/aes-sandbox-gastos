# US-002 / TASK-002 — Web: editar, eliminar, errores de carga y fecha `type="date"`

- **Historia:** US-002 (`specs/US-002/US-002.md`)
- **Rol:** programmer
- **Track:** T2
- **Rama:** `task/US-002/TASK-002`
- **Superficie:** `specs/US-002/TASK-002.scope`
- **Criterios:** es la **última** tarea: no lleva `.criteria`; la CI ejecuta la historia completa `@US-002` (AC-09 a AC-18 de navegador, más la API que deja TASK-001).
- **Depende de:** TASK-001 fusionada en `main`.

## Objetivo

Completar la web de US-002 sobre la API de TASK-001: editar un gasto reutilizando el formulario, eliminar con confirmación en la página, mostrar el error de carga con reintento (BUG-002) y migrar el campo de fecha a `<input type="date">` (ADR-002). Al terminar, `@US-002` completo pasa y la regresión `@EN-001` y `@US-001` sigue verde.

## Alcance

1. **Editar (AC-09 a AC-12, D-05, D-09):** botón `expense-edit` dentro de cada `expense-item`, que lleva además `data-id`. Al pulsarlo, `expense-form` pasa a `data-mode="edit"`, se llena con los valores del gasto y aparece `edit-cancel`; el botón `expense-submit` dice «Guardar cambios» (en alta, «Guardar»). Guardar llama a `PUT /api/expenses/{id}`; con éxito se recarga la lista, se actualiza el total y el formulario vuelve a su estado inicial (`data-mode="create"`, monto y nota vacíos, fecha de hoy, categoría Alimentación). Con `400` se muestran los errores en `field-error-<campo>` y el formulario sigue en modo edición. «Cancelar» vuelve al estado inicial sin cambiar nada.
2. **Eliminar (AC-13 a AC-15, D-06):** botón `expense-delete` en cada `expense-item`. Abre `delete-confirm` dentro del ítem, con `delete-confirm-yes` y `delete-confirm-no`; el gasto sigue en la lista hasta confirmar. Confirmar llama a `DELETE`, recarga la lista y el total. Cancelar cierra la confirmación. No uses `window.confirm`.
3. **Errores de campo (AC-16):** el formulario ya muestra `field-error-date`, `field-error-note` y `field-error-categoryId` del `400`; debe seguir haciéndolo en alta y en edición.
4. **Error de carga (AC-17, BUG-002, D-07):** si `GET /api/expenses` o `GET /api/categories` falla (red o estado no `2xx`), se muestra `load-error` con el botón `load-retry`; el formulario sigue visible. Al reintentar con éxito se carga todo y `load-error` desaparece del DOM. Nunca una pantalla sin formulario ni mensaje, y nunca una excepción no controlada.
5. **Fecha (AC-18, D-01, D-02):** `expense-date` es `<input type="date">` en alta y en edición, valor `YYYY-MM-DD`. Sigue sin validación nativa (`noValidate`, sin `required`, `min` ni `max`; ADR-002).
6. **Pruebas del programador:** Vitest del modo edición, la confirmación de borrado y el error de carga.

## Fuera de alcance

- Cambios en la API (TASK-001). Si hace falta alguno, reporta BLOCKED.
- Navegar a otros meses; deshacer; estilos más allá de lo mínimo legible.
- BUG-003.
- Cualquier archivo fuera de la superficie, en particular `tests/acceptance/`, `specs/`, `ci/`, `.github/`, `.claude/`, `docs/`, `web/package.json` y `web/package-lock.json`. Si necesitas alguno, reporta BLOCKED.

## Comandos de validación (exactos)

```bash
npm --prefix web ci
npm --prefix web run lint
npm --prefix web test
npm --prefix web run build
dotnet build -warnaserror
dotnet test
npm --prefix tests/acceptance ci
npm --prefix tests/acceptance test -- --grep "@US-002|@US-001|@EN-001"
BASE_REF=origin/main TASK_SCOPE_FILE=specs/US-002/TASK-002.scope bash ci/aes-guard.sh
```

## Pruebas afectadas

- Aceptación (solo lectura): `tests/acceptance/tests/us-002-ui.spec.ts` (y las de `@US-001`, incluidas las que cubren AC-08 y AC-16 en alta, D-10).
- Existentes del programador: `web/src/App.test.tsx`.

## Presupuesto de diff

≈ 250 líneas escritas a mano.

## Dependencias autorizadas

Ninguna.

## Notas

- Commits separados por tipo (`feat:` / `fix:` / `test:`), sin mezclarlos y cada uno compilable. La migración de la fecha y el error de carga son commits aparte.
- Los selectores y textos salen de la historia («Contrato de interfaz»), no de las pruebas de aceptación.
