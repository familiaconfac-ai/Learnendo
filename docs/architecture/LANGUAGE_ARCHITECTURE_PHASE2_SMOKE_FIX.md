# Fase 2 — fechamento do smoke

Validado localmente em 2026-09-03. Sem commit, push ou deploy.

## Causas

### Interface parcialmente localizada

O runtime já resolvia baseLanguage/uiLanguage corretamente, mas consumidores ainda ignoravam o resultado:

- App tinha VIEW_MODE_LABELS e menu fixos em inglês.
- WorkbookView recebia uiLanguage, mas Grammar e os prefixos Lesson permaneciam literais.
- LessonView usava currentLanguage (target) para os labels dos exercícios e navigator.language para EL/HE.
- GrammarFocusModal usava activeLanguage tanto para o conteúdo quanto para os textos da interface.
- TeacherStage lia BASE_UI_LANGUAGE_STORAGE_KEY sem UID, em vez dos valores resolvidos da Fase 2.
- CoursesView ainda permitia EL/HE no texto de instrução. O painel do professor tinha cabeçalhos e abas fixos.

UiLanguageProvider distribui apenas os valores já resolvidos por App. Não resolve preferências, não lê armazenamento e não escreve perfil. O catálogo uiLabels contém EN/PT/ES; labels próprios de Grammar continuam em seus catálogos existentes, agora indexados por uiLanguage. O idioma inicial do conteúdo continua baseLanguage e o seletor manual permanece independente.

Prefixos estruturais (Workbook/Lesson e equivalentes PT/ES) são removidos somente no início do título para compor o label localizado. O restante do título curricular permanece intacto. Nenhuma tradução de workbook ou exercício foi criada.

### Grammar recortado pela Board/Live

Caminho real: TeacherRoomView → TeacherStage → LiveClassRoomShell.overlay → GrammarNavigatorModal → GrammarFocusModal. O segundo caminho LiveTrailExerciseOverlay também reutiliza o mesmo navigator/modal.

LiveClassRoomShell tem position:fixed, inset:0, overflow:hidden e z-index:auto. Esse elemento forma um contexto de empilhamento. O modal inline, mesmo com z-index:1001, permanecia dentro dele, abaixo do cabeçalho global de App com z-index:50. A abertura pelo Workbook ocorre fora desse contexto.

Reprodução com os componentes reais, CSS Tailwind/LiveKit instalado e cabeçalho global equivalente, em 1280×720:

| Medição | Workbook antes | Board antes | Ambos depois |
| --- | --- | --- | --- |
| Retângulo do dialog | x=120,5; y=28,8; 1024×662,4 | igual | igual |
| Elemento em x=640, y=45 | cabeçalho do Grammar | cabeçalho global de App | cabeçalho do Grammar |
| Pai do overlay depois | — | — | BODY |

Não foi encontrado transform/zoom no caminho reproduzido. A geometria já era igual: a parte superior estava encoberta por outra camada. A fonte medida também era igual; a cor herdada da Live era branca, por causa de text-white no shell. O modal agora estabelece fonte, tamanho, entrelinha e cor próprios, evitando dependência do contexto externo.

## Correção

O mesmo GrammarFocusModal usa createPortal(..., document.body). Mantém contexto React, refs, callbacks, editor, permissões e estado existentes. Não foi criado outro modal. O portal remove a dependência dos ancestrais da Board. Alturas usam dvh, o cabeçalho não encolhe e a região de conteúdo tem min-height:0 com rolagem própria.

Os labels migrados incluem:

- Shell: Aluno/Alunos, Professor, Administrador, Cadernos, Cursos, Teste de nível, Painel do professor, Início, visitante, configurações, ajuda, relatórios e saída.
- Workbook/lesson: Gramática, Caderno, Lição, Unidade, Voltar, Exercício, Teste, Feito, palavras, pontuação e repetição do teste.
- Grammar: cabeçalho, seletor de caderno, lições, lição atual, instrução para escolher lição, carregamento, controles, editor e texto da área legacy.
- Report Grammar: formulário, status e categorias de exibição; os valores persistidos das categorias continuam os mesmos.
- Painel do professor: título, abas, cartões de resumo, atualização, totais e identificação de alunos.
- Live: botão Grammar da Board, labels existentes de TeacherStage recebem o contexto correto; voltar/alunos na lista de aulas.

Live e Battle continuam com seus nomes. Esta é uma correção dos consumidores descritos, não uma tradução estrutural de todas as telas administrativas ou do currículo.

## Testes

