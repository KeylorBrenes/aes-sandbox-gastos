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
| US-002 | Historia | EPIC-01 | Editar y eliminar un gasto | T2 | 3 | P1 | Draft |
| US-003 | Historia | EPIC-02 | Definir el presupuesto mensual por categoría | T2 | 5 | P1 | Draft |
| US-004 | Historia | EPIC-03 | Resumen del mes: gastado vs. presupuesto por categoría | T2 | 5 | P1 | Draft |
| US-005 | Historia | EPIC-01 | Categorías personalizadas | T2 | 5 | P2 | Draft |
| US-006 | Historia | EPIC-03 | Exportar los gastos de un mes a CSV | T2 | 2 | P3 | Draft |
| BUG-001 | Bug | EPIC-01 | Una nota con solo espacios se guarda tal cual en vez de `null` | T1 | 1 | P2 | Draft |
| BUG-002 | Bug | EPIC-01 | Si la carga inicial de la lista falla, la web no muestra el formulario ni un error | T1 | 2 | P1 | Draft |
| BUG-003 | Bug | EPIC-01 | El mensaje de error del monto usa U+00A0 (espacio duro) como separador de miles | T1 | 1 | P3 | Draft |
| CH-001 | Chore | EPIC-00 | `nuget.config` versionado con `nuget.org` y *package source mapping* | T1 | 1 | P1 | Ready |

Orden propuesto: CH-001 → US-002 (incluye BUG-001 a BUG-003 si el refinamiento lo decide) → US-003 → US-004.

Los bugs y chores son ítems de primera clase: se refinan, tienen criterio y prueba RED, y entran al ciclo como cualquier historia (track T1, AES 02 §8). No se dejan como notas.

## Notas de Draft

- **CH-001:** tarea `mechanic`. Crea `nuget.config` en la raíz con `<clear />`, solo `nuget.org` y `packageSourceMapping` (`*` → `nuget.org`). Criterio: un clon limpio restaura con `dotnet restore` sin fuentes globales configuradas. Necesita `aes:deps-approved` (el guardián trata `nuget.config` como dependencia).

- **US-002:** editar monto, fecha, categoría y nota; eliminar con confirmación. Mismas validaciones que US-001. Añade `GET /api/expenses/{id}` (al que ya apunta el `Location` de US-001, decisión D-03). En el refinamiento: decidir si BUG-001 a BUG-003 entran en esta historia o van aparte, y resolver D-06 de US-001 (¿la web muestra los errores de fecha, categoría y nota?).
- **US-003:** un presupuesto por categoría y mes; copiar el del mes anterior como facilidad (por decidir).
- **US-004:** por categoría: gastado, presupuesto, restante y porcentaje; resaltar las excedidas.
- **US-005:** crear, renombrar y archivar categorías; las fijas no se pueden borrar si tienen gastos.
- **US-006:** CSV con encabezados en español y separador configurable (por decidir).
