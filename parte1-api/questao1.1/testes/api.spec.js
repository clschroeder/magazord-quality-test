import { test, expect } from '@playwright/test';
import {
  isPrimaryRateLimitExceeded,
  createTokenManager,
} from './utils/api-helper.js';

// "testInfo" fornece informações e recursos da execução atual,
// como a possibilidade de adicionar anexos ao relatório.
test('deve retornar os headers de rate limiting do GitHub', async ({
  request,
}, testInfo) => {
  // Consulta um usuário público sem enviar token de autenticação.
  // O header Accept informa o formato de resposta desejado.
  // O timeout limita a espera desta requisição a 30 segundos.
  const response = await request.get(
    'https://api.github.com/users/github',
    {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      timeout: 30_000,
    }
  );

  // Recupera os headers como um objeto com nomes em minúsculas.
  // Seus valores são strings, mesmo quando representam números.
  const headers = response.headers();

  // Guarda evidências antes das validações. Assim, mesmo se uma
  // asserção falhar, os valores recebidos estarão no relatório.
  //
  // JSON.stringify transforma o objeto em texto JSON.
  // "null" mantém todos os campos e "2" aplica indentação de 2 espaços.
  // O contentType identifica o formato do anexo.
  await testInfo.attach('rate-limit', {
    body: JSON.stringify({
      status: response.status(),
      limit: headers['x-ratelimit-limit'],
      remaining: headers['x-ratelimit-remaining'],
      reset: headers['x-ratelimit-reset'],
    }, null, 2),
    contentType: 'application/json',
  });

  // test.step agrupa ações e validações em etapas nomeadas no relatório.
  // As etapas pertencem ao mesmo teste; não são testes independentes.
  await test.step('Validar o sucesso da consulta', async () => {
    // Exige HTTP 200. O segundo argumento do expect é uma mensagem
    // personalizada, que inclui o corpo da resposta para ajudar
    // no diagnóstico de erros, como uma cota já esgotada.
    expect(
      response.status(),
      `Resposta da API: ${await response.text()}`
    ).toBe(200);

    // Converte o corpo JSON em objeto JavaScript e confirma
    // que a resposta corresponde ao usuário solicitado.
    const body = await response.json();
    expect(body.login).toBe('github');
  });

  await test.step('Validar presença e formato dos headers', async () => {
    // Aplica a mesma validação aos três headers obrigatórios,
    // evitando duplicar o código das asserções.
    for (const name of [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
    ]) {
      // A expressão regular /^\d+$/ aceita somente dígitos:
      // ^ = início, \d = dígito, + = um ou mais, $ = fim.
      //
      // Um header ausente, vazio ou com texto fará a validação falhar.
      // Isso também evita converter uma string vazia em zero depois.
      expect(headers[name], `Header obrigatório: ${name}`)
        .toMatch(/^\d+$/);
    }
  });

  await test.step('Validar a consistência dos limites', async () => {
    // Após validar o formato, converte as strings para números
    // para realizar comparações e cálculos.
    const limit = Number(headers['x-ratelimit-limit']);
    const remaining = Number(headers['x-ratelimit-remaining']);
    const reset = Number(headers['x-ratelimit-reset']);

    // Este cenário considera a cota de 60 requisições por hora
    // para chamadas sem autenticação.
    expect(limit).toBe(60);

    // Não exigimos um saldo fixo, como 59: outras requisições
    // do mesmo IP podem ter consumido parte da cota.
    // O saldo deve ficar entre zero e o limite total.
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(limit);

    // O header Date informa a data/hora da resposta do servidor.
    // Date.parse converte esse valor para milissegundos desde
    // 1º de janeiro de 1970 (referência Unix).
    //
    // Usamos o horário do servidor para evitar depender de um
    // relógio local que possa estar adiantado ou atrasado.
    const serverTime = Date.parse(headers.date);

    // Uma data inválida resulta em NaN.
    // Esta asserção impede que o cálculo prossiga com esse valor.
    expect(Number.isFinite(serverTime)).toBe(true);

    // O header reset já está em segundos Unix.
    // Dividimos serverTime por 1000 para igualar as unidades,
    // e Math.floor remove a parte decimal.
    //
    // A diferença representa quantos segundos faltam
    // para a renovação da janela de rate limiting.
    const secondsUntilReset = reset - Math.floor(serverTime / 1000);

    // A renovação deve estar entre o instante da resposta
    // e uma hora à frente: 60 minutos × 60 segundos = 3600.
    expect(secondsUntilReset).toBeGreaterThanOrEqual(0);
    expect(secondsUntilReset).toBeLessThanOrEqual(3600);
    // Obs.: Esse teste valida os headers e sua consistência em uma resposta real. 
    // Ele ainda não comprova o bloqueio ao exceder a cota; 
    // esse comportamento é coberto em outro cenário.
  });
});

