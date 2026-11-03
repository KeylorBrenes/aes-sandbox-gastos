# EN-001 — Plan de pruebas de aceptación

Archivo: `tests/acceptance/tests/en-001.spec.ts` (etiqueta `@EN-001`). Configuración: `tests/acceptance/playwright.config.ts` (arranca la API en 5080 con SQLite temporal vía `ConnectionStrings__Gastos` y la web en 5173; `reuseExistingServer: !process.env.CI`).

## Matriz criterio -> prueba

| Criterio | Prueba | Tipo |
|---|---|---|
| AC-01 | `AC-01 GET /api/health responde 200 con {"status":"ok"} en JSON` (200, content-type JSON, cuerpo exacto) | API |
| AC-01 | `AC-01 (negativo) una ruta inexistente de la API no responde ok de salud` (404 en `/api/no-existe`) | API, negativo |
| AC-02 | `AC-02 la página principal muestra el título «Control de gastos»` (`data-testid="app-title"` visible, texto exacto) | Navegador |
| AC-03 | `AC-03 el proxy de la web responde lo mismo que la API en /api/health` | API vía web |
| AC-04 | No cubierto por Playwright: lo verifica la CI (`aes`), según el criterio. | CI |

Límites: texto exacto (no subcadena) en AC-02; cuerpo exacto con `toEqual` en AC-01 y AC-03.

## RED confirmado

Comando: `npm --prefix tests/acceptance test -- --grep "@EN-001"` contra el código actual (sin `src/` ni `web/`).

Salida real (resumen):
```
[WebServer] The provided file path does not exist: src/Gastos.Api.
Error: Process from config.webServer was not able to start. Exit code: 1
```

| Prueba | Resultado | Razón | ¿Esperada? |
|---|---|---|---|
| AC-01 health 200 | Falla (no se ejecuta) | `webServer` de la API no arranca: `src/Gastos.Api` no existe | Sí (la spec lo prevé) |
| AC-01 negativo 404 | Falla (no se ejecuta) | Idem | Sí |
| AC-02 título | Falla (no se ejecuta) | Idem; además `web/` no existe | Sí |
| AC-03 proxy | Falla (no se ejecuta) | Idem | Sí |

Nota: al fallar el arranque de los servidores, Playwright aborta antes de correr las pruebas (exit code distinto de 0). Es la razón esperada indicada en la estrategia de pruebas de EN-001. La configuración y las pruebas cargan y compilan; el error es del `webServer`, no de sintaxis.

## Supuestos y preguntas

- Supuesto: el `Content-Type` puede incluir `; charset=utf-8`; se comprueba con `toContain('application/json')`.
- La prueba negativa 404 no está en la tabla de criterios; es un extra de bajo riesgo que asume el comportamiento por defecto de minimal APIs.
- Pregunta (no bloqueante): el contrato no define `ASPNETCORE_ENVIRONMENT`; la configuración no lo fija.
- `tests/acceptance/node_modules` no debe versionarse; conviene confirmar que `.gitignore` lo cubre (el orquestador).
