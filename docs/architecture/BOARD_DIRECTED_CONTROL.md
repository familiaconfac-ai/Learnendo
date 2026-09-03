# Board — apresentação e interação dirigida

Implementação e validação local em 03/09/2026. Sem commit, push, deploy ou acesso a produção. Esta tarefa não inicia a Fase 3.

## 1. Causa do problema anterior

A Workspace aceitava publicação de Selection e scroll por professor e alunos. A posição coletiva era escolhida pelo timestamp mais recente em `participantScroll`. O Range remoto era desenhado como decoração, sem restaurar a Selection nativa do editor que receberia a interação. A permissão geral `studentEditingEnabled` e exceções de ownership permitiam concorrência sem uma autoridade única. As Rules também permitiam atualizar `shared/workspace` a qualquer usuário autenticado quando a turma existia.

## 2. Modelo final

Cada turma tem uma designação persistente e uma única geração de controle (`epoch`). O controlador é identificado por UID **e** identificador da instância do editor (`controllerClientId`). Professor/admin autorizado pode interromper qualquer geração. Somente o aluno designado pode adquirir controle de aluno, após a liberação ou expiração da prioridade do professor. Os demais alunos acompanham.

## 3. Designação versus prioridade

O seletor compacto Alunos / Students / Alumnos usa o roster real recebido pela Workspace, preserva o indicador de presença e oferece Professor / Teacher / Profesor. Uma intervenção não limpa `designatedStudentId`.

Pointerdown, seleção por arraste, teclado, formatação, página e scroll intencional iniciam/renovam a prioridade do professor. Mousemove sem botão pressionado não publica estado. A renovação é limitada a uma por 900 ms; o professor libera depois de 2.2 s sem interação. Se a aba desaparecer antes da liberação, a lease expira em 5 s, usando timestamp do servidor nas Rules. Composição IME do professor mantém a lease viva até terminar.

Os controles de página continuam disponíveis ao professor durante a delegação. Um clique de comando pode aguardar a aquisição confirmada e executar a ação no DOM atual. A alteração de conteúdo só é permitida depois dessa confirmação; a latência da rede faz parte da aquisição, não há escrita otimista concorrente autorizada.

## 4. Estado persistido

| Documento em `liveClasses/{classId}/shared` | Responsabilidade |
| --- | --- |
| `boardControl` | `designatedStudentId`, `controllerId`, `controllerClientId`, `epoch`, `teacherLeaseAt`, `updatedAt`, `view` congelada na passagem de controle |
| `boardView` | Estado visual atual: mesma geração/controlador, `view` com surface, página, ratio e Range/fingerprint, `updatedAt` |
| `workspace` | HTML, itens, páginas, superfícies Board/Slides, apresentação; cada gravação inclui `controlEpoch` e `controlClientId` |

Separar `boardView` evita que scroll/caret modifiquem o documento de conteúdo ou obriguem suas transações a disputar a mesma gravação de autoridade. O consumidor só aceita a view da geração corrente; durante a troca utiliza a cópia congelada em `boardControl.view`.

## 5. Autorização

Somente o professor da turma ou admin, segundo `isTeacherForClass`, pode designar. O UID designado precisa pertencer à turma; o roster histórico por e-mail continua aceito. Alunos não podem se autodesignar nem designar outra pessoa.

Conteúdo e estado visual precisam corresponder a UID, cliente e geração atuais. O aluno precisa ainda ser o designado e a lease docente estar livre. Rules rejeitam followers, gerações antigas, cliente incorreto e payload visual inválido. Escritas de conteúdo revalidam a autoridade em transação. Não existe fallback de erro que grave o documento inteiro ignorando essa validação.

Ownership, permissão de editar uma caixa, designação e estado visual continuam conceitos distintos. Ownership/nomes/atribuições de caixas foram preservados. Uma caixa de outro proprietário não se torna editável só por designação. Locks transitórios não superam o controle dirigido quando o participante já tem permissão sobre a caixa.

## 6. Caret e Selection

O Range mantém a representação por DOM path + offset de `SerializedSelectionRange`. Seguidores recebem `Selection.removeAllRanges()/addRange()` reais. A aplicação exige surface, página e fingerprint do HTML compatíveis; é tentada novamente quando o conteúdo correspondente chega. Isso evita aplicar offsets de uma versão do texto sobre outra.

Não se rouba foco de inputs/selects externos ao editor nem se substitui uma composição IME em andamento. A mudança remota não é publicada como evento local. Na passagem ao aluno, a Selection já está pronta para substituir a lacuna. Documentos e caixas usam suas próprias raízes de Range.

## 7. Scroll e página

Scroll usa `scrollTop / (scrollHeight - clientHeight)`, com limites, aplicado à área rolável da surface corrente. A altura útil é recalculada no follower e após resize. O aluno designado pode conduzir o scroll, e o professor passa a acompanhar até intervir. Não se consulta mais o participante com scroll mais recente.

