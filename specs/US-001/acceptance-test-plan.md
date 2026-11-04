# US-001 — Plan de pruebas de aceptación

Etiqueta: `@US-001`. Archivos en `tests/acceptance/tests/`: `us-001-api.spec.ts`, `us-001-ui.spec.ts`, `us-001-persistence.spec.ts`, `us-001.helpers.ts`. Reutiliza la configuración de EN-001 (sin cambios).

Aislamiento: las pruebas de API usan meses propios en años pasados (1999–2007). Las que tocan el mes actual (UI y «fecha de hoy») están en un solo archivo en modo `default` (secuencial dentro del archivo, sin omitir las siguientes si una falla). AC-09 usa su propia API en el puerto 5081 y su propio archivo SQLite.

## Matriz criterio → prueba

| Criterio | Prueba | Casos cubiertos |
|---|---|---|
| AC-01 | AC-01 GET /api/categories devuelve las 7 categorías fijas en orden | ids, nombres con tildes y orden |
| AC-02 | AC-02 POST … responde 201, Location y el gasto creado | 201, `Location: /api/expenses/{id}`, cuerpo, `createdAt` ISO con Z |
| AC-02 | AC-02 nota ausente o vacía → `null` | límite |
| AC-02 | AC-02 límites válidos 0.01, 99999999.99, nota de 200 | límite |
| AC-02 | AC-02 gasto con fecha de hoy es válido | límite (en `us-001-ui.spec.ts`) |
| AC-03 | AC-03 el gasto aparece en items y total es suma exacta | 0.1 + 0.2 + 12500.5 = 12500.8 |
| AC-03 | AC-03 mes sin gastos → `items: []`, `total: 0` | límite |
| AC-03 | AC-03 sin `month` lista el mes actual | contrato |
| AC-04 | AC-04 solo gastos del mes, fecha descendente | meses vecinos excluidos |
| AC-04 | AC-04 igual fecha, `createdAt` descendente | desempate (espera 1,1 s entre creaciones) |
| AC-05 | AC-05 cada campo inválido produce su error y no se crea nada | 13 casos: monto 0, -1, 0.001, 10.123, 100000000; fecha mañana, 2006-02-30, «ayer»; categoría inexistente; nota 201; falta monto / fecha / categoría; luego el mes sigue vacío |
| AC-05 | AC-05 varios campos inválidos | una entrada por campo (amount, date, categoryId, note) |
| AC-05 | AC-05 cuerpo vacío | errores en amount, date, categoryId |
| AC-06 | AC-06 month inválido → 400 con error en `month` | 2026-13, 2026-00, 2026-1, 202611, noviembre, 2026-11-01, 26-11 |
| AC-07 | AC-07 registrar gasto lo muestra sin recargar, total y formulario limpio | `data-amount`, conteo +1, total +monto, fecha vuelve a hoy, marca en `window` sobrevive |
| AC-08 | AC-08 monto inválido muestra error junto al monto | `field-error-amount` visible, lista y total sin cambio |
| AC-09 | AC-09 persistencia tras reiniciar la API | crea, detiene, relanza con el mismo SQLite, consulta |

## RED confirmado

Comando: `npm --prefix tests/acceptance test -- --grep "@US-001"` contra el código actual (solo existe `/api/health` y el título). Resultado: 17 failed, 0 skipped, 0 did not run (corrección tras el rechazo de L3: se cambió el modo `serial` por `default` en el archivo de UI).

| Prueba | Resultado | Razón | ¿Esperada? |
|---|---|---|---|
| AC-01 categorías | falla | `GET /api/categories` → 404 | Sí |
| AC-02 201/Location | falla | POST → 404 (esperaba 201) | Sí |
| AC-02 nota ausente/vacía | falla | POST → 404 | Sí |
| AC-02 límites válidos | falla | POST → 404 | Sí |
| AC-02 fecha de hoy | falla | POST → 404 | Sí |
| AC-03 suma exacta | falla | POST sin cuerpo (404) → `Unexpected end of JSON input` al leer la respuesta | Sí (consecuencia del 404) |
| AC-03 mes vacío | falla | GET → 404 | Sí |
| AC-03 sin month | falla | GET → 404 | Sí |
| AC-04 solo del mes | falla | POST 404 → JSON vacío | Sí |
| AC-04 desempate | falla | POST 404 → JSON vacío | Sí |
| AC-05 campo por campo | falla | primer caso («monto 0») recibe 404 en vez de 400 | Sí |
| AC-05 varios campos | falla | 404 en vez de 400 | Sí |
| AC-05 cuerpo vacío | falla | 404 en vez de 400 | Sí |
| AC-06 month inválido | falla | 404 en vez de 400 (primer valor, `2026-13`) | Sí |
| AC-07 registrar en la UI | falla | `getByTestId('expense-form')` no encontrado | Sí |
| AC-08 error de monto | falla | `getByTestId('expense-form')` no encontrado | Sí |
| AC-09 persistencia | falla | la API propia arranca en 5081; POST → 404 en vez de 201 | Sí |

## Supuestos y preguntas

- Supuesto: el selector de categoría es un `<select>` cuyo `value` es el id (se usa `selectOption('alimentacion')`) y el campo de fecha acepta `fill('YYYY-MM-DD')`. El contrato dice «selector» pero no el elemento. Pregunta no bloqueante: ¿confirmar `<select>` con `value` = id?
- Supuesto: `GET /api/health` (EN-001) sigue disponible; AC-09 lo usa como señal de que su API propia arrancó.
- Supuesto: al desempatar por `createdAt` (AC-04), la prueba separa las creaciones 1,1 s por si la resolución es de segundos.
- AC-09 usa `dotnet run` para la segunda instancia mientras el `webServer` principal ya compiló; si hay bloqueo de compilación concurrente en CI, el arranque puede tardar (timeout 120 s).
- Posible caso faltante, sin prueba: monto con 2 decimales exactos con valor entero grande en la web, y errores por campo de fecha/categoría/nota en la UI (solo AC-08 cubre monto). Si se quiere, agregar criterios.
- Los valores de `month` vacío (`?month=`) no están definidos en el contrato; no se prueban.
