# Architecture Overview — Control de gastos

## Contexto y límites

Aplicación local de un solo usuario. El navegador habla con la web (React) y la web con la API (`/api`). La API persiste en un archivo SQLite. No hay sistemas externos.

```
[Navegador] ──► web (Vite/React, :5173) ──/api──► Gastos.Api (:5080) ──► SQLite (gastos.db)
```

Límite de confianza: la API escucha solo en `localhost`. No hay autenticación (fuera de alcance en el primer horizonte, ver brief).

## Vista de componentes

| Componente | Responsabilidad |
|---|---|
| `Gastos.Api` — Endpoints | Mapear HTTP ↔ casos de uso; validar entrada; devolver `ProblemDetails` en errores. |
| `Gastos.Api` — Dominio | Entidades (`Expense`, `Budget`), categorías fijas, reglas (monto > 0, fecha no futura, etc.). |
| `Gastos.Api` — Datos | `GastosDbContext`, configuración de EF Core y migraciones. |
| `web` | Formularios, listados y resúmenes; llamadas a la API con un cliente `fetch` pequeño. |

## Dependencias y reglas

- Endpoints → Dominio → Datos. El dominio no depende de ASP.NET Core.
- La web solo conoce la API por HTTP; no comparte código con el backend.
- Sin patrón repositorio ni capas adicionales sin requisito que las justifique (ADR-001).

## Datos

| Entidad | Campos principales | Notas |
|---|---|---|
| `Expense` | `Id` (int), `Amount` (decimal 18,2), `Date` (DateOnly), `CategoryId` (string), `Note` (string?, ≤ 200), `CreatedAt` (UTC) | US-001 |
| `Budget` | `Month` (YYYY-MM), `CategoryId`, `Amount` | US-003 |

Categorías fijas iniciales: `alimentacion`, `transporte`, `vivienda`, `servicios`, `salud`, `ocio`, `otros`.

Ubicación de la base: configurable (`ConnectionStrings:Gastos`); por defecto `data/gastos.db`, ignorada por git. Las pruebas usan una base aislada por ejecución.

## Interfaces e integraciones

Contratos definidos por historia en `specs/<ID>/<ID>.md` (sección *Contrato de interfaz*). Convenciones generales en ADR-001.

## Seguridad y privacidad

- Datos financieros personales: no salen del equipo; nada de telemetría.
- Escucha solo en `localhost`; CORS no habilitado (la web usa proxy en desarrollo).
- Sin secretos en el repositorio. La llave de la GitHub App de los agentes vive fuera del repo (`docs/agent-identity.md`).

## Despliegue y operación

Local. En desarrollo: `dotnet run` + `npm run dev`. La entrega empaquetada (CD) se decidirá en una historia posterior con su propio ADR.

## Calidad no funcional

- Accesibilidad básica: formularios con `label`, mensajes de error asociados al campo.
- Respuesta de la API < 200 ms en local para listados de un mes.

## Restricciones y decisiones abiertas

- Zona horaria de referencia para «hoy»: la local del equipo (pendiente de confirmar en US-001).
- Paginación: no necesaria mientras el listado sea mensual.

## ADRs relacionados

| ID | Decisión | Estado |
|---|---|---|
| ADR-001 | Stack y estructura del repositorio | Proposed |