As mesmas credenciais protegem `currentPageId`, transições Board/Slides e apresentação. Followers não podem ativar outra página ou publicar posição coletiva. O estado remoto de conteúdo continua determinando a página/surface persistida; a view só é aplicada nessa página.

## 8. Mobile

Validado no navegador com Workspace do professor ampla e aluno de 390 px, com áreas úteis diferentes. No documento longo, o fim correspondeu a ratio 1 em ambos: professor com área de 513 px/documento de 2082 px (`scrollTop=1569`), aluno com área de 383 px/documento de 4032 px (`scrollTop=3649`). João voltou ao topo e o professor acompanhou ratio 0. Esses números pertencem à medição anterior à fixação visual da barra de páginas; o protocolo usa as dimensões reais a cada aplicação.

É validação de layout estreito em Chromium, não execução em aparelho físico ou Safari/iOS.

## 9. Aluno errado

Maria/Pedro/Ana recebem documento não editável. Captura de pointer, click, teclado, beforeinput, wheel e touch impede que suas ações se tornem interação autoritativa. Scroll local indevido é corrigido pela view corrente. Rules constituem a proteção adicional contra chamadas diretas, independentemente da interface.

## 10. Desconexão e refresh

Snapshot vindo apenas de cache e evento offline desarmam o aluno. Ao reconectar/atualizar, a designação permanece, mas ele precisa pressionar **Continuar deste ponto**. Isso evita retomar automaticamente a aula com cursor antigo. A nova instância usa outro `controllerClientId`; um cliente antigo não pode reutilizar sua geração.

O professor pode assumir mesmo quando o aluno designado está offline. A toolbar usa a presença já fornecida pela turma. Buffers locais são descartados ao perder controle; escritas já iniciadas carregam a geração anterior e não podem sobrescrever uma intervenção. Transações revalidam a geração, e o registro local de escritor bloqueia salvamento sem conexão confirmada. Não se usa a fila de `updateDoc` como fallback offline.

## 11. Anti-loop e performance

View: throttle trailing de 120 ms, comparação da assinatura e um único envio em voo, com coalescência para a última view pendente. Limite teórico de cerca de 8.3 publicações/s durante movimento contínuo; não é uma medição de carga em produção. Conteúdo mantém os throttles existentes de 150 ms. Autoridade só muda em aquisição/designação/liberação e renovação limitada da lease; não há polling periódico de estado React.

Guards: proprietário/geração/conexão, composição IME, aplicação remota de Range, supressão temporária de scroll programático, hash de HTML e página/surface. A sincronização visual não grava HTML. Pausas e mousemove incidental não renovam a autoridade. No harness estabilizado, 20 eventos pointermove sem botão mantiveram os contadores em Visual=5, Updates=7 e epoch=48. Undo de operações da Workspace é preservado durante handoff sem edição; uma alteração real de outro escritor invalida esse snapshot para não desfazer trabalho alheio. Undo/Redo de texto continuam nativos do editor.

## 12. Firestore Rules

**Alteradas e testadas no Emulator. Precisam ser publicadas antes do frontend.** Foram protegidos `workspace`, `boardControl` e `boardView`. Os demais documentos de Live/Trail/Battle não receberam nova política.

Compatibilidade: documentos antigos de conteúdo e awareness não são apagados. As maps antigas deixam de ser usadas como autoridade. Antes de existir `boardControl`, o professor mantém a compatibilidade de gravação antiga; após a inicialização, clientes antigos sem geração são bloqueados. Alunos antigos não mantêm o modo irrestrito de escrita.

Grammar → Board/Slides faz aquisição e append em uma transação, preservando a designação. Não mudou identidade curricular, assignment legado, dados de Grammar ou suas permissões.

## 13. Arquivos

Novos:

- `apps/main/src/models/boardControl.ts` e `boardControl.test.ts` — protocolo e testes de decisão.
- `apps/main/src/services/boardControlService.ts` — subscriptions, transações, capability local e gravação visual.
- `apps/main/src/components/LiveClasses/Workspace/useBoardControl.ts` — lifecycle, intenção, reconexão e coalescência.
- `apps/main/src/components/LiveClasses/Workspace/BoardControlToolbar.tsx` — seletor e indicadores EN/PT/ES.
- `apps/main/scripts/board-control.integration.ts` — serviços reais + Rules com quatro alunos.
- `apps/main/scripts/board-control.browser.mjs` e `board-control.fixture.tsx` — harness com Workspace real, cinco sessões e emuladores obrigatórios.
- Este relatório.

Alterados:

