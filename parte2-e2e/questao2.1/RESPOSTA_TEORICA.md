# Parte 2 — Fluxo de checkout

## 2.1.a) Como garantir um cupom válido diferente por execução?

Criaria o cupom por uma API de preparação de dados do ambiente
de testes antes de executar o checkout.

O código teria um identificador único, associado à execução.
Porém, gerar uma string diferente não torna o cupom válido:
é necessário cadastrá-lo e confirmar suas condições de uso.

A preparação verificaria:

- Cupom ativo e dentro do prazo de validade.
- Limite de utilização igual a um.
- Produtos e usuário elegíveis.
- Valor mínimo do pedido, quando aplicável.
- Tipo e valor do desconto esperado.

Cada teste receberia seu próprio cupom, evitando disputas entre
execuções paralelas. Após o teste, desativaria ou removeria os
dados criados, conforme as possibilidades do ambiente.

Se não houvesse API de criação, utilizaria um conjunto de cupons
previamente cadastrados, com reserva exclusiva por execução.

Além do uso válido, cobriria:

- Tentativa de reutilizar um cupom já consumido.
- Cupom expirado.
- Cupom inexistente.
- Carrinho que não atende às condições.
- Duas tentativas simultâneas de consumir o mesmo cupom.

A validação incluiria o desconto no resumo e o total final.
O consumo único deve ser garantido pelo backend, inclusive
sob concorrência.

### Aplicação neste projeto

O fluxo disponibilizado pelo SauceDemo não oferece aplicação
de cupom. Portanto, essa funcionalidade foi abordada na
estratégia teórica, sem alegar cobertura automatizada.

Os dados dinâmicos implementados são nome, sobrenome e CEP.
Eles são gerados para cada execução e não representam
cadastro ou validação de endereço real.

## 2.1.b) Como validar a confirmação sem depender de email real?

Validaria a conclusão em camadas:

1. Interface: mensagem de sucesso, identificação do pedido
   e resumo dos itens e valores.
2. API: consulta do pedido pelo identificador retornado,
   verificando cliente, produtos, quantidades e status.
3. Integração: confirmação dos eventos esperados em um
   ambiente controlado, quando essa observabilidade existir.

Para operações assíncronas, consultaria o status com tentativas
limitadas e prazo máximo, evitando esperas fixas arbitrárias.

Se o envio de email fosse parte do requisito, utilizaria um
servidor de captura de emails no ambiente de testes ou um
substituto controlado do serviço de envio.

Nesse caso, verificaria destinatário, identificação do pedido
e conteúdo essencial da mensagem, sem depender de uma caixa
de email pessoal ou de entrega externa.

Também cobriria a prevenção de pedidos e cobranças duplicadas
quando houver repetição de clique ou de requisição.

### Aplicação neste projeto

O teste de sucesso no SauceDemo verifica:

- Login e acesso ao catálogo.
- Adição de dois produtos.
- Indicador de dois itens no carrinho.
- Nomes dos produtos no carrinho e no resumo.
- Preenchimento de dados dinâmicos.
- Subtotal, imposto e total esperados.
- Navegação para a página de conclusão.
- Mensagem "Thank you for your order!".
- Ausência do indicador de itens após a conclusão.

O ambiente demonstra o checkout, mas não comprova cobrança
real, persistência de um pedido em backend ou envio de email.
Esses comportamentos não são apresentados como validados.

## Organização e isolamento

Os Page Objects concentram seletores e ações:

- LoginPage: acesso à tela e autenticação.
- CheckoutPage: produtos, carrinho e etapas do checkout.

As asserções ficam nos testes, tornando explícitos os
resultados esperados de cada cenário.

O gerador checkout-data.js separa a criação dos dados
da interação com a interface.

Cada teste utiliza um contexto de navegador isolado,
sem depender de uma execução anterior.

O afterEach realiza a limpeza explícita de localStorage,
sessionStorage e cookies. O Playwright também descarta
o contexto ao final do teste.

## Cobertura implementada

1. Finalização de compra com dois produtos.
2. Bloqueio do avanço quando o nome não é preenchido.
3. Bloqueio do avanço quando o sobrenome não é preenchido.
4. Bloqueio do avanço quando o CEP não é preenchido.

Os três cenários negativos são parametrizados, mas cada um
aparece como teste independente no relatório e prepara
seu próprio carrinho.

A cobertura prioriza o fluxo principal e as validações
dos campos obrigatórios. Não representa cobertura completa
de todas as regras possíveis de um checkout.

## Evidência de execução

Os quatro testes passaram na execução local e também
na execução conjunta das três partes práticas.