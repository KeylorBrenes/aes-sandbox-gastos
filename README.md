# aes-sandbox-gastos

Aplicación de control de gastos personales construida con agentes de IA siguiendo el [Agentic Engineering Standard (AES)](https://github.com/KeylorBrenes/AES---Agent-Method) 1.1.1.

Es a la vez un producto pequeño pero real y un banco de pruebas de AES con el harness de Claude Code (orquestador, QA, programador y verificador como agentes separados).

## Stack

- API: ASP.NET Core 10, EF Core, SQLite
- Web: React + TypeScript (Vite)
- Pruebas: xUnit (unitarias e integración), Playwright (aceptación y prueba manual agéntica)
- CI: GitHub Actions (`aes`), con el guardián AES en `ci/aes-guard.sh`

## Estado

Inicio del proyecto: EN-001 y US-001 propuestas. Para trabajar, ver [`docs/runbook.md`](docs/runbook.md).

| Documento | Contenido |
|---|---|
| [`docs/project-brief.md`](docs/project-brief.md) | Problema, alcance y fuera de alcance |
| [`docs/architecture-overview.md`](docs/architecture-overview.md) | Componentes, datos, seguridad |
| [`docs/adr/`](docs/adr/) | Decisiones de arquitectura |
| [`docs/project-profile.md`](docs/project-profile.md) | Perfil AES y **binding de roles** (harness y modelo por rol) |
| [`docs/backlog.md`](docs/backlog.md) | Epics e historias |
| [`specs/`](specs/) | Historias, tareas y superficies de cambio |
| [`docs/harness-findings.md`](docs/harness-findings.md) | Hallazgos del experimento con Claude Code |

## Convención de ramas

| Rama | Quién | Controles |
|---|---|---|
| `task/US-NNN/TASK-NNN` | Programador (agente) | Guardián AES + CI |
| `qa/US-NNN` | QA (agente) | CI + tu revisión |
| `spec/US-NNN` | Orquestador / tú | CI + tu revisión |
| `main` | Solo vía pull request | Protegida |