- `WorkspaceCanvas.tsx` — autoridade, Range nativo, scroll, IME, gates e passagem de comandos.
- `TeacherRoomView.tsx` — remoção do botão que habilitava edição irrestrita de todos os alunos.
- `workspaceService.ts` — credenciais de geração e transações sem fallback inseguro.
- `materialsService.ts` — captura da geração antes da leitura assíncrona do material.
- `grammarFocusWorkspace.ts` — aquisição atômica com o append de Grammar.
- `firestore.rules` — proteção dos três documentos.
- `scripts/workspace-selection-ui.test.mjs`, `scripts/language-phase1.integration.mjs`, `package.json` — regressões e comandos de execução.

## 14. Testes executados

| Cenário | Evidência |
| --- | --- |
| A — professor sozinho | Navegador: Range/caret, scroll, página 1/2 e Board/Slides; integração de serviços |
| B/D — João e lacuna | `Ub ----- bl` → Selection nativa `-----` em João → tecla J → `Ub J bl`, caret colapsado em offset 4; texto/caret acompanhados por professor e Maria |
| C — intervenção | Professor selecionou durante delegação; João ficou read-only, preservou designação e retomou depois da pausa, sem nova escolha no seletor |
| E/I — quatro alunos/segurança | Cinco sessões no navegador; Emulator rejeitou autoatribuição, publicação visual, escrita de conteúdo e takeover dos três followers; rejeitou escrita/visual de geração antiga após intervenção |
| F/G — scroll longo | Desktop → aluno estreito no fim e aluno → desktop no topo, com scrollHeight/clientHeight diferentes |
| H — reconexão | Refresh recuperou estado sem armar aluno; Offline/Online bloqueou edição e manteve designação/posição; retomada explícita pelo botão |
| J — formatação/IME | B/I/U reais produziram `<b><i><u>Q</u></i></b>`; testes de Range e estado mixed/uniform; composição parcial `漢` ficou local até compositionend, depois propagou |
| J — Undo/Redo | Ctrl+Z restaurou `Ub ----- bl`; Ctrl+Shift+Z refez `Ub J bl` no aluno designado |
| J — páginas/ownership | Serviços persistiram página/surface e `ownerUserId`; navegador alternou Board/Slides, criou slide e propagou Page 2 aos followers |
| J — Grammar/Live/Trail | Upgrade real legado → scoped + append Board/Slides EN/ES/PT passou; suites de Grammar, permissões, role mode, transição Live/Trail e smoke multilíngue passaram |
| Battle | Nenhum arquivo de Battle alterado; os erros de tipagem de Battle já existentes continuam identificados no lint |

Comandos executados com sucesso: `test:board-control`, `test:workspace-selection`, `test:grammar-focus`, `test:role-mode`, `test:live-trail-transition`, `test:language-smoke`; runner de `board-control.integration.ts` e `grammar-focus-upgrade.integration.tsx` contra Auth/Firestore locais no projeto `demo-learnendo-board-browser`.

Os testes de navegador usaram a Workspace real. Botões do harness posicionam Range e emitem scroll/composition para reproduzir cenários; a tecla de substituição e os comandos B/I/U/Undo/Redo usaram eventos do navegador. Não se trata de certificação de IME de sistema operacional ou de teclado móvel físico. Não foi simulado tráfego audiovisual LiveKit; a integração Live/Trail foi coberta pelas suites locais existentes.

Reprodução: em `apps/main`, com Java no PATH, `npm run test:board-control-integration`. Para o harness, `npm run test:board-control-browser` e abrir `http://127.0.0.1:4180/?role=teacher`, `joao`, `maria`, `pedro`, `ana` em abas separadas. O runner recusa projeto sem prefixo `demo-` ou sem hosts de emulador.

## 15. Build e lint

`npm run build`: passou (Vite + service worker PWA). Permanecem os avisos existentes de tamanho de chunk, import estático/dinâmico do Firestore e Browserslist.

`npm run lint`: não está verde; mantém os **14 erros preexistentes**, sem erros novos: Battle history 2, BattleSetupModal 3, WorkspaceCanvas 3 (comparação de boxRole e tipos de MouseEvent), UI 1 e dados dos Workbooks 5/6/7 somando 5. Não se alteraram Battle ou conteúdos curriculares para corrigir esse baseline fora do escopo.

## 16. Antes da publicação

Revisar o diff e coordenar atualização fora de aulas ativas: publicar Rules primeiro, frontend depois e recarregar as sessões antigas (incluindo atualização da PWA). Não precisa script de migração nem remoção de documentos existentes. `boardControl`/`boardView` são inicializados pelo fluxo autorizado da nova Board.

Após publicação autorizada, repetir o smoke com professor e aluno em aparelho real, incluindo seleção da lacuna, teclado/IME móvel, scroll nos dois sentidos e reconexão. As limitações de dispositivo estão registradas acima. Nenhuma dessas ações de publicação foi executada nesta tarefa.
