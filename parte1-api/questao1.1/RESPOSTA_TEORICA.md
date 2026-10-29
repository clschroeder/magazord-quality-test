# Parte 1 — Rate limiting e autenticação com token

## 1.1.a) Como estruturar os testes de rate limiting?

Dividiria a cobertura em duas camadas:

1. Integração com a API real: verificar os headers de limite,
   saldo e renovação da janela.
2. Testes controlados: simular respostas de bloqueio para validar
   a lógica de detecção sem esgotar a cota de um serviço público.

Em um ambiente próprio, com limite configurável e identidade
exclusiva para o teste, também verificaria:

- Requisições abaixo do limite.
- A última requisição permitida.
- A primeira requisição excedente.
- Recuperação do acesso após a renovação da janela.
- Isolamento da cota conforme o contrato: usuário, token ou IP.
- Comportamento sob concorrência.

O cliente deve respeitar o tempo de espera indicado pelo servidor,
quando disponível, e limitar as tentativas. Não deve repetir
requisições indefinidamente após um bloqueio.

### O que foi implementado

Uma consulta real ao GitHub valida:

- HTTP 200 e identificação do usuário solicitado.
- Presença e formato numérico dos headers de rate limiting.
- Limite esperado de 60 para a consulta sem autenticação.
- Saldo entre zero e o limite total.
- Renovação da janela em até uma hora, usando a data do servidor.

O helper `isPrimaryRateLimitExceeded` identifica a combinação
de status 403 ou 429 com saldo igual a zero.

Cinco testes com dados simulados cobrem essa classificação,
incluindo casos que não devem ser considerados bloqueio:

- HTTP 403 com saldo disponível.
- HTTP 200 com saldo zero.
- HTTP 403 sem o header de saldo.

### Limites da evidência

Os testes simulados validam o helper, não o mecanismo de bloqueio
do GitHub. Não foi provocada exaustão da cota pública.

Um HTTP 403 isolado não comprova rate limiting. O helper tem
escopo restrito à cota primária e não cobre todas as formas
de limitação secundária.

## 1.1.b) Como obter e reutilizar um token entre os testes?

Utilizaria um gerenciador que encapsula login, armazenamento em
memória, validade e invalidação do token.

Para compartilhar o gerenciador entre testes no Playwright,
utilizaria uma fixture com escopo de worker. Cada worker teria
sua própria instância e, quando necessário, seu próprio usuário.

Esse compartilhamento depende do isolamento dos cenários:
testes que alteram permissões, encerram sessões ou invalidam
tokens devem usar uma sessão exclusiva.

O token só deve ser reutilizado enquanto estiver válido.
Em um sistema real, a validade deve ser derivada do contrato
da autenticação, com uma margem antes do vencimento.

### O que foi implementado

O helper `createTokenManager`:

- Recebe uma função de login.
- Mantém o token em memória.
- Reutiliza o token enquanto o TTL local não venceu.
- Obtém outro token após o vencimento.
- Permite invalidar explicitamente o cache.
- Rejeita tokens vazios ou respostas sem token utilizável.

O teste de integração realiza duas consultas autenticadas e
comprova que a função de login foi chamada uma única vez.

O cache foi demonstrado dentro de um teste. A fixture com
compartilhamento entre testes é uma proposta de evolução,
não faz parte da implementação entregue.

## 1.1.c) Como detectar e tratar a expiração?

Consideraria dois sinais:

1. Vencimento conhecido pelo cliente, conforme o contrato
   de validade do token.
2. Rejeição pelo servidor, analisando o status e o código
   de erro retornado.

HTTP 401 não significa necessariamente expiração. Também
pode indicar token ausente, inválido ou revogado.

Quando a renovação for apropriada, invalidaria o cache,
obteria um novo token e permitiria uma tentativa adicional.
Uma segunda falha seria propagada.

A repetição de operações com efeitos colaterais exige cuidado
com idempotência, para evitar duplicar pedidos ou pagamentos.

### O que foi implementado

O TTL local é testado com um relógio injetável. Assim,
simulamos a passagem de dois minutos sem espera real.

A cobertura verifica:

- Reutilização um milissegundo antes do vencimento.
- Renovação exatamente no vencimento.
- Reutilização do token renovado.
- Invalidação explícita do cache.
- Propagação de falha na renovação.
- Nova tentativa por chamada posterior.
- Rejeição de token vazio.

O TTL local não altera a validade do JWT no servidor.
Não foi implementada recuperação automática após HTTP 401.

## Adaptação do ambiente de autenticação

A ReqRes retornou HTTP 401 com `missing_api_key` ao consultar
`/api/users/2` usando o token de login como Bearer. A resposta
informou que esse endpoint exige `x-api-key`.

Foi utilizada a DummyJSON como alternativa pública,
conforme permitido pelo enunciado:

- Login: POST /auth/login.
- Consulta autenticada: GET /auth/me.

O teste comprova acesso negado sem token, sucesso com Bearer
e reutilização do token em duas consultas.

Os clientes HTTP de login e consulta são separados para
impedir que cookies recebidos no login autentiquem as
consultas e escondam uma falha no uso do Bearer.

## Evidência de execução

Os 11 testes da Parte 1 passaram na execução local.
Essa evidência não substitui a validação posterior no CI.