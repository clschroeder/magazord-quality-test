# Parte 5 — Mocks e integrações com marketplaces

Esta seção descreve uma proposta de arquitetura.
Não foram implementados servidores de mock nem testes
contra marketplaces neste projeto.

## 5.1.a) Como testar sem afetar os ambientes reais?

Separaria os testes em três níveis:

1. Testes de componente com respostas controladas.
2. Testes de integração com um servidor de mock.
3. Uma suíte menor contra sandboxes oficiais, quando disponíveis.

Nos testes com mock, configuraria a aplicação para utilizar
a URL do servidor de teste em vez da URL do marketplace.

Utilizaria dados sintéticos e credenciais exclusivas de teste.
O ambiente automatizado bloquearia chamadas acidentais aos
endereços de produção.

A preparação e a limpeza dos dados seriam isoladas por execução.

Cobriria publicação de produtos, atualização de preços,
processamento de pedidos e atualização de estoque.

Além do sucesso HTTP, verificaria os efeitos na aplicação:
estado persistido, mensagens ao usuário, operações pendentes
e eventos emitidos.

Um mock não comprova compatibilidade com o serviço real.
Por isso, complementaria essa cobertura com verificações
controladas no sandbox e revisão do contrato utilizado.

## 5.1.b) Qual estratégia e quais ferramentas utilizaria?

Para integrações entre o backend e os marketplaces,
escolheria inicialmente WireMock como servidor HTTP separado.

A aplicação enviaria requisições reais ao mock, que permitiria
definir respostas por método, caminho, headers e conteúdo.

Também verificaria as requisições recebidas, incluindo:

- Identificação do produto ou pedido.
- Preço e moeda.
- Quantidade de estoque.
- Campos obrigatórios.
- Identificadores de correlação e idempotência, quando previstos.
- Quantidade de chamadas realizadas.

Cada cenário teria configurações e dados próprios.
O histórico de requisições seria limpo entre os testes.

### Comparação com outras opções

MSW seria uma alternativa para interceptar chamadas em testes
de frontend ou de componentes JavaScript. É útil quando o foco
está no comportamento da aplicação diante de respostas da API.

Para um backend de tecnologia não especificada, um servidor
HTTP separado evita depender do mecanismo de interceptação
do processo que executa a aplicação.

JSON Server seria adequado para protótipos e operações CRUD
simples. Para este contexto, priorizaria uma solução com
controle explícito de falhas, atrasos e verificação das chamadas.

A escolha final seria confirmada com uma prova de conceito
dos cenários críticos e avaliação do custo de manutenção.

## 5.1.c) Como simular 500, timeout e 429?

### Erro HTTP 500

Configuraria o mock para retornar 500 em uma operação específica.

Validaria que a aplicação:

- Não registra sucesso indevido.
- Preserva dados necessários para recuperação.
- Apresenta ou registra um erro compreensível.
- Aplica a política de retentativas prevista.
- Encerra as tentativas após o limite definido.

Também simularia uma falha temporária seguida de sucesso,
verificando a recuperação e a ausência de efeitos duplicados.

### Timeout

Configuraria um atraso maior que o timeout do cliente.

Verificaria se a aplicação encerra a espera dentro do prazo,
registra a falha e mantém o estado consistente.

Um timeout não comprova que o marketplace deixou de processar
a operação. A resposta pode ter se perdido após a gravação.

Por isso, antes de repetir operações com efeitos colaterais,
utilizaria idempotência ou consulta de reconciliação,
conforme os recursos previstos pelo marketplace.

Distinguiria timeout de resposta, falha de conexão e resposta
HTTP de erro, pois podem exigir tratamentos diferentes.

### Rate limiting — HTTP 429

Configuraria uma resposta 429 com Retry-After, quando previsto
no contrato da API.

Validaria que a aplicação:

- Respeita o intervalo indicado.
- Não realiza repetição imediata e contínua.
- Limita o total de tentativas ou o tempo de recuperação.
- Preserva a operação pendente.
- Retoma o processamento após a liberação.
- Não duplica pedidos ou atualizações.

Quando o header não estiver disponível, aplicaria a política
de espera definida para o cliente, como backoff exponencial
com jitter.

Testaria a política de tempo com relógio controlado sempre
que possível, evitando tornar a suíte desnecessariamente lenta.

Retentativas dependeriam da operação: um erro transitório
não torna automaticamente seguro repetir qualquer chamada.

## 5.1.d) Como validar os schemas e onde isso entra no pipeline?

Utilizaria os contratos oficiais da versão integrada,
preferencialmente OpenAPI ou JSON Schema, quando disponíveis.

Validaria requisições enviadas e respostas recebidas, incluindo:

- Tipos de dados.
- Campos obrigatórios.
- Valores enumerados.
- Estruturas de objetos e listas.
- Campos opcionais e valores nulos.
- Restrições de formato configuradas no validador.

A política para campos adicionais seria definida conforme
a compatibilidade esperada. Não rejeitaria automaticamente
uma evolução aditiva sem avaliar seu impacto no consumidor.

Schema validation não substitui regras de negócio.
Um preço pode ter o tipo correto e ainda representar um valor
incorreto para o produto. Essas verificações seriam separadas.

### Pipeline proposto

Em cada pull request:

1. Validar a estrutura dos contratos e exemplos.
2. Executar testes unitários de transformação dos payloads.
3. Validar os payloads contra os schemas.
4. Executar integrações com mock e cenários de falha.

Periodicamente e antes de liberações relevantes:

- Executar a suíte de sandbox.
- Comparar o comportamento observado com o contrato adotado.
- Investigar mudanças de versão e incompatibilidades.

Os contratos seriam versionados junto com os testes.
Uma falha informaria a operação, o campo e a regra violada,
sem expor credenciais ou dados sensíveis.

## 5.1.e) Qual a diferença entre mocks e testes de contrato?

### Testes com mock

Permitem controlar o comportamento de uma dependência.

São adequados para testar sucesso, erros, demora,
indisponibilidade e recuperação de forma previsível.

Entretanto, o mock pode estar incorreto ou desatualizado.
Um teste aprovado contra ele não comprova compatibilidade
com o provedor real.

### Testes de contrato

Verificam as expectativas de comunicação entre consumidor
e provedor: requisições aceitas, respostas e estruturas
necessárias à integração.

Em uma abordagem orientada pelo consumidor, as expectativas
produzidas pelo consumidor precisam ser verificadas contra
a implementação do provedor para fechar essa garantia.

Para marketplaces externos, não presumiria que o provedor
executará contratos produzidos pela nossa equipe.

Nesse caso, utilizaria a documentação e os schemas oficiais,
complementados por verificações no sandbox e acompanhamento
das mudanças da API.

Validar exemplos locais contra um schema é útil, mas não
equivale à verificação do provedor em um processo completo
de contract testing.

### Quando utilizar cada abordagem

Utilizaria mocks para verificar o comportamento e a resiliência
da aplicação em muitos cenários controlados.

Utilizaria testes de contrato para detectar incompatibilidades
nas fronteiras entre sistemas, conforme o nível de colaboração
e os recursos disponibilizados pelo provedor.

As abordagens são complementares. Nenhuma elimina a necessidade
de verificar regras de negócio, efeitos persistidos e fluxos
críticos em um ambiente de integração apropriado.