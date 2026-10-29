# Parte 4 — Estratégia de automação mobile

Esta seção apresenta uma proposta de arquitetura.
Não foram implementados ou executados testes mobile neste projeto.

## 4.1.a) Qual ferramenta escolheria e por quê?

Escolheria inicialmente Appium, considerando um aplicativo
para Android e iOS cuja tecnologia de implementação não foi
informada.

A escolha definitiva dependeria de uma prova de conceito
com os fluxos críticos e os recursos do dispositivo.

### Appium

É uma opção adequada para uma estratégia que precisa interagir
com aplicativos e componentes nativos das duas plataformas.

Permite organizar os testes com Page Objects ou Screen Objects,
mantendo uma linguagem comum para os cenários e adaptadores
para diferenças entre Android e iOS.

Como contrapartida, exige manutenção dos drivers, configuração
dos dispositivos e atenção à sincronização das interações.

### Maestro

Consideraria Maestro para fluxos de interface que se beneficiem
de uma descrição declarativa e de menor volume de código.

Pode facilitar a leitura e a manutenção de jornadas simples.
Entretanto, validaria em uma prova de conceito a adequação aos
cenários específicos de câmera, notificações e sincronização.

A simplicidade de um fluxo básico não garante que todas as
integrações do aplicativo terão a mesma facilidade de automação.

### Decisão

Adotaria Appium como ponto de partida pela necessidade de
controle das particularidades das plataformas.

Se a prova de conceito mostrasse que Maestro atende aos fluxos
críticos com menor custo de manutenção, reconsideraria a escolha.

A decisão consideraria estabilidade, tempo de execução,
diagnóstico de falhas, experiência da equipe e custo do CI,
além da capacidade de automatizar um cenário isolado.

## 4.1.b) Como simular geolocalização, câmera e notificações push?

Separaria testes determinísticos com substitutos controlados
dos testes que verificam integração real com o sistema operacional.

### Geolocalização

Nos testes de regras de negócio, injetaria um provedor de
localização que retornasse coordenadas conhecidas.

Nos testes de integração com o dispositivo, utilizaria os
recursos disponíveis no emulador, simulador ou driver para
definir a localização.

Cobriria:

- Permissão concedida, negada e revogada.
- Localização dentro e fora da área atendida.
- Mudança de posição durante o uso.
- Localização indisponível ou desatualizada.

Não confundiria a simulação de coordenadas com a validação
do comportamento real do GPS em campo.

### Câmera

Criaria uma abstração para a captura de imagens. Em uma build
de testes, ela poderia retornar uma imagem conhecida, permitindo
validar processamento e apresentação de forma determinística.

Cobriria captura bem-sucedida, cancelamento, permissão negada
e imagem incompatível com as regras da aplicação.

Manteria testes adicionais em dispositivo real para verificar
abertura da câmera, permissões e retorno ao aplicativo.

Substituir o resultado da captura não comprova o funcionamento
da câmera física.

### Notificações push

Nos testes determinísticos, injetaria payloads no componente
responsável por tratar notificações.

Verificaria:

- Conteúdo apresentado.
- Navegação ao tocar na notificação.
- Identificadores e dados obrigatórios.
- Notificações duplicadas ou malformadas.
- Comportamento conforme o estado da aplicação.

Complementaria com testes de integração usando os serviços
de push em ambiente de homologação e dispositivos compatíveis.

Esses testes verificariam registro do dispositivo, permissões
e entrega com o aplicativo em primeiro plano, em segundo plano
e encerrado, respeitando as diferenças de cada plataforma.

A injeção de um payload no aplicativo não comprova sua entrega
pelos serviços externos de push.

## 4.1.c) Como reutilizar testes entre Android e iOS?

Separaria a implementação em três camadas:

1. Cenários de negócio compartilhados.
2. Screen Objects com ações e verificações da interface.
3. Adaptadores para operações específicas de cada plataforma.

