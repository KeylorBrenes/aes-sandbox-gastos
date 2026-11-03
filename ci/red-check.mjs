// AES — Verificación de RED confirmado (AES 05 §2.2), capa L3.
//
// Lee el reporte JSON de Playwright de las pruebas de UNA historia ejecutadas contra el código
// actual y exige que:
//   1. se hayan EJECUTADO pruebas (un error de compilación o de configuración no es RED);
//   2. ninguna pase (una prueba que pasa contra la base no prueba la funcionalidad nueva);
//   3. ninguna esté omitida (skip/fixme).
// Excepción: «RED de arranque». Si la base todavía no tiene código de aplicación (enabler
// inicial), se acepta que no se ejecute ninguna prueba porque los servidores no arrancan.
//
// Uso: node red-check.mjs <reporte.json> <ID-historia> <bootstrap: 0|1>
// Imprime una tabla prueba → estado → primera línea del error, para que el humano revise
// que cada prueba falle por la razón esperada.
import { readFileSync, existsSync } from 'node:fs';

const [reportPath, story, bootstrapArg] = process.argv.slice(2);
const bootstrap = bootstrapArg === '1';
const fail = (msg) => { console.log(`::error::${msg}`); process.exit(1); };
const ok = (msg) => { console.log(msg); process.exit(0); };

let report = null;
if (reportPath && existsSync(reportPath)) {
  try { report = JSON.parse(readFileSync(reportPath, 'utf8')); } catch { report = null; }
}

const tests = [];
const walk = (suite, parents = []) => {
  const path = suite.title ? [...parents, suite.title] : parents;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const results = t.results ?? [];
      const last = results[results.length - 1];
      const message = (last?.error?.message ?? last?.errors?.[0]?.message ?? '')
        .replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) ?? '';
      tests.push({ title: spec.title, status: last?.status ?? 'notRun', outcome: t.status, message: message.trim() });
    }
  }
  for (const child of suite.suites ?? []) walk(child, path);
};
for (const s of report?.suites ?? []) walk(s);

const globalErrors = (report?.errors ?? []).map((e) =>
  (e.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').find((l) => l.trim()) ?? '');
const executed = tests.filter((t) => t.status !== 'notRun' && t.status !== 'skipped');

console.log(`Historia: @${story} | pruebas encontradas: ${tests.length} | ejecutadas: ${executed.length}`);
for (const t of tests) console.log(`  - [${t.status}] ${t.title}${t.message ? `  →  ${t.message.slice(0, 160)}` : ''}`);
for (const e of globalErrors) console.log(`  ! error global: ${e.slice(0, 200)}`);

if (executed.length === 0) {
  if (bootstrap) {
    ok(`RED de arranque aceptado: la base aún no tiene código de aplicación y ninguna prueba llegó a ejecutarse${globalErrors.length ? ` (${globalErrors[0].slice(0, 120)})` : ''}.`);
  }
  fail(`Ninguna prueba de @${story} llegó a ejecutarse. Un error de compilación, de configuración o de arranque no demuestra RED. Revisa los errores globales.`);
}

const passed = tests.filter((t) => t.status === 'passed');
if (passed.length) {
  fail(`Estas pruebas PASAN contra el código actual, así que no prueban la funcionalidad nueva: ${passed.map((t) => `«${t.title}»`).join(', ')}`);
}

const skipped = tests.filter((t) => t.status === 'skipped');
if (skipped.length) {
  fail(`Hay pruebas omitidas (skip/fixme) en @${story}: ${skipped.map((t) => `«${t.title}»`).join(', ')}`);
}

const notRun = tests.filter((t) => t.status === 'notRun');
if (notRun.length) {
  fail(`Algunas pruebas no llegaron a ejecutarse: ${notRun.map((t) => `«${t.title}»`).join(', ')}`);
}

ok(`RED confirmado: las ${executed.length} pruebas de @${story} se ejecutaron y fallaron. Revisa arriba que cada una falle por la razón esperada.`);
