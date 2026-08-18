# Workbook 1 — relatório de regressões pós-deploy

## Estado

- Correções implementadas localmente.
- Nenhum novo deploy realizado.
- Auditoria do resultado renderizado: 12 lições, 1.200 exercícios, 0 violações detectadas.

## 1. Causa dos greetings no início da Lição 1

O pipeline anterior aplicava `normalizeLessonsToOfficialTrails` à L1 e depois ordenava todos os 80 exercícios de prática por um ranking genérico de tipo. Os exercícios de letras tinham instrução de listening e recebiam rank posterior. Greetings de múltipla escolha, sem a palavra `listen`, recebiam rank anterior e eram deslocados para o início.

Antes da correção, as posições 1–16 eram compostas pelos IDs sintéticos:

- `wb1_l1_d5_e1` a `wb1_l1_d5_e10`;
- `wb1_l1_d6_e1`, `e2`, `e7`, `e8`, `e9` e `e10`.

Esses IDs continham Hello, Good morning, How are you, perguntas de nome, Nice to meet you, Good afternoon, Good night e Good evening. O alfabeto só aparecia na posição 26.

## 2. Correção curricular de L1

L1 passou a usar uma composição explicitamente autorada em `lesson1Authored.ts`. O finalizador não ordena mais a prática por tipo.

| Faixa | Dia | Conteúdo renderizado corrigido |
|---|---:|---|
| 1–10 | 1 | apresentação visual de letras A–J |
| 11–15 | 1 | apresentação visual de números 1–5 |
| 16–25 | 2 | reconhecimento de letras K–T |
| 26–30 | 2 | reconhecimento de números 6–10 |
| 31–36 | 3 | escrita de letras U–Z |
| 37–40 | 3 | escrita de números 11–14 |
| 41–45 | 3 | singular/plural: letter, number, letters, numbers |
| 46–55 | 4 | apresentação visual das dez cores |
| 56–70 | 5 | escrita visual e escrita guiada de cores |
| 71–77 | 6 | listening de cores |
| 78–80 | 6 | shadowing de cores |
| 81–100 | 7 | Final Test explicitamente autorado, 8/6/6 |

Greetings não aparecem mais na L1.

## 3. Histórico visual de erros

O componente usava somente o status final `mastered`. Quando o aluno corrigia, o verde substituía visualmente o erro anterior.

O motor agora mantém `incorrectAttempts` por exercício. Cada erro incrementa o contador; o acerto muda o domínio para `mastered`, remove o ID da fila e preserva o contador. A bolinha usa laranja sempre que `incorrectAttempts > 0`, inclusive após o acerto. O estado é serializado com o run ativo e restaurado após reload.

O resumo distingue:

- precisão de primeira tentativa;
- total de tentativas erradas;
- exercícios corrigidos;
- exercícios dominados.

O Final Test também informa erros e correções por habilidade.

## 4. Sequência corrigida das cores

1. Dia 4: estímulo visual + palavra escrita + reconhecimento, para red, blue, green, yellow, orange, black, white, purple, pink e brown.
2. Dia 5: escrita com apoio visual para as dez cores.
3. Dia 5: escrita guiada adicional para red, blue, green, yellow e orange.
4. Dia 6: listening + escolha para red, blue, green e yellow.
5. Dia 6: listening + writing para orange, black e white.
6. Dia 6: shadowing para purple, pink e brown.
7. Final Test: listening-writing, shadowing e speaking somente após a prática.

`watercolor` e `zip` não aparecem na sequência de cores corrigida.

## 5. Outras lições

O ranking global afetava potencialmente a ordem dos 80 itens em todas as 12 lições. Ele foi removido. L2–L7 ainda passam pelo normalizador legado, mas cada exercício agora registra `sourceExerciseId` e origem; não há concatenação entre lições. L8–L12 tinham 100 casos de IDs de Final Test reutilizados com conteúdo transformado. Os Final Tests gerados de L2–L12 agora usam IDs versionados `final_v2`, eliminando essas colisões.

O Final Test de cada lição é validado contra os valores presentes nos 80 exercícios de prática da mesma lição.

## 6. Persistência

Nenhuma chave ou registro de progresso antigo é excluído. IDs antigos cujo conteúdo era incorreto permanecem no armazenamento, mas não são associados a conteúdo novo diferente. A migração v3 continua lendo v2/v1 e preservando registros antigos.

## 7. Validação

- `test:exercise-flow`: 43 testes aprovados.
- `test:answer-normalization`: 16 testes aprovados.
- Total: 59 testes aprovados.
- Auditoria renderizada: 1.200 linhas, 0 violações.
- Build Vite: aprovado, 781 módulos.
- TypeScript: somente os 14 erros preexistentes fora deste fluxo.
- `git diff --check`: aprovado.

O teste visual local ficou bloqueado por `spawn EPERM` ao iniciar o servidor Vite no ambiente de navegador. O bundle de produção e o bundle independente de auditoria foram gerados com sucesso.

## 8. Artefatos

- `WORKBOOK1_RENDERED_SEQUENCE.tsv`: sequência completa L1–L12.
- `WORKBOOK1_L1_RENDERED_SEQUENCE.tsv`: tabela completa das 100 posições de L1.
- `WORKBOOK1_COLOR_SEQUENCE.tsv`: todas as ocorrências classificadas como cores.
- `WORKBOOK1_RENDERED_ISSUES.json`: lista de violações; resultado atual `[]`.
