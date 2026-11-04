import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createExpense, listMonth } from './us-001.helpers';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const PORT = 5081;
const BASE = `http://localhost:${PORT}`;

function startApi(dbFile: string): ChildProcess {
  return spawn('dotnet', ['run', '--project', 'src/Gastos.Api', '--urls', BASE], {
    cwd: repoRoot,
    env: { ...process.env, ConnectionStrings__Gastos: `Data Source=${dbFile}` },
    stdio: 'ignore',
    detached: process.platform !== 'win32',
  });
}

function stopApi(child: ChildProcess) {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* ya terminó */
    }
  }
}

async function waitUntilUp(timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* aún no escucha */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`La API propia no respondió en ${BASE} dentro de ${timeoutMs} ms`);
}

async function waitUntilDown(timeoutMs: number) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      await fetch(`${BASE}/api/health`);
    } catch {
      return;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('La API propia no se detuvo');
}

test('AC-09 el gasto sigue ahí tras reiniciar la API (mismo archivo SQLite)', { tag: '@US-001' }, async ({ request }) => {
  test.setTimeout(180_000);
  const dbFile = path.join(os.tmpdir(), `gastos-persist-${process.pid}-${Date.now()}.db`).split(path.sep).join('/');

  let api = startApi(dbFile);
  try {
    await waitUntilUp(120_000);
    const created = await createExpense(
      request,
      { amount: 777.25, date: '2007-07-07', categoryId: 'servicios', note: 'persistente' },
      BASE,
    );
    expect(created.status()).toBe(201);
    const { id } = await created.json();

    stopApi(api);
    await waitUntilDown(30_000);

    api = startApi(dbFile);
    await waitUntilUp(120_000);

    const { res, body } = await listMonth(request, '2007-07', BASE);
    expect(res.status()).toBe(200);
    expect(body.total).toBe(777.25);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      id,
      amount: 777.25,
      date: '2007-07-07',
      categoryId: 'servicios',
      note: 'persistente',
    });
  } finally {
    stopApi(api);
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(dbFile + suffix, { force: true });
      } catch {
        /* se limpia al reiniciar el SO */
      }
    }
  }
});
