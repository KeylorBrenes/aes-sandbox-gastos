# ADR-002: Convenciones de UI y validación

- **Estado:** Proposed. **No se acepta al fusionar el ajuste del harness 3**: se acepta (o se ajusta) en el refinamiento de US-002, como decisión D-NN de esa historia.
- **Fecha:** 2026-11-04
- **Responsable:** Orquestador / arquitecto
- **Aprobador:** Responsable humano del producto

## Contexto

En US-001 se tomaron decisiones de UI que no son de esa historia, sino de todos los formularios futuros (editar en US-002, presupuestos en US-003):

- D-04: la validación vive en la API; la web no usa validación nativa del navegador, porque bloquearía el envío sin mostrar `field-error-<campo>`.
- D-05: la categoría es un `<select>` cuyo `value` es el id; la fecha es un `<input type="date">`. **Esto nunca se decidió explícitamente**: lo fijaron las pruebas de QA y lo implementó el programador.

Sin un registro común, cada historia vuelve a preguntar lo mismo, o peor, el primer agente que escribe una prueba lo decide.

## Decisión (propuesta)

| Tema | Convención |
|---|---|
| Fuente de verdad de la validación | La API. La web envía y muestra los errores de `ProblemDetails.errors` junto a cada campo, en `data-testid="field-error-<campo>"` |
| Validación nativa | Desactivada en los formularios (`noValidate`): sin `required`, `min` ni `pattern` que bloqueen el envío |
| Selección de entidades con id | `<select>` con `value` = id y texto = nombre |
| Fechas | `<input type="date">`, valor `YYYY-MM-DD` |
| Montos | Se muestran con formato local; el valor numérico sin formato va en `data-amount` para pruebas y lectura por herramientas |
| Errores de carga | Si una carga inicial falla, se muestra un mensaje con `data-testid="load-error"` y la acción que corresponda; nunca una pantalla vacía (ver BUG-002) |
| Selectores de prueba | `data-testid` estables, definidos en el contrato de interfaz de cada historia |

## Alternativas consideradas

| Alternativa | Ventajas | Costes/riesgos |
|---|---|---|
| Validación duplicada (navegador + API) | Respuesta instantánea | Dos fuentes de verdad; el error nativo no tiene `data-testid` y las pruebas no lo ven |
| Decidir por historia | Flexibilidad | Lo decide quien escriba primero la prueba (D-05) |

## Consecuencias

- QA puede escribir pruebas de UI sin suponer el tipo de control: lo dice este ADR.
- Las historias con formularios solo especifican qué campos hay y qué errores existen; la forma sale de aquí.
- Cambiar una convención requiere un ADR nuevo que sustituya a este.

## Referencias

US-001 (decisiones D-04 a D-06), BUG-002, AES 01 §4.
