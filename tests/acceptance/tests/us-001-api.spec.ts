import { test, expect } from '@playwright/test';
import { API, createExpense, listMonth, localDate } from './us-001.helpers';

// Cada prueba usa meses propios (años pasados distintos) para aislar datos en la base compartida.

const CATEGORIES = [
  { id: 'alimentacion', name: 'Alimentación' },
  { id: 'transporte', name: 'Transporte' },
  { id: 'vivienda', name: 'Vivienda' },
  { id: 'servicios', name: 'Servicios' },
  { id: 'salud', name: 'Salud' },
  { id: 'ocio', name: 'Ocio' },
  { id: 'otros', name: 'Otros' },
];

test('AC-01 GET /api/categories devuelve las 7 categorías fijas en orden', { tag: '@US-001' }, async ({ request }) => {
  const res = await request.get(`${API}/api/categories`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(CATEGORIES);
});

test('AC-02 POST /api/expenses con datos válidos responde 201, Location y el gasto creado', { tag: '@US-001' }, async ({ request }) => {
  const res = await createExpense(request, {
    amount: 12500.5,
    date: '2001-11-02',
    categoryId: 'alimentacion',
    note: 'Supermercado',
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(typeof body.id).toBe('number');
  expect(res.headers()['location']).toBe(`/api/expenses/${body.id}`);
  expect(body).toMatchObject({
    amount: 12500.5,
    date: '2001-11-02',
    categoryId: 'alimentacion',
    note: 'Supermercado',
  });
  expect(typeof body.createdAt).toBe('string');
  expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
  expect(body.createdAt).toMatch(/Z$/);
});

test('AC-02 la nota ausente o vacía es válida y se guarda como null', { tag: '@US-001' }, async ({ request }) => {
  const sinNota = await createExpense(request, { amount: 10, date: '2002-01-05', categoryId: 'otros' });
  expect(sinNota.status()).toBe(201);
  expect((await sinNota.json()).note).toBeNull();

  const vacia = await createExpense(request, { amount: 10, date: '2002-01-05', categoryId: 'otros', note: '' });
  expect(vacia.status()).toBe(201);
  expect((await vacia.json()).note).toBeNull();
});

test('AC-02 límites válidos: monto 0.01 y 99999999.99, nota de 200 caracteres', { tag: '@US-001' }, async ({ request }) => {
  const min = await createExpense(request, { amount: 0.01, date: '2002-02-01', categoryId: 'ocio' });
  expect(min.status()).toBe(201);
  expect((await min.json()).amount).toBe(0.01);

  const max = await createExpense(request, { amount: 99999999.99, date: '2002-02-01', categoryId: 'ocio' });
  expect(max.status()).toBe(201);
  expect((await max.json()).amount).toBe(99999999.99);

  const note = 'n'.repeat(200);
  const nota = await createExpense(request, { amount: 5, date: '2002-02-01', categoryId: 'ocio', note });
  expect(nota.status()).toBe(201);
  expect((await nota.json()).note).toBe(note);
});

test('AC-03 el gasto creado aparece en items y total es la suma exacta del mes', { tag: '@US-001' }, async ({ request }) => {
  const month = '2003-03';
  const a = await (await createExpense(request, { amount: 0.1, date: '2003-03-10', categoryId: 'salud', note: 'a' })).json();
  const b = await (await createExpense(request, { amount: 0.2, date: '2003-03-11', categoryId: 'salud', note: 'b' })).json();
  const c = await (await createExpense(request, { amount: 12500.5, date: '2003-03-31', categoryId: 'vivienda' })).json();

  const { res, body } = await listMonth(request, month);
  expect(res.status()).toBe(200);
  expect(body.month).toBe(month);
  expect(body.items.map((i: { id: number }) => i.id).sort()).toEqual([a.id, b.id, c.id].sort());
  expect(body.total).toBe(12500.8);
  const item = body.items.find((i: { id: number }) => i.id === c.id);
  expect(item).toMatchObject({ amount: 12500.5, date: '2003-03-31', categoryId: 'vivienda', note: null });
});

test('AC-03 un mes sin gastos devuelve items vacío y total 0', { tag: '@US-001' }, async ({ request }) => {
  const { res, body } = await listMonth(request, '1999-01');
  expect(res.status()).toBe(200);
  expect(body).toEqual({ month: '1999-01', items: [], total: 0 });
});

test('AC-03 sin month se lista el mes actual', { tag: '@US-001' }, async ({ request }) => {
  const res = await request.get(`${API}/api/expenses`);
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.month).toBe(localDate().slice(0, 7));
  expect(Array.isArray(body.items)).toBe(true);
  expect(typeof body.total).toBe('number');
});

test('AC-04 solo aparecen los gastos del mes pedido, por fecha descendente', { tag: '@US-001' }, async ({ request }) => {
  const mk = async (date: string, amount: number) =>
    (await (await createExpense(request, { amount, date, categoryId: 'otros' })).json()).id as number;
  const prevMonth = await mk('2004-04-30', 1);
  const d5 = await mk('2004-05-05', 2);
  const d20 = await mk('2004-05-20', 4);
  const d12 = await mk('2004-05-12', 8);
  const nextMonth = await mk('2004-06-01', 16);

  const { body } = await listMonth(request, '2004-05');
  const ids = body.items.map((i: { id: number }) => i.id);
  expect(ids).toEqual([d20, d12, d5]);
  expect(ids).not.toContain(prevMonth);
  expect(ids).not.toContain(nextMonth);
  expect(body.total).toBe(14);
});

test('AC-04 a igual fecha, ordena por createdAt descendente', { tag: '@US-001' }, async ({ request }) => {
  const first = await (await createExpense(request, { amount: 1, date: '2005-05-05', categoryId: 'otros', note: 'primero' })).json();
  await new Promise((r) => setTimeout(r, 1100));
  const second = await (await createExpense(request, { amount: 2, date: '2005-05-05', categoryId: 'otros', note: 'segundo' })).json();

  const { body } = await listMonth(request, '2005-05');
  expect(body.items.map((i: { id: number }) => i.id)).toEqual([second.id, first.id]);
});

test('AC-05 cada campo inválido produce su error y no se crea nada', { tag: '@US-001' }, async ({ request }) => {
  const month = '2006-06';
  const valid = { amount: 10, date: '2006-06-15', categoryId: 'otros' };
  const cases: { name: string; body: Record<string, unknown>; fields: string[] }[] = [
    { name: 'monto 0', body: { ...valid, amount: 0 }, fields: ['amount'] },
    { name: 'monto -1', body: { ...valid, amount: -1 }, fields: ['amount'] },
    { name: 'monto 0.001', body: { ...valid, amount: 0.001 }, fields: ['amount'] },
    { name: 'monto 100000000', body: { ...valid, amount: 100000000 }, fields: ['amount'] },
    { name: 'monto 3 decimales', body: { ...valid, amount: 10.123 }, fields: ['amount'] },
    { name: 'fecha futura (mañana)', body: { ...valid, date: localDate(1) }, fields: ['date'] },
    { name: 'fecha inexistente', body: { ...valid, date: '2006-02-30' }, fields: ['date'] },
    { name: 'fecha con texto', body: { ...valid, date: 'ayer' }, fields: ['date'] },
    { name: 'categoría inexistente', body: { ...valid, categoryId: 'no-existe' }, fields: ['categoryId'] },
    { name: 'nota de 201 caracteres', body: { ...valid, note: 'x'.repeat(201) }, fields: ['note'] },
    { name: 'falta monto', body: { date: valid.date, categoryId: valid.categoryId }, fields: ['amount'] },
    { name: 'falta fecha', body: { amount: 10, categoryId: valid.categoryId }, fields: ['date'] },
    { name: 'falta categoría', body: { amount: 10, date: valid.date }, fields: ['categoryId'] },
  ];

  for (const c of cases) {
    const res = await createExpense(request, c.body as never);
    expect(res.status(), c.name).toBe(400);
    expect(res.headers()['content-type'], c.name).toContain('application/problem+json');
    const problem = await res.json();
    expect(problem.status, c.name).toBe(400);
    expect(Object.keys(problem.errors).sort(), c.name).toEqual([...c.fields].sort());
    for (const f of c.fields) {
      expect(problem.errors[f].length, `${c.name}/${f}`).toBeGreaterThan(0);
    }
  }

  const { body } = await listMonth(request, month);
  expect(body).toEqual({ month, items: [], total: 0 });
});

test('AC-05 varios campos inválidos devuelven una entrada por campo', { tag: '@US-001' }, async ({ request }) => {
  const res = await createExpense(request, {
    amount: -5,
    date: 'nunca',
    categoryId: 'no-existe',
    note: 'x'.repeat(201),
  });
  expect(res.status()).toBe(400);
  expect(res.headers()['content-type']).toContain('application/problem+json');
  const problem = await res.json();
  expect(Object.keys(problem.errors).sort()).toEqual(['amount', 'categoryId', 'date', 'note']);
});

test('AC-05 cuerpo vacío: error en los tres campos obligatorios', { tag: '@US-001' }, async ({ request }) => {
  const res = await createExpense(request, {} as never);
  expect(res.status()).toBe(400);
  const problem = await res.json();
  expect(Object.keys(problem.errors).sort()).toEqual(['amount', 'categoryId', 'date']);
});

test('AC-06 month con formato distinto de YYYY-MM responde 400 con error en month', { tag: '@US-001' }, async ({ request }) => {
  for (const month of ['2026-13', '2026-00', '2026-1', '202611', 'noviembre', '2026-11-01', '26-11']) {
    const res = await request.get(`${API}/api/expenses?month=${month}`);
    expect(res.status(), month).toBe(400);
    expect(res.headers()['content-type'], month).toContain('application/problem+json');
    const problem = await res.json();
    expect(problem.status, month).toBe(400);
    expect(Object.keys(problem.errors), month).toEqual(['month']);
    expect(problem.errors.month.length, month).toBeGreaterThan(0);
  }
});
