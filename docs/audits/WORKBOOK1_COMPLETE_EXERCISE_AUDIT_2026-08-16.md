# Auditoria completa dos exercícios — Workbook 1

**Data:** 16 de agosto de 2026  
**Escopo:** Workbook 1 de inglês, Lessons 1–12, estado local renderizado pelo código atual  
**Natureza:** investigação e relatório; nenhum exercício foi alterado, publicado ou enviado para deploy

## Método e limites

Foram avaliados os 1.200 exercícios efetivamente produzidos pelo export atual do Workbook 1: 100 por lição, em sete dias com 15, 15, 15, 10, 15, 10 e 20 itens. A auditoria comparou `type`, `assessmentMode`, instrução, áudio/TTS, display, opções, `correctValue`, `acceptedAnswers`, posição e origem após a normalização/finalização.

A classificação executiva é mutuamente exclusiva: cada exercício recebeu uma disposição principal. “Provável erro técnico/pedagógico” é um marcador de risco que coincide com os 59 itens inconsistentes.

O estado remoto completo não pôde ser enumerado com segurança. A tentativa de leitura direta das coleções publicadas recebeu `401 Unauthorized`; não foi feita renovação indireta de credenciais. Uma verificação visual limitada confirmou em produção o primeiro item de WB1/L3/Day 4 como **Shadowing**, instrução **“Listen and repeat.”** e áudio **“thirty thirteen”**. Ao abrir o aplicativo, ele autenticou automaticamente a sessão e gravou telemetria normal de perfil/sessão/acesso no Firestore; a verificação foi interrompida assim que isso apareceu nos logs. Não houve escrita em coleções editoriais, exercício, override, sequência, publicação ou progresso de resposta.

## Parte 1 — Resumo executivo

| Disposição principal | Quantidade | Leitura |
|---|---:|---|
| OK | **1.025** | objetivo e comportamento suficientemente coerentes para WB1 |
| Pequena melhoria recomendada | **5** | funciona, mas o bloco de repetição tem 15–25 palavras e deve ser encurtado |
| Confuso | **51** | a resposta depende de contexto anterior que não está no exercício atual |
| Inconsistente | **59** | instrução/tipo/áudio/gabarito não descrevem a mesma tarefa |
| Possivelmente avançado para WB1 | **60** | texto integral longo, `ain't` ou classificação fonética de `-ed` |
| **Total** | **1.200** | classificação sem sobreposição |

**Provável erro técnico/pedagógico:** **59** (os mesmos 59 itens inconsistentes).  
**P0:** 59. **P1:** 51. **P2:** 65 (60 avançados + 5 longos moderados). **P3:** 0.

Conclusão principal: o problema mais grave é sistêmico. A função que normaliza Lessons 2–7 converte todo o Day 4 em `speaking` e impõe “Listen and repeat.”, mas mantém o `correctValue` da tarefa original. Isso criou 52 inconsistências. Outras sete inconsistências são respostas pessoais incompletas na Lesson 5.

### Fonte de verdade

A fonte efetiva é uma composição, nesta ordem:

1. **Base local canônica:** `apps/main/src/data/workbook1/`. O `index.ts` usa `lesson1Authored`, Lessons 2–12, normaliza Lessons 2–7 e aplica `finalizeWorkbook1Lesson` às 12.
2. **Transformações locais:** `normalizeOfficialWorkbookLessons.ts` reordena/converte Lessons 2–7; `finalizeWorkbook1Lesson.ts` reconstrói o Day 7 com 8 listening-writing, 6 shadowing e 6 speaking.
3. **Camada editorial remota:** o aluno carrega `publishedDayExerciseSequences` e `publishedExerciseOverrides`; sequência publicada substitui a lista local do dia, e overrides são mesclados por `exerciseId`.
4. **Fallback:** se a sequência remota estiver ausente/inválida ou falhar, o app retém a base local.

Portanto, a fonte de verdade do aluno é **TypeScript transformado + sequência publicada no Firestore + overrides publicados no Firestore**. Corrigir somente o arquivo local pode não mudar um dia já substituído remotamente; corrigir apenas um override pode desaparecer quando o ID ou a sequência mudar.

Há fontes paralelas/duplicadas que não pertencem à cadeia canônica atual e podem induzir manutenção no lugar errado: `apps/main/src/constants.tsx` (conteúdo legado de L1–L3), `apps/wbk-5/src/data/workbook1/`, `LESSON_3_CONTENT.ts` e cópias dentro de diretórios `Learnendo/...`. O fluxo atual de Workbook usa o registry/import de `apps/main/src/data/workbook1`; `PRACTICE_ITEMS` de `constants.tsx` permanece em uso auxiliar legado, mas não define a sequência corrente de 100 itens por lição.

