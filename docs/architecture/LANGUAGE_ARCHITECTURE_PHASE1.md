# Arquitetura linguística — implementação da Fase 1

Data: 02/09/2026. Aplicativo: `apps/main`.

Especificação: [auditoria arquitetural](LANGUAGE_ARCHITECTURE_AUDIT.md) e instruções aprovadas para esta fase: integridade + modelo linguístico central. A numeração desta entrega segue essas instruções, que incluem a separação inicial do estado do App.

## Resultado

- Base/instrução/UI aceitam EN/PT/ES; alvo aceita também EL/HE.
- O App pode manter base PT ou ES enquanto o alvo é EN. Troca/restauração de curso altera o alvo, sem regravar a preferência de apoio.
- O nivelamento só inicia para o banco inglês existente; outros alvos mostram indisponibilidade. Persistência e conclusão carregam a identidade desse banco.
- Grammar Focus usa identidade curricular por curso. Notas antigas permanecem disponíveis em uma área explicitamente legada, sem serem adotadas por nenhum curso automaticamente.
- Board/Slides e relatórios de Grammar transportam a identidade curricular. Nenhum workbook foi duplicado ou traduzido.
- Não houve deploy, migração de produção, alteração de perfis, criação de instrução por turma nem avanço automático à Fase 2.

## Modelo central e fonte de verdade

`apps/main/src/models/languageContext.ts` define:

| Contrato | Valores / responsabilidade |
|---|---|
| `BaseLanguage` | en, pt, es; apoio pessoal |
| `InstructionLanguage` | Alias semântico de BaseLanguage; ainda não persistido em turmas |
| `UiLanguage` | Alias de tipo, conceito independente; pode diferir da base |
| `TargetLanguage` | en, pt, es, el, he |
| `LanguageContext` | Alvo, base, instrução e UI; sem locale global de TTS |
| `createLanguageContext` | Valida os campos sem converter base para alvo; instrução/UI usam base apenas quando omitidas |
| `COURSE_TARGET_LANGUAGE` | Fonte central curso → alvo, incluindo ambos os cursos de português |
| `getCourseTargetLanguage` | Retorna alvo ou null para curso desconhecido; não inventa um alvo |
| `PRIMARY_COURSE_FOR_TARGET` | Destino padrão de navegação; não é uma inversa bijetiva do catálogo |
| `resolveLegacyBaseLanguage` | Bootstrap local: preferência base válida → seleção moderna legada → en |

O contexto não contém regra `TTS=target` nem `TTS=base`. Os resolvedores de texto/voz e a captura de `resolvedAudioText`, `audioLanguage`, `audioVoice`, `audioProvider` foram preservados. Testes de locale e runtime de áudio passaram.

### Consumidores migrados e aliases

App, `dashboardMetrics` (usado pelo dashboard/teacherService), `reportService` e o novo contrato de Grammar consomem o mapa central. `COURSE_TO_LANGUAGE` no App e `COURSE_LANGUAGE_CODES` do dashboard são aliases de compatibilidade, sem mapas independentes. O relatório conserva o alias histórico `english-native` apontando para o valor central de inglês.

`LessonLanguageCode` em `types.ts` é alias de `TargetLanguage`. O nome `App.language` foi mantido para evitar reescrever todos os props, guards e dados de navegação; seu significado agora está explicitamente documentado como alvo. `LANGUAGE_TO_PRIMARY_COURSE` é alias da tabela central de destinos padrão.

Adaptadores locais de Live, Battle, Pronunciation e autoria ainda possuem mapeamentos legados. Esta fase não migrou integralmente esses módulos. Eles não devem receber novos cursos/idiomas por tabelas adicionais: a próxima alteração nesses caminhos deve consumir o contrato central. As cópias de aplicativos em `Learnendo/...`, `apps/wbk-5` e o Lab não foram refatoradas.

## Estado do App e compatibilidade

Antes, `setLanguage` salvava o alvo em `learnendo_user_language` e, para idiomas modernos, também em `learnendo_base_ui_lang`. A UI era derivada diretamente do alvo moderno. Agora:

