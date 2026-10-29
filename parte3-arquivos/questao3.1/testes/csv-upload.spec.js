import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { generateCsv } from './utils/csv-generator.js';

/**
 * Salva o arquivo em uma pasta exclusiva da execução e faz o upload.
 * O nome único evita colisões no ambiente público compartilhado.
 */
async function uploadCsv(page, testInfo, fileName, content) {
  const uniqueName = `${randomUUID()}-${fileName}`;
  const filePath = testInfo.outputPath(uniqueName);

  await writeFile(filePath, content, 'utf8');

  // Anexa exatamente o arquivo enviado, facilitando a investigação.
  await testInfo.attach('arquivo-enviado', {
    path: filePath,
    contentType: 'text/csv',
  });

  await page.goto('/upload');

  // setInputFiles preenche o input de arquivo diretamente.
  // Não depende de automatizar a janela de seleção do Windows.
  await page.locator('#file-upload').setInputFiles(filePath);
  await page.locator('#file-submit').click();

  await expect(page.getByRole('heading', {
    name: 'File Uploaded!',
    exact: true,
  })).toBeVisible();

  // Confirma que o nome exibido corresponde ao arquivo enviado.
  await expect(page.locator('#uploaded-files')).toHaveText(uniqueName);
}

test.describe('Upload de CSV válido', () => {
  for (const rowCount of [10, 100, 1000]) {
    test(`deve enviar CSV com ${rowCount} registros`, async ({
      page,
    }, testInfo) => {
      const content = generateCsv(rowCount);

      await test.step('Conferir a quantidade de registros gerados', async () => {
        // Esta contagem é adequada aos dados controlados do gerador,
        // que não incluem quebras de linha dentro dos campos.
        // Não é um parser genérico de CSV.
        const lines = content.trimEnd().split('\r\n');

        expect(lines[0]).toBe('nome,email,idade,cidade');
        expect(lines.length - 1).toBe(rowCount);
      });

      await test.step('Enviar arquivo e validar confirmação', async () => {
        await uploadCsv(
          page,
          testInfo,
          `valido-${rowCount}.csv`,
          content
        );
      });
    });
  }
});

test.describe('Arquivos inválidos — caracterização do uploader', () => {
  const invalidFiles = [
    {
      name: 'arquivo vazio',
      fileName: 'vazio.csv',
      content: '',
    },
    {
      name: 'estrutura CSV com aspas não fechadas',
      fileName: 'formato-incorreto.csv',
      content: 'nome,email,idade,cidade\r\n"Pessoa,teste@example.com,30,Pomerode\r\n',
    },
    {
      name: 'dados incompatíveis com as regras propostas',
      fileName: 'dados-invalidos.csv',
      content: 'nome,email,idade,cidade\r\nPessoa,email-invalido,-5,Pomerode\r\n',
    },
  ];

  for (const scenario of invalidFiles) {
    test(`deve registrar a aceitação de ${scenario.name}`, async ({
      page,
    }, testInfo) => {
      // Estes testes caracterizam o comportamento do uploader:
      // a expectativa é que ele aceite o envio mesmo sem validar CSV.
      //
      // Um teste aprovado NÃO significa que os dados são válidos
      // nem que um sistema de importação deveria aceitá-los.
      testInfo.annotations.push({
        type: 'limitação',
        description:
          'Valida transferência do arquivo; não valida importação ou regras de negócio.',
      });

      await uploadCsv(
        page,
        testInfo,
        scenario.fileName,
        scenario.content
      );
    });
  }
});