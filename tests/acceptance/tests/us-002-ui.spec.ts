import { test, expect, type Page } from '@playwright/test';
import { listMonth, localDate, monthOf } from './us-001.helpers';
import {
  WEB,
  expectTotalMatchesItems,
  getExpense,
  itemById,
  markNoReload,
  seed,
  uniqueNote,
  wasNotReloaded,
  type Expense,
} from './us-002.helpers';

// La web lista el mes actual. Estas pruebas corren en paralelo con otras sobre el mismo mes, así que:
//  - cada una siembra sus propios gastos por API (nota única) y los localiza por data-id;
//  - el total se verifica contra la suma de los gastos mostrados, no contra un valor absoluto.

const tag = (ac: string) => ({ tag: ['@US-002', `@US-002-${ac}`] });

async function open(page: Page, expense: Expense) {
  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await expect(itemById(page, expense.id)).toBeVisible();
}

async function seedToday(request: Parameters<typeof seed>[0], prefix: string, extra: Partial<Expense> = {}) {
  return seed(request, {
    amount: 1250.5,
    date: localDate(),
    categoryId: 'salud',
    note: uniqueNote(prefix),
    ...extra,
  });
}

async function startEdit(page: Page, expense: Expense) {
  await itemById(page, expense.id).getByTestId('expense-edit').click();
  await expect(page.getByTestId('expense-form')).toHaveAttribute('data-mode', 'edit');
}

async function expectCreateMode(page: Page) {
  await expect(page.getByTestId('expense-form')).toHaveAttribute('data-mode', 'create');
  await expect(page.getByTestId('expense-amount')).toHaveValue('');
  await expect(page.getByTestId('expense-note')).toHaveValue('');
  await expect(page.getByTestId('expense-date')).toHaveValue(localDate());
  // D-09: el formulario vuelve a su estado inicial, con la categoría por defecto.
  await expect(page.getByTestId('expense-category')).toHaveValue('alimentacion');
  await expect(page.getByTestId('expense-submit')).toHaveText('Guardar');
  await expect(page.getByTestId('edit-cancel')).toHaveCount(0);
}

async function expectUnchangedOnServer(request: Parameters<typeof seed>[0], expense: Expense) {
  const res = await getExpense(request, expense.id);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(expense);
}

test('AC-09 «Editar» llena el formulario con los valores del gasto y muestra «Cancelar»', tag('AC-09'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac09', { amount: 1250.5, categoryId: 'salud' });
  await open(page, e);

  // En modo alta no hay «Cancelar».
  await expect(page.getByTestId('expense-form')).toHaveAttribute('data-mode', 'create');
  await expect(page.getByTestId('edit-cancel')).toHaveCount(0);

  await startEdit(page, e);
  await expect(page.getByTestId('edit-cancel')).toBeVisible();
  await expect(page.getByTestId('expense-submit')).toHaveText('Guardar cambios');
  await expect.poll(async () => Number(await page.getByTestId('expense-amount').inputValue())).toBe(1250.5);
  await expect(page.getByTestId('expense-date')).toHaveValue(e.date);
  await expect(page.getByTestId('expense-category')).toHaveValue('salud');
  await expect(page.getByTestId('expense-note')).toHaveValue(e.note!);

  // Pulsar «Editar» no modifica nada.
  await expect(itemById(page, e.id)).toHaveAttribute('data-amount', '1250.5');
  await expectUnchangedOnServer(request, e);
});

test('AC-09 «Editar» en un gasto sin nota deja el campo de nota vacío', tag('AC-09'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac09b', { note: null });
  await open(page, e);
  await startEdit(page, e);
  await expect(page.getByTestId('expense-note')).toHaveValue('');
  await expect(page.getByTestId('expense-category')).toHaveValue('salud');
});

