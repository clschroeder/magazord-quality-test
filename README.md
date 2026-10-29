# Teste QA — Cristiano Schroeder

Projeto desenvolvido para o processo seletivo de Coordenador
de Qualidade da Magazord.

Contém automação de API, checkout e upload de CSV, além de
respostas teóricas sobre mobile e integrações com marketplaces.

## Tecnologias utilizadas

- JavaScript.
- Node.js 22.20.0 no ambiente local.
- npm 10.9.3 no ambiente local.
- Playwright Test 1.64.1.
- Chromium para os testes de interface.
- GitHub Actions para o workflow de CI.

O package-lock.json registra as versões das dependências
utilizadas na instalação reproduzível com npm ci.

## Pré-requisitos

- Node.js 22.x e npm.
- Git, caso o projeto seja obtido por clone.
- Acesso à internet para instalar dependências e acessar
  os ambientes públicos utilizados nos testes.

A execução local foi validada no Windows 10 Pro 22H2.
Isso descreve o ambiente observado, não uma garantia de
suporte oficial do Playwright a esse sistema operacional.

O workflow de CI está configurado para Ubuntu com Node.js 22.

## Instalação

Abra um terminal na raiz do projeto.

Instalação das dependências:

```bash
npm install
```

Para reproduzir as versões registradas no package-lock.json,
utilize alternativamente:

```bash
npm ci
```

Instale o navegador utilizado pelos testes:

```bash
npx playwright install chromium
```

No Linux, para instalar também as dependências do sistema:

```bash
npx playwright install --with-deps chromium
```

Não é necessário configurar uma chave de API para os
cenários implementados.

As credenciais presentes nos testes são públicas e pertencem
aos ambientes de demonstração.

## Execução dos testes

### Suíte completa

```bash
npm test
```

### Por parte

```bash
npm run test:parte1
npm run test:parte2
npm run test:parte3
```

As Partes 4 e 5 são exclusivamente teóricas.

### Checkout com navegador visível

```bash
npm run test:parte2 -- --headed
```

### Upload de CSV com navegador visível

```bash
npm run test:parte3 -- --headed
```

### Interface interativa

```bash
npm run test:ui
```

### Depuração do checkout

```bash
npm run test:debug -- --project=checkout
```

### Listar os testes sem executá-los

```bash
npm test -- --list
```

## Relatório e evidências

Após a execução:

```bash
npm run report
```

O relatório HTML é gerado em playwright-report.

Os arquivos de execução ficam em test-results.
Arquivos CSV enviados são anexados aos respectivos testes.

Em caso de falha, a configuração preserva traces e captura
screenshots dos testes de interface.

Para abrir um trace, substitua o caminho pelo arquivo
indicado na saída da execução:

```bash
npx playwright show-trace "caminho/para/trace.zip"
```

Relatórios e traces podem conter dados de requisições,
incluindo tokens temporários de demonstração. Devem ser
revisados antes de compartilhamento.

## Estrutura do projeto

| Caminho | Conteúdo |
| --- | --- |
| playwright.config.js | Projetos, timeouts e evidências |
| parte1-api/questao1.1/ | Teoria e testes de API |
| parte1-api/questao1.1/testes/utils/ | Helpers de rate limiting e token |
| parte2-e2e/questao2.1/ | Teoria e testes de checkout |
| parte2-e2e/questao2.1/testes/pages/ | Page Objects |
| parte2-e2e/questao2.1/testes/fixtures/ | Gerador de dados do comprador |
| parte3-arquivos/questao3.1/ | Teoria e testes de upload |
| parte3-arquivos/questao3.1/testes/utils/ | Gerador de CSV |
| parte3-arquivos/questao3.1/testes/fixtures/ | Exemplos estáticos de CSV |
| parte4-mobile/questao4.1/ | Estratégia teórica de mobile |
| parte5-mocks/questao5.1/ | Estratégia teórica de integrações |
| .github/workflows/playwright.yml | Workflow de CI |

## Respostas teóricas

- [Parte 1 — API](parte1-api/questao1.1/RESPOSTA_TEORICA.md)
- [Parte 2 — Checkout](parte2-e2e/questao2.1/RESPOSTA_TEORICA.md)
- [Parte 3 — CSV](parte3-arquivos/questao3.1/RESPOSTA_TEORICA.md)
- [Parte 4 — Mobile](parte4-mobile/questao4.1/RESPOSTA_TEORICA.md)
- [Parte 5 — Mocks](parte5-mocks/questao5.1/RESPOSTA_TEORICA.md)
- [Casos de teste — 21 cenários](CASOS_DE_TESTE.txt)

## Cobertura automatizada

