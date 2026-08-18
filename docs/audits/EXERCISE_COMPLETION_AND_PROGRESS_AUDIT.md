# Auditoria de conclusão de exercícios e progresso

Data: 2026-07-14  
Escopo: fluxo de prática, conclusão, avanço, pontuação, persistência e gamificação, com implementação inicial no Workbook 1.

## Diagnóstico do incidente de produção

A causa direta reproduzida estava em `apps/main/src/components/UI.tsx`: `promptAudioText` era lida ao calcular `isQuestionDrivenSpeaking` antes da declaração `const promptAudioText = ...`. Como a variável estava na temporal dead zone de JavaScript, qualquer render que percorresse esse bloco podia lançar `ReferenceError: Cannot access 'promptAudioText' before initialization`. Sem um boundary local, a árvore de prática desaparecia, produzindo a tela branca/azul-escura relatada.

Havia ainda uma segunda saída insegura em `ExercisePractice`: quando `currentIdx >= exercises.length`, o componente retornava `null`. Embora nominalmente “impossível”, qualquer divergência entre estado, recarga e lista de exercícios transformava isso em uma tela vazia sem recuperação.

Foi criado primeiro um teste de regressão em estado falho. Ele demonstrou a ordem inválida e também proíbe a volta do `return null`. Após a correção, os dois testes passam.

## Fluxo após a correção

1. O aluno responde; toda tentativa é contabilizada pelo callback já existente de `PracticeSection`.
2. Uma resposta errada mantém o exercício atual e incrementa tentativas/erros.
3. Ao acertar e tocar em continuar, a conclusão é reduzida localmente por uma função pura e idempotente.
4. O registro é salvo imediatamente em `localStorage`, separado por usuário, sem bloquear a interface.
5. A tela exibe uma transição de 1,4 segundo, pulável; `prefers-reduced-motion` remove a espera.
6. O próximo exercício é exibido. Ao concluir o último, aparece um resumo real do dia.
7. Somente ao continuar no resumo o fluxo existente conclui o dia. A navegação e o estado React/local continuam precedendo as gravações remotas.
8. Falha de cache ou Firestore não desmonta a interface. Falha de cache é informada no resumo; a persistência remota permanece assíncrona e protegida pelos caminhos já existentes.

## Estados visuais

O indicador superior usa chaves estáveis de exercício:

| Estado | Representação |
|---|---|
| concluído | verde |
| atual | azul com anel branco |
| ainda não alcançado/bloqueado na sequência | cinza |
| inconsistência recuperável | cartão de erro com retorno à lição |

## Matriz de sistemas encontrados

| Sistema | Fonte atual | Regra | Integridade observada | Decisão |
|---|---|---|---|---|
| conclusão por exercício | novo `exerciseCompletionEngine` + cache versionado | uma chave por workbook/lição/dia/exercício | idempotente; repetição vale zero | fonte local imediata do fluxo e dos resumos |
| conclusão por dia (navegação) | `UserProgress.completedActivities` e `days` | marca o `dayId` e avança caminho | atualização otimista antes do Firestore | preservado |
| progresso hierárquico | chaves de exercício + catálogo publicado | deriva exercício → dia → lição → workbook | não depende de contadores mutáveis | implementado inicialmente para o workbook carregado |
| analytics do dia | `courseProgressEngine.DayEntry` | tentativas, erros e acurácia | agora recebe valores reais do exercício | fonte canônica de analytics remotos |
| fogo | `rebuildLessonStats` | dia concluído na data de desbloqueio | derivado dos registros de dia | preservado |
| gelo/freeze | `rebuildLessonStats` e legado weekly | conclusão posterior ao desbloqueio | nomes ainda divergem entre UI e modelo | preservar e migrar nomenclatura depois |
| diamante | `rebuildLessonStats` | score do dia igual a 100 | score continua significando conclusão, não acurácia | preservado; acurácia fica separada |
| estrelas | `fire + diamonds` | agregado derivado | consistente no engine canônico | preservado |
| streak | UI usa em partes como alias de `fire` | sem entidade canônica única | semântica ambígua | não criar nova regra nesta entrega |
| pontos de exercício | novo modelo | 10 na primeira tentativa; 6 após erro | idempotente por chave estável | exibido e agregado localmente |
| badges/conquistas | não foi encontrada fonte pedagógica canônica no fluxo | apenas rótulos/visuais dispersos | não confiável para premiação | nenhuma nova premiação criada |
| flat `progress/{uid}` | dashboard/ranking | agregados cumulativos | havia chamada incremental repetível | `trackLessonCompletion` agora é evitado em dia já concluído |
| vocabulário salvo pelo usuário | `vocabularyService` | traduções adicionadas pelo usuário | produto distinto de domínio pedagógico | não misturar com mastery |

## Regra de pontuação

- acerto na primeira tentativa: 10 pontos;
- acerto após uma ou mais tentativas erradas: 6 pontos;
- repetição de exercício já concluído: 0 ponto novo;
- speaking, listening/choice, writing, reading/identification e dialogue usam a mesma regra, evitando vantagem por modalidade;
- score do dia continua sendo percentual de exercícios concluídos, mantendo diamantes e compatibilidade;
- acurácia é calculada separadamente como `conclusões / tentativas` e enviada com tentativas e erros reais.

Não foram criados bônus por velocidade, áudio ou tamanho de resposta. Isso reduz incentivo a exploração e desigualdade entre dispositivos.

## Persistência e falhas

O cache usa `learnendo_exercise_progress_v1:{uid}`. JSON inválido, quota esgotada, armazenamento indisponível e usuário anônimo têm fallback seguro. Cada conclusão é copiada imutavelmente; a mesma chave não gera pontos de novo. Ao recarregar, o primeiro exercício incompleto é retomado; se todos estiverem concluídos, abre-se o resumo.

O fluxo remoto existente é mais fragmentado do que o ideal: `courseProgress/main`, documentos por curso/workbook, weekly progress e flat progress coexistem. A entrega não removeu caminhos legados por risco de produção. A arquitetura-alvo está descrita no documento de modelo.

## Testes executados

- regressão da temporal dead zone;
- fallback não vazio para índice inválido;
- conclusão normal;
- erro seguido de nova tentativa;
- idempotência/anti-farming;
- cinco tipos suportados;
- último exercício e resumo do dia;
- acurácia/tentativas/erros reais;
- recarga;
- usuário anônimo;
- falha de persistência;
- cache corrompido;
- vocabulário explícito versus texto incidental;
- progresso hierárquico de lição, workbook e curso planejado.

`npm run test:exercise-flow` passou. `npm run build` passou. `npm run lint` continua falhando por 13 erros preexistentes e fora deste escopo em Battle, Workspace, UI grammar e workbooks 5–7; nenhum erro novo desta alteração apareceu.

## Riscos e próximos passos

- sincronizar registros por exercício no Firestore para continuidade entre dispositivos; o cache atual garante resposta local e retomada no mesmo dispositivo;
- consolidar `weeklyProgress`, `courseProgress/main`, documentos hierárquicos e flat progress mediante migração versionada;
- estabelecer catálogo curricular de vocabulário com IDs explícitos para todo o Workbook 1, substituindo gradualmente a compatibilidade via `isNewVocab`;
- criar um error boundary restrito ao player para registrar e oferecer recuperação mesmo diante de falhas futuras de render;
- corrigir a constante legada de oito workbooks antes de ativar a visão global para os nove catálogos.
