# Backlog — Control de gastos

Planificación progresiva (AES 02): solo las historias próximas están refinadas. El resto queda en `Draft` hasta que se acerquen.

## Product Goal

Saber en segundos en qué se va el dinero cada mes y si se está dentro del presupuesto, con una herramienta local y simple.

## Epics

| ID | Capacidad | Prioridad | Estado |
|---|---|---|---|
| EPIC-00 | Base técnica | P0 | Active |
| EPIC-01 | Registro de gastos | P0 | Active |
| EPIC-02 | Presupuestos | P1 | Draft |
| EPIC-03 | Resúmenes y análisis | P1 | Draft |

## Elementos

| ID | Tipo | Epic | Título | Track | Pts | Prioridad | Estado |
|---|---|---|---|---|---|---|---|
| EN-001 | Enabler | EPIC-00 | Esqueleto de la solución (API, web, pruebas, CI) | T2 | 3 | P0 | Accepted |
| US-001 | Historia | EPIC-01 | Registrar un gasto y verlo en la lista del mes | T2 | 5 | P0 | Accepted |
| US-002 | Historia | EPIC-01 | Editar y eliminar un gasto (incluye BUG-001 y BUG-002) | T2 | 5 | P1 | Draft (refinada) |
| US-003 | Historia | EPIC-02 | Definir el presupuesto mensual por categoría | T2 | 5 | P1 | Draft |
| US-004 | Historia | EPIC-03 | Resumen del mes: gastado vs. presupuesto por categoría | T2 | 5 | P1 | Draft |
| US-005 | Historia | EPIC-01 | Categorías personalizadas | T2 | 5 | P2 | Draft |
| US-006 | Historia | EPIC-03 | Exportar los gastos de un mes a CSV | T2 | 2 | P3 | Draft |
| BUG-001 | Bug | EPIC-01 | Una nota con solo espacios se guarda tal cual en vez de `null` | T1 | 1 | P2 | En US-002 (AC-07) |
| BUG-002 | Bug | EPIC-01 | Si la carga inicial de la lista falla, la web no muestra el formulario ni un error | T1 | 2 | P1 | En US-002 (AC-17) |
| BUG-003 | Bug | EPIC-01 | El mensaje de error del monto usa U+00A0 (espacio duro) como separador de miles | T1 | 1 | P3 | Draft |
| CH-001 | Chore | EPIC-00 | `nuget.config` versionado con `nuget.org` y *package source mapping* | T1 | 1 | P1 | Accepted |

Orden propuesto: CH-001 → US-002 (incluye BUG-001 y BUG-002; BUG-003 va aparte, D-04) → US-003 → US-004.

Los bugs y chores son ítems de primera clase: se refinan, tienen criterio y prueba RED, y entran al ciclo como cualquier historia (track T1, AES 02 §8). No se dejan como notas.

## Notas de Draft

- **CH-001:** tarea `mechanic`. Crea `nuget.config` en la raíz con `<clear />`, solo `nuget.org` y `packageSourceMapping` (`*` → `nuget.org`). Criterio: un clon limpio restaura con `dotnet restore` sin fuentes globales configuradas. Necesita `aes:deps-approved` (el guardián trata `nuget.config` como dependencia).

- **US-002:** refinada el 2026-11-05; ver `specs/US-002/US-002.md` (decisiones D-01 a D-06). Edita monto, fecha, categoría y nota reutilizando el formulario; elimina con confirmación en la página; añade `GET`, `PUT` y `DELETE` de `/api/expenses/{id}`; absorbe BUG-001 y BUG-002, resuelve D-06 de US-001 y migra la fecha a `type="date"` (ADR-002 Accepted).
- **BUG-003:** queda aparte (P3), en la misma validación que US-002 toca; conviene hacerlo después para no ampliar la superficie.
- **US-003:** un presupuesto por categoría y mes; copiar el del mes anterior como facilidad (por decidir).
- **US-004:** por categoría: gastado, presupuesto, restante y porcentaje; resaltar las excedidas.
- **US-005:** crear, renombrar y archivar categorías; las fijas no se pueden borrar si tienen gastos.
- **US-006:** CSV con encabezados en español y separador configurable (por decidir).
