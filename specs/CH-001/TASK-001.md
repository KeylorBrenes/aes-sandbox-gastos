# CH-001 / TASK-001 — `nuget.config` en la raíz

- **Historia:** CH-001 (`specs/CH-001/CH-001.md`)
- **Rol:** mechanic
- **Track:** T1
- **Rama:** `task/CH-001/TASK-001`
- **Superficie:** `specs/CH-001/TASK-001.scope`

## Objetivo

Crear `nuget.config` en la raíz del repositorio con exactamente este contenido:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="nuget.org">
      <package pattern="*" />
    </packageSource>
  </packageSourceMapping>
</configuration>
```

## Alcance

1. Un solo archivo nuevo: `nuget.config` (nombre en minúsculas, en la raíz).
2. Un solo commit con prefijo `chore:`.

## Fuera de alcance

- Cualquier otro archivo: `*.csproj`, `Directory.Packages.props`, `global.json`, `.gitignore`, `ci/`, `.github/`, `specs/`, `docs/`. Si necesitas alguno, reporta BLOCKED.
- Cambiar versiones de paquetes o agregar fuentes.

## Criterios (de CH-001)

AC-01, AC-02 y AC-03. No hay pruebas Playwright; el verificador comprueba AC-01 y AC-02 por comando.

## Comandos de validación (exactos)

```bash
dotnet nuget list source
dotnet restore
dotnet build -warnaserror
dotnet test
BASE_REF=origin/main TASK_SCOPE_FILE=specs/CH-001/TASK-001.scope bash ci/aes-guard.sh
```

`dotnet nuget list source` debe listar solo `nuget.org [Enabled]`. El guardián local fallará en `[dependencias]` porque `nuget.config` cuenta como dependencia; es lo esperado (en la CI lo cubre la etiqueta `aes:deps-approved`). Cualquier otro FAIL del guardián debe corregirse.

## Pruebas afectadas

Ninguna prueba existente depende de este archivo; `dotnet build` y `dotnet test` deben seguir en verde.

## Presupuesto de diff

≈ 12 líneas.

## Dependencias autorizadas

Solo la fuente `nuget.org` con *package source mapping* `*` → `nuget.org`. Ninguna otra.

## Notas

- Copia el contenido tal cual; no lo reformatees ni agregues comentarios.
