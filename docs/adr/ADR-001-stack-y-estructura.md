# ADR-001: Stack y estructura del repositorio

- **Estado:** Proposed (se acepta al fusionar el PR que lo introduce)
- **Fecha:** 2026-11-02
- **Responsable:** Orquestador / arquitecto
- **Aprobador:** Responsable humano del producto

## Contexto

Se necesita una aplicación local de control de gastos (API + interfaz web) que sirva también como banco de pruebas de AES. El responsable tiene experiencia en .NET/C# y React/TypeScript. Las pruebas de aceptación deben escribirse **antes** de la implementación y por un agente distinto del programador, así que deben ejercitar la aplicación desde fuera, sin depender de su código interno.

## Decisión

| Capa | Elección |
|---|---|
| API | ASP.NET Core 10 (LTS), **minimal APIs** agrupadas por recurso |
| Persistencia | EF Core + SQLite, migraciones de EF Core (herramienta local `dotnet-ef`) |
| Web | React + TypeScript con Vite; Vitest para pruebas unitarias |
| Pruebas .NET | xUnit; integración con `WebApplicationFactory` |
| Pruebas de aceptación | **Playwright Test (TypeScript)** contra la API HTTP y la web, en `tests/acceptance/` |
| CI | GitHub Actions, un job `aes` |

Estructura del repositorio:

```
Gastos.slnx
src/Gastos.Api/            API (endpoints, dominio, datos)
tests/Gastos.Api.Tests/    xUnit: unitarias e integración (programador)
tests/acceptance/          Playwright: aceptación (QA, ruta protegida)
web/                       React + TS + Vite
specs/                     historias, tareas, superficies (ruta protegida)
docs/                      brief, arquitectura, ADRs, perfil, backlog, hallazgos
ci/                        guardián AES (ruta protegida)
```

Convenciones de la API:

- JSON en camelCase. Fechas como `"YYYY-MM-DD"` (`DateOnly`). Montos como número con hasta 2 decimales (`decimal(18,2)`), moneda CRC implícita.
- Errores de validación: `400` con `ProblemDetails` (RFC 9457) y diccionario `errors` por campo (camelCase).
- Prefijo `/api`. La API escucha en `http://localhost:5080`; la web de desarrollo en `http://localhost:5173` con proxy de `/api` hacia la API.

## Alternativas consideradas

| Alternativa | Ventajas | Costes/riesgos |
|---|---|---|
| Pruebas de aceptación en xUnit | Un solo lenguaje | QA necesitaría conocer clases internas o el proyecto de pruebas del programador; acopla la aceptación a la implementación. |
| Controladores MVC | Familiar | Más ceremonia para una API pequeña. |
| Patrón repositorio sobre EF Core | Familiar en proyectos empresariales | Abstracción sin necesidad demostrable: EF Core ya es la abstracción (AES 01 §6). |
| SQL Server LocalDB | Igual que en entornos empresariales | Solo Windows; complica la CI en Linux. |
| Next.js | Full-stack en un solo lenguaje | Se aleja del objetivo de practicar .NET. |

## Consecuencias

- Las pruebas de aceptación son independientes del lenguaje del backend: si mañana se reescribe la API, siguen valiendo.
- La CI necesita .NET y Node, y navegadores de Playwright para la aceptación.
- SQLite simplifica la CI y la ejecución local; no hay concurrencia multiusuario que lo justifique.
- Sin patrón repositorio: los endpoints usan el `DbContext` directamente o servicios pequeños cuando una regla lo justifique.

## Reversibilidad y riesgos

Cambiar SQLite por otro motor es moderado gracias a EF Core. Cambiar la estructura de carpetas afecta superficies de cambio, rutas protegidas y CI: requiere un ADR nuevo.

## Referencias

- `docs/project-brief.md`, `docs/architecture-overview.md`, AES 05 §2.1 (contrato de interfaz).
