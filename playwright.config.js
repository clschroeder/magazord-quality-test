// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Busca os testes nas pastas definidas em cada projeto.
  testMatch: '**/*.spec.js',

  // Execução sequencial para reduzir carga nos serviços públicos.
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: 0,

  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],

  outputDir: 'test-results',

  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './parte1-api/questao1.1/testes',
    },
    {
      name: 'checkout',
      testDir: './parte2-e2e/questao2.1/testes',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.saucedemo.com',
      },
    },
    {
      name: 'csv',
      testDir: './parte3-arquivos/questao3.1/testes',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://the-internet.herokuapp.com',
      },
    },
  ],
});