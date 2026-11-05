import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API, listMonth, localDate, monthOf } from './us-001.helpers';
import { WEB, expectProblem, uniqueNote } from './us-002.helpers';

// Regresión de US-001 con origen en los criterios de US-002 (D-10): AC-08 y AC-16 (alta) ya se cumplen
// con el código actual (el hueco era de cobertura, D-06 de US-001), así que no pueden estar en RED.
// Viven en la suite de US-001 (@US-001), con el ID «US-002-AC-NN» en el título para trazabilidad.
// No llevan @US-002 ni @US-002-AC-NN: AC-08 y AC-16 no aparecen en ningún .criteria.

const tag = { tag: '@US-001' };

test('US-002-AC-08 — GET /api/expenses?month= (vacío) responde 400 con ProblemDetails y error en month', tag, async ({ request }) => {
  const res = await request.get(`${API}/api/expenses?month=`);
  const problem = await expectProblem(res, 400);
  expect(Object.keys(problem.errors ?? {})).toEqual(['month']);
  expect(problem.errors!.month.length).toBeGreaterThan(0);
});

async function fillValid(page: Page) {
  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await page.getByTestId('expense-amount').fill('300');
  await page.getByTestId('expense-date').fill(localDate());
  await page.getByTestId('expense-category').selectOption('otros');
}

async function expectNotCreated(page: Page, request: APIRequestContext, note: string) {
  await expect(page.getByTestId('expense-item').filter({ hasText: note })).toHaveCount(0);
  const month = (await listMonth(request, monthOf(localDate()))).body;
  expect(month.items.some((i: { note: string | null }) => i.note === note)).toBe(false);
}

test('US-002-AC-16 — (alta) con fecha vacía se muestra field-error-date y la lista no cambia', tag, async ({ page, request }) => {
  const note = uniqueNote('intento-fecha');
  await fillValid(page);
  await page.getByTestId('expense-note').fill(note);
  await page.getByTestId('expense-date').fill('');
  await page.getByTestId('expense-submit').click();
  const error = page.getByTestId('field-error-date');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
  await expectNotCreated(page, request, note);
});

test('US-002-AC-16 — (alta) con nota de 201 caracteres se muestra field-error-note y la lista no cambia', tag, async ({ page, request }) => {
  const note = 'n'.repeat(201);
  await fillValid(page);
  await page.getByTestId('expense-note').fill(note);
  await page.getByTestId('expense-submit').click();
  const error = page.getByTestId('field-error-note');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
  await expectNotCreated(page, request, note);
});

test('US-002-AC-16 — (alta) si la API responde 400 con error en categoryId se muestra field-error-categoryId y la lista no cambia', tag, async ({ page, request }) => {
  const note = uniqueNote('intento-categoria');
  await fillValid(page);
  await page.getByTestId('expense-note').fill(note);
  await page.route(/\/api\/expenses(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fulfill({
      status: 400,
      contentType: 'application/problem+json',
      body: JSON.stringify({ title: 'One or more validation errors occurred.', status: 400, errors: { categoryId: ['La categoría no existe.'] } }),
    });
  });
  await page.getByTestId('expense-submit').click();
  const error = page.getByTestId('field-error-categoryId');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
  await expectNotCreated(page, request, note);
});