test.describe('Detecção de rate limiting — dados simulados', () => {
  // Estes cenários testam a lógica do helper.
  // Não fazem requisições nem comprovam o bloqueio real do GitHub.
  const scenarios = [
    {
      name: 'deve detectar cota esgotada com status 403',
      status: 403,
      headers: { 'x-ratelimit-remaining': '0' },
      expected: true,
    },
    {
      name: 'deve detectar cota esgotada com status 429',
      status: 429,
      headers: { 'x-ratelimit-remaining': '0' },
      expected: true,
    },
    {
      name: 'não deve confundir um 403 com saldo disponível com cota esgotada',
      status: 403,
      headers: { 'x-ratelimit-remaining': '25' },
      expected: false,
    },
    {
      name: 'não deve considerar a última requisição bem-sucedida como bloqueada',
      status: 200,
      headers: { 'x-ratelimit-remaining': '0' },
      expected: false,
    },
    {
      name: 'não deve concluir que a cota esgotou quando o header está ausente',
      status: 403,
      headers: {},
      expected: false,
    },
  ];

  // Cada combinação gera um teste independente no relatório.
  for (const scenario of scenarios) {
    test(scenario.name, () => {
      const result = isPrimaryRateLimitExceeded(
        scenario.status,
        scenario.headers
      );

      expect(result).toBe(scenario.expected);
    });
  }
});

test('deve obter token e reutilizá-lo em consultas autenticadas', async ({
  playwright,
}) => {
  let loginCalls = 0;

  // Contextos separados evitam que cookies recebidos no login
  // autentiquem as consultas e escondam um problema no Bearer token.
  const loginClient = await playwright.request.newContext();
  const apiClient = await playwright.request.newContext();

  try {
    const tokenManager = createTokenManager({
      // Validade local do cache: dois minutos.
      ttlMs: 120_000,

      login: async () => {
        loginCalls += 1;

        const response = await loginClient.post(
          'https://dummyjson.com/auth/login',
          {
            // Credenciais públicas de demonstração da DummyJSON.
            data: {
              username: 'emilys',
              password: 'emilyspass',
              expiresInMins: 5,
            },
            timeout: 30_000,
          }
        );

        expect(response.status(), 'Status do login').toBe(200);

        const body = await response.json();

        // O helper verifica se o token retornado é uma string válida.
        return body.accessToken;
      },
    });

    await test.step('Validar que o endpoint exige autenticação', async () => {
      // Este cliente não recebeu os cookies do login
      // e ainda não envia um header Authorization.
      const response = await apiClient.get(
        'https://dummyjson.com/auth/me',
        { timeout: 30_000 }
      );

      expect(response.status(), 'Acesso sem token deve ser negado')
        .toBe(401);
    });

    await test.step('Obter token e consultar o usuário autenticado', async () => {
      const token = await tokenManager.getToken();

      const response = await apiClient.get(
        'https://dummyjson.com/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30_000,
        }
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.username).toBe('emilys');
      expect(body.id).toBe(1);
    });

    await test.step('Reutilizar o token sem realizar outro login', async () => {
      // O gerenciador deve devolver o token em cache.
      const token = await tokenManager.getToken();

      const response = await apiClient.get(
        'https://dummyjson.com/auth/me',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30_000,
        }
      );

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.username).toBe('emilys');

      // Comprova a reutilização: duas chamadas ao gerenciador,
      // mas somente uma execução da função de login.
      expect(loginCalls).toBe(1);
    });
  } finally {
    // Contextos criados manualmente precisam ser liberados.
    // O finally executa a limpeza mesmo se uma asserção falhar.
    await Promise.all([
      loginClient.dispose(),
      apiClient.dispose(),
    ]);
  }
});

