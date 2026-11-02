# Project Brief — Control de gastos

- **AES:** 1.1.1
- **Estado:** Propuesto por el orquestador. Pendiente de aprobación del responsable humano (se aprueba al fusionar el PR que lo introduce).
- **Responsable del producto:** Keylor Brenes

## Problema y oportunidad

Llevar el control de los gastos personales en hojas de cálculo o notas sueltas hace difícil saber, a mitad de mes, cuánto se ha gastado por categoría y si el presupuesto alcanza. Se quiere una herramienta personal, local y simple que responda dos preguntas en segundos: **¿en qué se me va el dinero este mes?** y **¿voy dentro del presupuesto?**

Este proyecto es además el banco de pruebas de AES con agentes de Claude Code. El producto debe ser real y usable, pero de escala pequeña.

## Usuarios y actores

- **Usuario único:** la persona que registra y consulta sus propios gastos, desde su PC.
- No hay administradores, roles ni sistemas externos en el primer horizonte.

## Objetivos y señales de éxito

1. Registrar un gasto toma menos de 15 segundos.
2. Ver el total del mes y su desglose por categoría sin cálculos manuales.
3. Saber, por categoría, cuánto queda del presupuesto mensual.
4. Como banco de pruebas: completar al menos dos historias con el ciclo AES completo y registrar los hallazgos del harness.

## Alcance inicial

- Registro de gastos: monto en colones (CRC), fecha, categoría y nota opcional.
- Listado por mes con total.
- Edición y eliminación de gastos.
- Presupuesto mensual por categoría.
- Resumen del mes: gastado vs. presupuesto por categoría.

## Fuera de alcance (primer horizonte)

- Múltiples usuarios, cuentas o autenticación (la app corre localmente para una sola persona).
- Múltiples monedas o conversión de divisas.
- Ingresos, cuentas bancarias, sincronización con bancos.
- Aplicación móvil y despliegue en la nube.
- Importación desde hojas de cálculo.

## Restricciones

- Se ejecuta localmente en Windows (y debe funcionar también en Linux para la CI).
- Stack: ASP.NET Core 10 + EF Core + SQLite; React + TypeScript (ver ADR-001).
- Datos personales financieros: se quedan en el equipo del usuario; la API escucha solo en `localhost`.
- Todo el código lo escriben agentes bajo AES; el humano aprueba criterios, pruebas de aceptación y PR.

## Supuestos e incertidumbres

| Elemento | Tipo | Impacto | Cómo resolver |
|---|---|---|---|
| Lista fija de categorías basta al inicio | Supuesto | Bajo | Categorías personalizadas como historia posterior (US-005). |
| Montos en colones con hasta 2 decimales | Supuesto | Bajo | Confirmar al aprobar US-001. |
| La zona horaria de referencia es la local del equipo (America/Costa_Rica) | Supuesto | Bajo | Confirmar al aprobar US-001. |
| Rendimiento de los subagentes en Windows/Git Bash | Incertidumbre | Medio | Se mide durante EN-001 y se registra en `docs/harness-findings.md`. |

## Riesgos iniciales

| Riesgo | Probabilidad/impacto | Mitigación |
|---|---|---|
| Los hooks bash fallan en Windows (rutas, CRLF) | Media/medio | `.gitattributes`, rutas normalizadas en hooks, prueba en EN-001. |
| Un agente escribe fuera de su rol por la terminal | Media/medio | L3: guardián en CI + rama protegida; L2 como fricción. |
| Sobrecosto de tokens por ciclo | Media/bajo | Medir por historia; usar Haiku para tareas mecánicas. |

## Aprobaciones

- Responsable del producto: _(se registra al fusionar el PR)_
- Fecha/versión aprobada:
