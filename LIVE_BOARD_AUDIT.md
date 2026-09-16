# Auditoria e correção Live/Board — 15/09/2026

## Retomada auditada — 16/09/2026

Antes desta retomada, o commit `0a55df2` já continha a fila serial por turma, revisão/sequência monotônicas, cancelamento de callbacks antigos no handoff, follow mode, scroll vertical da Board expandida, seletor único na toolbar e atualização do Firebase. A tentativa interrompida posterior deixou seis arquivos modificados e o novo `boardSyncTrace.ts`: instrumentação opt-in, persistência durante IME, observação de mudanças de layout, Fullscreen/Orientation API, fixture com leitura direta do backend e close/reopen. Não havia mudança em Grammar Focus nem na resolução de identidade.

A causa específica restante de DELETE → INSERT era o guard de composição no cliente. DELETE era emitido fora da composição e persistia. O INSERT de teclado virtual/IME ocorria com `composingRef.current === true`; `onDocInput`, `queueBoardView` e `applyAuthoritativeView` retornavam sem publicar documento, seleção ou scroll. `blur`/`compositionend`, disparados ao fechar a Board, finalmente sanitizavam e publicavam o DOM. Portanto o INSERT do relato ficava no cliente até o fechamento; o professor não descartava um snapshot desse INSERT, porque ele ainda não existia no backend. Não foi encontrado `pending`, `isSaving`, revision, mutationSeq ou controlEpoch preso. A fila de commit e o debounce de 150 ms funcionavam; o bloqueio acontecia antes de criar/agendar a mutação.

Na reprodução instrumentada corrigida, um INSERT `漢` durante composição ainda aberta chegou ao backend antes de fechar (`workspaceRevision=2`, `workspaceMutationSeq=4`) e apareceu no DOM do professor. Isso elimina a dependência de close/reopen. O cleanup mantém um flush defensivo somente se ainda houver buffer válido, revalidado pela autoridade da transação, mas não foi necessário para essa reprodução.

O scroll expandido usa o mesmo `overflowRef` e o mesmo ratio lógico do modo normal. O problema remanescente era mudança do range de scroll ao expandir/abrir teclado/alterar toolbar sem republicar/reaplicar o viewport; um `ResizeObserver` agora recalcula o ratio do controlador ou reaplica o ratio no observador. A seleção remota continua em overlay e nunca move o caret nativo do observador; o overlay é recalculado em scroll de ancestrais e resize. Coordenadas não somam `root.scrollTop`, evitando dupla contagem no editor internamente rolável de Slides.

No mobile, a chamada de Fullscreen ocorre diretamente no gesto antes da escrita assíncrona de apresentação, seguida de tentativa de `screen.orientation.lock('landscape')`. A Board editável não usa mais rotação CSS, pois CSS não gira o teclado do sistema. Quando lock não existe ou é rejeitado, é exibida orientação para girar o aparelho e o layout acompanha `window`/`visualViewport`. A rotação CSS já existente de Slides em apresentação foi preservada.

A página `Line 1: document for logical scroll testing.` é criada por `scripts/board-control.browser.mjs`. Não era um teste Playwright nem continha `waitForFunction`: `npm run test:board-control-browser` iniciava um servidor HTTP manual e, por desenho, nunca encerrava. O harness não deixou alteração dinâmica no produto; a alteração parcial estava somente nos arquivos Git listados. O comando de teste agora executa apenas build finito; o servidor manual passou para `npm run dev:board-control-browser` e declara no log que permanece ativo até Ctrl+C.

Validação desta retomada:

- `npm run test:board-control-browser`: passou e encerrou normalmente.
- `npm run test:board-control`: passou modelos, seleção, formatação, revisão, IME e assertions de UI.
- `npm run test:board-control-integration`: passou corrida de aquisição, revoke, reconnect, epochs antigos, view, apresentação, followers, offline guard e commits concorrentes. Os `PERMISSION_DENIED` exibidos são casos negativos deliberados do teste.
- `npm run test:grammar-focus`: passou integralmente.
- `npm run build`: passou.
- Navegador local com professor e aluno independentes: INSERT em composição chegou ao backend e ao professor antes de close; scroll lógico normal aluno→professor passou; scroll expandido aluno→professor e professor→aluno passou; seleção remota permaneceu visível nos dois sentidos com expansão.
- Grammar Focus, resolução de nomes, seletor único após a pasta azul e fluxo de identidade não foram modificados nesta retomada.

Riscos restantes: orientação/teclado precisam de confirmação em aparelhos físicos reais, pois o navegador/SO pode negar orientation lock; Fullscreen do aluno observador ainda exige o gesto local indicado pelo botão quando a política do navegador proíbe fullscreen programático. A aceitação completa de latência em 5/15/30 segundos e em backend de produção continua sendo teste físico, não coberto pelos emuladores. Não houve deploy, commit ou push.

Correções implementadas, sem deploy e sem commit. Grammar Focus e resolução de identidade/nome não tiveram alterações de código. Os testes usam a WorkspaceCanvas real, dois clientes de navegador com autenticações Firebase independentes e emuladores Auth/Firestore. Isso verifica publicação, recebimento e aplicação no DOM remoto; não constitui aceitação em dois dispositivos físicos no backend de produção.

## Causas encontradas

| Problema | Evidência e causa | Correção |
|---|---|---|
| Conteúdo fica intermediário | Reproduzido: aluno terminou `Ub handoff3 bl`, professor permaneceu em `Ub handof bl`. Logs mostraram flush e tentativa de publicação, seguida de `permission-denied`. Transações concorrentes calculavam a mesma revision+1; a regra rejeitava uma delas, sem retry de conflito. | Fila por turma para commits de documento/estrutura/item; documento mantém o HTML mais recente enquanto existe commit em andamento. |
| Edição só volta após blur | Timers cancelados continuavam com ref não nula em operações de página/importação, bloqueando novo agendamento. | Cancelar e zerar refs; limpar buffers após capturar estado estrutural. |
| Listener deixa de atualizar | Firebase 12.9.0 reproduziu INTERNAL ASSERTION ca9/b815, interrompendo listeners. O listener também era recriado a cada docHtml. | Assinatura estável e Firebase fixado em 12.13.0, que contém Firestore 4.14.1 com a correção oficial. |
| Formatação remota não acompanha | Formatação já estava no HTML compartilhado, sujeito aos mesmos erros de publicação e listener. Callback atrasado podia executar após handoff. | Mantido o mesmo canal HTML; callbacks verificam controle/epoch. Toolbar de formatação disponível para aluno controlador. |
| Página/superfície incoerente | Escritas estruturais concorriam com HTML pendente e sequência podia ser reiniciada ao registrar novamente o mesmo writer. | Mesma fila, buffers estruturais limpos e sequência preservada para o mesmo UID. |
| Scroll normal | Professor observador tinha exceção para viewport independente. Aplicar seleção nativa remota podia reposicionar documento/scroll. | Todo não controlador acompanha; seleção remota usa overlay, sem restaurar caret nativo do observador. |
| Roda na Board expandida | Contêiner de texto expandido usava overflow-hidden. | overflow-y-auto/min-h-0 para texto, preservando scroll interno dos slides. |
| Handoff lento/estado antigo | Listener capturava epoch antigo; callbacks/timers pendentes e renovação do documento de controle a cada 900 ms geravam disputa com transações. | Epoch atual via ref; cancelamento/limpeza de timers; sem renovação periódica redundante na arquitetura de controle dirigido. Aquisição inicial/rebind continuam. |
| Seletor cobre logo | Label/select fixos no topo. | Mesmo JSX, valor, opções e onSwitchClass passados por contexto à toolbar, após pasta azul; altura 7, largura limitada, sem duplicação. |

