# Auditoria de proveniência de conteúdo — Workbook 1

**Data da auditoria:** 14 de julho de 2026  
**Escopo:** Workbook 1 de inglês, seu conteúdo executável, variantes locais, histórico Git, artefato PDF e consumo pela aula/lousa.  
**Natureza:** investigação somente leitura; nenhuma alteração foi feita em código, conteúdo curricular, banco, regras ou configuração.

## 1. Parecer executivo

O Workbook 1 atualmente visto no aplicativo não veio de uma única versão editorial homogênea. Ele é uma composição de três momentos:

1. L1–L3 preservam uma linha antiga, criada e refinada em março de 2026. L2 e L3 não correspondem ao índice oficial atual; L1 corresponde apenas parcialmente.
2. L4–L7 foram preenchidas em junho e estão alinhadas nominal e tematicamente ao índice oficial, mas não existe no repositório evidência suficiente para afirmar que foram transcritas dos PDFs revisados.
3. L8–L12 foram criadas juntas em 12 de junho de 2026, com uma estrutura repetida e conteúdo bruto curto. São esqueletos curriculares utilizáveis como ponto de partida, não material final pronto para diagramação.

A fonte executável é o diretório `apps/main/src/data/workbook1`. O `index.ts` importa as 12 lições e, antes de exportá-las, passa todas pelo normalizador compartilhado (`apps/main/src/data/workbook1/index.ts:1-32`). O registro do Workbook e o registro do curso encaminham exatamente esse objeto ao aplicativo (`apps/main/src/data/workbookRegistry.ts:1-10`; `apps/main/src/courses/courseRegistry.ts:1-8`).

O único PDF de Workbook 1 encontrado é um fragmento de três páginas, numeradas visualmente 04–06, todas de **Lesson 3 — Cardinal Numbers**. Existem duas cópias binariamente idênticas. Esse artefato não é a fonte de execução: a L3 ativa continua sendo **Daily Routines**. Logo, ao menos a L3 revisada não foi transferida para o app.

O app contém 100 exercícios aparentes por lição, mas isso não significa 100 exercícios autorais brutos. L6–L12 possuem apenas 43–49 exercícios brutos cada; o normalizador chega a 100 reaproveitando exercícios em dias diferentes, alterando tipos e atribuindo novos IDs posicionais. L1–L5 já tinham 100 ou mais, mas também sofrem cortes, duplicações, deslocamentos e conversões.

### Veredito resumido

| Questão | Resultado |
|---|---:|
| Linhagens/conjuntos de artefatos encontrados | 5 |
| Fonte executável completa | 1 |
| Lições que correspondem plenamente ao índice oficial | 8 de 12 |
| Correspondência parcial | 2 de 12 |
| Não correspondem | 2 de 12 |
| Lições que dependem do normalizador para chegar a 100 | 7 de 12 |
| Lições afetadas semanticamente pelo normalizador | 12 de 12 |
| Transferências comprováveis dos PDFs revisados L1–L7 | 0 |
| Lições claramente genéricas/recicladas | 1 (L9) |
| Lições finas e dependentes de molde | 7 (L6–L12) |

## 2. Critérios e limites

Foram inspecionados:

- o relatório sistêmico anterior, `docs/audits/LEARNENDO_SYSTEM_AUDIT.md`, integralmente;
- os arquivos ativos de L1–L12 e seu `index.ts`;
- o normalizador compartilhado;
- todas as cópias locais encontradas por nome, conteúdo e hash;
- o histórico Git por arquivo, commit e diff relevante;
- os registros de workbook/curso e os consumidores da tela e da lousa;
- o PDF encontrado, por hash e renderização visual das três páginas.

As categorias usadas são:

- **Fato:** demonstrável diretamente em arquivo, hash, importação ou histórico Git.
- **Inferência:** conclusão sustentada pela convergência das evidências, mas sem documento de autoria que a declare.
- **Recomendação:** próximo passo sugerido; não foi implementado nesta auditoria.

Limites importantes:

- Os PDFs revisados completos de L1–L7 não estão presentes no repositório examinado. Portanto, não é possível provar transferência de L1, L2, L4, L5, L6 ou L7 a partir desses PDFs.
- O histórico Git prova quando o código entrou no repositório; não prova, sozinho, quem redigiu pedagogicamente cada frase ou qual ferramenta foi usada.
- A inspeção da lousa foi estática. Abrir ou iniciar uma aula poderia gravar estado operacional e ficaria fora do escopo somente leitura.

## 3. Índice oficial usado como referência

| Lição | Título oficial |
|---:|---|
| 1 | The Alphabet and Numbers |
| 2 | Vowels |
| 3 | Cardinal Numbers |
| 4 | Ordinal Numbers |
| 5 | Personal Information |
| 6 | Greetings |
| 7 | Days, Months, & Dates |
| 8 | Spoken Patterns |
| 9 | Practical Speaking |
| 10 | Months & Seasons |
| 11 | Asking Questions |
| 12 | Past Tense Regular Verbs |

Esse índice foi fornecido como referência oficial para a auditoria e prevalece sobre guias locais anteriores.

## 4. Qual versão aparece no app

### 4.1 Cadeia de importação ativa

**Fato.** A cadeia ativa é única:

1. `apps/main/src/data/workbook1/index.ts:1-12` importa L1–L12.
2. `apps/main/src/data/workbook1/index.ts:13` importa `normalizeLessonsToOfficialTrails`.
3. `apps/main/src/data/workbook1/index.ts:16-32` monta o objeto e exporta as lições já normalizadas.
4. `apps/main/src/data/workbookRegistry.ts:1-10` registra esse workbook.
5. `apps/main/src/courses/courseRegistry.ts:1-8` associa o registro ao curso de inglês.
6. `apps/main/src/App.tsx:1387-1468` carrega dinamicamente o módulo de dados e resolve `workbook${currentWorkbookId}`.
7. `apps/main/src/App.tsx:2975-2992` entrega `currentWorkbook.lessons` ao `WorkbookView`.

**Conclusão factual.** A fonte de verdade operacional do Workbook 1 é:

`apps/main/src/data/workbook1/`

Não foi encontrada segunda rota ativa de conteúdo inglês concorrendo com essa cadeia.

### 4.2 O que a interface mostra

`apps/main/src/components/WorkbookView.tsx:44-54` cria 12 posições para o Workbook 1 e usa a lição real quando ela existe. Como a fonte ativa possui L1–L12, não há placeholders visuais para essas lições. Títulos e botões são montados em `WorkbookView.tsx:111-164`.

Para usuários não administradores, o desbloqueio é sequencial (`WorkbookView.tsx:65-72`). Para administradores, as lições ficam acessíveis. A seleção de lição e dia é repassada em `App.tsx:2995-3045`.

**Fato.** As 12 lições vistas no app são as 12 lições normalizadas do diretório ativo, não uma renderização do PDF.

## 5. Quantas versões existem

Foram identificadas **cinco linhagens/conjuntos de artefatos**. “Linhagem” é mais preciso que contar cada cópia física como versão, porque algumas cópias têm hash idêntico.

### A. Aplicativo principal ativo — 12 lições

- Caminho: `apps/main/src/data/workbook1/`
- Estado: completo em quantidade de arquivos; único conjunto executado pelo app principal.
- Particularidade: exportado sempre após normalização.

### B. Aplicativo antigo `apps/wbk-5` — 5 lições

- Caminho: `apps/wbk-5/src/data/workbook1/`
- Estado: aplicação separada, não importada pela cadeia ativa.
- L1–L3 são variantes antigas.
- L4 e L5 têm o mesmo conteúdo bruto das correspondentes ativas.

### C. Espelho aninhado em `Learnendo/` — 5 lições

