import { randomUUID } from 'node:crypto';

/**
 * Protege campos que contenham vírgula, aspas ou quebra de linha.
 * No CSV, esses campos precisam ser envolvidos por aspas,
 * e cada aspa interna precisa ser duplicada.
 */
function escapeCsvField(value) {
  const text = String(value);

  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/**
 * Gera a quantidade solicitada de registros, além do cabeçalho.
 * Os dados são sintéticos e os emails são únicos dentro do arquivo.
 */
export function generateCsv(rowCount) {
  if (!Number.isInteger(rowCount) || rowCount <= 0) {
    throw new Error('A quantidade de registros deve ser um inteiro positivo.');
  }

  const batchId = randomUUID();
  const lines = ['nome,email,idade,cidade'];

  for (let index = 1; index <= rowCount; index += 1) {
    const row = [
      `Pessoa ${index}`,
      `teste-${batchId}-${index}@example.com`,
      18 + (index % 63),
      'Pomerode',
    ];

    lines.push(row.map(escapeCsvField).join(','));
  }

  // CRLF separa as linhas; a última linha também termina com CRLF.
  return `${lines.join('\r\n')}\r\n`;
}