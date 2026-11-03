import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

const here = __dirname;
const repoRoot = path.resolve(here, '..', '..');
const dbPath = path.join(os.tmpdir(), `gastos-acceptance-${process.pid}.db`).split(path.sep).join('/');

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: [
    {
      command: 'dotnet run --project src/Gastos.Api --urls http://localhost:5080',
      cwd: repoRoot,
      url: 'http://localhost:5080/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ConnectionStrings__Gastos: `Data Source=${dbPath}` },
    },
    {
      command: 'npm --prefix web run dev -- --port 5173 --strictPort',
      cwd: repoRoot,
      url: 'http://localhost:5173/',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