- Caminhos: `Learnendo/apps/main/src/data/workbook1/` e `Learnendo/apps/wbk-5/src/data/workbook1/`.
- Estado: cópia histórica/aninhada, não importada pelo `apps/main` da raiz.
- O `Learnendo/apps/main` contém L1–L3 iguais às atuais, mas L4–L5 ainda são placeholders mínimos.
- O `Learnendo/apps/wbk-5` combina variantes antigas de L1–L3 com placeholders de L4–L5.

### D. Rascunho autônomo de L3 — Daily Routines

- Caminhos equivalentes incluem `LESSON_3_CONTENT.ts` e cópias aninhadas.
- `LESSON_3_CONTENT.ts:1-9` declara Lesson 3 como **Daily Routines** e oito “islands”.
- `LESSON_3_CONTENT.ts:269-288` contém instruções explícitas para copiar o conteúdo para constantes e sincronizar apps.
- O arquivo entrou no commit `559bfb0`, de 10 de março de 2026.

**Inferência forte.** Esse rascunho é a origem editorial/técnica da L3 antiga mantida no app; ele antecede a versão ativa e descreve o processo de migração.

### E. Fragmento PDF de L3 — Cardinal Numbers

- `Learnendo/Wbk 1 (A1) (26).pdf`
- `Learnendo/Learnendo/Wbk 1 (A1) (26).pdf`
- As duas cópias têm o mesmo hash binário.
- O arquivo tem três páginas; visualmente são as páginas internas 04, 05 e 06.
- Todas trazem cabeçalho **Unit 1 — Lesson 3 — Cardinal Numbers**.

**Fato.** O PDF contém objetivos, explicação de números 20–99, diálogos sobre idade/número, leitura e checagem. **Fato.** Nada disso substituiu a L3 Daily Routines na fonte ativa.

## 6. Histórico de autoria e evolução

### 6.1 Estado do repositório

Foram encontradas apenas a branch local `main` e sua referência remota `origin/main`; não há outra branch ou worktree local com uma fonte alternativa completa do Workbook 1.

Os commits relevantes estão atribuídos a Márcio no Git. Isso identifica o autor do commit, não necessariamente o redator pedagógico de todo o material.

### 6.2 Linha do tempo

| Data | Evidência Git | Efeito |
|---|---|---|
| 10 mar. 2026 | `559bfb0` | adiciona rascunho autônomo de L3 Daily Routines |
| 14 mar. 2026 | `edc02f4` e sequência inicial | cria a linha ativa antiga de L1–L3 |
| 24 mar. 2026 | `7adfaa7` | último refinamento identificado de L1 |
| 26 mar. 2026 | `fb04271` | reescreve L2 como **A Day in Nature**, afastando-a de Vowels |
| 26 mar. 2026 | `51ab4b0` | corrige padrões de exercício de L3 Daily Routines |
| 12 jun. 2026 | `952d5f8` | substitui placeholders e introduz conteúdo detalhado de L4/L5 |
| 12 jun. 2026 | `2c4221a` | complementa L5 |
| 12 jun. 2026 | `f5011aa` | cria L6 |
| 12 jun. 2026 | `f6156c2` | cria L7 |
| 12 jun. 2026 | `77f2ed0` | adiciona L8–L12 juntas e amplia o índice de 7 para 12 lições |
| 15 jun. 2026 | `b79b757` | introduz o normalizador e passa a envolver todas as lições |

### 6.3 O que essa história demonstra

**Fatos.**

- As 12 lições brutas existiam antes do normalizador.
- L8–L12 entraram juntas no mesmo commit, com estrutura muito semelhante.
- O normalizador foi acrescentado três dias depois e não é o gerador original dos arquivos, mas remodela o que o runtime entrega.
- A L2 ativa foi deliberadamente reescrita para “A Day in Nature”; o desalinhamento não decorre apenas de arquivo esquecido no índice.
- Uma variante antiga não ativa, `apps/wbk-5/src/data/workbook1/lesson2.ts:3-40`, ainda tem o título **Vowels and Early Reader** e exercícios de vogais curtas/longas. Ela se aproxima mais do índice oficial, embora depois derive para natureza e artigos (`lesson2.ts:47-127`).