Os cenários expressariam intenções, como realizar login,
criar um registro offline e sincronizar alterações.

Os Screen Objects encapsulariam seletores e interações.
Priorizaria identificadores estáveis de acessibilidade
acordados com a equipe de desenvolvimento.

Os adaptadores tratariam diferenças como permissões,
navegação do sistema e configuração da localização.

Os dados e resultados esperados seriam compartilhados
quando a regra de negócio fosse a mesma.

Evitaria espalhar condicionais de plataforma pelos testes.
Também não forçaria reutilização quando o comportamento
esperado fosse diferente entre Android e iOS.

## 4.1.d) Como seria o ambiente local e de CI/CD?

### Ambiente local

Prepararia:

- Versões compatíveis e documentadas do runtime, Appium e drivers.
- Android SDK, emulador ou dispositivo Android.
- Ambiente macOS com Xcode para automação iOS local.
- Aplicativos compilados para os dispositivos de destino.
- Configuração de assinatura e provisionamento quando necessária.
- Ambiente de dados e serviços controlados.
- Comandos documentados para execução e diagnóstico.

A configuração Android e iOS seria separada, preservando
os cenários comuns.

### CI/CD

Criaria jobs independentes para Android e iOS, utilizando
runners ou uma plataforma de dispositivos compatível.

O pipeline:

1. Obteria a versão do aplicativo a ser testada.
2. Prepararia dependências e dispositivos.
3. Aguardaria a disponibilidade do ambiente.
4. Restauraria o estado inicial e os dados de teste.
5. Executaria os cenários.
6. Publicaria resultados e evidências.
7. Encerraria os recursos utilizados.

Credenciais e certificados seriam fornecidos por mecanismos
de secrets, sem inclusão no repositório.

Nos pull requests, priorizaria uma suíte curta de fluxos críticos.
Uma matriz mais ampla de dispositivos e versões seria executada
periodicamente e antes das liberações.

Coletaria logs do aplicativo e da automação, screenshots e,
quando útil, vídeo. Retentativas seriam limitadas e não
substituiriam a investigação de instabilidade.

## 4.1.e) Como validar offline e sincronização sem backend real?

Utilizaria o aplicativo com seu armazenamento local real,
conectado a um servidor de teste com respostas controladas
e estado reinicializável.

O servidor simularia aceitação, rejeição, conflito, demora
e indisponibilidade. Também registraria as requisições
recebidas para permitir validar quantidade e conteúdo.

Um cenário principal seria:

1. Preparar dados conhecidos e sincronizar o estado inicial.
2. Interromper a comunicação com o servidor de teste.
3. Criar ou alterar um registro no aplicativo.
4. Validar a indicação de alteração pendente.
5. Reiniciar o aplicativo e conferir a persistência local.
6. Restaurar a comunicação.
7. Aguardar a sincronização com prazo máximo.
8. Conferir o payload recebido pelo servidor.
9. Validar o estado final e a ausência de pendências indevidas.

Também cobriria:

- Falha temporária seguida de recuperação.
- Repetição do envio sem duplicação do efeito.
- Conflito entre versões local e remota.
- Ordem de operações dependentes.
- Exclusões pendentes.
- Perda de conexão durante a sincronização.
- Expiração de autenticação antes do envio.
- Erro permanente que exige ação do usuário.

Para conflitos, definiria previamente a política do produto:
prioridade de uma versão, combinação de alterações ou
resolução pelo usuário.

Uma resposta HTTP de erro não equivale a ausência de rede.
Por isso, distinguiria falhas do servidor de interrupções
de transporte e de mudanças reais na conectividade do dispositivo.

A sincronização seria verificada tanto no estado exibido pelo
aplicativo quanto no histórico de operações do servidor de teste.

Esses testes comprovam o comportamento perante o contrato
simulado. Uma suíte menor de integração com o backend real
continuaria necessária para detectar divergências desse contrato.