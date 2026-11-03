import { test, expect } from '@playwright/test';

const API = 'http://localhost:5080';
const WEB = 'http://localhost:5173';

test('AC-01 GET /api/health responde 200 con {"status":"ok"} en JSON', { tag: '@EN-001' }, async ({ request }) => {
  const res = await request.get(`${API}/api/health`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual({ status: 'ok' });
});

test('AC-02 la página principal muestra el título «Control de gastos»', { tag: '@EN-001' }, async ({ page }) => {
  await page.goto(`${WEB}/`);
  const title = page.getByTestId('app-title');
  await expect(title).toBeVisible();
  await expect(title).toHaveText('Control de gastos');
});

test('AC-03 el proxy de la web responde lo mismo que la API en /api/health', { tag: '@EN-001' }, async ({ request }) => {
  const res = await request.get(`${WEB}/api/health`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual({ status: 'ok' });
});