| Parte | Quantidade | Escopo |
| --- | ---: | --- |
| API | 11 | Headers reais, autenticação real e testes dos helpers |
| Checkout | 4 | Compra e validações de campos obrigatórios |
| CSV | 6 | Uploads válidos e caracterização de arquivos inválidos |
| Total | 21 | Suíte executada localmente |

### API

- Consulta real dos headers de rate limiting do GitHub.
- Cinco cenários simulados de classificação de cota esgotada.
- Login e reutilização de token na DummyJSON.
- Quatro cenários controlados do gerenciador de token.

### Checkout

- Compra de dois produtos com conferência dos valores.
- Bloqueio por ausência de nome.
- Bloqueio por ausência de sobrenome.
- Bloqueio por ausência de CEP.

### CSV

- Arquivos válidos com 10, 100 e 1.000 registros.
- Arquivo vazio.
- Estrutura com aspas não fechadas.
- Dados incompatíveis com as regras propostas.

## Decisões técnicas

### Organização

Page Objects concentram seletores e ações do checkout.
Helpers encapsulam geração de arquivos e gerenciamento de token.
Os testes mantêm explícitos os resultados esperados.

### Isolamento

Os testes de interface utilizam contextos isolados.

O checkout também realiza limpeza explícita de cookies,
localStorage e sessionStorage.

Os arquivos de upload têm nomes únicos e são gravados
na pasta de resultados de cada teste.

### Execução sequencial

A suíte utiliza um worker para reduzir concorrência
nos serviços públicos.

Essa configuração não dispensa o isolamento dos testes.
Cada cenário prepara seus próprios dados e condições.

### Falhas e diagnóstico

Não há retentativas automáticas configuradas no runner.
Falhas permanecem visíveis para investigação.

Os testes usam asserções com espera automática quando
aplicável, sem pausas fixas para sincronizar a interface.

## Adaptações e limites

### ReqRes substituída por DummyJSON

A ReqRes retornou HTTP 401 com missing_api_key ao consultar
/api/users/2 usando Bearer.

A resposta informou que esse endpoint exige x-api-key.
Foi adotada a DummyJSON para demonstrar autenticação por token,
conforme a autorização do enunciado para outra API pública.

O teste usa clientes HTTP separados para login e consulta,
evitando autenticação acidental pelos cookies do login.

### Rate limiting

Não foi esgotada a cota pública do GitHub.

A consulta real valida os headers. Os cenários de bloqueio
validam o helper com dados simulados, sem comprovar o
mecanismo de bloqueio do servidor.

A cota sem autenticação é compartilhada pelo IP.
Seu esgotamento pode afetar execuções locais ou no CI.

### Token

O cache foi demonstrado entre chamadas dentro de um teste.

A expiração local usa relógio controlado e TTL simulado.
Não foi comprovada expiração do JWT no servidor nem
implementada recuperação automática após HTTP 401.

O compartilhamento entre testes por fixture de worker
é discutido na resposta teórica, mas não foi implementado.

### Checkout

O SauceDemo não disponibiliza aplicação de cupons nesse fluxo.
A estratégia para cupons de uso único está na resposta teórica.

Os testes não comprovam cobrança real, persistência de pedido
em backend ou envio de email.

### CSV

O uploader aceita também os arquivos inválidos enviados.

Os testes caracterizam essa aceitação e validam a transferência.
Não comprovam processamento das linhas, regras de negócio,
duplicatas ou relacionamentos no servidor.

O cenário de 1.000 registros não é um teste de carga.

### Serviços externos

Os testes reais dependem da disponibilidade e do comportamento
dos ambientes públicos. Falhas devem ser investigadas,
distinguindo problema da aplicação, mudança de contrato,
limitação de acesso e indisponibilidade.

## CI/CD

O workflow é acionado em pushes e pull requests destinados
às branches main e master.

Etapas:

1. Obter o código.
2. Preparar Node.js 22.
3. Instalar dependências com npm ci.
4. Instalar Chromium e dependências do sistema.
5. Executar npm test.
6. Publicar o relatório HTML por 30 dias, quando a execução
   não for cancelada.

Status: workflow configurado, ainda sem execução no GitHub
Actions confirmada nesta etapa.

## Evidência local

A suíte completa foi executada com npm test e apresentou:

- 21 testes aprovados.
- Um worker.
- Duração observada de 36,8 segundos.

A duração varia conforme a máquina, a rede e os serviços públicos.
Essa execução não substitui a validação em instalação limpa ou no CI.

## Referências

- Enunciado: https://github.com/magazord-plataforma/magazord-quality-test
- Playwright: https://playwright.dev/docs/intro
- GitHub API: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- DummyJSON: https://dummyjson.com/docs/auth
- SauceDemo: https://www.saucedemo.com
- Upload: https://the-internet.herokuapp.com/upload