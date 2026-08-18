# Workbook 1 - Fonte do Conteudo

Este arquivo resume onde esta o conteudo oficial do Livro 1 e como ele foi montado no projeto.

## 1. Fonte oficial do Livro 1

O conteudo-base do Livro 1 esta em:

- `apps/main/src/data/workbook1/index.ts`
- `apps/main/src/data/workbook1/lesson1.ts`
- `apps/main/src/data/workbook1/lesson2.ts`
- `apps/main/src/data/workbook1/lesson3.ts`
- `apps/main/src/data/workbook1/lesson4.ts`
- `apps/main/src/data/workbook1/lesson5.ts`
- `apps/main/src/data/workbook1/lesson6.ts`
- `apps/main/src/data/workbook1/lesson7.ts`
- `apps/main/src/data/workbook1/lesson8.ts`
- `apps/main/src/data/workbook1/lesson9.ts`
- `apps/main/src/data/workbook1/lesson10.ts`
- `apps/main/src/data/workbook1/lesson11.ts`
- `apps/main/src/data/workbook1/lesson12.ts`

O arquivo `index.ts` registra o Livro 1 completo com 12 licoes.

## 2. Licoes existentes no Livro 1

1. Lesson 1: The Alphabet and Numbers
2. Lesson 2: A Day in Nature
3. Lesson 3: Daily Routines and Activities
4. Lesson 4: Ordinal Numbers and Sequence
5. Lesson 5: Personal Information and To Be
6. Lesson 6: Greetings
7. Lesson 7: Days, Months, and Dates
8. Lesson 8: Spoken Patterns
9. Lesson 9: Practical Speaking
10. Lesson 10: Months and Seasons
11. Lesson 11: Asking Questions
12. Lesson 12: Past Tense Regular Verbs

## 3. Como o conteudo foi feito

Pelo codigo e pelo historico Git, o Livro 1 principal foi construido manualmente em arquivos TypeScript, licao por licao, com objetos estruturados no formato:

- `Lesson`
- `days`
- `exercises`

Cada exercicio traz campos como:

- `id`
- `type`
- `instruction`
- `audioValue`
- `correctValue`
- `options`
- `displayValue`
- `translation`
- `isNewVocab`

Ou seja: o conteudo nao esta vindo automaticamente de um PDF dentro da trilha principal do app. O PDF aparece como uma possibilidade de importacao futura ou como ferramenta separada no `lab`, mas o Workbook 1 oficial esta escrito diretamente no codigo.

## 4. Como outras linguas reaproveitam esse conteudo

As outras versoes do Livro 1 usam o ingles como base oficial e sao derivadas de:

- `apps/main/src/courses/shared/replicatedWorkbook1.ts`

Ali o projeto:

1. importa as 12 licoes em ingles;
2. define `BASE_LESSONS` como fonte autoritativa;
3. aplica `lessonTitles` e `replacements` por idioma;
4. gera o workbook de Portugues, Espanhol, Grego e Hebraico a partir dessa base.

Entao, para criar textos ou reconstruir PDF, a melhor base e o Livro 1 em ingles dentro de `apps/main/src/data/workbook1`.

## 5. Ferramenta separada de PDF no Lab

Existe uma trilha separada para importar PDF e transformar texto em rascunho de licao:

- `apps/lab/src/sections/Import/index.tsx`
- `apps/lab/src/engine/lessonParser.ts`
- `apps/lab/src/engine/lessonBuilder.ts`

Fluxo dessa trilha:

1. extrai texto do PDF;
2. faz parse heuristico do conteudo;
3. detecta vocabulario, estruturas e exercicios;
4. gera itens suplementares automaticamente;
5. salva um pack importado.

Essa trilha e util para gerar rascunhos a partir de PDF, mas nao parece ser a fonte canonica usada para escrever o Livro 1 principal.

## 6. Evidencias no historico Git

Alguns commits mostram claramente a construcao manual e incremental das licoes:

- `be556db` - Lesson 1 day 1 finalized with letters + numbers and audio improvements
- `ad6f1b2` - complete lesson 1
- `f812da8` - finish lesson 1 final test and completion flow
- `fb04271` - Rewrite Lesson 2: A Day in Nature
- `51ab4b0` - Fix Lesson 3 exercise patterns

## 7. Recomendacao pratica

Se o objetivo e montar o PDF com base no que ja foi feito, use esta ordem:

1. `apps/main/src/data/workbook1/index.ts` para a visao geral do livro;
2. `apps/main/src/data/workbook1/lesson1.ts` ate `lesson12.ts` para o conteudo real;
3. `apps/main/src/courses/shared/replicatedWorkbook1.ts` se voce quiser entender como o mesmo material foi adaptado para outras linguas.

Se precisar, o proximo passo natural e gerar um unico arquivo consolidado em `.md` ou `.json` com as 12 licoes prontas para diagramacao em PDF.