test.describe('Gerenciador de token — simulação controlada', () => {
  test('deve reutilizar o token antes do vencimento e renová-lo ao expirar', async () => {
    // Relógio controlado pelo teste, em milissegundos.
    // Alterar esta variável não altera o relógio do computador.
    let currentTime = 0;
    let loginCalls = 0;

    const manager = createTokenManager({
      ttlMs: 120_000,
      now: () => currentTime,

      // Substitui o login real por uma função previsível.
      // Tokens diferentes permitem identificar cada renovação.
      login: async () => {
        loginCalls += 1;
        return `token-simulado-${loginCalls}`;
      },
    });

    const firstToken = await manager.getToken();

    expect(firstToken).toBe('token-simulado-1');
    expect(loginCalls).toBe(1);

    // Um milissegundo antes da expiração: ainda utiliza o cache.
    currentTime = 119_999;

    expect(await manager.getToken()).toBe(firstToken);
    expect(loginCalls).toBe(1);

    // Exatamente no vencimento: o token deve ser renovado.
    // Esta é uma validação de valor-limite.
    currentTime = 120_000;

    expect(await manager.getToken()).toBe('token-simulado-2');
    expect(loginCalls).toBe(2);

    // O token renovado também deve ficar disponível em cache.
    expect(await manager.getToken()).toBe('token-simulado-2');
    expect(loginCalls).toBe(2);
  });

  test('deve obter outro token após invalidar o cache', async () => {
    let loginCalls = 0;

    const manager = createTokenManager({
      now: () => 0,
      login: async () => {
        loginCalls += 1;
        return `token-simulado-${loginCalls}`;
      },
    });

    expect(await manager.getToken()).toBe('token-simulado-1');

    // Representa a decisão de descartar o token, por exemplo,
    // depois de o cliente receber um HTTP 401.
    // Este teste verifica a invalidação; não simula a resposta HTTP.
    manager.invalidate();

    expect(await manager.getToken()).toBe('token-simulado-2');
    expect(loginCalls).toBe(2);
  });

  test('deve propagar erro de renovação sem devolver o token expirado', async () => {
    let currentTime = 0;
    let loginCalls = 0;

    const manager = createTokenManager({
      ttlMs: 120_000,
      now: () => currentTime,
      login: async () => {
        loginCalls += 1;

        if (loginCalls === 2) {
          throw new Error('Serviço de autenticação indisponível');
        }

        return `token-simulado-${loginCalls}`;
      },
    });

    await manager.getToken();
    currentTime = 120_000;

    // rejects verifica a rejeição de uma Promise.
    // O helper deve comunicar a falha, sem devolver o token vencido.
    await expect(manager.getToken()).rejects.toThrow(
      'Serviço de autenticação indisponível'
    );

    expect(loginCalls).toBe(2);

    // Uma nova chamada pode tentar obter o token novamente.
    // Não há repetição automática ou loop infinito no helper.
    expect(await manager.getToken()).toBe('token-simulado-3');
    expect(loginCalls).toBe(3);
  });

  test('deve rejeitar resposta de login com token vazio', async () => {
    const manager = createTokenManager({
      login: async () => '',
    });

    await expect(manager.getToken()).rejects.toThrow(
      'Login não retornou um token válido.'
    );
  });
});