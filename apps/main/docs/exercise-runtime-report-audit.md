# Auditoria: áudio e snapshot de Reportar problema

Data: 2026-09-02. Alterações locais; sem publicação em produção.

## Causa e caminho do exercício

1. `src/data/workbook1/lesson1.ts` define `wb1_l1_d1_e9`, multiple-choice, com `audioValue: 'R'`.
2. `src/courses/spanish/workbook1.ts` chama `buildReplicatedWorkbook1('es')`. Em `src/courses/shared/replicatedWorkbook1.ts`, `transformLesson` prefixa os IDs e `transformExercise` traduz os campos existentes. Uma letra isolada continua sendo `R`. Resultado: workbook 1, `es_wb1_l1`, `es_wb1_l1_d1`, `es_wb1_l1_d1_e9`.
3. `ExercisePractice` aplica a sequência/overrides publicados e fornece o exercício efetivo a `PracticeSection`, em `src/components/UI.tsx`.
4. `resolvePromptAudioText`, em `src/utils/fillInBlankAudio.ts`, selecionava audioValue → audioValueBeforeAnswer → displayValue → instruction e acrescentava **incondicionalmente** `This is the letter ${letter}.` a uma letra isolada. O helper não recebia o idioma. Essa transformação ocorria depois da tradução do currículo.
5. `resolveExerciseSpeechLocale` escolhia corretamente `es-ES` pelo idioma do workbook. O wrapper `speak` de `PracticeSection` enviava a frase inglesa e o locale espanhol ao serviço central de TTS.
6. `submitProblemReport` lia somente `currentExercise.audioValue`. Por isso salvava `R`, sem a frase gerada, voz ou locale utilizados.

## Alterações de código

| Arquivo | Funções/responsabilidade |
| --- | --- |
| `src/utils/fillInBlankAudio.ts` | `resolvePromptAudioText`, `buildBlankAudioText`, `buildFullSentenceFromPrompt`, `resolveFullSentenceAfterAnswer`: locale explícito, templates de letras e lacunas localizados. |
| `src/services/ttsService.ts` | `speak`, `playRemoteTts`: callback opcional `onSynthesis` registra o pedido na fronteira real de síntese; `onVoicesReady` permite o fallback remoto quando a API local não existe. |
| `src/utils/remoteTtsLanguage.ts` | `normalizeTranslateLang`: normalização compartilhada entre cliente, endpoint e servidor de desenvolvimento. |
| `api/tts.ts`, `vite.config.ts` | Reutilizam a normalização do provedor remoto. Nenhum segundo serviço de TTS foi criado. |
| `src/models/exerciseRuntimeSnapshot.ts` | `createExerciseAudioRecorder`: histórico por apresentação, cópias imutáveis, até 50 tentativas; resumo mantém o último prompt mesmo após áudio de alternativa/feedback. |
| `src/components/UI.tsx` | `PracticeSection`, `speak`, `playPrompt`: passam o locale ao resolver; associam cada pedido ao papel/origem; expõem leitura do texto visível, alternativas embaralhadas, resposta atual e respostas aceitas do validador. |
| `src/components/ExercisePractice/ExercisePractice.tsx` | `submitProblemReport`: consome o leitor da apresentação atual, com conferência do ID; formulário oferece prévia do diagnóstico de áudio. |
| `src/services/exerciseReportsService.ts` | Campos opcionais no contrato; busca também considera texto final e texto visível. Persistência mantém o fluxo existente. |
| `src/utils/exerciseRuntimeReportRows.ts` | Linhas compartilhadas de diagnóstico histórico. |
| `src/components/ProblemReports/ProblemReportsDashboard.tsx`, `ExerciseEditorModal.tsx` | Exibem os dados novos; o dashboard inclui esses dados no JSON copiado. |
| `firestore.rules` | Allowlist de criação aceita os novos campos sem exigir sua presença em reportes antigos. |

## Captura e semântica

No navegador, a captura lê `utterance.text`, `utterance.lang`, `utterance.voice` e `utterance.rate` imediatamente antes de `speechSynthesis.speak(utterance)`. No fallback, registra o texto e o idioma normalizados imediatamente antes do POST a `/api/tts`; a normalização é a mesma usada na requisição ao Google Translate. O servidor não traduz nem acrescenta frases.

`audioText`, `instruction`, `displayedText`, `options`, `expectedAnswer` e `acceptedAnswers` preservam os dados da definição efetiva. Os campos adicionais são:

- `resolvedAudioText`, `audioLanguage`, `audioVoice`, `audioVoiceLanguage`, `audioProvider`;
- `audioHistory`: texto, locale, voz, provider, fonte, velocidade, ID, horário, papel, origem e estado de cada tentativa;
- `renderedText`: `innerText` da área real do exercício, incluindo instruções transformadas, suporte/hints visíveis e feedback;
- `displayedOptions`: ordem utilizada pelo renderer;
- `resolvedAcceptedAnswers`: os mesmos alvos utilizados na validação, sem mudar regras pedagógicas;
- `studentAnswer` passa a refletir a resposta atual, inclusive antes da próxima validação.

