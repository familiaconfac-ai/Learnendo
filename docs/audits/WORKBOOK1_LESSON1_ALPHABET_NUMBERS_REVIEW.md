# Workbook 1 - Lição 1: revisão de alfabeto e números

## Fonte

O PDF citado não estava presente nos anexos disponíveis. A implementação seguiu integralmente as regras textuais fornecidas. O arquivo legado `lesson1.ts` foi mantido apenas para proveniência; o runtime usa `lesson1Authored.ts`.

## Escopo renderizado

- Alfabeto A-Z.
- Números 0-20.
- `letter` versus `number`.
- `This is the letter X.` e `This is the number ...`.
- `It is a letter.`, `It is a number.`, `They are letters.`, `They are numbers.`.
- Perguntas e respostas Yes/No.
- Nenhum greeting, nome, informação pessoal, mês, data, cor ou operação.

## Ordem das 100 posições

| Posições | Dia | Conteúdo |
|---|---:|---|
| 1-15 | 1 | apresentação visual, áudio e reconhecimento de A-O |
| 16-26 | 2 | apresentação visual, áudio e reconhecimento de P-Z |
| 27-30 | 2 | apresentação visual e áudio de 0-3; escolha de dígito |
| 31-37 | 3 | apresentação visual e áudio de 4-10; escolha de dígito |
| 38-40 | 3 | apresentação de 11-13; escolha da palavra |
| 41 | 3 | fourteen; contraste diagnóstico 4/14/40/44 |
| 42-45 | 3 | apresentação de 15-18; escolha da palavra |
| 46-47 | 4 | apresentação de 19-20; escolha da palavra |
| 48-55 | 4 | Yes/No para A-H |
| 56-70 | 5 | Yes/No para I-W |
| 71-73 | 6 | Yes/No para X-Z |
| 74 | 6 | Yes/No com four/fourteen |
| 75-76 | 6 | escrita simples de seven e sixteen |
| 77-79 | 6 | shadowing: letters, numbers e twenty |
| 80 | 6 | produção oral: `It is a number.` |
| 81-88 | 7 | Final Test: 8 listening-writing |
| 89-94 | 7 | Final Test: 6 shadowing |
| 95-100 | 7 | Final Test: 6 speaking |

A tabela campo a campo está em `WORKBOOK1_L1_RENDERED_SEQUENCE.tsv`.

## Cobertura de letras

Cada letra A-Z possui:

- símbolo em `displayValue`;
- áudio isolado seguido do modelo `This is the letter X.`;
- quatro alternativas de contraste;
- um exercício Yes/No posterior;
- feedback completo que preserva `Yes, it is.` ou `No, it is not.`.

Grupos solicitados como A/E/H/R, B/D/P/V, G/J/K/Z, M/N/L/W e I/Y/E/A foram incorporados. Letras fora desses grupos receberam contrastes fonéticos ou visuais próximos.

## Cobertura de números

- 0-10: áudio para escolha de dígito.
- 11-13 e 15-20: áudio para escolha de palavra.
- 14: modelo diagnóstico solicitado, com 4/14/40/44.
- Escrita: seven e sixteen.
- Yes/No: four versus fourteen.
- Shadowing: `They are numbers.` e `This is the number twenty.`.
- Produção: `It is a number.`.

Números acima de 20 aparecem somente como distratores diagnósticos, nunca como resposta ou conteúdo ensinado.

## Conteúdo removido

Os greetings do arquivo legado continuam fora do runtime, incluindo os antigos IDs `wb1_l1_d6_e1` a `e10` e os greetings do review `d7_e4`, `e9`, `e14`, `e19` e `e24`. Cores e operações também foram removidas da L1 renderizada.

## Áudio das instruções

Todas as instruções foram reduzidas a comandos curtos. O componente possui agora um controle `Play instruction` que lê a instrução separadamente do áudio-alvo.

## Fila e bolinhas

- Cada erro incrementa `incorrectAttempts` e mantém a bolinha laranja.
- O ID permanece na fila enquanto a resposta estiver errada.
- Um acerto domina o exercício, remove o ID da fila e preserva o contador de erros.
- Continue avança imediatamente após o acerto.
- O estado serializado preserva fila e erros no reload.
- Há testes explícitos para 1, 2 e 4 erros antes do acerto.

## Validação

- 49 testes do fluxo aprovados.
- 16 testes de normalização aprovados.
- 65 testes aprovados no total.
- Auditoria: 12 lições, 1.200 linhas e 0 violações.
- L1: 100 exercícios; A-Z completos; 0-20 completos; 26 exercícios Yes/No de letras.
- Final Test: 8/6/6 e somente conteúdo modelado anteriormente.
- Build: aprovado, 781 módulos.
- TypeScript: somente os 14 erros preexistentes fora deste fluxo.
- Nenhum deploy realizado.