## Parte 2 — Situações críticas (P0)

### P0-A — 52 itens convertidos indevidamente em shadowing

Metadados comuns: Workbook 1; tipo renderizado `speaking`; modo inferido `shadowing`; instrução “Listen and repeat.” ou “Listen and repeat the dialogue.”. O campo `acceptedAnswers` autoral está vazio, salvo quando indicado. Em runtime, o código adiciona o próprio áudio como alvo aceito para shadowing, o que mitiga uma transcrição perfeita, mas o `correctValue`, o feedback de erro e o relatório continuam semanticamente errados. O aluno observado em produção vê exatamente esse modo.

Objetivo aparente por origem:

- L2, L4 e L5: compreensão/seleção de uma parte da frase;
- L3: discriminação auditiva SAME/DIFFERENT;
- L6 e L7: resposta de diálogo, compreensão ou leitura;
- objetivo dos quatro itens “Listen to the text” de L6/L7: **OBJETIVO NÃO CLARO** após a conversão.

Recomendação comum: preservar o tipo e a instrução da tarefa original; quando o objetivo for realmente shadowing, criar um item separado cujo `correctValue` e `acceptedAnswers` sejam o áudio completo. O normalizador não deve converter semanticamente um exercício apenas para cumprir uma cota de tipo.

| Lesson | Day/posição no dia | Posição | exerciseId | Áudio/conteúdo | Resposta esperada | acceptedAnswers autoral |
|---|---:|---:|---|---|---|---|
| L2 | 4/1 | 46 | `wb1_l2_d4_e1` | It is a sunny day. | sunny | — |
| L2 | 4/2 | 47 | `wb1_l2_d4_e2` | The sky is blue. | blue | — |
| L2 | 4/3 | 48 | `wb1_l2_d4_e3` | The kite is red and white. | red and white | — |
| L2 | 4/4 | 49 | `wb1_l2_d4_e4` | I sit on a rock near a tree. | on a rock | — |
| L2 | 4/5 | 50 | `wb1_l2_d4_e5` | I eat an apple. | an apple | — |
| L2 | 4/6 | 51 | `wb1_l2_d4_e6` | I drink water. | water | — |
| L2 | 4/7 | 52 | `wb1_l2_d4_e7` | My toes are hot. | hot | — |
| L2 | 4/8 | 53 | `wb1_l2_d4_e8` | The wind blows. | blows | — |
| L3 | 4/1 | 46 | `wb1_l3_d4_e1` | thirty thirteen | different | — |
| L3 | 4/2 | 47 | `wb1_l3_d4_e2` | fifty fifteen | different | — |
| L3 | 4/3 | 48 | `wb1_l3_d4_e3` | nine ninety | different | — |
| L3 | 4/4 | 49 | `wb1_l3_d4_e4` | walk talk | different | — |
| L3 | 4/5 | 50 | `wb1_l3_d4_e5` | ship sheep | different | — |
| L3 | 4/6 | 51 | `wb1_l3_d4_e6` | wake wake | same | — |
| L3 | 4/7 | 52 | `wb1_l3_d4_e7` | shower shower | same | — |
| L3 | 4/8 | 53 | `wb1_l3_d4_e8` | study study | same | — |
| L3 | 4/9 | 54 | `wb1_l3_d4_e9` | homework homework | same | — |
| L3 | 4/10 | 55 | `wb1_l3_d4_e10` | bed bed | same | — |
| L4 | 4/1 | 46 | `wb1_l4_d4_e1` | My birthday is March tenth. | March tenth | — |
| L4 | 4/2 | 47 | `wb1_l4_d4_e2` | My birthday is May third. | May third | — |
| L4 | 4/3 | 48 | `wb1_l4_d4_e3` | Mine is September first. | September first | — |
| L4 | 4/4 | 49 | `wb1_l4_d4_e4` | My birthday is January twenty-first. | January twenty-first | My birthday is January 21st. |
| L4 | 4/5 | 50 | `wb1_l4_d4_e5` | My birthday is April seventh. | April seventh | — |
| L4 | 4/6 | 51 | `wb1_l4_d4_e6` | My birthday is July fourth. | July fourth | — |
| L4 | 4/7 | 52 | `wb1_l4_d4_e7` | That is Independence Day in the USA. | Independence Day | — |
| L4 | 4/8 | 53 | `wb1_l4_d4_e8` | Thanksgiving is on the fourth Thursday of November. | the fourth Thursday of November | — |
| L4 | 4/9 | 54 | `wb1_l4_d4_e9` | I have a party on June fifteenth. | June fifteenth | — |
| L4 | 4/10 | 55 | `wb1_l4_d4_e10` | It is at 21 First Street. | 21 First Street | It is at 21 First Street / com ponto |
| L5 | 4/1 | 46 | `wb1_l5_d4_e1` | My name is Leo. | Leo | — |
| L5 | 4/2 | 47 | `wb1_l5_d4_e2` | I am twelve years old. | 12 | — |
| L5 | 4/3 | 48 | `wb1_l5_d4_e3` | I am from Brazil. | Brazil | — |
| L5 | 4/6 | 51 | `wb1_l5_d4_e6` | He is eleven years old. | 11 | — |
| L5 | 4/7 | 52 | `wb1_l5_d4_e7` | He is from Canada. | Canada | — |
| L5 | 4/10 | 55 | `wb1_l5_d4_e10` | She is from Spain. | Spain | — |
| L6 | 4/1 | 46 | `wb1_l6_d4_e1` | diálogo completo Good morning / How are you | diálogo sem rótulos de falante | — |
| L6 | 4/2 | 47 | `wb1_l6_d4_e2` | Good morning, class. | Good morning, teacher. | — |
| L6 | 4/3 | 48 | `wb1_l6_d4_e3` | Good evening, Dad. | Good evening. | — |
| L6 | 4/4 | 49 | `wb1_l6_d4_e4` | Good afternoon, Ana. | Good afternoon | — |
| L6 | 4/5 | 50 | `wb1_l6_d4_e5` | Nice to meet you. | Nice to meet you too. | — |
| L6 | 4/6 | 51 | `wb1_l6_d4_e6` | It is night. You go to bed. | Good night! | — |
| L6 | 4/10 | 55 | `wb1_l6_d4_e10` | How are you? | I am fine, thank you. | — |
| L6 | 5/8 | 63 | `wb1_l6_d5_e8` | texto de 51 palavras | Good morning! My name is Ben. | — |
| L6 | 6/1 | 71 | `wb1_l6_d6_e1` | mesmo texto de 51 palavras | Good morning! My name is Ben. | — |
| L6 | 6/8 | 78 | `wb1_l6_d6_e8` | diálogo completo Good morning / How are you | diálogo sem rótulos de falante | — |
| L7 | 4/1 | 46 | `wb1_l7_d4_e1` | diálogo de 29 palavras sobre dia/mês/data | diálogo sem rótulos de falante | — |
| L7 | 4/2 | 47 | `wb1_l7_d4_e2` | What day is it today? | It is Monday. | — |
| L7 | 4/3 | 48 | `wb1_l7_d4_e3` | What month is it? | It is January. | — |
| L7 | 4/5 | 50 | `wb1_l7_d4_e5` | It is January first. | first | — |
| L7 | 4/6 | 51 | `wb1_l7_d4_e6` | It is February second. | second | — |
| L7 | 5/8 | 63 | `wb1_l7_d5_e8` | texto de 49 palavras | Today is Monday. The month is January. | — |
| L7 | 6/1 | 71 | `wb1_l7_d6_e1` | mesmo texto de 49 palavras | Today is Monday. The month is January. | — |
| L7 | 6/8 | 78 | `wb1_l7_d6_e8` | diálogo de 29 palavras sobre dia/mês/data | diálogo sem rótulos de falante | — |

### P0-B — 7 respostas pessoais incompletas

Tipo `speaking`, modo pergunta-resposta, instrução “Listen and answer”. Diferentemente de shadowing, o runtime usa somente `correctValue + acceptedAnswers`; não acrescenta o áudio. Como `acceptedAnswers` está vazio, respostas naturais completas podem ser rejeitadas.

| Lesson | Day/posição | Posição | exerciseId | Pergunta/áudio | Gabarito | acceptedAnswers | Problema e recomendação |
|---|---:|---:|---|---|---|---|---|
| L5 | 5/1 | 56 | `wb1_l5_d5_e1` | What is your name? | my name is | — | gabarito incompleto; aceitar nome livre via padrão guiado |
| L5 | 5/2 | 57 | `wb1_l5_d5_e2` | How old are you? | i am years old | — | ordem impossível; fornecer número/modelo e aceitar variantes |
| L5 | 5/3 | 58 | `wb1_l5_d5_e3` | Where are you from? | i am from | — | gabarito incompleto; fornecer país/modelo ou resposta aberta explícita |
| L5 | 5/7 | 62 | `wb1_l5_d5_e7` | What is his name? | his name is | — | não existe pessoa/nome no prompt; incluir contexto e nome |
| L5 | 5/8 | 63 | `wb1_l5_d5_e8` | What is her name? | her name is | — | não existe pessoa/nome no prompt; incluir contexto e nome |
| L5 | 5/9 | 64 | `wb1_l5_d5_e9` | Where is he from? | he is from | — | não existe pessoa/país no prompt; incluir contexto |
| L5 | 5/10 | 65 | `wb1_l5_d5_e10` | Where is she from? | she is from | — | não existe pessoa/país no prompt; incluir contexto |