test('AC-10 guardar la edición actualiza la lista y el total sin recargar y devuelve el formulario a modo alta', tag('AC-10'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac10', { amount: 1250.5, categoryId: 'salud' });
  const newNote = uniqueNote('ac10-nuevo');
  const firstOfMonth = `${monthOf(localDate())}-01`;
  await open(page, e);
  await startEdit(page, e);
  await markNoReload(page);

  await page.getByTestId('expense-amount').fill('2500.75');
  await page.getByTestId('expense-date').fill(firstOfMonth);
  await page.getByTestId('expense-category').selectOption('transporte');
  await page.getByTestId('expense-note').fill(newNote);
  await page.getByTestId('expense-submit').click();

  const item = itemById(page, e.id);
  await expect(item).toHaveAttribute('data-amount', '2500.75');
  await expect(item).toContainText(newNote);
  await expect(page.getByTestId('expense-item').filter({ hasText: e.note! })).toHaveCount(0);
  await expect(page.getByTestId('expense-item').filter({ hasText: newNote })).toHaveCount(1);
  await expectTotalMatchesItems(page);
  await expectCreateMode(page);
  expect(await wasNotReloaded(page)).toBe(true);

  // El servidor refleja la edición y conserva id y createdAt.
  const got = await (await getExpense(request, e.id)).json();
  expect(got).toEqual({
    id: e.id,
    amount: 2500.75,
    date: firstOfMonth,
    categoryId: 'transporte',
    note: newNote,
    createdAt: e.createdAt,
  });
});

test('AC-10 el total mostrado cambia cuando se edita el monto', tag('AC-10'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac10t', { amount: 100 });
  await open(page, e);
  await expectTotalMatchesItems(page);
  await startEdit(page, e);

  await page.getByTestId('expense-amount').fill('777.77');
  await page.getByTestId('expense-submit').click();

  await expect(itemById(page, e.id)).toHaveAttribute('data-amount', '777.77');
  await expectTotalMatchesItems(page);
  // El total ya incluye al menos el monto nuevo (y no el anterior de forma aislada).
  expect(Number(await page.getByTestId('month-total').getAttribute('data-amount'))).toBeGreaterThanOrEqual(777.77);
});

test('AC-11 guardar con un monto inválido muestra field-error-amount, no cambia el gasto y mantiene el modo edición', tag('AC-11'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac11', { amount: 1250.5 });
  await open(page, e);
  await startEdit(page, e);

  await page.getByTestId('expense-amount').fill('-5');
  await page.getByTestId('expense-submit').click();

  const error = page.getByTestId('field-error-amount');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
  await expect(page.getByTestId('expense-form')).toHaveAttribute('data-mode', 'edit');
  await expect(itemById(page, e.id)).toHaveAttribute('data-amount', '1250.5');
  await expect(itemById(page, e.id)).toContainText(e.note!);
  await expectUnchangedOnServer(request, e);
});

test('AC-12 «Cancelar» vuelve a modo alta con campos limpios y no cambia el gasto', tag('AC-12'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac12', { amount: 1250.5 });
  await open(page, e);
  await startEdit(page, e);

  // Se tocan los campos para comprobar que lo no guardado se descarta.
  await page.getByTestId('expense-amount').fill('9999');
  await page.getByTestId('expense-note').fill('texto-que-se-descarta');
  await page.getByTestId('edit-cancel').click();

  await expectCreateMode(page);
  await expect(itemById(page, e.id)).toHaveAttribute('data-amount', '1250.5');
  await expect(itemById(page, e.id)).toContainText(e.note!);
  await expect(page.getByTestId('expense-item').filter({ hasText: 'texto-que-se-descarta' })).toHaveCount(0);
  await expectUnchangedOnServer(request, e);
});

test('AC-13 «Eliminar» abre la confirmación en la página y el gasto sigue en la lista', tag('AC-13'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac13');
  await open(page, e);
  const item = itemById(page, e.id);
  await expect(item.getByTestId('delete-confirm')).toHaveCount(0);

  await item.getByTestId('expense-delete').click();

  await expect(item.getByTestId('delete-confirm')).toBeVisible();
  await expect(item.getByTestId('delete-confirm-yes')).toBeVisible();
  await expect(item.getByTestId('delete-confirm-no')).toBeVisible();
  await expect(item).toBeVisible();
  await expectUnchangedOnServer(request, e);
});