Correção upstream do SDK: [Firebase PR 9842](https://github.com/firebase/firebase-js-sdk/pull/9842). A atualização é necessária porque uma assertion fatal do SDK não pode ser corrigida apenas com guards da aplicação. O lock atualiza a família Firebase e sua dependência grpc; não houve atualização geral de bibliotecas.

Não foi reproduzida uma espera cronometrada de cinco minutos. Foram reproduzidas causas capazes de deixar o observador indefinidamente no estado intermediário até outra publicação/reconexão. Não se atribui o relato inteiro a simples latência.

## Canais e guards

Todos os caminhos ativos auditados usam Firestore, sem RTDB na WorkspaceCanvas:

- `liveClasses/{classId}/shared/workspace`: HTML com formatação, itens, páginas e superfície; docContent/pages/boardState/slidesState atualizados atomicamente.
- `shared/boardControl`: controlador, clientId, epoch e aquisição dirigida.
- `shared/boardView`: scroll e seleção serializada; scroll separado de página.
- `shared/boardPresentation`: expansão, com autoridade própria do professor.
- Presence e resolução de nomes permanecem separadas e intactas.

Isso explica por que expansão podia chegar enquanto documento falhava: documentos/listeners e regras diferentes. Expansão não dependia dos commits concorrentes de workspace.

Mantidos guards de userId, clientId, controlEpoch, workspaceRevision e workspaceMutationSeq, com revalidação no commit. Self-echo compara epoch atual, origem e revisão. Stamp do HTML é emitido no flush, depois de validar a geração capturada, evitando sequência ultrapassada por escrita de item. Ao perder controle, cancelam-se timers de documento, itens, item único, scroll e seleção, zerando refs/buffers; callbacks de formatação verificam epoch. Controles de apresentação e seletor marcados como UI de controle para continuarem acessíveis ao professor observador.

Debounce de workspace continua em 150 ms; view mantém throttle de 40 ms com coalescimento. Não foram aumentados delays. HTML pendente conserva apenas o valor mais recente durante um commit. Proteção local de digitação não adia aplicação no observador. A fila cobre documento e item e segue após uma falha anterior, mas não libera escrita sem autoridade. Não houve alteração do caminho Excalidraw alternativo, fora desta WorkspaceCanvas.

Logs `BOARD_WORKSPACE_SYNC` em JSON distinguem buffer/flush/save/commit, erro, recebimento, aplicação/ignore, fingerprint, revisão, sequência, autor e geração; commits incluem elapsedMs e transactionAttempts. Permanecem para diagnóstico, sem conteúdo integral do documento.

## Aceitação A–H

| Teste | Resultado observado |
|---|---|
| A — aluno | 10 mutações consecutivas alternando apagar/digitar; cada resultado esperado confirmado no DOM do professor antes da próxima mutação. 156–201 ms; nenhuma perda observada. |
| B — professor | 10 mutações consecutivas; DOM remoto confirmado a cada etapa, 170–202 ms. |
| C — formato | Ambos controladores: 28→40 e bold/italic/underline on/off, 16 resultados remotos confirmados. HTML final idêntico nos dois clientes. |
| D — normal | Top/bottom nas duas direções; posições lógicas 0/1 confirmadas remotamente. |
| E — expandida | Roda real do navegador moveu documento com aluno e professor controlando; observador acompanhou. Leituras imediatas podem anteceder propagação; comparar após recebimento, com tolerância de arredondamento do scroll. Não testado touchpad físico. |
| F — página | Professor abriu Page 2 e aluno viu Second page; aluno abriu Page 1 e professor recebeu seu conteúdo. Integração também cobre superfície/página. |
| G — handoff | Cinco etapas alternadas com edição após cada uma, todas recebidas; tempos totais 599–974 ms, incluindo digitação. Integração cobre epoch antigo, disputa de aquisição, revogação, reconnect e offline. |
| H — seletor | Toolbar após pasta azul, uma instância normal/expandida, alinhamento e inspeção responsiva. Fixture confirmou mudança de opção/callback; a troca real de turma com backend de produção não foi executada. O handler original foi preservado. |

Depois de conteúdo/página/scroll, seleção remota inspecionada: overlay visível e seleção nativa do professor observador permaneceu vazia com offsets 0/0 antes/depois da seleção do aluno.

Reprodução: em `apps/main`, executar `npm run test:board-control` e `npm run test:board-control-integration` (ver scripts de package.json para emuladores). Para inspeção visual executar `npm run test:board-control-browser` (fixture `scripts/board-control.fixture.tsx`), abrir `?role=teacher&selector=1` e `?role=joao` em clientes separados. Usar controles reais de ownership/toolbar/páginas e Select gap para selecionar a palavra de teste. Testar A–H na ordem acima, verificando o outro DOM a cada mutação. Bottom/Top exercitam scroll normal; E usa roda real. Emuladores e abas temporárias foram encerrados ao terminar.

## Verificação e riscos

- `test:board-control`: passou modelos, seleção, formatação, revisão e UI.
- Integração: passou; nova regressão de 10 commits concorrentes avançou revisão 10→20, com último HTML confirmado por outro cliente SDK.
- `test:grammar-focus`: passou todos os grupos após atualização do SDK.
- `npm run build`: passou com SDK final.
- `git diff --check`: passou.
- `npm run lint`/tsc: falhou com erros existentes: courseId em battleQuestionHistoryService; repairBattleTextEncoding em BattleSetupModal; comparação content/student e tipos de eventos de páginas em WorkspaceCanvas; map de GrammarGuideEntry em UI; ExerciseInput nos workbooks 5/6/7 e CorrectionItem em workbook6. Não corrigidos por serem fora do escopo.

Risco residual: confirmar A–H em dois dispositivos físicos e rede/backend de produção; confirmar troca real da turma. A atualização Firebase é compartilhada com outros módulos, embora Grammar Focus tenha passado e identidade não tenha sido modificada. Testes locais não estabelecem garantia contra latência/reconexão de produção. Não declarar a aceitação física concluída.

## Arquivos e Git

Arquivos alterados: package.json/package-lock.json; board-control.fixture.tsx; board-control.integration.ts; LiveClassRoomPage.tsx; WorkspaceCanvas.tsx; useBoardControl.ts; boardControlService.ts; workspaceService.ts. Novo BoardClassSelectorContext.ts e este relatório.

`git diff --stat` (arquivos rastreados; novos arquivos ainda untracked não entram):

```text
 apps/main/package-lock.json                        | 551 +++++++++++----------
 apps/main/package.json                             |   2 +-
 apps/main/scripts/board-control.fixture.tsx         |  12 +-
 apps/main/scripts/board-control.integration.ts      |   8 +
 .../components/LiveClasses/LiveClassRoomPage.tsx     |  10 +-
 .../LiveClasses/Workspace/WorkspaceCanvas.tsx       | 110 ++--
 .../LiveClasses/Workspace/useBoardControl.ts        |   7 +-
 apps/main/src/services/boardControlService.ts       |  34 +-
 apps/main/src/services/workspaceService.ts          |  13 +-
 9 files changed, 423 insertions(+), 324 deletions(-)
```

`git status -sb`:

```text
## main...origin/main
 M apps/main/package-lock.json
 M apps/main/package.json
 M apps/main/scripts/board-control.fixture.tsx
 M apps/main/scripts/board-control.integration.ts
 M apps/main/src/components/LiveClasses/LiveClassRoomPage.tsx
 M apps/main/src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx
 M apps/main/src/components/LiveClasses/Workspace/useBoardControl.ts
 M apps/main/src/services/boardControlService.ts
 M apps/main/src/services/workspaceService.ts
?? LIVE_BOARD_AUDIT.md
?? apps/main/src/components/LiveClasses/Workspace/BoardClassSelectorContext.ts
```

