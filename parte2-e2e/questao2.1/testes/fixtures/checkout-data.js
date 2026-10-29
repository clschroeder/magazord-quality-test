import { randomUUID, randomInt } from 'node:crypto';

export function generateCheckoutData() {
  const id = randomUUID().slice(0, 8);

  return {
    firstName: `Teste-${id}`,
    lastName: `Cliente-${id}`,
    postalCode: String(randomInt(10000000, 100000000)),
  };
}