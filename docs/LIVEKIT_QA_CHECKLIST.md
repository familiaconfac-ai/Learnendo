# LiveKit e Board — checklist de homologação manual

## Objetivo

Validar em ambiente real uma Live Class com um professor e dois alunos, cobrindo mídia sob demanda, controle exclusivo por aba, Google Meet, Board, reconexão e cleanup. O teste deve confirmar tanto a experiência visível quanto o encerramento correto das conexões LiveKit.

## Participantes e dispositivos

- [ ] Professor autenticado em um desktop, usando a conta real de professor da turma.
- [ ] Aluno A autenticado em um celular real.
- [ ] Aluno B autenticado em outro celular, tablet ou desktop.
- [ ] Os dois alunos estão atribuídos à mesma turma do professor.
- [ ] Usar navegadores atualizados; registrar navegador, versão, sistema operacional e tipo de rede de cada dispositivo.
- [ ] Deixar o console do navegador aberto no desktop do professor para registrar erros.
- [ ] Confirmar que nenhum dispositivo está com outra Live Class ou teste LiveKit aberto antes de começar.

### Registro do ambiente

| Papel | Dispositivo | Navegador/versão | Sistema | Rede | Conta/UID de teste |
|---|---|---|---|---|---|
| Professor | Desktop |  |  |  |  |
| Aluno A | Celular |  |  |  |  |
| Aluno B |  |  |  |  |  |

## 1. Entrada sem mídia

- [ ] Entrar na Live Class nos três dispositivos com microfone e câmera desligados.
- [ ] Confirmar que Board, Trail, exercícios e Battle podem abrir sem iniciar mídia automaticamente.
- [ ] Confirmar que não aparece solicitação inesperada de microfone/câmera.
- [ ] Confirmar, pela telemetria/logs disponíveis, que ninguém conecta ao LiveKit antes da primeira ativação de mídia.
- [ ] Trocar entre Board, Trail e Battle e confirmar que a tela atual não determina a conexão LiveKit.

Critério de aprovação: os recursos pedagógicos funcionam sem mídia e não consomem uma conexão LiveKit antes de um usuário solicitar áudio, câmera ou compartilhamento.

## 2. Mídia LiveKit

### Microfone do professor

- [ ] Professor liga o microfone.
- [ ] Confirmar a sequência visual `connecting` → `active` sem cliques repetidos.
- [ ] Alunos A e B recebem o áudio do professor.
- [ ] Confirmar ausência de eco, participantes duplicados ou áudio tocando duas vezes.
- [ ] Manter o microfone ligado e navegar por Board, Trail, exercícios e Battle.
- [ ] Confirmar que o áudio continua ativo durante todas essas transições.

### Áudio e autoplay no celular

- [ ] No Aluno A, testar a primeira recepção de áudio sem interação adicional.
- [ ] Se o navegador bloquear autoplay, confirmar que a interface apresenta uma ação clara para liberar o áudio.
- [ ] Após uma interação do usuário, confirmar que o áudio passa a tocar e continua nas mudanças internas de tela.
- [ ] Bloquear e desbloquear a tela do celular e confirmar o comportamento ao retornar.
- [ ] Alternar o aplicativo para segundo plano e voltar, registrando se houve reconexão ou necessidade de nova interação.

### Câmera e compartilhamento

- [ ] Professor liga e desliga a câmera; ambos os alunos recebem e removem a imagem corretamente.
- [ ] Professor inicia e encerra o compartilhamento de tela.
- [ ] Confirmar que desligar somente uma mídia não desconecta a sala enquanto outra track continuar ativa.
- [ ] Testar microfone de um aluno, se essa função estiver habilitada, e confirmar atualização do estado agregado de mídia.

## 3. Grace period de dez segundos

- [ ] Com todos conectados, desligar a última mídia ativa.
- [ ] Reativar uma mídia antes de dez segundos e confirmar que a desconexão é cancelada.
- [ ] Desligar novamente toda a mídia e aguardar mais de dez segundos.
- [ ] Confirmar que professor e alunos desconectam do LiveKit após o período de tolerância.
- [ ] Confirmar que Board, Trail, exercícios e Battle continuam funcionando após a desconexão de mídia.
- [ ] Ligar o microfone novamente e confirmar uma nova conexão limpa, sem participante antigo ou duplicado.

