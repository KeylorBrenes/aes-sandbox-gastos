<!-- Copia de AES 1.1.2, standard/08-definition-of-ready-and-done.md (https://github.com/KeylorBrenes/AES---Agent-Method/blob/v1.1.2/standard/08-definition-of-ready-and-done.md).
     Se copia para que el orquestador la tenga sin salir del repo. No editar aquí: los cambios van a AES y se vuelven a copiar. -->

# 08 — Definition of Ready y Definition of Done

## 1. Definition of Ready (DoR) — Historia de Usuario

Una historia puede pasar a `Ready` cuando:

- [ ] objetivo, actor y beneficio/resultante están claros;
- [ ] alcance y exclusiones relevantes están definidos;
- [ ] criterios de aceptación son observables y verificables;
- [ ] ambigüedades materiales están resueltas;
- [ ] dependencias y riesgos relevantes están identificados;
- [ ] prioridad, Story Points y track están asignados;
- [ ] existe estrategia de aceptación y pruebas;
- [ ] decisiones arquitectónicas necesarias están aprobadas;
- [ ] el contrato de interfaz está definido cuando la historia toca una frontera observable;
- [ ] la suite de aceptación está escrita, aprobada por el responsable humano y protegida;
- [ ] **RED confirmado**: cada prueba nueva falla contra la base por la razón esperada;
- [ ] las pruebas holdout existen cuando el track es T3 (o el perfil las exige);
- [ ] «Fuera de alcance» no está vacío en T2/T3;
- [ ] puede dividirse en tareas pequeñas sin inventar requisitos.

Para T0 no se requiere historia. Para T1 basta con la prueba de reproducción protegida con RED confirmado y su aprobación (02 §8).

Si una casilla no aplica, se puede marcar `N/A` con justificación. No se debe forzar una historia a `Ready` por presión de planificación.

## 2. Definition of Ready — Tarea

Una tarea puede pasar a ejecución cuando:

- [ ] pertenece a una historia/elemento aprobado;
- [ ] tiene un resultado principal concreto;
- [ ] alcance, exclusiones y restricciones están claros;
- [ ] la superficie de cambio está publicada en la rama protegida;
- [ ] dependencias/contratos se conocen;
- [ ] permisos del agente están definidos;
- [ ] los comandos de validación exactos y las pruebas de regresión afectadas están listados;
- [ ] la condición de finalización está definida;
- [ ] el contexto necesario está disponible.

## 3. Definition of Done — Tarea

Una tarea está técnicamente terminada cuando:

- [ ] cumple el resultado especificado;
- [ ] el baseline de pruebas se registró al inicio de la sesión;
- [ ] el cambio está dentro de la superficie de cambio;
- [ ] las pruebas pertinentes se añadieron/actualizaron y ejecutaron;
- [ ] lint, tipos y análisis requeridos pasan;
- [ ] los commits separan cambios estructurales y conductuales;
- [ ] el guardián de CI no reporta alertas, o cada alerta tiene justificación y aprobación;
- [ ] se inspeccionó el diff y no hay cambios ajenos;
- [ ] no se introdujeron secretos, artefactos temporales ni dependencias no aprobadas;
- [ ] se entregó el reporte con evidencia ejecutada y bloqueos conocidos.

La tarea pasa a revisión; el programador no la marca como aceptada.

## 4. Definition of Done — Historia de Usuario

Una historia puede pasar a `Ready for Acceptance` cuando:

- [ ] todas sus tareas están técnicamente terminadas;
- [ ] todos los criterios de aceptación tienen evidencia PASS o una excepción formal aprobada;
- [ ] pruebas unitarias, integración, contrato, E2E y regresión requeridas pasan;
- [ ] controles estáticos y de seguridad aplicables pasan;
- [ ] las pruebas holdout pasan, cuando existen;
- [ ] el verificador independiente re-ejecutó las validaciones y emite `PASS`;
- [ ] existe evidencia de la prueba manual agéntica cuando el track la exige (05 §11);
- [ ] no quedan defectos críticos ni bloqueantes conocidos;
- [ ] documentación/ADRs afectados están actualizados;
- [ ] el comportamiento existente relevante no sufrió regresiones;
- [ ] el resultado puede probarse en un entorno apropiado.

Después de eso:

- funcionalidades visibles o relevantes para el usuario pasan por aceptación humana según el perfil;
- en T3, el responsable humano revisa el código de las zonas de riesgo (00 §8);
- el responsable humano emite `Accepted` o `Rejected`;
- solo entonces la historia se considera aceptada;
- en T2/T3, el orquestador ejecuta la retrospectiva compuesta (09 §3) antes de pasar a la siguiente historia.

Un resultado `BLOCKED`, `NOT RUN` o una prueba omitida sin justificación no equivale a `PASS`.

## 5. Definition of Done del proyecto

El proyecto puede declararse listo para una liberación cuando se cumplen sus gates de release, seguridad, migración, documentación, recuperación y aprobación definidos en el perfil. No basta con que todas las historias estén en estado `Accepted` si aún existen riesgos de liberación sin resolver.
