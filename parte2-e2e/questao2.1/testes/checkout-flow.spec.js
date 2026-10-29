import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page.js';
import { CheckoutPage } from './pages/checkout-page.js';
import { generateCheckoutData } from './fixtures/checkout-data.js';

test.afterEach(async ({ page, context }) => {
  // Limpeza explícita solicitada pelo desafio.
  // O Playwright também descarta o contexto isolado de cada teste.
  try {
    if (new URL(page.url()).origin === 'https://www.saucedemo.com') {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
  } finally {
    await context.clearCookies();
  }
});

test('deve finalizar a compra de dois produtos', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const checkoutPage = new CheckoutPage(page);
  const customer = generateCheckoutData();

  const products = [
    'Sauce Labs Backpack',
    'Sauce Labs Bike Light',
  ];

  await test.step('Entrar no catálogo', async () => {
    await loginPage.open();
    await loginPage.login('standard_user', 'secret_sauce');

    await expect(page).toHaveURL(/\/inventory\.html$/);
  });

  await test.step('Adicionar dois produtos e conferir o carrinho', async () => {
    for (const product of products) {
      await checkoutPage.addProduct(product);
    }

    await expect(checkoutPage.cartBadge).toHaveText('2');

    await checkoutPage.openCart();

    await expect(page).toHaveURL(/\/cart\.html$/);
    await expect(checkoutPage.itemNames).toHaveText(products);
  });

  await test.step('Preencher os dados do comprador', async () => {
    await checkoutPage.startCheckout();

    await expect(page).toHaveURL(/\/checkout-step-one\.html$/);

    await checkoutPage.fillCustomerData(customer);

    await expect(page).toHaveURL(/\/checkout-step-two\.html$/);
  });

  await test.step('Conferir produtos e valores antes de finalizar', async () => {
    await expect(checkoutPage.itemNames).toHaveText(products);

    // Valores esperados para os dois produtos do cenário:
    // Backpack: US$ 29,99; Bike Light: US$ 9,99.
    await expect(checkoutPage.subtotal).toHaveText('Item total: $39.98');
    await expect(checkoutPage.tax).toHaveText('Tax: $3.20');
    await expect(checkoutPage.total).toHaveText('Total: $43.18');
  });

  await test.step('Finalizar e validar a confirmação', async () => {
    await checkoutPage.finishOrder();

    await expect(page).toHaveURL(/\/checkout-complete\.html$/);

    await expect(checkoutPage.confirmation)
      .toHaveText('Thank you for your order!');

    await expect(checkoutPage.cartBadge).toHaveCount(0);
  });
});

const requiredFields = [
  {
    field: 'firstName',
    description: 'nome',
    expectedError: 'Error: First Name is required',
  },
  {
    field: 'lastName',
    description: 'sobrenome',
    expectedError: 'Error: Last Name is required',
  },
  {
    field: 'postalCode',
    description: 'CEP',
    expectedError: 'Error: Postal Code is required',
  },
];

for (const scenario of requiredFields) {
  test(`deve impedir checkout sem ${scenario.description}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    const checkoutPage = new CheckoutPage(page);

    const customer = {
      ...generateCheckoutData(),
      [scenario.field]: '',
    };

    await test.step('Preparar um carrinho com produto', async () => {
      await loginPage.open();
      await loginPage.login('standard_user', 'secret_sauce');

      await checkoutPage.addProduct('Sauce Labs Backpack');
      await checkoutPage.openCart();
      await checkoutPage.startCheckout();
    });

    await test.step(`Continuar sem preencher ${scenario.description}`, async () => {
      await checkoutPage.fillCustomerData(customer);
    });

    await test.step('Validar o erro e o bloqueio do avanço', async () => {
      await expect(
        page.locator('[data-test="error"]')
      ).toHaveText(scenario.expectedError);

      await expect(page).toHaveURL(/\/checkout-step-one\.html$/);

      await expect(checkoutPage.continueButton).toBeVisible();
    });
  });
}