test('AC-14 «Confirmar» elimina el gasto de la lista, actualiza el total y lo borra del servidor', tag('AC-14'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac14', { amount: 4321.25 });
  await open(page, e);
  await expectTotalMatchesItems(page);
  await markNoReload(page);

  const item = itemById(page, e.id);
  await item.getByTestId('expense-delete').click();
  await item.getByTestId('delete-confirm-yes').click();

  await expect(itemById(page, e.id)).toHaveCount(0);
  await expect(page.getByTestId('expense-item').filter({ hasText: e.note! })).toHaveCount(0);
  await expectTotalMatchesItems(page);
  expect(await wasNotReloaded(page)).toBe(true);

  expect((await getExpense(request, e.id)).status()).toBe(404);
  const { body } = await listMonth(request, monthOf(e.date));
  expect(body.items.some((i: { id: number }) => i.id === e.id)).toBe(false);
});

test('AC-15 «Cancelar» en la confirmación la cierra y el gasto sigue en la lista', tag('AC-15'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac15');
  await open(page, e);
  const item = itemById(page, e.id);

  await item.getByTestId('expense-delete').click();
  await expect(item.getByTestId('delete-confirm')).toBeVisible();
  await item.getByTestId('delete-confirm-no').click();

  await expect(item.getByTestId('delete-confirm')).toHaveCount(0);
  await expect(item).toBeVisible();
  await expect(item).toContainText(e.note!);
  await expectUnchangedOnServer(request, e);
});

// AC-16: errores de fecha, nota y categoría junto a su campo, en alta y en edición.

type Mode = 'alta' | 'edición';

async function prepareForm(page: Page, request: Parameters<typeof seed>[0], mode: Mode, prefix: string): Promise<Expense | null> {
  let e: Expense | null = null;
  if (mode === 'edición') {
    e = await seedToday(request, prefix, { amount: 1250.5 });
    await open(page, e);
    await startEdit(page, e);
  } else {
    // En alta no hace falta sembrar nada: la prueba no depende de las funciones nuevas de la lista.
    await page.goto(`${WEB}/`);
    await expect(page.getByTestId('expense-form')).toBeVisible();
  }
  // Valores válidos base; cada prueba rompe un campo.
  await page.getByTestId('expense-amount').fill('300');
  await page.getByTestId('expense-date').fill(localDate());
  await page.getByTestId('expense-category').selectOption('otros');
  return e;
}

async function expectNothingChanged(page: Page, request: Parameters<typeof seed>[0], e: Expense | null, attemptedNote: string) {
  await expect(page.getByTestId('expense-item').filter({ hasText: attemptedNote })).toHaveCount(0);
  const month = (await listMonth(request, monthOf(localDate()))).body;
  expect(month.items.some((i: { note: string | null }) => i.note === attemptedNote)).toBe(false);
  if (e) {
    await expect(page.getByTestId('expense-form')).toHaveAttribute('data-mode', 'edit');
    await expect(itemById(page, e.id)).toHaveAttribute('data-amount', '1250.5');
    await expectUnchangedOnServer(request, e);
  }
}