## Parte 3 — Auditoria por lição

| Lição | OK | Pequena | Confusa | Inconsistente | Avançada | Avaliação geral |
|---|---:|---:|---:|---:|---:|---|
| 1 — The Alphabet and Numbers | 100 | 0 | 0 | 0 | 0 | **coerente** |
| 2 — A Day in Nature | 92 | 0 | 0 | 8 | 0 | **necessita revisão** (Day 4 convertido) |
| 3 — Daily Routines and Activities | 80 | 0 | 10 | 10 | 0 | **necessita revisão estrutural** |
| 4 — Ordinal Numbers and Sequence | 90 | 0 | 0 | 10 | 0 | **necessita revisão** (Day 4 convertido; Day 5 visual é válido) |
| 5 — Personal Information and To Be | 87 | 0 | 0 | 13 | 0 | **necessita revisão estrutural** |
| 6 — Greetings | 88 | 1 | 0 | 10 | 1 | **necessita revisão estrutural** |
| 7 — Days, Months, and Dates | 92 | 0 | 0 | 8 | 0 | **necessita revisão** |
| 8 — Spoken Patterns | 84 | 0 | 1 | 0 | 15 | **necessita revisão estrutural** (extensão e `ain't`) |
| 9 — Practical Speaking | 83 | 2 | 13 | 0 | 2 | **necessita revisão** |
| 10 — Months & Seasons | 87 | 2 | 9 | 0 | 2 | **coerente com ajustes** |
| 11 — Asking Questions | 86 | 0 | 9 | 0 | 5 | **necessita revisão** |
| 12 — Past Tense Regular Verbs | 56 | 0 | 9 | 0 | 35 | **necessita revisão estrutural** |

### Lesson 3 em detalhe

Pontos positivos:

- vocabulário de rotina e horários é compatível com A1;
- os pares `thirty/thirteen`, `fifty/fifteen`, `nine/ninety`, `ship/sheep` têm objetivo fonológico legítimo;
- os pares iguais equilibram a tarefa e ensinam SAME;
- Days 1–3 progridem de vocabulário para listening/identification.

Falhas:

- os 10 pares de Day 4 perderam a tarefa de discriminação e viraram shadowing com gabarito SAME/DIFFERENT;
- os 10 itens de Day 6 perguntam por Daniel/Sarah/Tom/Mark sem reapresentar a rotina no exercício atual; o aluno precisa lembrar conteúdo de outro dia;
- a progressão pretendida “discriminar → repetir” colapsou: a discriminação foi removida e a repetição herdou o gabarito dela.

Menor correção conceitual: restaurar Day 4 como listening discrimination; manter os pares; se desejar repetição, acrescentar uma fase posterior que repita exatamente cada par. Em Day 6, incluir uma frase curta de contexto no áudio ou transformar cada pergunta em compreensão imediata de uma única frase.

## Parte 4 — POSSÍVEL POR DESIGN — CONFIRMAR COM O RESPONSÁVEL PEDAGÓGICO

### Pares SAME/DIFFERENT da Lesson 3

- **Objetivo:** discriminação de vogais, tonicidade e contraste lexical/numeral.
- **Por que é válido:** `shower/shower`, `wake/wake`, `study/study`, `homework/homework` e `bed/bed` ensinam SAME; `ship/sheep`, `thirty/thirteen`, `fifty/fifteen`, `nine/ninety` e `walk/talk` ensinam DIFFERENT.
- **Confirmar:** se a intenção é discriminar, repetir ou usar ambos em duas etapas. Não excluir automaticamente.

### Linha ordinal visual da Lesson 4