Critério de aprovação: nenhuma conexão fica ativa quando toda a mídia permanece desligada por mais de dez segundos, e uma reativação dentro do período cancela o cleanup.

## 4. Restrição de múltiplas abas

- [ ] Com a mídia ativa, abrir a mesma Live Class em uma segunda aba com a conta do professor.
- [ ] Confirmar que a segunda aba não começa a publicar mídia silenciosamente.
- [ ] Confirmar a mensagem de que áudio/vídeo já está ativo em outra aba.
- [ ] Acionar “Usar nesta aba” ou a ação equivalente.
- [ ] Confirmar que a propriedade da mídia passa para a nova aba e a anterior desconecta/para de publicar.
- [ ] Repetir o cenário com um aluno.
- [ ] Fechar a aba proprietária e confirmar que o lease expira ou é liberado sem deixar participante órfão.
- [ ] Confirmar que não há alternância contínua entre abas nem duas identidades simultâneas do mesmo usuário.

## 5. Exclusividade Google Meet × LiveKit

- [ ] Com LiveKit ativo, selecionar Google Meet como transporte da aula.
- [ ] Confirmar que microfone, câmera e compartilhamento internos são desligados.
- [ ] Confirmar que professor e alunos desconectam do LiveKit.
- [ ] Confirmar que Board, Trail, Battle e exercícios continuam disponíveis.
- [ ] Confirmar que abrir ou manter o Meet não provoca reconexão automática ao LiveKit.
- [ ] Voltar explicitamente para a mídia interna e confirmar que a conexão LiveKit só começa após ativar uma track.

Critério de aprovação: Meet e LiveKit não permanecem ativos simultaneamente por ação automática do aplicativo.

## 6. Board — controle e sincronização

### Controle dirigido

- [ ] Professor libera a Board para o Aluno A.
- [ ] Aluno A adquire o controle e consegue editar.
- [ ] Aluno B permanece em modo de acompanhamento e não consegue escrever sem controle.
- [ ] Professor retoma o controle.
- [ ] Professor transfere o controle para o Aluno B.
- [ ] Confirmar que o nome exibido do controlador corresponde à conta correta.
- [ ] Confirmar que nenhuma escrita atrasada do controlador anterior reaparece após a troca.

### Sincronização bidirecional

- [ ] Professor digita texto; os dois alunos recebem na ordem correta.
- [ ] Aluno controlador digita texto; professor e outro aluno recebem na ordem correta.
- [ ] Testar digitação rápida, acentos, composição de teclado/IME, Enter, apagar e colar texto.
- [ ] Alterar somente parte de um texto e confirmar que o restante não é sobrescrito.
- [ ] Aplicar negrito, cor ou tamanho a uma seleção parcial e confirmar que apenas a seleção muda.
- [ ] Confirmar que a seleção remota aparece como overlay sem mover o cursor local do observador.
- [ ] Testar criação, movimentação, duplicação e exclusão de item/slide.
- [ ] Confirmar que duplicar ou editar um slide não altera outro slide.
- [ ] Trocar de página e confirmar que conteúdo, página ativa e posição permanecem sincronizados.

### Scroll, fullscreen e celular

- [ ] Professor rola a Board; alunos acompanham a mesma região lógica.
- [ ] Aluno controlador rola; professor e outro aluno acompanham.
- [ ] Abrir a Board em fullscreen no celular.
- [ ] Confirmar encaixe horizontal, rolagem vertical e ausência de conteúdo inacessível.
- [ ] Girar o celular entre retrato e paisagem e confirmar que a Board se recompõe corretamente.
- [ ] Sair do fullscreen e confirmar que o estado compartilhado não é perdido.

## 7. Reload e restauração

