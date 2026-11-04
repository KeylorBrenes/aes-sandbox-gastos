import { test, expect } from '@playwright/test';
import { createExpense, listMonth, localDate, monthOf } from './us-001.helpers';

// Estas pruebas operan sobre el mes actual (la web lista el mes actual); van en orden (modo default, sin omitir las siguientes si una falla)
// dentro de este archivo para que las diferencias de total y conteo no choquen entre sí.
test.describe.configure({ mode: 'default' });

const WEB = 'http://localhost:5173';

test('AC-02 el gasto con la fecha de hoy es válido (límite)', { tag: '@US-001' }, async ({ request }) => {
  const today = localDate();
  const res = await createExpense(request, { amount: 1, date: today, categoryId: 'otros', note: 'hoy-limite' });
  expect(res.status()).toBe(201);
  expect((await res.json()).date).toBe(today);
  const { body } = await listMonth(request, monthOf(today));
  expect(body.items.some((i: { note: string }) => i.note === 'hoy-limite')).toBe(true);
});

test('AC-07 registrar un gasto lo muestra en la lista sin recargar, actualiza el total y limpia el formulario', { tag: '@US-001' }, async ({ page }) => {
  const note = `ui-${Date.now()}`;
  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('expense-form')).toBeVisible();
  await expect(page.getByTestId('month-total')).toBeVisible();

  const totalBefore = Number(await page.getByTestId('month-total').getAttribute('data-amount'));
  const countBefore = await page.getByTestId('expense-item').count();
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

  await page.getByTestId('expense-amount').fill('12500.5');
  await page.getByTestId('expense-date').fill(localDate());
  await page.getByTestId('expense-category').selectOption('alimentacion');
  await page.getByTestId('expense-note').fill(note);
  await page.getByTestId('expense-submit').click();

  const item = page.getByTestId('expense-item').filter({ hasText: note });
  await expect(item).toHaveCount(1);
  await expect(item).toHaveAttribute('data-amount', '12500.5');
  await expect(page.getByTestId('expense-item')).toHaveCount(countBefore + 1);
  await expect
    .poll(async () => Number(await page.getByTestId('month-total').getAttribute('data-amount')))
    .toBeCloseTo(totalBefore + 12500.5, 2);

  // Formulario limpio; la fecha vuelve a hoy.
  await expect(page.getByTestId('expense-amount')).toHaveValue('');
  await expect(page.getByTestId('expense-note')).toHaveValue('');
  await expect(page.getByTestId('expense-date')).toHaveValue(localDate());

  // Sin recarga de página.
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
});

test('AC-08 un monto inválido muestra el error junto al monto y no agrega nada', { tag: '@US-001' }, async ({ page }) => {
  await page.goto(`${WEB}/`);
  await expect(page.getByTestId('expense-form')).toBeVisible();
  const countBefore = await page.getByTestId('expense-item').count();
  const totalBefore = await page.getByTestId('month-total').getAttribute('data-amount');

  await page.getByTestId('expense-amount').fill('-5');
  await page.getByTestId('expense-date').fill(localDate());
  await page.getByTestId('expense-category').selectOption('otros');
  await page.getByTestId('expense-note').fill('no-debe-aparecer');
  await page.getByTestId('expense-submit').click();

  const error = page.getByTestId('field-error-amount');
  await expect(error).toBeVisible();
  await expect(error).not.toHaveText('');
  await expect(page.getByTestId('expense-item')).toHaveCount(countBefore);
  await expect(page.getByTestId('expense-item').filter({ hasText: 'no-debe-aparecer' })).toHaveCount(0);
  await expect(page.getByTestId('month-total')).toHaveAttribute('data-amount', totalBefore ?? '0');
});
