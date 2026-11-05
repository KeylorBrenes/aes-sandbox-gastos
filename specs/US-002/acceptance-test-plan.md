# US-002 — Plan de pruebas de aceptación

Autor: QA / Test Designer. Fuente de verdad: `specs/US-002/US-002.md` y ADR-001/ADR-002. No se leyó `src/`, `web/` ni `tests/Gastos.Api.Tests/`.

Archivos (todos en `tests/acceptance/`):

- `tests/us-002-api.spec.ts`: AC-01 a AC-07 (API).
- `tests/us-002-ui.spec.ts`: AC-09 a AC-18 (navegador).
- `tests/us-001-regresion-us-002.spec.ts`: AC-08 y AC-16 en modo alta, en la suite de US-001 (etiqueta `@US-001`; ya se cumplían; D-10).
- `tests/us-002.helpers.ts`: utilidades (siembra por API, `ProblemDetails`, localizador por `data-id`).
- `playwright.config.ts`: corregido `reuseExistingServer: false` en la API y la web (estaba en `!process.env.CI`, que reutiliza servidores ajenos en local: FL-007).

## Matriz criterio → prueba

Cada prueba lleva `@US-002` y `@US-002-AC-NN`, salvo las de AC-08 y AC-16 (alta): viven en la suite de US-001 con la etiqueta `@US-001` y el ID `US-002-AC-NN` en el título (D-10); no aparecen en ningún `.criteria`.

| Criterio | Prueba(s) |
|---|---|
| AC-01 | GET /api/expenses/{id} devuelve 200 con el gasto en el mismo formato que la creación · el Location devuelto por POST apunta a un GET que responde 200 |
| AC-02 | GET, PUT y DELETE de un id inexistente responden 404 con ProblemDetails (`2147483647`, `0`, `-1`) · un id que no es un entero se trata como inexistente (`abc`, `1.5`, `1e3`, `0x10`, desbordado) · PUT a un id inexistente no crea nada · PUT a un id inexistente con cuerpo inválido responde 404 · eliminar un gasto ya eliminado responde 404 |
| AC-03 | PUT reemplaza los cuatro campos y conserva id y createdAt, y el GET posterior lo refleja · PUT con `note: null` reemplaza la nota · PUT sin la clave `note` deja `note: null` (D-08) · editar sin cambiar nada (200, mismos valores) · límites válidos: monto 0.01 y 99999999.99, fecha de hoy, nota de 200 caracteres |
| AC-04 | Tabla de 13 casos inválidos de PUT (monto 0, -1, 0.001, 100000000, 3 decimales; fecha mañana, 30 de febrero, texto; categoría inexistente; nota de 201; falta monto, fecha o categoría): 400 `problem+json` con exactamente el campo inválido en `errors`, y el gasto y el listado del mes no cambian · varios campos inválidos a la vez (4 entradas) · cuerpo vacío (3 entradas obligatorias) · nota de 201 espacios: `400` solo en `note`, el gasto no cambia (D-08) |
| AC-05 | Mover un gasto de 2011-03 a 2011-04: sale de un mes, aparece en el otro, totales 150 → 50 y 7 → 107 |
| AC-06 | DELETE: 204 sin cuerpo, GET 404, ausente del mes, total 12500.8 → 0.3 |
| AC-07 | POST con `''`, `' '`, `'   '` guarda `null` · PUT con los mismos valores guarda `null` (se parte de un gasto con nota) · PUT con `'  hola  '` guarda la nota tal cual, sin recortar (D-08) |
| AC-08 | Regresión `@US-001` (D-10): `US-002-AC-08 — GET /api/expenses?month=` → 400 con error en `month` |
| AC-09 | «Editar» llena monto, fecha, categoría y nota; aparece `edit-cancel` y el botón dice «Guardar cambios»; en alta no hay `edit-cancel` · gasto sin nota deja la nota vacía |
| AC-10 | Guardar edición: la lista se actualiza sin recarga (marca en `window`), el total coincide con la suma de los gastos mostrados, el formulario vuelve a `data-mode="create"` con campos limpios, fecha de hoy, categoría `alimentacion` (D-09) y botón «Guardar»; el servidor conserva `id` y `createdAt` · el total cambia al editar el monto |
| AC-11 | Monto `-5` en edición: `field-error-amount` visible y con texto, `data-mode="edit"`, el gasto no cambia en la lista ni en el servidor |
| AC-12 | «Cancelar» tras modificar campos: modo alta con campos limpios, fecha de hoy y categoría `alimentacion` (D-09); el gasto no cambia |
| AC-13 | «Eliminar» abre `delete-confirm` (con `-yes` y `-no`) dentro del `expense-item`; el gasto sigue en la lista y en el servidor |
| AC-14 | «Confirmar»: el gasto desaparece de la lista sin recarga, el total coincide con la suma, y el servidor responde 404 |
| AC-15 | «Cancelar» en la confirmación: se cierra y el gasto sigue |
| AC-16 | En edición: fecha vacía, nota de 201 caracteres y `400` interceptado con error en `categoryId` muestran `field-error-date`, `field-error-note` y `field-error-categoryId`, y nada cambia (3 pruebas). En alta: las mismas 3 pruebas están en la suite de US-001 (`US-002-AC-16 — (alta) …`, D-10) |
| AC-17 | `GET /api/expenses` → 500 y `GET /api/categories` → 500: `load-error` + `load-retry` + formulario visible; al quitar la interceptación y pulsar `load-retry`, `load-error` desaparece y se carga la lista (el gasto sembrado) o las categorías (`option` de `alimentacion` y `otros`) |
| AC-18 | `expense-date` tiene `type="date"` y valor `YYYY-MM-DD` en alta (valor por defecto y tras `fill`) y en edición |

