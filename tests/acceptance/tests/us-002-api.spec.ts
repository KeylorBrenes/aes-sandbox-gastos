import { test, expect } from '@playwright/test';
import { API, createExpense, listMonth, localDate } from './us-001.helpers';
import { deleteExpense, expectProblem, getExpense, putExpense, seed } from './us-002.helpers';

// Cada prueba usa meses propios (años pasados distintos de los de US-001) para aislar datos en la base compartida.

const tag = (ac: string) => ({ tag: ['@US-002', `@US-002-${ac}`] });

test('AC-01 GET /api/expenses/{id} devuelve 200 con el gasto en el mismo formato que la creación', tag('AC-01'), async ({ request }) => {
  const created = await seed(request, { amount: 12500.5, date: '2010-01-15', categoryId: 'alimentacion', note: 'Supermercado' });

  const res = await getExpense(request, created.id);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual(created);
  expect(await res.json()).toEqual({
    id: created.id,
    amount: 12500.5,
    date: '2010-01-15',
    categoryId: 'alimentacion',
    note: 'Supermercado',
    createdAt: created.createdAt,
  });
});

test('AC-01 el Location devuelto por POST apunta a un GET que responde 200 con el mismo gasto', tag('AC-01'), async ({ request }) => {
  const post = await createExpense(request, { amount: 33, date: '2010-01-20', categoryId: 'ocio', note: null });
  expect(post.status()).toBe(201);
  const created = await post.json();
  const location = post.headers()['location'];
  expect(location).toBe(`/api/expenses/${created.id}`);

  const res = await request.get(`${API}${location}`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(created);
});

test('AC-02 GET, PUT y DELETE de un id inexistente responden 404 con ProblemDetails', tag('AC-02'), async ({ request }) => {
  for (const id of ['2147483647', '0', '-1']) {
    await expectProblem(await getExpense(request, id), 404, `GET ${id}`);
    await expectProblem(
      await putExpense(request, id, { amount: 10, date: '2010-02-10', categoryId: 'otros', note: 'no-debe-crearse' }),
      404,
      `PUT ${id}`,
    );
    await expectProblem(await deleteExpense(request, id), 404, `DELETE ${id}`);
  }
});

test('AC-02 un id que no es un entero se trata como inexistente (404 con ProblemDetails)', tag('AC-02'), async ({ request }) => {
  for (const id of ['abc', '1.5', '1e3', '0x10', '99999999999999999999']) {
    await expectProblem(await getExpense(request, id), 404, `GET ${id}`);
    await expectProblem(
      await putExpense(request, id, { amount: 10, date: '2010-02-10', categoryId: 'otros', note: 'no-debe-crearse' }),
      404,
      `PUT ${id}`,
    );
    await expectProblem(await deleteExpense(request, id), 404, `DELETE ${id}`);
  }
});

test('AC-02 PUT a un id inexistente no crea nada', tag('AC-02'), async ({ request }) => {
  const month = '2010-02';
  const before = await listMonth(request, month);
  expect(before.body).toEqual({ month, items: [], total: 0 });

  await expectProblem(
    await putExpense(request, '2147483646', { amount: 10, date: '2010-02-10', categoryId: 'otros', note: 'no-debe-crearse' }),
    404,
  );
  await expectProblem(
    await putExpense(request, 'abc', { amount: 10, date: '2010-02-11', categoryId: 'otros', note: 'no-debe-crearse' }),
    404,
  );

  const after = await listMonth(request, month);
  expect(after.body).toEqual({ month, items: [], total: 0 });
});

test('AC-02 PUT a un id inexistente con cuerpo inválido responde 404 (la existencia se comprueba primero)', tag('AC-02'), async ({ request }) => {
  const res = await putExpense(request, '2147483645', { amount: -1, date: 'nunca', categoryId: 'no-existe', note: 'x'.repeat(201) });
  const problem = await expectProblem(res, 404);
  expect(problem.errors ?? {}).toEqual({});
});

test('AC-03 PUT reemplaza los cuatro campos y conserva id y createdAt; un GET posterior devuelve los nuevos valores', tag('AC-03'), async ({ request }) => {
  const created = await seed(request, { amount: 100, date: '2010-03-05', categoryId: 'alimentacion', note: 'antes' });

  const res = await putExpense(request, created.id, { amount: 13000, date: '2010-03-20', categoryId: 'transporte', note: 'despues' });
  expect(res.status()).toBe(200);
  const updated = await res.json();
  expect(updated).toEqual({
    id: created.id,
    amount: 13000,
    date: '2010-03-20',
    categoryId: 'transporte',
    note: 'despues',
    createdAt: created.createdAt,
  });

  const got = await getExpense(request, created.id);
  expect(got.status()).toBe(200);
  expect(await got.json()).toEqual(updated);
});

test('AC-03 PUT con note null reemplaza la nota existente por null', tag('AC-03'), async ({ request }) => {
  const created = await seed(request, { amount: 100, date: '2010-04-05', categoryId: 'salud', note: 'con nota' });

  const res = await putExpense(request, created.id, { amount: 100, date: '2010-04-05', categoryId: 'salud', note: null });
  expect(res.status()).toBe(200);
  expect((await res.json()).note).toBeNull();
  expect((await (await getExpense(request, created.id)).json()).note).toBeNull();
});

test('AC-03 PUT sin la clave note reemplaza la nota existente por null (D-08)', tag('AC-03'), async ({ request }) => {
  const created = await seed(request, { amount: 100, date: '2010-07-05', categoryId: 'salud', note: 'con nota' });

  const res = await putExpense(request, created.id, { amount: 120, date: '2010-07-06', categoryId: 'salud' });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({
    id: created.id,
    amount: 120,
    date: '2010-07-06',
    categoryId: 'salud',
    note: null,
    createdAt: created.createdAt,
  });
  expect((await (await getExpense(request, created.id)).json()).note).toBeNull();
});

test('AC-03 editar sin cambiar nada responde 200 con los mismos valores', tag('AC-03'), async ({ request }) => {
  const created = await seed(request, { amount: 250.75, date: '2010-05-05', categoryId: 'servicios', note: 'igual' });

  const res = await putExpense(request, created.id, { amount: 250.75, date: '2010-05-05', categoryId: 'servicios', note: 'igual' });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(created);
  expect(await (await getExpense(request, created.id)).json()).toEqual(created);
});

test('AC-03 límites válidos al editar: monto 0.01 y 99999999.99, fecha de hoy, nota de 200 caracteres', tag('AC-03'), async ({ request }) => {
  const created = await seed(request, { amount: 5, date: '2010-06-05', categoryId: 'otros', note: null });
  const base = { amount: 5, date: '2010-06-05', categoryId: 'otros', note: null as string | null };

  const min = await putExpense(request, created.id, { ...base, amount: 0.01 });
  expect(min.status()).toBe(200);
  expect((await min.json()).amount).toBe(0.01);

  const max = await putExpense(request, created.id, { ...base, amount: 99999999.99 });
  expect(max.status()).toBe(200);
  expect((await max.json()).amount).toBe(99999999.99);

  const today = localDate();
  const hoy = await putExpense(request, created.id, { ...base, date: today });
  expect(hoy.status()).toBe(200);
  expect((await hoy.json()).date).toBe(today);

  const note = 'n'.repeat(200);
  const nota = await putExpense(request, created.id, { ...base, date: '2010-06-05', note });
  expect(nota.status()).toBe(200);
  expect((await nota.json()).note).toBe(note);

  const final = await (await getExpense(request, created.id)).json();
  expect(final).toEqual({ id: created.id, amount: 5, date: '2010-06-05', categoryId: 'otros', note, createdAt: created.createdAt });
});

test('AC-04 cada campo inválido en PUT produce su error, y el gasto no cambia', tag('AC-04'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2013-06-15', categoryId: 'otros', note: 'original' });
  const valid = { amount: 10, date: '2013-06-15', categoryId: 'otros', note: 'original' };
  const cases: { name: string; body: Record<string, unknown>; fields: string[] }[] = [
    { name: 'monto 0', body: { ...valid, amount: 0 }, fields: ['amount'] },
    { name: 'monto -1', body: { ...valid, amount: -1 }, fields: ['amount'] },
    { name: 'monto 0.001', body: { ...valid, amount: 0.001 }, fields: ['amount'] },
    { name: 'monto 100000000', body: { ...valid, amount: 100000000 }, fields: ['amount'] },
    { name: 'monto 3 decimales', body: { ...valid, amount: 10.123 }, fields: ['amount'] },
    { name: 'fecha futura (mañana)', body: { ...valid, date: localDate(1) }, fields: ['date'] },
    { name: 'fecha inexistente', body: { ...valid, date: '2013-02-30' }, fields: ['date'] },
    { name: 'fecha con texto', body: { ...valid, date: 'ayer' }, fields: ['date'] },
    { name: 'categoría inexistente', body: { ...valid, categoryId: 'no-existe' }, fields: ['categoryId'] },
    { name: 'nota de 201 caracteres', body: { ...valid, note: 'x'.repeat(201) }, fields: ['note'] },
    { name: 'falta monto', body: { date: valid.date, categoryId: valid.categoryId, note: valid.note }, fields: ['amount'] },
    { name: 'falta fecha', body: { amount: 10, categoryId: valid.categoryId, note: valid.note }, fields: ['date'] },
    { name: 'falta categoría', body: { amount: 10, date: valid.date, note: valid.note }, fields: ['categoryId'] },
  ];

  for (const c of cases) {
    const res = await putExpense(request, created.id, c.body);
    const problem = await expectProblem(res, 400, c.name);
    expect(Object.keys(problem.errors ?? {}).sort(), c.name).toEqual([...c.fields].sort());
    for (const f of c.fields) {
      expect(problem.errors![f].length, `${c.name}/${f}`).toBeGreaterThan(0);
    }
  }

  const got = await getExpense(request, created.id);
  expect(await got.json()).toEqual(created);
  const { body } = await listMonth(request, '2013-06');
  expect(body).toEqual({ month: '2013-06', items: [created], total: 10 });
});

test('AC-04 varios campos inválidos en PUT devuelven una entrada por campo', tag('AC-04'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2013-07-15', categoryId: 'otros', note: 'original' });
  const res = await putExpense(request, created.id, { amount: -5, date: 'nunca', categoryId: 'no-existe', note: 'x'.repeat(201) });
  const problem = await expectProblem(res, 400);
  expect(Object.keys(problem.errors ?? {}).sort()).toEqual(['amount', 'categoryId', 'date', 'note']);
  expect(await (await getExpense(request, created.id)).json()).toEqual(created);
});

test('AC-04 PUT con cuerpo vacío: error en los tres campos obligatorios y el gasto no cambia', tag('AC-04'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2013-08-15', categoryId: 'otros', note: 'original' });
  const res = await putExpense(request, created.id, {});
  const problem = await expectProblem(res, 400);
  expect(Object.keys(problem.errors ?? {}).sort()).toEqual(['amount', 'categoryId', 'date']);
  expect(await (await getExpense(request, created.id)).json()).toEqual(created);
});

test('AC-04 PUT con una nota de 201 espacios responde 400 por largo en note y el gasto no cambia (D-08)', tag('AC-04'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2013-09-15', categoryId: 'otros', note: 'original' });
  const res = await putExpense(request, created.id, { amount: 10, date: '2013-09-15', categoryId: 'otros', note: ' '.repeat(201) });
  const problem = await expectProblem(res, 400);
  expect(Object.keys(problem.errors ?? {})).toEqual(['note']);
  expect(problem.errors!.note.length).toBeGreaterThan(0);
  expect(await (await getExpense(request, created.id)).json()).toEqual(created);
  expect(await listMonth(request, '2013-09').then((r) => r.body)).toEqual({ month: '2013-09', items: [created], total: 10 });
});

test('AC-05 cambiar la fecha a otro mes mueve el gasto y recalcula los dos totales', tag('AC-05'), async ({ request }) => {
  const stays = await seed(request, { amount: 50, date: '2011-03-02', categoryId: 'otros' });
  const moves = await seed(request, { amount: 100, date: '2011-03-10', categoryId: 'otros' });
  const other = await seed(request, { amount: 7, date: '2011-04-01', categoryId: 'otros' });

  const mar0 = (await listMonth(request, '2011-03')).body;
  expect(mar0.total).toBe(150);
  const apr0 = (await listMonth(request, '2011-04')).body;
  expect(apr0.total).toBe(7);

  const res = await putExpense(request, moves.id, { amount: 100, date: '2011-04-10', categoryId: 'otros', note: null });
  expect(res.status()).toBe(200);
  expect((await res.json()).date).toBe('2011-04-10');

  const mar = (await listMonth(request, '2011-03')).body;
  expect(mar.items.map((i: { id: number }) => i.id)).toEqual([stays.id]);
  expect(mar.total).toBe(50);

  const apr = (await listMonth(request, '2011-04')).body;
  expect(apr.items.map((i: { id: number }) => i.id)).toEqual([moves.id, other.id]);
  expect(apr.total).toBe(107);
});

test('AC-06 DELETE responde 204 sin cuerpo; el gasto desaparece y el total baja en su monto', tag('AC-06'), async ({ request }) => {
  const a = await seed(request, { amount: 0.1, date: '2012-05-10', categoryId: 'salud', note: 'a' });
  const b = await seed(request, { amount: 0.2, date: '2012-05-11', categoryId: 'salud', note: 'b' });
  const c = await seed(request, { amount: 12500.5, date: '2012-05-31', categoryId: 'vivienda' });
  expect((await listMonth(request, '2012-05')).body.total).toBe(12500.8);

  const res = await deleteExpense(request, c.id);
  expect(res.status()).toBe(204);
  expect((await res.body()).length).toBe(0);

  await expectProblem(await getExpense(request, c.id), 404);
  const { body } = await listMonth(request, '2012-05');
  expect(body.items.map((i: { id: number }) => i.id).sort()).toEqual([a.id, b.id].sort());
  expect(body.total).toBe(0.3);
});

test('AC-02 eliminar un gasto ya eliminado responde 404 con ProblemDetails', tag('AC-02'), async ({ request }) => {
  const created = await seed(request, { amount: 9, date: '2012-06-10', categoryId: 'otros' });
  expect((await deleteExpense(request, created.id)).status()).toBe(204);
  await expectProblem(await deleteExpense(request, created.id), 404);
  await expectProblem(
    await putExpense(request, created.id, { amount: 9, date: '2012-06-10', categoryId: 'otros', note: null }),
    404,
  );
  expect(await listMonth(request, '2012-06').then((r) => r.body)).toEqual({ month: '2012-06', items: [], total: 0 });
});

test('AC-07 POST con nota vacía o solo espacios guarda note null', tag('AC-07'), async ({ request }) => {
  const ids: number[] = [];
  for (const note of ['', ' ', '   ']) {
    const res = await createExpense(request, { amount: 10, date: '2014-01-05', categoryId: 'otros', note });
    expect(res.status(), JSON.stringify(note)).toBe(201);
    const created = await res.json();
    expect(created.note, JSON.stringify(note)).toBeNull();
    ids.push(created.id);
  }
  // Lo persistido también es null (se consulta el listado del mes, que no depende de GET /{id}).
  const { body } = await listMonth(request, '2014-01');
  expect(body.items.map((i: { id: number }) => i.id).sort()).toEqual([...ids].sort());
  for (const item of body.items) expect(item.note).toBeNull();
});

test('AC-07 PUT con nota vacía o solo espacios guarda note null', tag('AC-07'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2014-02-05', categoryId: 'otros', note: 'tiene nota' });
  for (const note of ['   ', '', ' ']) {
    // Se vuelve a poner una nota antes de cada intento para que el null sea resultado del PUT.
    const set = await putExpense(request, created.id, { amount: 10, date: '2014-02-05', categoryId: 'otros', note: 'tiene nota' });
    expect(set.status()).toBe(200);
    expect((await set.json()).note).toBe('tiene nota');

    const res = await putExpense(request, created.id, { amount: 10, date: '2014-02-05', categoryId: 'otros', note });
    expect(res.status(), JSON.stringify(note)).toBe(200);
    expect((await res.json()).note, JSON.stringify(note)).toBeNull();
    expect((await (await getExpense(request, created.id)).json()).note, JSON.stringify(note)).toBeNull();
  }
});

test('AC-07 PUT con una nota con texto y espacios alrededor la guarda tal cual, sin recortar (D-08)', tag('AC-07'), async ({ request }) => {
  const created = await seed(request, { amount: 10, date: '2014-03-05', categoryId: 'otros', note: null });
  const note = '  hola  ';

  const res = await putExpense(request, created.id, { amount: 10, date: '2014-03-05', categoryId: 'otros', note });
  expect(res.status()).toBe(200);
  expect((await res.json()).note).toBe(note);
  expect((await (await getExpense(request, created.id)).json()).note).toBe(note);
  const { body } = await listMonth(request, '2014-03');
  expect(body.items.map((i: { note: string | null }) => i.note)).toEqual([note]);
});

// AC-08 (GET /api/expenses?month= vacío -> 400) ya se cumplía: su prueba vive en la suite de US-001
// (us-001-regresion-us-002.spec.ts, D-10).
