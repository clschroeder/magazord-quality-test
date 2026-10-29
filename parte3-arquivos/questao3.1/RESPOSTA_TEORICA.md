# Parte 3 — Importação de CSV

## 3.1.a) Como validar que todas as 1.000 linhas foram processadas?

Separaria a validação em três etapas: preparação do arquivo,
acompanhamento da importação e conferência dos dados persistidos.

### Preparação

Geraria 1.000 registros com identificadores únicos e manteria
os dados esperados para comparação após o processamento.

Utilizaria um parser CSV para conferir a estrutura, o cabeçalho
e a quantidade de registros. Contar quebras de linha não é
suficiente para arquivos genéricos, pois campos entre aspas
podem conter quebras de linha internas.

Também prepararia os dados relacionados exigidos pelas regras
de negócio, como categorias ou clientes já cadastrados.

### Acompanhamento

Após enviar o arquivo, obteria o identificador da importação.

Se o processamento fosse assíncrono, consultaria seu status
com intervalo e prazo máximo definidos, até atingir um estado
terminal de sucesso ou falha.

Uma confirmação de upload ou uma resposta HTTP 202 não seria
tratada como evidência de processamento concluído.

### Conferência

Para um arquivo com 1.000 registros válidos, verificaria:

- Importação concluída.
- Exatamente 1.000 registros processados com sucesso.
- Nenhum registro rejeitado ou ignorado indevidamente.
- Ausência de registros extras ou duplicados.
- Correspondência entre cada registro esperado e o persistido.
- Preservação dos valores e dos relacionamentos.

Consultaria os resultados por API ou por acesso controlado
ao banco de testes, filtrando pelo lote da execução e
percorrendo todas as páginas quando houvesse paginação.

Não verificaria apenas a contagem: 1.000 registros podem
existir mesmo com dados trocados, duplicados ou ausentes.

Para lotes mistos, reconciliaria registros aceitos, rejeitados
e ignorados conforme o contrato. Também verificaria se
atualizações de registros existentes são contabilizadas
separadamente das novas inserções.

Testaria o reenvio do arquivo conforme a regra de idempotência,
evitando duplicação acidental.

## 3.1.b) Como testar arquivos corrompidos ou dados inválidos?

Organizaria os cenários por tipo de falha.

### Estrutura do arquivo

- Arquivo vazio.
- Arquivo contendo apenas cabeçalho.
- Cabeçalhos obrigatórios ausentes ou duplicados.
- Quantidade incorreta de colunas.
- Aspas não fechadas.
- Delimitador incompatível com o formato aceito.
- Codificação inválida ou arquivo truncado.

### Conteúdo e regras de negócio

- Campos obrigatórios vazios.
- Email com formato inválido.
- Texto em campos numéricos.
- Valores fora dos limites permitidos.
- Duplicatas dentro do arquivo.
- Registros já existentes no sistema.
- Referências a entidades inexistentes.
- Caracteres acentuados, vírgulas e aspas em campos válidos.

As regras precisam ser definidas antes dos testes.
Por exemplo, considerar uma idade negativa inválida é uma
premissa do cenário, não uma regra demonstrada pelo uploader.

### Resultados esperados

Para cada falha, verificaria:

- Mensagem clara sobre o problema.
- Identificação do registro e do campo, quando aplicável.
- Contadores de sucesso e erro consistentes.
- Ausência de gravações indevidas.
- Possibilidade de corrigir e reenviar o arquivo.

A política de processamento deve ser explícita:

- Importação atômica: qualquer erro impede a gravação do lote.
- Importação parcial: registros válidos são processados e os
  rejeitados são apresentados em relatório.

Os testes verificariam a política acordada, sem presumir
que uma dessas alternativas é sempre a correta.

Também simularia interrupção e reprocessamento para verificar
que o sistema não perde registros nem os duplica.

## Implementação realizada

O gerador csv-generator.js cria arquivos com:

- Cabeçalho nome,email,idade,cidade.
- 10, 100 ou 1.000 registros.
- Dados sintéticos.
- Emails distintos por lote e registro.
- Escape de campos com vírgulas, aspas ou quebras de linha.

Os testes de arquivos válidos conferem o cabeçalho e a
quantidade de registros antes do envio.

A contagem simplificada por linhas é adequada aos dados
controlados gerados nesses cenários, que não contêm quebras
de linha dentro dos campos. Não é um parser CSV genérico.

Cada arquivo recebe um nome único, é salvo na pasta de
resultados da execução e anexado ao relatório.

Após o upload, os testes verificam a mensagem de sucesso
e o nome do arquivo apresentado pelo site.

## Arquivos inválidos e comportamento observado

Foram enviados três exemplos inválidos:

1. Arquivo vazio.
2. CSV com aspas não fechadas.
3. CSV com email inválido e idade negativa.

O site aceitou os três uploads.

Esses testes caracterizam o comportamento observado:
a confirmação de envio não distingue arquivos CSV válidos
de arquivos inválidos.

A aceitação não é apresentada como defeito comprovado do site,
pois o recurso disponibilizado é um uploader, sem requisito
demonstrado de validar regras de importação.

## Limites da cobertura

Não foi demonstrado processamento dos registros, persistência,
validação de duplicatas ou conferência de relacionamentos
no servidor.

A estratégia descrita nas respostas 3.1.a e 3.1.b se aplica
a um sistema real de importação com essas funcionalidades.
Ela não representa funcionalidades implementadas neste projeto.

## Exemplos disponíveis

A pasta testes/fixtures contém exemplos para inspeção:

- valido.csv
- vazio.csv
- formato-incorreto.csv
- dados-invalidos.csv

Os testes automatizados geram seus próprios arquivos.
Os exemplos estáticos não são carregados pela suíte atual.

## Evidência de execução

Os seis testes passaram individualmente na Parte 3 e
na execução conjunta das três partes práticas.

O cenário com 1.000 registros valida geração e upload.
Não constitui um teste de carga nem comprova desempenho
do processamento de uma importação.