## Casos negativos y límites cubiertos

Los de la historia: monto `0.01` y `99999999.99` válidos al editar; `0`, `0.001`, `100000000` inválidos; fecha de hoy válida y mañana inválida; nota de 200 válida y 201 inválida; `"   "` → `null`; `PUT` sin `note` → `null`; 201 espacios → `400`; `"  hola  "` se guarda tal cual (D-08); editar sin cambiar nada; `PUT` a un id inexistente con cuerpo inválido → 404; eliminar un gasto ya eliminado → 404.

## Aislamiento y ejecución en paralelo

- API: cada prueba usa meses de años pasados propios (2010 a 2014), distintos de los de US-001 (1999 a 2006). Las comparaciones de listado y total son exactas porque nadie más escribe en esos meses.
- Navegador: la web solo muestra el mes actual, que comparten todas las pruebas en paralelo. Cada prueba siembra su gasto por API con una nota única, lo localiza por `data-id` y verifica el total como «`month-total` = suma de los `expense-item` mostrados» (lectura atómica con reintentos), no contra un valor absoluto. Limitación: no detecta un total que se actualice mal pero coincida por casualidad con la suma; los montos distintivos reducen ese riesgo.
- No hay `serial` ni dependencia de orden.

## RED confirmado

Comandos, desde la raíz del repo y contra el código actual:

```
PLAYWRIGHT_JSON_OUTPUT_NAME="$TEMP/red.json" npm --prefix tests/acceptance test -- --grep "@US-002" --reporter=list,json
node ci/red-check.mjs "$TEMP/red.json" US-002 0
```

Salida de `red-check.mjs` (37 encontradas, 37 ejecutadas, 37 fallan):

