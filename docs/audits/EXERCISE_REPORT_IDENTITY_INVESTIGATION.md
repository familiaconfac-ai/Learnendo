# Investigação de identidade: denúncia → editor → Sandbox

Data: 2026-08-04  
Escopo: `wb1_l2_final_v2_speak_1`, Workbook 1, Lesson 2, Day 7  
Restrição observada: nenhum conteúdo curricular foi alterado, publicado ou enviado ao Firestore.

## Conclusão

A primeira divergência ocorre depois que a denúncia é salva e antes da abertura do editor. O aluno renderiza a sequência pública do dia e os overrides públicos; a denúncia salva um snapshot fiel do objeto que estava em `currentExercise`. O painel administrativo, entretanto, resolvia novamente o exercício no currículo empacotado e podia usar `currentExerciseIndex` quando o ID não fosse encontrado. O editor então carregava documentos editoriais pelo ID sobre essa nova base. Eram, portanto, fontes diferentes combinadas silenciosamente.

O defeito estrutural comprovado é o uso de IDs finais gerados por posição (`..._speak_1`, `..._speak_2`, `..._speak_3`) junto com uma resolução administrativa que não priorizava a publicação vista pelo aluno. Quando o pool é regenerado/reordenado, o sufixo mantém aparência estável, mas passa a designar outro conteúdo semântico. O fallback por índice ampliava o problema ao permitir que um ID ausente abrisse outro exercício.

## Conteúdo encontrado

O snapshot fornecido para a denúncia registra:

- ID: `wb1_l2_final_v2_speak_1`
- tipo/modo/fase: `speaking` / `speaking` / `review`
- instrução: `Listen and repeat.`
- áudio, texto e resposta: `I sit on a rock.`

O currículo empacotado atual, gerado por `finalizeWorkbook1Lesson`, contém:

| ID | sourceExerciseId | instruction | audioValue | correctValue |
|---|---|---|---|---|
| `wb1_l2_final_v2_speak_1` | `wb1_l2_d6_e1` | `Listen and answer aloud in English.` | `Which article completes this sentence: "It is ___ apple"?` | `an` |
| `wb1_l2_final_v2_speak_2` | `wb1_l2_d6_e2` | `Listen and answer aloud in English.` | `Which article completes this sentence: "It is ___ kite"?` | `a` |
| `wb1_l2_final_v2_speak_3` | `wb1_l2_d6_e4` | `Listen and answer aloud in English.` | `Which article completes this sentence: "I sit on ___ rock"?` | `a` |

Isso prova que o texto de TTS observado no editor/Sandbox pertence semanticamente ao conteúdo atual de `speak_3`, enquanto o relatório nomeia `speak_1`. O repositório não contém busca por `includes`, `startsWith`, remoção de sufixo ou correspondência parcial nesse fluxo; a resolução correta usa igualdade estrita. A rota perigosa era o fallback explícito para `currentExerciseIndex`.

## Fluxo antes da correção

### 1. Aluno e criação da denúncia

1. `ExercisePractice` começa com o currículo local.
2. Consulta `publishedDayExerciseSequences/{scopeId}`.
3. Consulta `publishedExerciseOverrides` por `workbookId + lessonId + dayId + language`.
4. `resolveAuthoredDayExercises` usa a sequência publicada inteira quando existe e aplica override somente por igualdade exata de `exerciseId`.
5. A denúncia usa o objeto `currentExercise = resolvedExercises[currentIdx]`.
6. `createExerciseReport` grava `exerciseReports/{reportId}`.

O documento da denúncia contém ID, workbook/lesson/day, índice, tipo, modo, fase e snapshot de `instruction`, `displayedText`, `audioText`, `options`, `expectedAnswer` e `acceptedAnswers`. Não contém a versão da sequência publicada, caminho de origem nem `sourceExerciseId`. Logo, o conteúdo histórico está preservado, mas relatórios antigos não permitem reconstruir documentalmente qual versão pública o originou.

### 2. Relatório administrativo

`listExerciseReports` lê `exerciseReports`, e a tela mostra diretamente os campos do snapshot. Ela não recalcula esses textos. Antes da correção, o título “Exercício relacionado” não deixava claro que esse conteúdo era histórico.

### 3. Editor

Antes da correção, `resolveReportedLocation` importava novamente `COURSE_WORKBOOKS` e chamava `findReportedExercise`. A função tentava igualdade exata, mas, se o ID não existisse, usava `currentExerciseIndex`. Em seguida, `ExerciseEditorModal` usava o exercício encontrado como base e consultava:

- `exerciseDrafts/{exerciseId}`
- `exerciseOverrides/{exerciseId}`
- `exerciseOverrides/{exerciseId}/versions/{version}`
- `exerciseReports` com `where('exerciseId', '==', exerciseId)`

O editor não carregava primeiro `publishedDayExerciseSequences/{scopeId}`, embora essa seja a fonte que substitui o dia para o aluno.

### 4. Sandbox

O Sandbox não realiza busca independente. Ele recebe `effective`, calculado no editor como base atual + campos de draft/publicado. Portanto, quando editor e relatório divergem, o Sandbox reproduz a divergência do editor. O componente não possuía estado separado de `sandboxExercise`, mas a hidratação assíncrona do editor não tinha geração/cancelamento e o componente não era chaveado por relatório/fonte.

## Fontes de verdade

| Uso | Fonte |
|---|---|
| o que o aluno viu | `publishedDayExerciseSequences/{scopeId}` quando válida; senão currículo empacotado; depois `publishedExerciseOverrides/{exerciseId}` |
| histórico da denúncia | snapshot em `exerciseReports/{reportId}` |
| rascunho por exercício | `exerciseDrafts/{exerciseId}` |
| publicação administrativa canônica | `exerciseOverrides/{exerciseId}` e subcoleção `versions` |
| projeção pública do override | `publishedExerciseOverrides/{exerciseId}` |
| sequência editorial do dia | `dayExerciseSequences/{scopeId}`, `dayExerciseSequenceDrafts/{scopeId}` e `publishedDayExerciseSequences/{scopeId}` |
| Sandbox | objeto `effective` do editor; nenhuma nova consulta |

`scopeId` é `courseId__language__w{workbookId}__lessonId__dayId`, com partes escapadas pela função `daySequenceScopeId`. Para este caso esperado: `english__en__w1__wb1_l2__wb1_l2_d7`.

## Correção implementada

- O painel agora consulta primeiro `publishedDayExerciseSequences/{scopeId}` e só aceita o `exerciseId` completo por igualdade exata.
- A base empacotada permanece fallback apenas quando não há sequência publicada contendo o ID.
- Um ID não vazio que deixou de existir não usa mais índice.
- Somente relatórios realmente legados (`exerciseId` vazio ou `not-informed`) podem usar índice, e a origem é marcada `legacy-index-fallback`.
- A localização leva `sourceCollection`, `documentPath`, `publicationVersion` e `resolutionKind` até o editor.
- Snapshot histórico, fonte atual, rascunho e publicação ficam rotulados separadamente.
- O editor mostra ID solicitado e ID retornado.
- Cada troca de relatório/fonte remonta o editor; a hidratação usa um contador de requisição e ignora respostas antigas.
- A troca de exercício fecha e limpa o Sandbox. O Sandbox é chaveado por ID e conteúdo e recebe o mesmo objeto `effective` exibido no editor.

## Evidência Firestore e limitação

Os caminhos e regras foram verificados no código. Não foi possível ler os documentos de produção nesta investigação: a sessão do navegador não estava autenticada e a conta ativa no Firebase CLI lista somente o projeto `app-ebd-85cd0`, não `learnendo-6f4d3`. Nenhuma tentativa de escrita foi feita.

Assim, não é possível afirmar, sem credenciais administrativas do projeto correto, se o TTS de `speak_3` estava armazenado sob `speak_1` em `publishedDayExerciseSequences`, `exerciseDrafts` ou `exerciseOverrides`. A falha de arquitetura e a divergência semântica no currículo atual estão comprovadas; o documento remoto específico continua sendo uma evidência pendente.

## Impacto

O risco abrange relatórios de qualquer dia cuja sequência publicada seja diferente do bundle atual, especialmente IDs finais gerados por posição e relatórios antigos cujo ID deixou de existir. Reordenação, regeneração do pool e publicação de sequência podem produzir a divergência. Busca parcial não foi encontrada nesse fluxo.

## Testes

- ID exato vence índice divergente.
- ID ausente não abre silenciosamente a posição antiga.
- fallback legado é explícito.
- IDs semelhantes (`speak_1`, `speak_2`, `speak_10`) não se confundem.
- reordenação preserva associação por ID.
- painel consulta a sequência publicada usada pelo aluno.
- snapshot histórico recebe rótulo próprio.
- editor é chaveado por relatório, ID e versão da fonte.
- resposta assíncrona antiga é descartada.
- fechar/trocar exercício limpa o Sandbox.
- Sandbox é remontado a partir do mesmo ID e conteúdo efetivo do editor.

Resultados: `test:exercise-reports`, `test:exercise-overrides` e `npm run build` passaram. `tsc --noEmit` continua falhando apenas em erros preexistentes fora deste escopo, listados na entrega da investigação.