**Inferências.**

- A simultaneidade, o vocabulário recorrente e o molde comum de L8–L12 são compatíveis com redação orientada por índice/template.
- Não foi encontrado script, prompt ou gerador que prove geração automática ou por IA. A auditoria não atribui a autoria a uma ferramenta sem evidência.

### 6.4 Guia local não é aprovação curricular

O arquivo local `WORKBOOK1_SOURCE_GUIDE.md:5-23` chama os arquivos ativos de fonte oficial; `WORKBOOK1_SOURCE_GUIDE.md:40-60` orienta manutenção manual em TypeScript, e `WORKBOOK1_SOURCE_GUIDE.md:62-75` trata replicação entre idiomas.

**Fato.** É um guia técnico local. **Conclusão.** Ele documenta o fluxo de manutenção do código, mas não comprova que cada lição foi aprovada pedagogicamente ou transferida de PDF. Além disso, o índice oficial fornecido para esta auditoria é posterior/mais específico e prevalece na avaliação de correspondência.

## 7. Correspondência com o índice oficial

### 7.1 Classificação consolidada

| Lição | Conteúdo ativo bruto | Correspondência | Fundamentação |
|---:|---|---|---|
| 1 | The Alphabet and Numbers | **Parcial** | cobre alfabeto e números, mas inclui blocos extensos de cores e greetings; o normalizador ainda omite partes do bruto |
| 2 | A Day in Nature | **Não corresponde** | foca natureza, demonstrativos e `a/an`; não ensina sistematicamente vogais curtas/longas |
| 3 | Daily Routines | **Não corresponde** | diverge do índice e do PDF disponível, ambos Cardinal Numbers |
| 4 | Ordinal Numbers | **Corresponde** | ordinais, datas, som de `th` e leitura/ordenação |
| 5 | Personal Information | **Corresponde** | dados pessoais, perguntas/respostas e `am/is/are` afirmativo |
| 6 | Greetings | **Corresponde** | saudações, despedidas, formalidade e diálogos |
| 7 | Days, Months, & Dates | **Corresponde** | calendário, datas e uso contextual de `to be` |
| 8 | Spoken Patterns | **Corresponde** | contrações e formas negativas de `to be` em fala guiada |
| 9 | Practical Speaking | **Parcial** | há prática oral, mas grande parte recicla greetings/personal information e o escopo é vago |
| 10 | Months & Seasons | **Corresponde** | meses, estações e `in/on/at` |
| 11 | Asking Questions | **Corresponde** | WH-words, perguntas com `to be`, diálogo e leitura |
| 12 | Past Tense Regular Verbs | **Corresponde** | formas regulares e pronúncias `/t/`, `/d/`, `/ɪd/` |

**Contagem:** 8 correspondem plenamente, 2 parcialmente e 2 não correspondem.

### 7.2 Observações pedagógicas essenciais

- **L1:** é um híbrido historicamente refinado, mas seu escopo excede a proposta oficial. Cores e greetings antecipam assuntos de outras lições.
- **L2:** é o maior conflito depois da L3. O título e o objetivo foram mudados no código ativo, enquanto uma variante antiga de vogais ficou fora da cadeia de importação.
- **L3:** é um conflito inequívoco de versão. O código conserva Daily Routines e o artefato editorial disponível diz Cardinal Numbers.
- **L4–L8, L10–L12:** o alinhamento temático não equivale a suficiência editorial. Especialmente L6–L12, o conteúdo bruto é curto.
- **L9:** funciona como revisão oral genérica do nível inicial, mas não estabelece progressão ou um conjunto próprio de situações práticas robustas.

## 8. O conteúdo bruto e o normalizado

### 8.1 Regra do normalizador

`apps/main/src/data/shared/normalizeOfficialWorkbookLessons.ts:3` fixa a distribuição dos sete dias em `15, 15, 15, 10, 15, 15, 15`, totalizando 100.

O algoritmo:

- pode converter itens para escrita (`normalizeOfficialWorkbookLessons.ts:19-29`);
- pode converter itens para fala (`normalizeOfficialWorkbookLessons.ts:32-43`);
- seleciona e reaproveita referências de exercícios (`normalizeOfficialWorkbookLessons.ts:66-95` e `:112-159`);
- substitui os sete dias originais (`normalizeOfficialWorkbookLessons.ts:161-199`);
- força o quarto dia para speaking e o quinto para writing;
- cria novos IDs posicionais para a saída (`normalizeOfficialWorkbookLessons.ts:104-108`).

**Fato.** Um mesmo exercício bruto pode aparecer em mais de um dia normalizado com ID novo e, às vezes, tipo novo. Isso produz variedade aparente sem criar um novo item pedagógico.

### 8.2 Medição por lição

“Fontes usadas” conta referências brutas únicas que sobrevivem. “Repetições” conta posições normalizadas adicionais que reutilizam uma referência já usada. “Movidos” conta posições cujo dia de origem difere do dia de destino. “Transformados” conta mudanças de tipo realizadas pelo normalizador.

| Lição | Brutos | Saída | Fontes usadas | Omitidos | Repetições | Movidos | Transformados |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 100 | 80 | 20 | 20 | 20 | 15 |
| 2 | 100 | 100 | 80 | 20 | 20 | 20 | 25 |
| 3 | 104 | 100 | 94 | 10 | 6 | 6 | 22 |
| 4 | 101 | 100 | 94 | 7 | 6 | 6 | 25 |
| 5 | 107 | 100 | 97 | 10 | 3 | 3 | 25 |
| 6 | 47 | 100 | 47 | 0 | 53 | 53 | 17 |
| 7 | 49 | 100 | 49 | 0 | 51 | 51 | 17 |
| 8 | 46 | 100 | 46 | 0 | 54 | 54 | 16 |
| 9 | 43 | 100 | 43 | 0 | 57 | 57 | 13 |
| 10 | 44 | 100 | 44 | 0 | 56 | 56 | 16 |
| 11 | 43 | 100 | 43 | 0 | 57 | 57 | 13 |
| 12 | 43 | 100 | 43 | 0 | 57 | 57 | 13 |

### 8.3 Leitura correta desses números

**Fatos.**

- L6–L12 dependem do normalizador para atingir 100 exercícios.
- L1–L5 não dependem dele para quantidade, pois já têm pelo menos 100 itens, mas são semanticamente alteradas por cortes, redistribuição, repetição e conversão.
- Portanto, 7 lições dependem dele quantitativamente e as 12 são afetadas qualitativamente.
- O caminho de preenchimento final de emergência (`padRefs`) não é necessário para WB1, porque todas as lições têm mais de 15 itens brutos. As duplicações surgem principalmente da seleção da mesma referência para diferentes trilhas/dias.

**Risco funcional.** O aluno vê 100 posições, porém em L9, L11 e L12 existem apenas 43 fontes autorais distintas. A métrica de quantidade da interface superestima a variedade real.

**Risco pedagógico.** O algoritmo move exercícios entre objetivos diários e converte modalidade. Uma pergunta de reconhecimento pode virar writing; um item pode ser forçado a speaking sem que o enunciado tenha sido originalmente escrito para produção oral.

**Risco de avaliação.** Nenhum exercício bruto das 12 lições possui `acceptedAnswers`. Nos itens convertidos para escrita, a própria opção/resposta pode ser exposta como referência pelo conversor (`normalizeOfficialWorkbookLessons.ts:19-29`). Isso reduz a capacidade de correção aberta robusta.

## 9. Estrutura dos sete dias

### 9.1 Estrutura bruta real por lição