1. O alvo continua sendo carregado e sincronizado com o curso pelos guards existentes.
2. `baseLanguage` é inicializado uma vez a partir do storage legado.
3. A preferência inicializada é persistida na chave existente, para sobreviver ao primeiro reload mesmo quando a chave estava ausente.
4. `createLanguageContext({ targetLanguage: language, baseLanguage })` fornece UI independente, com base como default.
5. Trocar/restaurar curso não chama o bootstrap de base novamente.

Nenhuma chave de navegação/progresso foi removida. `getScopedStorageItem` continua preferindo sessão e depois localStorage. Contexto de aba, Workbook, Lesson, Auth, role/view mode e mecanismos de progresso continuam nos caminhos anteriores.

Esta é uma ponte local, não um cadastro linguístico completo. A preferência ainda não pertence ao perfil Firestore nem possui seletor novo. A chave antiga não é segregada por UID. Esses limites estão registrados para a Fase 2; não foram acrescentadas escritas no login para inferir idioma pessoal.

O Grammar Focus do estudo individual passa a receber baseLanguage. Os outros fluxos de apoio legado, como PracticeSection e Live, ainda não foram integralmente localizados nem migrados para esse contexto. O shell preserva EN/PT/ES para os alvos EL/HE; eles nunca são aceitos como base pelo modelo.

## Placement Test: causa e solução

### Causa

`getQuestionsForLanguage` ignorava seu argumento e retornava sempre `PLACEMENT_TEST_QUESTIONS`. O componente gravava `languageCode: currentLanguage` e `tests.placements[currentLanguage]`, permitindo registrar uma avaliação do banco inglês sob ES/PT/EL/HE.

### Solução

- `placementIdentity.ts` declara o banco `english-listening-v1`, `languageCode=en`, `courseId=english`.
- `getPlacementBank` retorna null para os demais alvos. `getQuestionsForLanguage` retorna lista vazia nesses casos, sem copiar/traduzir banco.
- O componente externo bloqueia o teste não suportado antes de montar o fluxo de avaliação. A mensagem usa `uiLanguage` separado.
- O fluxo inglês valida a identidade ao montar e imediatamente antes de persistir. Documento atual e histórico recebem `bankId`, `courseId` e `languageCode` do banco, e o índice de placements usa esse idioma.
- O callback de conclusão carrega bankId/languageCode; o App recusa atualizar navegação/progresso se a conclusão não corresponde ao alvo e banco ativos.
- O banner de convite só aparece quando existe banco. A rota continua protegida mesmo quando aberta por outro caminho.
- A instância do teste é remontada por alvo, impedindo reaproveitar respostas da seleção anterior.

As exportações históricas `placementTestQuestions_pt.ts` e `_es.ts` continuam sendo aliases antigos; elas não são registradas como bancos no novo resolvedor e não são usadas para habilitar avaliações desses alvos. Dados históricos não foram apagados nem reclassificados: corrigir notas antigas exige análise de proveniência separada.

## Grammar Focus: identidade, leitura e preservação

### Schema e chaves

O documento novo contém `schemaVersion: 2`, `courseId`, `targetLanguage`, workbookId, lessonId canônico, conteúdo EN/PT/ES e metadados administrativos.

Exemplos de documentos independentes:

```text
grammarFocus/english__wb1_l1
grammarFocus/spanish__wb1_l1
grammarFocus/portuguese_foreigners__wb1_l1
grammarFocus/portuguese_native__wb1_l1
grammarFocus/greek_koine__wb1_l1
grammarFocus/hebrew_biblical__wb1_l1
```

O prefixo de idioma da lição ainda pode ser normalizado **dentro** de um curso. Ele não é mais a única dimensão da identidade. `grammarFocusDocumentId` exige curso conhecido, workbook inteiro válido e ID de lição válido. O leitor e a transação verificam schema/curso/alvo/workbook/lição antes de usar um documento existente.

Uma ausência inicial no cache não comprova ausência no servidor. As subscriptions usam eventos de metadados e aguardam confirmação do servidor para misses locais; isso evita apresentar uma gramática recém-salva como ausente.

### Legado sem curso confirmado

Não há evidência suficiente para atribuir automaticamente todo `grammarFocus/wb1_l1` antigo ao inglês, espanhol ou outro curso. Por isso:

- `legacyGrammarFocusDocumentId` serve apenas para localizar o documento antigo.
- Uma subscription separada fornece as notas históricas para um disclosure **“Notas legadas sem curso confirmado (somente leitura)”**.
- Esse material não vira `documentValue` do currículo, não preenche automaticamente o draft e não é exportado como gramática oficial daquele curso.
- Novas edições gravam exclusivamente na chave curricular; não sobrescrevem nem copiam automaticamente o legado.
- O conteúdo legado permanece consultável em sua versão EN/PT/ES, segundo a língua de exibição, e intacto no armazenamento.

Consequência visível: até que as notas antigas sejam classificadas, elas ficam nessa área de consulta, e os controles de edição/exportação oficiais operam sobre o documento curricular novo. A associação do acervo antigo precisa de decisão editorial posterior. Isso resolve a ambiguidade sem fabricar a origem dos dados.

### Guia, seleção, Practice, Board e Slides

- Navigator passa courseId até o modal e nas seleções. O workbook carregado só é exposto quando seu escopo corresponde ao curso/livro atuais; resultados assíncronos antigos são descartados.
- O modal é remontado por curso/workbook/lição; drafts e subscriptions de outro currículo não são reaproveitados.
- Practice recebe seleção com courseId. O App descarta seleção pendente de outro curso e usa workbook numérico do estado, sem converter IDs como `es_wb1` com `Number`.
- Board/Slides recebem courseId, workbookId, lessonId e grammarDocumentId; o serviço valida a consistência antes de escrever.
- `WorkspacePage.grammarSource` registra esses campos. O normalizador e a serialização preservam a origem durante reload/edições posteriores.
- O relatório Grammar usa a chave curricular em exerciseId, mantendo a infraestrutura e o schema de relatórios existentes.
- Os guias estáticos ingleses em `constants.tsx` não foram reescritos ou transformados em gramática de outros alvos.

### Regras

`firestore.rules` valida o curso/alvo e a correspondência entre caminho e conteúdo para schema 2. Mantém leitura autenticada e escrita administrativa. Schema 1 permanece aceito somente no namespace antigo, sem metadados que o apresentem como documento curricular novo.

Não houve deploy de regras. Para publicar esta versão posteriormente, as regras compatíveis precisam estar disponíveis antes do cliente que grava schema 2. Sem isso, gravações novas serão negadas; não existe fallback para escrever novamente na chave compartilhada. Os documentos antigos permanecem preservados.

## Traduções e trabalho adiado

Nenhuma ocorrência de `translation?: string` foi convertida. O inventário de 32 ocorrências no main e demais consumidores continua na seção 8 da auditoria. Os caminhos de maior atenção para a próxima fase são Exercise/PracticeItem, seeds/helpers, CanonicalExerciseInput, AdminExerciseContent, allowlists dos overrides, ajuda de ExercisePractice, Vocabulary/Translator e snapshots Live.

O contexto agora permite selecionar apoio por base/instrução sem confundir alvo. Adicionar os objetos localizados ainda exigirá leitores, autores, sanitizers, versões e regras compatíveis em conjunto.

Ficaram fora: onboarding, língua materna, learningLanguages definitivo, preferências em users, class.instructionLanguage, migração completa Live/Battle/Vocabulary, tradução de workbooks, áudio bíblico autoral, migração em massa e IA em runtime.

## Testes executados

| Comando / cobertura | Resultado |
|---|---|
| `npm run build` | Passou; avisos de bundle grande, import misto e Browserslist antigo |
| `test:language-context` / execução direta do mesmo arquivo | Passou: sete combinações aprovadas, base/UI independentes, mapa dos seis cursos, desconhecidos e EL/HE rejeitados como base |
| `test:placement` / execução direta do mesmo arquivo | Passou: apenas EN tem banco e identidade persistível; outros alvos não recebem questões |
| `test:grammar-focus` | Passou: chaves distintas, normalização, merge, localização existente, permissões, regras e contratos de UI |
| `test:language-integrity` | Passou em Auth/Firestore emulados, projeto `demo-learnendo-language` |
| `test:tts-locale` | Passou |
| `test:runtime-audio` | Passou; snapshot texto/locale/provedor preservado |
| `test:role-mode` | Passou |
| `test:exercise-reports` | Passou |
| `test:exercise-overrides` | Passou |
| `test:exercise-flow` | Passou após atualizar duas expectativas textuais obsoletas sobre as assinaturas de áudio já existentes |
| `test:pedagogical-activity` | Passou; dashboard, atividade e conclusão/progresso |
| `node --experimental-strip-types src/services/profileLoginPolicy.test.ts` | Passou; campos oficiais preservados |
| `npm run lint` | Permanece com os 14 erros preexistentes; nenhuma correção desses erros foi feita |

