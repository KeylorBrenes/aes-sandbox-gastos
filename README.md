# aes-sandbox-gastos

Aplicación de control de gastos personales construida con agentes de IA siguiendo el [Agentic Engineering Standard (AES)](https://github.com/KeylorBrenes/AES---Agent-Method) 1.1.1.

Es a la vez un producto pequeño pero real y un banco de pruebas de AES con el harness de Claude Code (orquestador, QA, programador y verificador como agentes separados).

## Stack

- API: ASP.NET Core 10, EF Core, SQLite
- Web: React + TypeScript (Vite)
- Pruebas: xUnit (unitarias e integración), Playwright (aceptación y prueba manual agéntica)
- CI: GitHub Actions (`aes`), con el guardián AES en `ci/aes-guard.sh`

## Estado

En preparación. El backlog, la arquitectura y el perfil del proyecto estarán en `docs/` y `specs/`.

## Convención de ramas

| Rama | Quién | Controles |
|---|---|---|
| `task/US-NNN/TASK-NNN` | Programador (agente) | Guardián AES + CI |
| `qa/US-NNN` | QA (agente) | CI + tu revisión |
| `spec/US-NNN` | Orquestador / tú | CI + tu revisión |
| `main` | Solo vía pull request | Protegida |