`audioSource` passa a vir da execução. Sem chamada ao TTS, os campos de áudio resolvido ficam null e o histórico vazio. Não se infere reprodução a partir de audioValue. O campo `state` distingue tentativa, conclusão, cancelamento e erro. Uma voz não exposta pelo navegador/provedor fica null, sem inventar seu nome. O resumo refere-se ao último prompt; instruções, alternativas e feedback continuam disponíveis no histórico. O histórico pertence à instância/apresentação do exercício e não a uma variável global compartilhada entre alunos/exercícios.

## Localização e varredura

- Letras: `This is the letter R.` / `Esta es la letra R.` / `Esta é a letra R.`. Regra genérica, incluindo Ñ; o texto inglês já escrito continua intacto. Idiomas sem template não recebem fallback inglês para letras.
- Lacunas: encontrado outro template fixo, `blank`; agora usa `blank`, `espacio en blanco` ou `em branco`, inclusive no fallback de frase completa.
- Feedback: seu locale acompanha o idioma dos próprios rótulos/mensagens. Isso evita misturar feedback traduzido com um `speechLanguage` explícito diferente no conteúdo do exercício.
- Números: o helper não adiciona frase a números. As traduções de palavras numéricas de ES/PT já são feitas pelo language pack; foram preservadas e verificadas (`diez` / `dez`).
- `This is the number` e frases completas de letras em `lesson1Authored.ts` pertencem ao currículo inglês. ES/PT usam o currículo replicado a partir de `lesson1.ts`, não esse gerador. Esses textos ingleses corretos não foram alterados.
- `resolveSpokenOptionText` só normaliza YES/NO; não monta frases de letras/números. Endpoint TTS e servidor Vite só encaminham texto, sem templates ocultos.
- Esta foi uma varredura direcionada de templates e fluxo de áudio, não uma revisão linguística integral de todo o currículo ou de overrides remotos.

## Testes e evidências

O fixture `scripts/runtime-report-fixture.mjs` compila **ExercisePractice, PracticeSection, o serviço de TTS e createExerciseReport reais**. Apenas a leitura editorial e a escrita Firestore são simuladas. Ele usa o currículo empacotado e não altera denúncias/progresso em produção. Iniciar a partir de `apps/main`: `node scripts/runtime-report-fixture.mjs`, porta local 5187.

No navegador: selecionar idioma, executar Play, escolher alternativa errada, abrir ajuda → Reportar problema, expandir diagnóstico e enviar para a persistência simulada. Os três percursos foram executados; os JSONs completos estão em `exercise-runtime-report-browser.json`.

| Exercício | audioText | resolvedAudioText | Locale | Resultado |
| --- | --- | --- | --- | --- |
| `es_wb1_l1_d1_e9` | `R` | `Esta es la letra R.` | `es-ES` | Chamada de Play concluída; formulário e payload conferidos. |
| `pt_wb1_l1_d1_e9` | `R` | `Esta é a letra R.` | `pt-BR` | Concluída com Microsoft Daniel - Portuguese (Brazil); formulário e payload conferidos. |
| `wb1_l1_letter_recognition_r` | `R. This is the letter R.` | `R. This is the letter R.` | `en-US` | Texto inglês original preservado; reprodução concluída; formulário e payload conferidos. |

No primeiro autoplay espanhol houve falha local e no fallback remoto. Essas duas tentativas aparecem como `error`; a reprodução manual posterior aparece como `completed`. EN/ES não expuseram nome de voz nesta sessão. A conclusão foi verificada pelo ciclo de reprodução, não por transcrição humana do som.

Depois da ampliação dos alvos de validação, o formulário espanhol foi novamente executado: `exercise-runtime-report-final.json` confirma `resolvedAcceptedAnswers: ["R"]`, a resposta atual `N`, a ordem exibida e o texto visível, além da frase final do TTS.

Validações executadas:

- `npm run test:runtime-audio`: 3 testes passam, cobrindo currículos reais EN/ES/PT, igualdade exata com o argumento entregue ao motor, voz, preservação do prompt após feedback, isolamento/cópia do histórico, falha e normalização do fallback remoto, letras/lacunas/números e preservação de texto autoral.
- `npm run test:tts-locale`: 16 testes passam.
- `npm run test:exercise-reports`: regressão estrutural + 18 testes passam.
- `npm run test:answer-normalization`: 25 testes passam.
- Emulador Auth/Firestore, projeto `demo-learnendo-validation`: reportes antigos e novos aceitos; restrições de autoria/leitura/atualização permanecem passando. Comando na raiz: `firebase emulators:exec --project demo-learnendo-validation --only auth,firestore "node apps/main/scripts/firestore-exercise-reports.integration.mjs"`.
- `npm run build`: passa.
- TypeScript: 14 diagnósticos no HEAD e os mesmos 14 no código alterado; nenhum diagnóstico novo. O lint geral permanece bloqueado por esses erros preexistentes (Battle, Workspace, UI/GrammarGuideEntry e dados de workbooks 5–7).

Para publicar: as novas regras Firestore precisam acompanhar o frontend; a allowlist antiga rejeita os campos adicionais. Nenhum deploy foi feito nesta tarefa.
