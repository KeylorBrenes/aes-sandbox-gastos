import { expect, type APIResponse, type APIRequestContext, type Page } from '@playwright/test';
import { API, type NewExpense } from './us-001.helpers';

export const WEB = 'http://localhost:5173';

export type Expense = {
  id: number;
  amount: number;
  date: string;
  categoryId: string;
  note: string | null;
  createdAt: string;
};

export async function seed(request: APIRequestContext, body: NewExpense): Promise<Expense> {
  const res = await request.post(`${API}/api/expenses`, { data: body });
  expect(res.status(), 'siembra del gasto').toBe(201);
  return (await res.json()) as Expense;
}

export function getExpense(request: APIRequestContext, id: number | string) {
  return request.get(`${API}/api/expenses/${id}`);
}

export function putExpense(request: APIRequestContext, id: number | string, body: Record<string, unknown>) {
  return request.put(`${API}/api/expenses/${id}`, { data: body });
}

export function deleteExpense(request: APIRequestContext, id: number | string) {
  return request.delete(`${API}/api/expenses/${id}`);
}

/** Exige un ProblemDetails (application/problem+json) con el estado dado y devuelve su cuerpo. */
export async function expectProblem(res: APIResponse, status: number, label = '') {
  expect(res.status(), label).toBe(status);
  expect(res.headers()['content-type'], label).toContain('application/problem+json');
  const problem = await res.json();
  expect(problem.status, label).toBe(status);
  return problem as { status: number; errors?: Record<string, string[]> };
}

/** Localiza un gasto de la lista por su data-id. */
export function itemById(page: Page, id: number) {
  return page.locator(`[data-testid="expense-item"][data-id="${id}"]`);
}

/** El total mostrado coincide con la suma de los gastos mostrados (lectura atómica, con reintentos). */
export async function expectTotalMatchesItems(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const total = Number(document.querySelector('[data-testid="month-total"]')?.getAttribute('data-amount'));
          const sum = Array.from(document.querySelectorAll('[data-testid="expense-item"]')).reduce(
            (acc, el) => acc + Number(el.getAttribute('data-amount')),
            0,
          );
          return Math.abs(total - sum) < 0.005;
        }),
      { message: 'month-total debe ser la suma de los expense-item mostrados' },
    )
    .toBe(true);
}

export async function markNoReload(page: Page) {
  await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
}

export async function wasNotReloaded(page: Page) {
  return page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload === true);
}

export function uniqueNote(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