- `npm run test:language-smoke`: renderização React real de WorkbookView/LessonView para UI PT × EN/ES/EL/HE, ES × EN e EN × ES; títulos preservados; UI independente da base/target; restrição EN/PT/ES; contratos dos pontos de entrada e portal.
- Navegador local: mesma matriz de labels; overview com “Escolha a lição que deseja abrir.”; seletor manual EN e ES mantém interface PT; dimensões/fonte iguais nas duas entradas; conteúdo longo rolável; topo visível em desktop e móvel (390×844). No móvel o dialog ocupa a área útil de 375×844, descontada a barra de rolagem do navegador de teste, em ambos os caminhos.
- Permissões no DOM real do modal, nas duas entradas: student só leitura; teacher Quadro/Slides/Praticar/Reportar; admin Editar/Quadro/Slides/Praticar. Não aparece Edit para teacher/student nem Report para admin.
- `npm run test:grammar-focus`: modelos, seleção de locale, permissões, contratos de UI e Rules existentes passaram.
- `npm run test:grammar-upgrade`: emulador demo, serviços reais, documentos v1 exatos em wb1_l1, wb1_es_wb1_l1 e wb1_pt_wb1_l1. Leitura de outro locale, atribuição explícita EN/ES/PT, preservação integral dos originais, isolamento de destinos, proteção contra sobrescrita/concorrência/revisão desatualizada e Board/Slides passaram.
- `npm run test:language-profile`, `test:language-context`, `test:placement`, `test:role-mode`: passaram. Placement permanece restrito ao target English.
- `npm run build`: passou, incluindo service worker.
- `npm run lint`: 14 erros preexistentes, nenhum novo. Arquivos com erros não foram alterados: battleQuestionHistoryService (2), BattleSetupModal (3), WorkspaceCanvas (3), UI.tsx (1), workbook5 (1), workbook6 (3), workbook7 (1).
- `git diff --check`: passou.

A verificação visual usou fixture com dados simulados, não uma conexão autenticada com uma sala de produção. O teste de persistência/legacy usou exclusivamente emuladores.

### Repetir o smoke visual

Em apps/main, executar `npm run test:language-smoke-browser` e abrir http://127.0.0.1:4178. O comando serve uma fixture local, não é um runner que termina automaticamente.

1. Selecionar UI/Target e conferir os títulos e prefixos da matriz acima.
2. Abrir Gramática pelo Workbook e por “Board/Live → Grammar”. Conferir topo, dimensões, cor e rolagem longa em desktop/móvel.
3. Selecionar os três papéis e conferir exatamente as ações descritas acima em ambas as entradas.
4. Abrir o overview e conferir instrução e título curricular.
5. Com UI PT, trocar somente o seletor de conteúdo para EN/ES; a interface deve continuar PT.

A fixture importa os componentes reais e substitui apenas o serviço Grammar e o formulário de envio por dados locais, sem qualquer envio ou acesso a produção.

## Arquivos alterados

Caminhos relativos à raiz do repositório:

- apps/main/src/i18n/uiLabels.ts
- apps/main/src/i18n/UiLanguageContext.tsx
- apps/main/src/i18n/grammarReportLabels.ts
- apps/main/src/App.tsx
- apps/main/src/components/CoursesView/CoursesView.tsx
- apps/main/src/components/WorkbookView/WorkbookView.tsx
- apps/main/src/components/LessonView/LessonView.tsx
- apps/main/src/components/GrammarFocus/GrammarFocusModal.tsx
- apps/main/src/components/GrammarFocus/GrammarFocusReportModal.tsx
- apps/main/src/components/TeacherDashboard/TeacherDashboard.tsx
- apps/main/src/components/LiveClasses/LiveClassesPage.tsx
- apps/main/src/components/LiveClasses/Teacher/TeacherRoomView.tsx
- apps/main/src/components/LiveClasses/LiveTrailExerciseOverlay.tsx
- apps/main/scripts/language-smoke.test.tsx
- apps/main/scripts/grammar-focus-ui.test.mjs
- apps/main/scripts/smoke-ui.fixture.tsx
- apps/main/scripts/smoke-ui.serve.mjs
- apps/main/package.json
- docs/architecture/LANGUAGE_ARCHITECTURE_PHASE2_SMOKE_FIX.md

## Publicação

Somente frontend, com publicação normal quando autorizada. Nenhuma alteração de Rules, índices, perfil, cache por UID, preservação no login, learningLanguages, registry, identidade Grammar, serviços de persistência ou migração. Não exige ação manual nos documentos de produção nem nova atribuição legacy. Fase 3 não iniciada.