- [ ] Com professor controlando a Board, pressionar F5 no desktop.
- [ ] Confirmar que a sessão, página ativa, conteúdo e modo da Board são restaurados.
- [ ] Confirmar que o professor não volta conectado ao LiveKit se nenhuma mídia estiver ativa.
- [ ] Repetir o F5 com o microfone ativo e registrar se a reconexão exige ação explícita ou segue a política definida.
- [ ] Recarregar o Aluno A enquanto ele controla a Board.
- [ ] Confirmar que o lease antigo não permite duas instâncias escritoras.
- [ ] Confirmar que o aluno consegue readquirir controle somente pelo fluxo permitido.
- [ ] Recarregar o Aluno B observador e confirmar que ele retorna sem adquirir controle indevidamente.

## 8. Queda de internet e reconexão

Executar primeiro no Aluno A e depois no professor.

- [ ] Com mídia e Board ativas, desligar a rede por menos de dez segundos e religar.
- [ ] Confirmar indicação clara de reconexão e ausência de conteúdo duplicado.
- [ ] Confirmar retorno do áudio e do estado correto da Board.
- [ ] Repetir com queda superior a dez segundos.
- [ ] Confirmar expiração/cleanup de mídia e ausência de participante órfão.
- [ ] Após restabelecer a rede, confirmar que a Board recupera o estado autoritativo mais recente.
- [ ] Confirmar que mídia interna não é republicada sem intenção do usuário quando a política exigir ação explícita.
- [ ] Verificar que ações realizadas offline não sobrescrevem conteúdo mais novo de outro controlador.

## 9. Saída e cleanup final

- [ ] Professor encerra a mídia e sai pelo botão normal.
- [ ] Confirmar desconexão imediata, sem esperar o grace period quando a saída for explícita.
- [ ] Repetir usando Voltar do navegador.
- [ ] Fechar abruptamente a aba do professor e confirmar remoção do participante após a tolerância esperada.
- [ ] Fazer o mesmo com um aluno.
- [ ] Confirmar que nenhum usuário continua listado/conectado depois do encerramento.
- [ ] Confirmar ausência de áudio, câmera ou captura de tela ativa no sistema operacional.
- [ ] Aguardar pelo menos 30 segundos e confirmar que não ocorre reconexão espontânea.

## 10. Evidências e resultado

Para cada falha, registrar:

- horário e fuso;
- turma e papel afetado;
- dispositivo, navegador e rede;
- passos exatos para reproduzir;
- resultado esperado e observado;
- screenshot ou gravação curta;
- mensagens relevantes do console, sem tokens ou dados sensíveis;
- se o problema desapareceu após reload ou reconexão.

| Cenário | Resultado | Evidência/observação |
|---|---|---|
| Entrada sem mídia | ☐ Passou ☐ Falhou |  |
| Microfone/áudio/autoplay | ☐ Passou ☐ Falhou |  |
| Câmera/screen share | ☐ Passou ☐ Falhou |  |
| Grace period | ☐ Passou ☐ Falhou |  |
| Múltiplas abas | ☐ Passou ☐ Falhou |  |
| Meet × LiveKit | ☐ Passou ☐ Falhou |  |
| Troca de controlador | ☐ Passou ☐ Falhou |  |
| Sincronização da Board | ☐ Passou ☐ Falhou |  |
| Fullscreen mobile | ☐ Passou ☐ Falhou |  |
| Reload | ☐ Passou ☐ Falhou |  |
| Queda e reconexão | ☐ Passou ☐ Falhou |  |
| Cleanup final | ☐ Passou ☐ Falhou |  |

## Critério de liberação

A homologação só é aprovada quando:

- nenhum participante duplicado ou conexão órfã for observado;
- o controle da Board nunca permitir dois escritores simultâneos;
- conteúdo e formatação não forem perdidos ou restaurados de forma obsoleta;
- áudio, autoplay e reconexão tiverem comportamento compreensível nos dispositivos testados;
- o grace period e todas as saídas executarem cleanup;
- Meet e LiveKit forem mutuamente exclusivos;
- não houver erro de permissão nas regras do Firestore para os três participantes autorizados;
- não houver acesso de escrita por usuário não autorizado.

Se houver perda de conteúdo, exposição entre turmas, dois controladores simultâneos, mídia órfã ou falha de autorização, interromper a homologação e registrar o cenário como bloqueador.
