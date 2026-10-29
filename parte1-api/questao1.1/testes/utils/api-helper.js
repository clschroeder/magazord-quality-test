/**
 * Identifica o esgotamento da cota primária.
 *
 * Um status 403 sozinho não comprova rate limiting:
 * ele também pode indicar falta de permissão.
 *
 * Por isso, combinamos o status de bloqueio com o header
 * que informa que nenhuma requisição está disponível.
 *
 * Escopo: cota primária. Limites secundários exigem
 * outros sinais e não são identificados por esta função.
 */
export function isPrimaryRateLimitExceeded(status, headers) {
  const isBlocked = status === 403 || status === 429;

  // Os headers recebidos por response.headers() são strings.
  // A comparação explícita evita tratar um header ausente como zero.
  const hasNoRequestsLeft = headers['x-ratelimit-remaining'] === '0';

  return isBlocked && hasNoRequestsLeft;
}

/**
 * Cria um gerenciador de token com cache em memória.
 *
 * login: função responsável por obter um token da API.
 * ttlMs: validade local usada na simulação de expiração.
 * now: relógio substituível para testar o tempo sem esperar.
 *
 * O TTL local não altera a validade do token no servidor.
 */
export function createTokenManager({
  login,
  ttlMs = 120_000,
  now = () => Date.now(),
}) {
  // Estas variáveis ficam preservadas entre chamadas de getToken()
  // feitas na mesma instância do gerenciador.
  let cachedToken;
  let expiresAt = 0;

  return {
    async getToken() {
      // Enquanto houver um token dentro da validade local,
      // devolve o cache sem realizar outro login.
      if (cachedToken && now() < expiresAt) {
        return cachedToken;
      }

      // Se não houver token ou ele tiver expirado, solicita outro.
      // Uma falha no login é propagada para quem chamou o helper.
      const token = await login();

      // Impede armazenar uma resposta sem um token utilizável.
      if (typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Login não retornou um token válido.');
      }

      cachedToken = token;
      expiresAt = now() + ttlMs;

      return cachedToken;
    },

    // Permite descartar o cache, por exemplo, após um HTTP 401.
    invalidate() {
      cachedToken = undefined;
      expiresAt = 0;
    },
  };
}