```
Historia: @US-002 | pruebas encontradas: 37 | ejecutadas: 37
  - [failed] AC-01 GET /api/expenses/{id} devuelve 200 con el gasto en el mismo formato que la creación  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-01 el Location devuelto por POST apunta a un GET que responde 200 con el mismo gasto  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-02 GET, PUT y DELETE de un id inexistente responden 404 con ProblemDetails  →  Error: expect(received).toContain(expected) // indexOf
  - [failed] AC-02 un id que no es un entero se trata como inexistente (404 con ProblemDetails)  →  Error: expect(received).toContain(expected) // indexOf
  - [failed] AC-02 PUT a un id inexistente no crea nada  →  Error: expect(received).toContain(expected) // indexOf
  - [failed] AC-02 PUT a un id inexistente con cuerpo inválido responde 404 (la existencia se comprueba primero)  →  Error: expect(received).toContain(expected) // indexOf
  - [failed] AC-03 PUT reemplaza los cuatro campos y conserva id y createdAt; un GET posterior devuelve los nuevos valores  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-03 PUT con note null reemplaza la nota existente por null  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-03 PUT sin la clave note reemplaza la nota existente por null (D-08)  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-03 editar sin cambiar nada responde 200 con los mismos valores  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-03 límites válidos al editar: monto 0.01 y 99999999.99, fecha de hoy, nota de 200 caracteres  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-04 cada campo inválido en PUT produce su error, y el gasto no cambia  →  Error: monto 0
  - [failed] AC-04 varios campos inválidos en PUT devuelven una entrada por campo  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-04 PUT con cuerpo vacío: error en los tres campos obligatorios y el gasto no cambia  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-04 PUT con una nota de 201 espacios responde 400 por largo en note y el gasto no cambia (D-08)  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-05 cambiar la fecha a otro mes mueve el gasto y recalcula los dos totales  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-06 DELETE responde 204 sin cuerpo; el gasto desaparece y el total baja en su monto  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-02 eliminar un gasto ya eliminado responde 404 con ProblemDetails  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-07 POST con nota vacía o solo espacios guarda note null  →  Error: " "
  - [failed] AC-07 PUT con nota vacía o solo espacios guarda note null  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-07 PUT con una nota con texto y espacios alrededor la guarda tal cual, sin recortar (D-08)  →  Error: expect(received).toBe(expected) // Object.is equality
  - [failed] AC-09 «Editar» llena el formulario con los valores del gasto y muestra «Cancelar»  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-09 «Editar» en un gasto sin nota deja el campo de nota vacío  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-10 guardar la edición actualiza la lista y el total sin recargar y devuelve el formulario a modo alta  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-10 el total mostrado cambia cuando se edita el monto  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-11 guardar con un monto inválido muestra field-error-amount, no cambia el gasto y mantiene el modo edición  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-12 «Cancelar» vuelve a modo alta con campos limpios y no cambia el gasto  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-13 «Eliminar» abre la confirmación en la página y el gasto sigue en la lista  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-14 «Confirmar» elimina el gasto de la lista, actualiza el total y lo borra del servidor  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-15 «Cancelar» en la confirmación la cierra y el gasto sigue en la lista  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-16 (edición) con fecha vacía se muestra field-error-date y la lista no cambia  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-16 (edición) con nota de 201 caracteres se muestra field-error-note y la lista no cambia  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-16 (edición) si la API responde 400 con error en categoryId se muestra field-error-categoryId y la lista no cambia  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-17 si GET /api/expenses falla se muestra load-error con load-retry y el formulario; al reintentar se carga la lista  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-17 si GET /api/categories falla se muestra load-error con load-retry y el formulario; al reintentar se cargan las categorías  →  Error: expect(locator).toBeVisible() failed
  - [failed] AC-18 expense-date es un input de tipo date en alta, con valor YYYY-MM-DD  →  Error: expect(locator).toHaveAttribute(expected) failed
  - [failed] AC-18 expense-date sigue siendo un input de tipo date en edición, con valor YYYY-MM-DD  →  Error: expect(locator).toBeVisible() failed
RED confirmado: las 37 pruebas de @US-002 se ejecutaron y fallaron. Revisa arriba que cada una falle por la razón esperada.
```

Resultado y razón por prueba (todas `failed`):

| Prueba | Razón del fallo | ¿Esperada? |
|---|---|---|
| AC-01 (2 pruebas) | `GET /api/expenses/{id}`: se esperaba 200 y llegó 404 (la ruta no existe) | Sí |
| AC-02 GET/PUT/DELETE inexistente; id no entero; PUT no crea; PUT con cuerpo inválido (4 pruebas) | El 404 actual llega sin cuerpo: falta el `content-type` `application/problem+json` (`received` indefinido) | Sí (el contrato exige `ProblemDetails`) |
| AC-02 eliminar dos veces | `DELETE` esperaba 204 y llegó 404 | Sí |
| AC-03 (5 pruebas, incluida «PUT sin note», D-08) | `PUT`: se esperaba 200 y llegó 404 | Sí |
| AC-04 (4 pruebas, incluida «201 espacios», D-08) | `PUT` inválido: se esperaba 400 y llegó 404 (primera etiqueta de la tabla: «monto 0») | Sí |
| AC-05 | `PUT` esperaba 200 y llegó 404 | Sí |
| AC-06 | `DELETE` esperaba 204 y llegó 404 | Sí |
| AC-07 POST | `note` de `" "` se guarda como `" "` y no `null` (BUG-001 reproducido; `''` ya llega a `null`) | Sí |
| AC-07 PUT (vacía/espacios) y PUT con texto entre espacios (D-08) | `PUT` esperaba 200 y llegó 404 | Sí |
| AC-09 (2), AC-10 (2), AC-11, AC-12, AC-13, AC-14, AC-15 | `expense-item[data-id=N]` no existe: la lista aún no emite `data-id` | Sí (atributo nuevo del contrato) |
| AC-16 edición (3 pruebas) | Igual: `expense-item[data-id=N]` no existe (no hay modo edición) | Sí |
| AC-17 (2 pruebas) | `load-error` no existe; además la web se rompe con `categories.map is not a function` cuando falla `/api/categories` (BUG-002) | Sí |
| AC-18 alta | `expense-date` no tiene atributo `type` (se esperaba `date`; llegó vacío) | Sí |
| AC-18 edición | `expense-item[data-id=N]` no existe | Sí |