// Las variantes en modo alta ya se cumplían (no pueden estar en RED): viven en la suite de US-001
// (us-001-regresion-us-002.spec.ts, D-10).
for (const mode of ['edición'] as Mode[]) {
  test(`AC-16 (${mode}) con fecha vacía se muestra field-error-date y la lista no cambia`, tag('AC-16'), async ({ page, request }) => {
    const e = await prepareForm(page, request, mode, `ac16d-${mode === 'alta' ? 'a' : 'e'}`);
    const attemptedNote = uniqueNote('intento-fecha');
    await page.getByTestId('expense-note').fill(attemptedNote);
    await page.getByTestId('expense-date').fill('');
    await page.getByTestId('expense-submit').click();

    const error = page.getByTestId('field-error-date');
    await expect(error).toBeVisible();
    await expect(error).not.toHaveText('');
    await expectNothingChanged(page, request, e, attemptedNote);
  });

  test(`AC-16 (${mode}) con nota de 201 caracteres se muestra field-error-note y la lista no cambia`, tag('AC-16'), async ({ page, request }) => {
    const e = await prepareForm(page, request, mode, `ac16n-${mode === 'alta' ? 'a' : 'e'}`);
    const attemptedNote = 'n'.repeat(201);
    await page.getByTestId('expense-note').fill(attemptedNote);
    await page.getByTestId('expense-submit').click();

    const error = page.getByTestId('field-error-note');
    await expect(error).toBeVisible();
    await expect(error).not.toHaveText('');
    await expectNothingChanged(page, request, e, attemptedNote);
  });

  test(`AC-16 (${mode}) si la API responde 400 con error en categoryId se muestra field-error-categoryId y la lista no cambia`, tag('AC-16'), async ({ page, request }) => {
    const e = await prepareForm(page, request, mode, `ac16c-${mode === 'alta' ? 'a' : 'e'}`);
    const attemptedNote = uniqueNote('intento-categoria');
    await page.getByTestId('expense-note').fill(attemptedNote);

    const method = mode === 'alta' ? 'POST' : 'PUT';
    await page.route(/\/api\/expenses(\/\d+)?(\?.*)?$/, async (route) => {
      if (route.request().method() !== method) return route.fallback();
      await route.fulfill({
        status: 400,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { categoryId: ['La categoría no existe.'] },
        }),
      });
    });
    await page.getByTestId('expense-submit').click();

    const error = page.getByTestId('field-error-categoryId');
    await expect(error).toBeVisible();
    await expect(error).not.toHaveText('');
    await expectNothingChanged(page, request, e, attemptedNote);
  });
}

// AC-17: error de carga con reintento (BUG-002).

test('AC-17 si GET /api/expenses falla se muestra load-error con load-retry y el formulario; al reintentar se carga la lista', tag('AC-17'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac17a');
  const listUrl = /\/api\/expenses(\?.*)?$/;
  await page.route(listUrl, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Error', status: 500 }) });
  });

  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('load-error')).toBeVisible();
  await expect(page.getByTestId('load-error')).not.toHaveText('');
  await expect(page.getByTestId('load-retry')).toBeVisible();
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await expect(itemById(page, e.id)).toHaveCount(0);

  await page.unroute(listUrl);
  await page.getByTestId('load-retry').click();

  await expect(page.getByTestId('load-error')).toHaveCount(0);
  await expect(itemById(page, e.id)).toBeVisible();
  await expect(page.getByTestId('month-total')).toBeVisible();
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await expectTotalMatchesItems(page);
});

test('AC-17 si GET /api/categories falla se muestra load-error con load-retry y el formulario; al reintentar se cargan las categorías', tag('AC-17'), async ({ page }) => {
  const catUrl = /\/api\/categories(\?.*)?$/;
  await page.route(catUrl, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ status: 500, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Error', status: 500 }) });
  });

  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('load-error')).toBeVisible();
  await expect(page.getByTestId('load-error')).not.toHaveText('');
  await expect(page.getByTestId('load-retry')).toBeVisible();
  await expect(page.getByTestId('expense-form')).toBeVisible();

  await page.unroute(catUrl);
  await page.getByTestId('load-retry').click();

  await expect(page.getByTestId('load-error')).toHaveCount(0);
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await expect(page.locator('[data-testid="expense-category"] option[value="alimentacion"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="expense-category"] option[value="otros"]')).toHaveCount(1);
});

// AC-18: el campo de fecha es <input type="date"> con valor YYYY-MM-DD (ADR-002).

test('AC-18 expense-date es un input de tipo date en alta, con valor YYYY-MM-DD', tag('AC-18'), async ({ page }) => {
  await page.goto(`${WEB}/`);
  const date = page.getByTestId('expense-date');
  await expect(date).toBeVisible();
  await expect(date).toHaveAttribute('type', 'date');
  await expect(date).toHaveValue(localDate());
  await date.fill('2020-02-29');
  await expect(date).toHaveValue('2020-02-29');
});

test('AC-18 expense-date sigue siendo un input de tipo date en edición, con valor YYYY-MM-DD', tag('AC-18'), async ({ page, request }) => {
  const e = await seedToday(request, 'ac18');
  await open(page, e);
  await startEdit(page, e);
  const date = page.getByTestId('expense-date');
  await expect(date).toHaveAttribute('type', 'date');
  await expect(date).toHaveValue(e.date);
  expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
