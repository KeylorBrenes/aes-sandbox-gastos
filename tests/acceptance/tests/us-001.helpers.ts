import type { APIRequestContext } from '@playwright/test';

export const API = 'http://localhost:5080';

export type NewExpense = {
  amount: unknown;
  date: unknown;
  categoryId: unknown;
  note?: unknown;
};

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fecha local del equipo en formato YYYY-MM-DD (misma regla que «hoy» en la API). */
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export async function createExpense(request: APIRequestContext, body: NewExpense, base = API) {
  return request.post(`${base}/api/expenses`, { data: body });
}

export async function listMonth(request: APIRequestContext, month: string, base = API) {
  const res = await request.get(`${base}/api/expenses?month=${month}`);
  return { res, body: res.ok() ? await res.json() : null };
}