| Lição | Progressão dos sete dias antes da normalização |
|---:|---|
| 1 | alfabeto/números; números/matemática; números/matemática; cores/listening; cores/writing; greetings; teste/revisão |
| 2 | natureza/demonstrativos; identificação visual; `this/that/those`; leitura; speaking; `a/an`; revisão |
| 3 | rotinas; listening/horas; audio match; comparação sonora; leitura; Q&A oral; revisão |
| 4 | reconhecimento de ordinais; formas; função/ordem; datas; speaking/`th`; leitura e letras silenciosas; revisão |
| 5 | dados pessoais; `am/is/are`; perfil/Q&A; listening de perfis; speaking; leitura; revisão |
| 6 | vocabulário/saudações; forma; Q&A; diálogo; produção; leitura; revisão |
| 7 | vocabulário/calendário; forma; Q&A; diálogo; produção; leitura; revisão |
| 8 | vocabulário/contrações; forma; Q&A; diálogo; produção; leitura; revisão |
| 9 | vocabulário funcional; forma; Q&A; diálogo; produção; leitura; revisão |
| 10 | meses/estações; preposições; Q&A; diálogo; produção; leitura; revisão |
| 11 | WH-words; construção; Q&A; diálogo; produção; leitura; revisão |
| 12 | verbos regulares; formas; pronúncia; diálogo; produção; leitura; revisão |

### 9.2 Avaliação funcional e pedagógica

- **L1–L5** têm estruturas próprias e maior densidade bruta, embora L1/L2/L3 estejam desalinhadas em escopo ou versão.
- **L6–L12** seguem um molde claro de sete dias: apresentação, forma, perguntas, diálogo, produção, leitura e revisão.
- O molde é pedagogicamente plausível como esqueleto, mas não garante gradação. A distribuição normalizada posterior mistura dias e enfraquece a intenção original desses objetivos.
- Todos os itens possuem texto para `audioValue`, mas não foram encontrados arquivos de áudio específicos; trata-se de texto destinado a TTS, não de acervo sonoro autoral.
- As traduções são irregulares: L1 tem 55 itens com tradução; L2, 30; L3, zero; L4, 5; L5, 7; L6, 10; L7, 6; L8, 8; L9–L12, 5 cada. Isso revela ausência de uma política uniforme de apoio linguístico.

## 10. L1–L7: transferência dos PDFs revisados

### 10.1 Resultado por lição

| Lição | Situação no app | Evidência de transferência do PDF | Veredito |
|---:|---|---|---|
| 1 | versão antiga híbrida, muito trabalhada em março | PDF revisado não localizado | **não verificável; aparentemente antiga** |
| 2 | A Day in Nature | PDF revisado não localizado; índice oficial diz Vowels | **não transferida/alinhada** |
| 3 | Daily Routines | PDF disponível diz Cardinal Numbers | **definitivamente não transferida** |
| 4 | Ordinal Numbers, introduzida em junho | PDF revisado não localizado | **aparentemente atualizada pelo índice; transferência não comprovada** |
| 5 | Personal Information, introduzida/completada em junho | PDF revisado não localizado | **aparentemente atualizada pelo índice; transferência não comprovada** |
| 6 | Greetings, 47 itens brutos | PDF revisado não localizado | **alinhada, mas parcial/fina; transferência não comprovada** |
| 7 | Days, Months, & Dates, 49 itens brutos | PDF revisado não localizado | **alinhada, mas parcial/fina; transferência não comprovada** |

### 10.2 Conclusão sobre a transferência

**Fato.** A auditoria consegue confirmar **zero** transferências do PDF para o app entre L1 e L7, porque os PDFs completos não estão disponíveis e o único caso comparável, L3, diverge.

**Inferência.** L4–L7 parecem ter sido atualizadas com base no índice e em um molde de conteúdo, não necessariamente transcritas de material diagramado. L1–L3 são a camada antiga ativa; L2 e L3 precisam ser substituídas para refletir o currículo oficial.

Não se deve interpretar “zero transferências comprovadas” como prova de que nenhuma transferência ocorreu. É uma afirmação sobre a evidência disponível.

## 11. L8–L12 como base para PDFs

### 11.1 Critérios

Para servir de base editorial a um PDF final, a lição deveria trazer, no mínimo: objetivo explícito, explicação clara de forma/uso, exemplos graduados, prática variada, produção, leitura/diálogo e revisão, sem depender de duplicação algorítmica para parecer completa.