A integração usa serviços reais com a inicialização Firebase substituída exclusivamente pela conexão de emulador. Verificou seis currículos separados, ausência de fallback implícito para legado, save/merge/reload, preservação literal do documento antigo, leitura de aluno, rejeição de escrita de aluno, rejeição de curso/alvo/caminho incompatíveis e origem persistida em Board/Slides. Os erros PERMISSION_DENIED nos casos negativos são esperados.

Uma primeira execução identificou miss de cache após salvar; o leitor foi corrigido e a integração inteira passou na repetição. O Java instalado não pôde ser iniciado pelo Firebase no sandbox: o teste foi executado com escalonamento autorizado e PATH apontando para o JDK 21 local, sempre com projeto demo. Não houve acesso a dados reais.

As duas expectativas de `exercise-flow-regression.test.mjs` ainda esperavam `resolvePromptAudioText(item)` e `speak(instructionAudioText, 1, promptVoice)`. Foram atualizadas para exigir o locale e o papel de áudio que já existiam antes desta fase; `UI.tsx` e o conteúdo dos exercícios não foram alterados.

Os 14 erros de lint continuam em Battle history/setup, WorkspaceCanvas, UI/GrammarGuide e tipos dos workbooks 5/6/7. O build Vite passou. Não foi executada navegação manual completa em navegador nem validada a qualidade auditiva de dispositivos reais nesta fase.

## Arquivos desta implementação

Todos os caminhos abaixo são relativos à raiz do repositório.

**Novos:**

- `apps/main/src/models/languageContext.ts` e `.test.ts`
- `apps/main/src/models/placementIdentity.ts` e `.test.ts`
- `apps/main/scripts/language-phase1.integration.mjs` e `.ts`
- `docs/architecture/LANGUAGE_ARCHITECTURE_PHASE1.md`

**Alterados:**

- `apps/main/src/App.tsx`, `src/types.ts`, `src/utils/tabScopedStorage.ts`
- `apps/main/src/engine/dashboardMetrics.ts`, `src/engine/teacherService.ts`, `src/services/reportService.ts`
- `apps/main/src/data/placementTestQuestions.ts`, `src/components/PlacementTest/PlacementTest.tsx`
- `apps/main/src/models/grammarFocus.ts`, `src/models/grammarFocus.test.ts`
- `apps/main/src/services/grammarFocusService.ts`, `src/services/grammarFocusReportService.ts`, `src/services/grammarFocusWorkspace.ts`, `src/services/workspaceService.ts`
- `apps/main/src/components/GrammarFocus/GrammarFocusModal.tsx`, `GrammarFocusReportModal.tsx`, `GrammarNavigatorModal.tsx`
- `apps/main/src/components/LiveClasses/LiveTrailExerciseOverlay.tsx`, `Teacher/TeacherRoomView.tsx`
- `apps/main/scripts/grammar-focus-ui.test.mjs`, `scripts/exercise-flow-regression.test.mjs`
- `apps/main/package.json`, `firestore.rules`

As alterações preexistentes de testes/editor-publication, a auditoria e o subprojeto modificado foram preservados. Esta implementação não fez commit nem alterou as cópias aninhadas.

## Riscos e decisões posteriores

1. Classificar a origem curricular do acervo Grammar legado antes de associá-lo aos novos documentos. A área legada preserva acesso, mas não autoriza atribuição automática.
2. Publicar regras e cliente em ordem compatível, com autorização de deploy separada. Nenhuma publicação foi realizada nesta tarefa.
3. Revisar avaliações históricas possivelmente rotuladas com outro alvo, sem apagá-las ou converter notas automaticamente.
4. Implementar a fonte autenticada de preferência na Fase 2; a ponte local ainda não resolve troca de conta/dispositivo.
5. Migrar gradualmente os adaptadores e os consumidores de apoio. O modelo central não equivale a localização integral de todos os módulos.

A Fase 2 não foi iniciada.