`wb1_l4_d5_e1`–`e4` parecem perguntas sem contexto quando lidas como dados, mas o runtime mostra um `contextVisual` com Anna, Lucas, Daniel e Emily em quatro posições, além de accepted answers completas. São pedagogicamente válidos. Confirmar somente se a ordem visual permanece acessível em todos os dispositivos.

### Inglês informal com `ain't` na Lesson 8

12 exercícios usam `ain't`; o código os rotula explicitamente como informal e fornece equivalente padrão. Isso pode ser consciência de registro válida, não “erro gramatical”. Confirmar se WB1 deve ensinar reconhecimento passivo dessa forma. Para iniciantes, evitar exigir produção/shadowing e priorizar reconhecer “informal” + mapear para `isn't/aren't/am not`.

### Pronúncia de `-ed` na Lesson 12

32 exercícios trabalham `/t/`, `/d/`, `/ɪd/` e produção guiada. O objetivo fonológico é claro e a sequência reconhecimento → classificação → repetição faz sentido. Confirmar se símbolos IPA fazem parte da meta do WB1; se não, usar rótulos auditivos/exemplos em vez de notação técnica.

### Textos e diálogos longos

O texto longo pode ser válido como input de leitura apoiada. O problema não é sua existência, mas usá-lo como um único alvo de shadowing/ditado ou retirar o texto da tela nas perguntas seguintes. Confirmar se a leitura deve ser segmentada por frase e permanecer disponível durante as perguntas.

## Parte 5 — Padrão das correções recentes

O Git permite distinguir correções locais recentes com segurança:

- `51ab4b0` corrigiu alinhamento áudio→resposta na Lesson 3 e removeu glossas PT do display inglês;
- `2fb8b11` tornou instruções abertas explícitas (“any day/month”) e adicionou listas amplas de accepted answers;
- `69dea04` marcou explicitamente `assessmentMode: 'speaking'` para impedir classificação errada;
- `09763bd` encurtou o áudio para uma palavra, aceitou palavra/frase e moveu a frase completa para feedback posterior;
- `75a2318` aceitou tanto a letra isolada quanto “This is the letter X.”;
- o finalizador recente força `audioValue === correctValue` nos novos itens de listening-writing/shadowing, padrão correto, mas seleciona fontes sem limite de palavras e pode transformar texto/diálogo inteiro em alvo final.

Padrão editorial emergente recomendado: instrução explícita, `assessmentMode` explícito, áudio curto, resposta natural flexível, frase completa como apoio posterior e um objetivo por exercício.

Quanto às correções manuais feitas pelo administrador no Firestore: **Não é possível distinguir com segurança os exercícios corrigidos dos exercícios originais.** Existem `version`, `publishedAt`, `updatedAt`, histórico de versões e motivos editoriais no modelo, mas o conjunto remoto não pôde ser lido nesta auditoria. Alteração recente também não foi presumida correta.

## Parte 6 — Padrões de problemas repetidos

1. **52 conversões semânticas indevidas para shadowing.** L2: 8; L3: 10; L4: 10; L5: 6; L6: 10; L7: 8.
2. **7 respostas pessoais incompletas.** Todos em L5/Day 5; não há accepted answers capazes de acomodar conteúdo pessoal real.
3. **51 perguntas dependentes de contexto não reapresentado.** L3: 10; L8: 1; L9: 13; L10: 9; L11: 9; L12: 9. Inclui perguntas “Answer from the reading/dialogue” sem o texto no exercício corrente.
4. **18 alvos integrais com mais de 25 palavras.** Incluem ditado de 51 palavras, shadowing de 133 palavras e diálogos/textos de 26–120 palavras.
5. **5 alvos moderadamente longos (15–25 palavras).** `wb1_l6_final_v2_shadow_3`, `wb1_l9_d4_e2`, `wb1_l9_d4_e3`, `wb1_l10_d4_e1`, `wb1_l10_final_v2_shadow_6`.
6. **12 itens com `ain't`.** Conteúdo potencialmente válido, mas produção ativa é avançada para o estágio.
7. **32 itens com classificação fonética de `-ed`.** Progressão válida, carga metalinguística possivelmente avançada.
8. **0 gabaritos ausentes nas alternativas** entre os 565 itens de múltipla escolha/identificação.
9. **0 ditados com áudio diferente do gabarito** nos itens explicitamente classificados como listening-writing.
10. **Final Test automático sem teto de extensão.** O finalizador pode selecionar passagem/diálogo inteiro porque filtra conteúdo e diversidade, mas não comprimento.