### 11.2 Parecer individual

| Lição | Estado | Parecer para PDF |
|---:|---|---|
| 8 | 46 itens brutos; contrações, negativos, diálogo, leitura e revisão | **Base parcial.** Tema coerente, mas falta explicação editorial suficiente e prática autoral em volume adequado. |
| 9 | 43 itens; muito conteúdo reaproveita greetings e personal information | **Esqueleto insuficiente.** É o caso mais genérico e precisa de cenários práticos próprios, progressão e identidade curricular. |
| 10 | 44 itens; meses, estações e `in/on/at` | **Base parcial.** Coerente, porém curta e sem aprofundamento explicativo. |
| 11 | 43 itens; WH-words e perguntas com `to be` | **Base parcial.** Tem diálogo e leitura, mas precisa de exposição gramatical, gradação e mais variedade. |
| 12 | 43 itens; passado regular e alofones de `-ed` | **Base parcial.** O núcleo existe, mas faltam regras, exceções/limites, exemplos graduados e prática suficiente. |

**Conclusão.** Nenhuma de L8–L12 está pronta, no estado bruto atual, para ser a única fonte de um PDF final. L8, L10, L11 e L12 são bases parciais aproveitáveis. L9 é apenas um esqueleto e exige redesenho mais profundo.

### 11.3 O aplicativo como fonte editorial futura

**Inferência.** A arquitetura suporta uma estratégia app-first: lições em TypeScript têm dias, objetivos, tipos, respostas, TTS e podem alimentar tanto a aula quanto a lousa. Porém, o conteúdo atual não sustenta ainda a conclusão “o app já é a fonte editorial madura”. A normalização mascara lacunas quantitativas e altera a intenção dos itens.

Antes de diagramar PDFs a partir do app, a fonte bruta deve ser validada pedagogicamente e deve conter a variedade real desejada, sem contar duplicações normalizadas como novo conteúdo.

## 12. Relação com a lousa e aula ao vivo

### 12.1 Mesma fonte de conteúdo

**Fato.** A lousa de inglês carrega o mesmo registro do curso:

- `apps/main/src/services/liveWhiteboardActivities.ts:1-4` importa o registro;
- `liveWhiteboardActivities.ts:72-88` lista e carrega os workbooks por esse registro;
- `liveWhiteboardActivities.ts:90-113` resolve lição e dia por ID ou posição;
- `liveWhiteboardActivities.ts:142-167` monta o quadro.

O serviço de sessão também carrega o mesmo workbook e grava blocos derivados da trilha selecionada (`apps/main/src/services/liveSessionService.ts:969-1050`, especialmente `:987-1003`). O painel do professor oferece as opções vindas desse carregamento (`apps/main/src/components/ExerciseSessionPanel.tsx:621-675`) e inicia as trilhas selecionadas (`ExerciseSessionPanel.tsx:901-937`).

**Conclusão factual.** Não existe uma segunda fonte específica de Workbook 1 para a lousa. App e lousa consomem o mesmo export já normalizado.

### 12.2 Snapshot de sessão

**Inferência técnica.** Ao iniciar/semear uma sessão, os blocos são gravados como snapshot. Conteúdo novo deve aparecer em novas sessões, mas uma sessão já semeada pode conservar o payload antigo até ser recriada/resemeada. Isso decorre do fluxo de escrita em `liveSessionService.ts:987-1003`, não de um cache curricular separado.

### 12.3 Progresso existente

`apps/main/src/components/LessonView.tsx:72-120` usa IDs de dia para conclusão. O motor de progresso também mantém posições numéricas de lição/dia e inicia a lição por posição (`apps/main/src/services/courseProgressEngine.ts:280-318`). Não foi encontrado `contentVersion` curricular.

**Risco.** Trocar o significado de uma lição conservando os mesmos IDs pode manter conclusões antigas associadas ao conteúdo novo. Trocar IDs pode invalidar progresso. Uma futura correção curricular deve incluir estratégia explícita de versionamento/migração, mas isso não foi implementado aqui.

