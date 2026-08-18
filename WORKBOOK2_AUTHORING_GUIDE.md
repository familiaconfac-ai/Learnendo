# Workbook 2 - Regras de Autoria

Este guia registra o padrao que deve ser seguido ao criar o Workbook 2 no app.

## Estrutura de cada licao

Cada licao deve ter 7 dias/trilhas:

1. `d1` - introducao do conteudo
2. `d2` - pratica guiada
3. `d3` - pratica guiada
4. `d4` - leitura, uso ou compreensao
5. `d5` - speaking curto e objetivo
6. `d6` - revisao mista
7. `d7` - teste final da licao

## Padrao de quantidade

Para o Workbook 2, usar a padronizacao:

- `d1`: 25 exercicios
- `d2`: 10 exercicios
- `d3`: 10 exercicios
- `d4`: 10 exercicios
- `d5`: 10 exercicios
- `d6`: 10 exercicios
- `d7`: 25 exercicios

Total por licao: 100 exercicios.

Observacao:
O motor do app calcula nota por percentual, nao exige 100 exercicios tecnicamente.
Mesmo assim, o Workbook 2 deve seguir esse padrao para manter consistencia pedagogica.

## Speaking

Regras obrigatorias:

- Frases curtas.
- Sem blocos longos de memoria.
- O aluno precisa ouvir e repetir rapido.
- Evitar speaking com 3 frases longas encadeadas.

Bom:

- `It is twenty.`
- `I am here.`
- `My birthday is in May.`
- `She is in the kitchen.`

Ruim:

- paragrafo inteiro
- dialogo longo em uma unica tentativa
- resposta que depende de memorizar varias informacoes ao mesmo tempo

## Variantes aceitas em speaking

Exercicios de speaking devem aceitar variacoes corretas quando o sentido for o mesmo.

Exemplos:

- `It is twenty.`
- `It's twenty.`
- `It is 20.`
- `It's 20.`

Outro exemplo:

- `I am twenty years old.`
- `I'm twenty years old.`
- `I am 20 years old.`
- `I'm 20 years old.`

Para isso, usar:

- `correctValue` para a resposta principal
- `acceptedAnswers` para as variantes corretas

## Writing de ditado

Quando o exercicio for "escreva exatamente o que ouviu", a resposta deve seguir a forma ouvida.

Exemplos:

- se o audio disser `I am twenty years old`, nao aceitar `I'm twenty years old`
- se o audio disser `I'm twenty years old`, nao aceitar `I am twenty years old`

Ou seja:

- ditado = forma exata
- speaking = variantes aceitas

## Exercicios de traducao

O Workbook 2 deve incluir exercicios de traducao.

Formato sugerido:

- audio ou frase em ingles
- aluno responde em portugues
- aceitar mais de uma formulacao correta quando o portugues permitir

Exemplo:

- audio/texto: `I am here.`
- respostas aceitas:
  - `Estou aqui.`
  - `Eu estou aqui.`

Outro exemplo:

- audio/texto: `She is in the kitchen.`
- respostas aceitas:
  - `Ela esta na cozinha.`
  - `Ela esta na cozinha.`

Observacao:
Pode aceitar variacoes de maiusculas/minusculas e pontuacao final, mas sem mudar o sentido.

## Como modelar no codigo

Exemplo de speaking com variantes:

```ts
{
  id: 'wb2_l13_d5_e1',
  type: 'speaking',
  instruction: 'Listen and repeat exactly as you hear.',
  audioValue: 'It is twenty.',
  correctValue: 'It is twenty.',
  acceptedAnswers: ['It\\'s twenty.', 'It is 20.', 'It\\'s 20.']
}
```

Exemplo de traducao:

```ts
{
  id: 'wb2_l13_d4_e6',
  type: 'writing',
  instruction: 'Translate to Portuguese.',
  audioValue: 'I am here.',
  displayValue: 'I am here.',
  correctValue: 'Estou aqui.',
  acceptedAnswers: ['Eu estou aqui.']
}
```

Exemplo de ditado exato:

```ts
{
  id: 'wb2_l13_d2_e8',
  type: 'writing',
  instruction: 'Type exactly what you hear.',
  audioValue: 'I am twenty years old.',
  correctValue: 'I am twenty years old.'
}
```

## Faixa curricular do Workbook 2

O PDF `Wbk 2 (A1).pdf` corresponde ao bloco de 12 licoes:

- Lesson 13
- Lesson 14
- Lesson 15
- Lesson 16
- Lesson 17
- Lesson 18
- Lesson 19
- Lesson 20
- Lesson 21
- Lesson 22
- Lesson 23
- Lesson 24

Essas licoes devem ser convertidas para o padrao acima antes de entrar no app.