## Parte 7 — Proposta de critérios editoriais

1. `assessmentMode` deve ser explícito em todo `speaking` e `writing` auditivo.
2. Shadowing/repeat/listen-write: `correctValue` deve equivaler ao áudio; accepted answers só adicionam variantes de transcrição, nunca outra tarefa.
3. SAME/DIFFERENT: tipo listening/choice, instrução explícita, opções `same/different`, gabarito correspondente; repetição é outro exercício.
4. Um exercício A1 deve conter todo o contexto necessário ou oferecer replay/texto do trecho relevante.
5. Produção pessoal deve declarar o grau de liberdade e usar validação por padrão/slots, não gabarito incompleto.
6. Repetição guiada: preferir 1–10 palavras; acima de 15, segmentar. Ditado: preferir palavra/frase curta.
7. Textos longos podem existir como leitura, mas não como um único alvo de fala/escrita; perguntas devem manter a leitura acessível.
8. O finalizador automático deve respeitar limites de palavras e excluir passagens/diálogos inteiros de shadowing/ditado.
9. Transformações quantitativas não podem mudar o objetivo pedagógico. Se faltar um tipo, deve-se autorar um exercício novo ou conservar o original.
10. Toda publicação deve armazenar objetivo pedagógico, modo, versão, motivo e teste de invariantes instrução↔áudio↔gabarito.

## Parte 8 — Prioridade de correção

### P0 — 59 itens

- corrigir os 52 itens da matriz P0-A;
- corrigir os 7 prompts incompletos de L5/Day 5;
- prioridade imediata: L3/Day 4, especialmente `wb1_l3_d4_e1`–`e10`.

### P1 — 51 itens

- L3/Day 6 (`e1`–`e10`): reapresentar uma frase curta de contexto;
- L8 `wb1_l8_d5_e5`;
- L9 `wb1_l9_d4_e4`–`e7` e `wb1_l9_d6_e2`–`e10`;
- L10/L11/L12 Day 6 `e2`–`e10`: manter leitura/áudio relevante disponível.

### P2 — 65 itens

- 60 itens avançados: 15 em L8, 2 em L9, 2 em L10, 5 em L11, 35 em L12 e 1 final-test em L6;
- 5 shadowings moderadamente longos listados na Parte 6.

### P3

Nenhum item recebeu apenas melhoria cosmética; as melhorias encontradas afetam clareza, carga ou coerência.

## Menor conjunto de mudanças capaz de tornar o WB1 consistente

1. Impedir `toSpeakingExercise` de converter indiscriminadamente Day 4 das Lessons 2–7; preservar tipo/tarefa original ou criar conversão semanticamente segura com gabarito igual ao áudio.
2. Restaurar L3/Day 4 como SAME/DIFFERENT e, opcionalmente, adicionar shadowing separado dos mesmos pares.
3. Reautorizar os sete itens pessoais de L5 com contexto/slots e accepted answers naturais.
4. Fazer perguntas dependentes de leitura/diálogo carregarem o trecho relevante ou um replay local.
5. Adicionar teto de palavras ao gerador do Final Test e segmentar textos/diálogos longos.
6. Decidir pedagogicamente `ain't` e IPA de `-ed`; manter como reconhecimento se aprovados, não produção longa.
7. Antes de publicar, auditar também as sequências/overrides remotos e reconciliá-los com a base, pois eles podem prevalecer sobre o TypeScript.

Essas sete intervenções atacam os mecanismos, não apenas os 110 itens P0/P1 individualmente.

## Evidências técnicas principais

- `apps/main/src/data/workbook1/index.ts`: composição e transformações das 12 lições.
- `apps/main/src/data/shared/normalizeOfficialWorkbookLessons.ts`: `toSpeakingExercise` e conversão do Day 4.
- `apps/main/src/data/workbook1/lesson3.ts`: pares SAME/DIFFERENT originais.
- `apps/main/src/utils/speakingExercise.ts`: classificação e alvos aceitos para shadowing versus Q&A.
- `apps/main/src/components/UI.tsx`: feedback de erro usa `correctValue`.
- `apps/main/src/data/workbook1/finalizeWorkbook1Lesson.ts`: geração 8/6/6 do Final Test sem limite de extensão.
- `apps/main/src/components/ExercisePractice/ExercisePractice.tsx`: carregamento conjunto de sequência e overrides publicados.
- `apps/main/src/services/dayExerciseAuthoringService.ts` e `exerciseOverrideService.ts`: coleções, versionamento e merge remoto.

