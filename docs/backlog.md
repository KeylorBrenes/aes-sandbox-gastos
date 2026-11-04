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

Orden propuesto: EN-001 → US-001 → US-002 → US-003 → US-004.

## Notas de Draft

- **US-002:** editar monto, fecha, categoría y nota; eliminar con confirmación. Mismas validaciones que US-001. Añade `GET /api/expenses/{id}` (al que ya apunta el `Location` de US-001). Deuda que dejó US-001, a refinar aquí: (1) la web no maneja el error del `GET` inicial (si la API no responde, el formulario no aparece); (2) una nota con solo espacios no se guarda como `null`; (3) el mensaje de error del monto usa U+00A0 como separador de miles.
- **US-003:** un presupuesto por categoría y mes; copiar el del mes anterior como facilidad (por decidir).
- **US-004:** por categoría: gastado, presupuesto, restante y porcentaje; resaltar las excedidas.
- **US-005:** crear, renombrar y archivar categorías; las fijas no se pueden borrar si tienen gastos.
- **US-006:** CSV con encabezados en español y separador configurable (por decidir).