## 13. Achados priorizados

### Críticos

1. **L3 executável está na versão errada.** O PDF e o índice dizem Cardinal Numbers; o app e a lousa entregam Daily Routines.
2. **L2 executável não corresponde ao currículo oficial.** A fonte atual ensina natureza/demonstrativos/`a/an`, não Vowels.
3. **Quantidade aparente não equivale a variedade real.** Sete lições só chegam a 100 por reaproveitamento algorítmico.

### Altos

4. **Não há rastreabilidade PDF → código para L1–L7.** O repositório não contém os PDFs completos nem metadados de versão por lição.
5. **L8–L12 não estão prontas para PDF final.** Quatro são bases parciais e L9 é um esqueleto genérico.
6. **Normalização altera intenção pedagógica.** Dias, tipos e IDs são remodelados no runtime.

### Médios

7. **L1 excede o escopo oficial** e duplica tópicos posteriores.
8. **Apoio linguístico é inconsistente:** traduções variam de 0 a 55 itens por lição.
9. **Progresso não tem versão curricular**, criando risco em substituições de conteúdo.

## 14. Fonte de verdade recomendada

### Estado atual

- **Fonte de verdade executável:** `apps/main/src/data/workbook1/`.
- **Referência curricular oficial:** o índice de 12 lições fornecido nesta auditoria.
- **Referência editorial disponível:** apenas o fragmento PDF de L3 Cardinal Numbers.
- **Variantes antigas:** devem ser tratadas como evidência histórica, não como fonte ativa.

### Recomendação

Adotar o conteúdo bruto versionado do app como futura fonte canônica somente depois de uma reconciliação editorial controlada:

1. reunir e versionar os PDFs revisados completos de L1–L7;
2. criar uma matriz por lição que associe versão editorial, arquivo-fonte, revisão pedagógica e versão de conteúdo;
3. substituir L2 e L3 pelas versões oficiais e revisar o escopo de L1;
4. validar/completar L4–L7 contra os PDFs;
5. expandir L8–L12 no bruto, começando por L9, sem usar duplicação como substituto de autoria;
6. reduzir o papel do normalizador a validação/formatação previsível, preservando intenção e variedade;
7. definir migração/versionamento de progresso e política para snapshots da lousa antes da publicação.

Essa sequência é uma recomendação documental. Nenhum item foi executado nesta auditoria.

## 15. Resumo terminal solicitado

- **Fonte atualmente usada:** `apps/main/src/data/workbook1/`, exportada após `normalizeLessonsToOfficialTrails` e compartilhada por app e lousa.
- **Versões encontradas:** 5 linhagens/conjuntos de artefatos; apenas 1 fonte completa ativa.
- **Correspondência com o índice:** 8 plenas, 2 parciais (L1 e L9), 2 incompatíveis (L2 e L3).
- **Atualizadas/aparentemente alinhadas:** 9 lições tiveram conteúdo ativo criado ou substancialmente preenchido em junho (L4–L12), mas isso não comprova transferência de PDF.
- **Antigas:** 3 lições ativas (L1–L3); L1 é híbrida/parcial, L2 e L3 estão fora do currículo oficial atual.
- **Genéricas:** 1 caso claro (L9); além disso, 7 lições são finas e dependentes de molde (L6–L12).
- **Dependentes da normalização:** 7 para atingir 100 (L6–L12); todas as 12 são semanticamente alteradas.
- **L1–L7:** nenhuma transferência de PDF é comprovável; L3 é comprovadamente não transferida; L4–L7 parecem atualizadas pelo índice, mas sem rastreabilidade editorial.
- **L8–L12:** L8/L10/L11/L12 são bases parciais; L9 é insuficiente; nenhuma está pronta como única base de PDF final.
- **Recomendação:** reconciliar PDFs e código por versão, corrigir primeiro L2/L3, completar o bruto antes da normalização e só então declarar o app como fonte editorial canônica.