Nota de calidad: las pruebas de UI que parten de una edición o un borrado fallan hoy en el paso previo (`data-id`), de modo que su RED no demuestra por sí solo cada aserción posterior (p. ej., la categoría `alimentacion` de D-09 en AC-10 y AC-12). La verificación real ocurre con la implementación. Las pruebas de API y las de AC-17/AC-18 sí fallan en la aserción propia del criterio.

Regresión `@US-001` con las 4 pruebas movidas (D-10), ejecutada contra el código actual: `npm --prefix tests/acceptance test -- --grep "@US-001"` → 21 pasan (17 existentes + `US-002-AC-08` + 3 `US-002-AC-16 (alta)`). Pasan porque ya se cumplían; la CI las ejecuta con la suite de US-001 y no entran en `red-check` de US-002.

## Supuestos que requieren decisión

Todos resueltos por el humano en la revisión (D-07 a D-10, `specs/US-002/US-002.md`). Quedan como contrato de las pruebas.

| Supuesto | Resolución |
|---|---|
| AC-08 y las 3 variantes de AC-16 (alta) ya se cumplían: sin RED posible | D-10: pruebas en la suite de US-001 (`tests/us-001-regresion-us-002.spec.ts`), etiqueta `@US-001`, ID `US-002-AC-NN` en el título (sin «@»), sin `@US-002`, `@US-002-AC-NN` ni `@baseline-…`. AC-08 y AC-16 no van en ningún `.criteria`; AC-16 (edición) sigue en `@US-002` |
| `404` con `application/problem+json` y `status: 404` | D-07 (1), confirmado |
| Ids `0` y `-1` dan `404`; no enteros (`abc`, `1.5`, `1e3`, `0x10`, desbordado) dan `404` | D-07 (2), confirmado |
| Monto del campo de edición comparado numéricamente (`Number(valor)`) | D-07 (3), confirmado |
| Botones con texto exacto «Guardar» y «Guardar cambios» | D-07 (5), confirmado |
| Con carga fallida el formulario sigue visible; `load-error` tiene texto | D-07 (6), confirmado |
| Tras un reintento exitoso `load-error` deja de existir en el DOM | D-07 (7), confirmado |
| Total de la UI = suma de los `expense-item` mostrados (por la ejecución en paralelo sobre el mes actual) | D-07 (8), confirmado |
| `PUT` sin la clave `note` | D-08: reemplaza todo, `note: null`. Prueba en AC-03 |
| `PUT` con nota de 201 espacios | D-08: `400` por largo en `note`. Prueba en AC-04 |
| Nota con texto y espacios alrededor (`'  hola  '`) | D-08: se guarda tal cual. Prueba en AC-07 (en `PUT`; en `POST` no se agregó prueba: la decisión habla de `PUT` y ya se cumpliría, sin RED) |
| Categoría seleccionada tras guardar o cancelar una edición | D-09: vuelve a `alimentacion`. Comprobado en AC-10 y AC-12 (helper `expectCreateMode`) |

Observaciones menores que no cambian ningún criterio y no se llevaron como decisión (informativas):

- La lista se localiza por `data-id` o por nota única; no se asume orden de los gastos.
- AC-10 edita la fecha al día 1 del mes actual (válido, no futuro). Si hoy es día 1 coincide con la fecha previa; la edición se comprueba igual por monto, categoría y nota.
- El contrato no define qué muestra `expense-item` además de `data-amount` y la nota. No se verifica la fecha ni la categoría visibles; se comprueban vía API.

## Preguntas para el humano

Ninguna abierta. Las preguntas A (`PUT` sin `note`), B (categoría tras guardar o cancelar), C (201 espacios) y D (espacios alrededor de un texto) quedaron resueltas por D-08 y D-09 y ahora tienen prueba.

## Cobertura vs. estrategia

No hay holdout en esta fase (excepción registrada en el perfil). La regresión `@US-001` (incluidas las 4 pruebas movidas) se ejecutó contra el código actual y pasa; con `type="date"` en la implementación debe seguir verde (`fill('YYYY-MM-DD')` funciona igual, D-02). `@EN-001` no se ejecutó en este paso.
