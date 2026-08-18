# Auditoria técnica, funcional e pedagógica do Learnendo

**Data:** 14 de julho de 2026  
**Escopo executado:** inspeção estática do repositório, avaliação automatizada dos módulos de conteúdo, typecheck, build, inventário de testes, inspeção visual local limitada e leitura visual do PDF disponível.  
**Fora de escopo por segurança:** produção, dados reais, gravações reais, escrita no Firebase, teste multiusuário, permissões de câmera/microfone e mudanças no código do aplicativo.

## Como ler este relatório

- **Fato** é uma conclusão sustentada por código, execução ou arquivo inspecionado.
- **Não testado** indica algo que exigiria produção, emuladores, credenciais ou mais de um usuário.
- **Inferência** é explicitamente identificada.
- “100 exercícios carregados” não significa “100 exercícios autorais distintos”. O normalizador modifica os dados antes de a interface recebê-los.
- “Completa estruturalmente” significa: cadastrada, sete dias, 100 objetos carregados, IDs e campos mínimos presentes. Nenhuma das 108 lições foi homologada ponta a ponta com persistência real, console limpo e todos os navegadores.

---

# A. Resumo executivo

## Estado geral

O Learnendo é um SPA React/Vite grande e funcionalmente ambicioso. O catálogo inglês contém de fato **9 livros, 108 lições e 10.800 objetos de exercício carregados**. Todos os livros ingleses estão registrados e o catálogo do Livro 1 foi confirmado visualmente no servidor local. O bundle principal também é gerado com sucesso.

Esse resultado quantitativo é enganoso sem uma segunda leitura: os Livros 1–4 passam por `normalizeLessonsToOfficialTrails`, que recorta, reordena, converte e repete atividades para forçar `[15,15,15,10,15,15,15]`. Há **8.453 assinaturas semânticas únicas em 10.800 objetos carregados** (78,3%), e o Livro 1 cai para 804/1.200 (67%). A Lição 9 do Livro 1, por exemplo, possui só 43 atividades brutas, mas aparece com 100 após clonagem.

## Funcionalidades existentes

- autenticação Firebase por e-mail/senha, conta anônima, conversão de conta e recuperação de senha;
- catálogo de cursos e workbooks, lições, sete dias e execução de exercícios;
- TTS de navegador com fallback HTTP, STT via Web Speech API e validação flexível de respostas;
- progresso em Firestore e `localStorage`, ranking e painel do professor;
- placement test adaptativo;
- aula ao vivo com lousa/workspace, trilhas sincronizadas, respostas individuais, chat, presença, LiveKit, Jitsi e battle;
- PWA e build de produção.

## Cinco riscos principais

1. **Crítico — emissão de token LiveKit sem autenticação/autorização.** Qualquer cliente pode informar sala, identidade e metadados e receber token com publicação e assinatura (`apps/main/api/getToken.ts:164-250`).
2. **Alto — “100 exercícios” mascaram truncamento e duplicação.** O normalizador repete referências e converte exercícios (`normalizeOfficialWorkbookLessons.ts:84-108,112-200`).
3. **Alto — Livro 1 não corresponde ao PDF disponível.** As únicas páginas do PDF são 04–06 da Lição 3, “Cardinal Numbers”; o app oferece “Daily Routines and Activities”.
4. **Alto — trilha de exercício não passa no typecheck.** Há 15 erros no app principal; um deles usa `promptAudioText` antes da declaração e pode quebrar exercícios de speaking (`UI.tsx:723,738`).
5. **Alto — workspace compartilhado permissivo.** Qualquer usuário autenticado pode alterar `shared/workspace` de uma aula existente, mesmo não atribuído (`firestore.rules:296-307`).

## Prontidão

| Área | Avaliação | Motivo |
|---|---|---|
| Livro 1 | **Não pronto para expansão** | PDF divergente/incompleto; 6–12 fortemente preenchidas por repetição; zero `acceptedAnswers`; conteúdo sem versionamento. |
| Lousa | **Protótipo avançado, não homologado** | Sincronização e trilhas existem, mas há erros TypeScript, regra permissiva e falta teste multiusuário/reload. |
| Placement | **Funcional como teste adaptativo de listening; incompatível com a proposta de 40 questões** | 45 questões, 100% listening, sem speaking/reading/writing; padrão correto determinístico. |

## Bloqueadores antes dos próximos livros

- corrigir segurança do endpoint LiveKit e da regra `shared/workspace`;
- tornar o typecheck obrigatório e zerar os 15 erros;
- remover a normalização destrutiva como fonte de “completude” e validar o conteúdo autoral;
- obter o PDF integral e congelar um contrato pedagógico/versionado para o Livro 1;
- criar testes de conteúdo e dos fluxos críticos.

---

# B. Arquitetura atual

## Aplicações e módulos

| Área | Caminho | Papel encontrado |
|---|---|---|
| Aplicação principal | `apps/main` | React 19 + TypeScript + Vite, PWA, Firebase, LiveKit, lousa, placement, livros e progresso. |
| Aplicação legada/paralela | `apps/wbk-5` | Variante anterior do mesmo produto; 7 erros TypeScript e estrutura de conteúdo própria. |
| Laboratório | `apps/lab` | Quiz/battle/editor de packs; build não inicia porque `tsc` não é resolvido. |
| Raiz | `package.json`, `firestore.rules`, `firebase.json` | Regras Firebase e dependências avulsas; não é um workspace npm formal. |
| Espelho aninhado | `Learnendo/apps/*` | Segunda árvore rastreada: 289 arquivos de `main` e 225 de `wbk-5`. |
| Submódulo/cópia | `Learnendo/Learnendo/Learnendo-Lab` | Aparece modificado antes da auditoria; não foi alterado. |

Tecnologias: React 19, TypeScript 5.8, Vite 6, Tailwind 3/4, Firebase Auth/Firestore/Analytics, LiveKit, Jitsi, Excalidraw, jsPDF, JSZip, Google GenAI e PWA.

## Rotas e navegação

Não existe React Router no app principal. `App.tsx` usa `SectionType` e vários `useState`; somente aulas ao vivo recebem caminho `/live-class/:id`. Há `pushState` e `popstate` específicos em `LiveClassesPage.tsx:204-291`. Livros, lições, dias, placement e perfil não têm URLs profundas estáveis. O contexto da aba é salvo em `sessionStorage`/`localStorage`, mas um link externo não codifica livro/lição/dia.

## Estado e fluxo de dados

```text
Catálogo TypeScript -> normalizador (Livros 1-4) -> React App/SectionType
  -> WorkbookView -> LessonView -> ExercisePractice -> PracticeSection
  -> resposta local -> percentual do dia -> App.handleDayComplete
  -> localStorage + users/{uid}/courseProgress/main
  -> users/{uid}/courseProgress/{course_book}
  -> progress/{uid} + users/{uid}/stats/main + weeklyProgress

Aula ao vivo
  professor -> liveClasses/{id}/session/state -> onSnapshot -> aluno
  trilha -> exerciseSession + exerciseBlocks -> resposta individual por UID
  workspace/lousa -> shared/workspace e shared/whiteboard -> onSnapshot
```

## Fontes de verdade

| Dado | Fonte encontrada | Concorrência/inconsistência |
|---|---|---|
| Livros/lessons ingleses | `src/data/workbook1..9` + `workbookRegistry.ts` | Há cópias em `apps/wbk-5`, `constants.tsx` e árvore `Learnendo/apps`. |
| Outros idiomas | `src/courses/*` + `courseRegistry.ts` | Vários workbooks são stubs/replicações; não equivalem ao catálogo inglês. |
| Exercícios carregados | export do workbook após normalização | Para Livros 1–4, difere dos arquivos autorais brutos. |
| IDs | arquivos/bricks geradores; normalizador recria IDs | IDs carregados são únicos, mas podem mudar semanticamente mantendo o mesmo ID após reordenação. |
| Resposta correta | `correctValue` | Opções e alternativas são opcionais; não há schema runtime. |
| Alternativas aceitas | `acceptedAnswers` + expansor PT | Livro 1: zero exercícios com alternativas explícitas. |
| Áudio | `audioValue` como texto de TTS | Não são arquivos de áudio; “referência quebrada” de arquivo não se aplica. Disponibilidade depende de navegador/API. |
| Traduções | campo `translation` por exercício | Cobertura irregular e zero em vários livros. |
| Grammar | `constants.tsx:489+` | Separada dos objetos Lesson; L1–L3 usam chaves antigas por ilha, L4–L24 não têm guia equivalente. |
| Progresso | quatro pipelines | `localStorage`, `courseProgress/main`, `courseProgress/{course_book}`, `progress/{uid}` e weekly progress concorrem. |
| Pontuação | percentual do dia + engines de stats | Algumas escritas ainda usam `totalAnswers: 100` fixo (`App.tsx:2626-2630`). |
| Ordem | normalizador ou gerador de cada livro | Regra central só nos Livros 1–4; 5–9 têm builders próprios. |

## Integrações externas

- Firebase: autenticação e toda persistência colaborativa;
- LiveKit: áudio/vídeo; sem endpoint, a sala abre sem o recurso interno ou apresenta erro;
- Web Speech API: speaking e TTS local; suporte varia por navegador;
- Google Translate TTS: fallback não oficial em `api/tts.ts:62-114`;
- Jitsi: sala externa;
- WhatsApp: placement usa número fixo em `PlacementTest.tsx:429-436`;
- Google GenAI: recursos de IA/battle;
- Vercel serverless: `/api/getToken`, `/api/tts`, `/api/evaluateResponse`.

---

# C. Inventário dos nove livros

Os níveis são os rótulos do placement (`placementTestQuestions.ts:69-141`), não campos dos objetos Workbook. “12 estruturais” significa que o módulo carregado possui sete dias e 100 objetos; “0 homologadas” significa que nenhuma foi concluída E2E sem acesso à produção.

| Livro | Título | Nível | Idioma | Lições cadastradas | Estruturais | Homologadas E2E | Vazias | IDs/títulos duplicados | Exercícios carregados | Assinaturas semânticas únicas | UI | Progresso |
|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 1 | Workbook 1 | A1 Initial | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 804 | catálogo confirmado | genérico, não testado em produção |
| 2 | Workbook 2 | A1 Basic | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 986 | registrado | genérico, não testado |
| 3 | Workbook 3 | A2 Initial | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 804 | registrado | genérico, não testado |
| 4 | Workbook 4 | A2 Strong | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 839 | registrado | genérico, não testado |
| 5 | Workbook 5 | B1 Initial | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 1.119 | registrado | genérico, não testado |
| 6 | Workbook 6 | B1 Strong | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 1.140 | registrado | genérico, não testado |
| 7 | Workbook 7 | B2 Initial | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 1.140 | registrado | genérico, não testado |
| 8 | Workbook 8 | B2 Strong | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 1.081 | registrado | genérico, não testado |
| 9 | Workbook 9 | C1 | inglês | 12 | 12 | 0 | 0 | 0 | 1.200 | 540 | registrado | genérico, não testado |
| **Total** |  |  |  | **108** | **108** | **0** | **0** | **0** | **10.800** | **8.453** |  |  |

Todas são importáveis e o analisador não encontrou ID duplicado, campo mínimo vazio nem `correctValue` ausente das opções nos objetos carregados. Isso não prova qualidade semântica ou fluxo completo.

---

# D. Auditoria do Livro 1

## Comparação com o PDF

O arquivo `Learnendo/Wbk 1 (A1) (26).pdf` tem **3 páginas**, visualmente numeradas 04, 05 e 06. Todas são “Unit 1 — Lesson 3 — Cardinal Numbers”. Objetivos: padrões numéricos, som final de Y, grafia de números maiores e uso cotidiano; grammar focus: cardinal numbers. O app define L3 como “Daily Routines and Activities” (`lesson3.ts:3-5`) e o guia fala de rotinas, horas e preposições (`constants.tsx:512-543`). A divergência é comprovada.

Não há páginas das lições 1, 2, 4, 5, 6 e 7 no PDF disponível. Assim, não é possível confirmar a afirmação de que o “PDF está corrigido até a Lição 7” usando o arquivo presente. Há uma cópia binariamente idêntica em `Learnendo/Learnendo/Wbk 1 (A1) (26).pdf`.

## Matriz das 12 lições

Objetivo, grammar focus, vocabulário e estruturas-alvo **não são campos do schema Lesson** (`types.ts:36-46`). A tabela usa apenas o que foi encontrado em título, instruções e guias separados; “inferido” não é metadado oficial.

| Lição | Título do app | Foco encontrado/inferido | Bruto -> carregado | Tipos (MC/ID/SP/WR) | Traduções | Alternativas | Reading/revisão | Status |
|---:|---|---|---:|---|---:|---:|---|---|
| 1 | The Alphabet and Numbers | alfabeto, números, cores, cumprimentos; guias L1_I1–I5 | 100 -> 100 | 40/22/16/22 | 55 | 0 | heurístico/sim | **estrutura antiga**; normalizador reordena |
| 2 | A Day in Nature | vogais, imagens, artigos a/an; guias L2_I1–I7 | 100 -> 100 | 27/39/17/17 | 38 | 0 | sim/sim | **estrutura antiga**; sem PDF comparável |
| 3 | Daily Routines and Activities | rotinas, horas, at/to/after/before | 104 -> 100 | 3/39/38/20 | 0 | 0 | sim/sim | **estrutura antiga e divergente do PDF**; quatro itens descartados |
| 4 | Ordinal Numbers and Sequence | ordinais e sequência (inferido) | 101 -> 100 | 30/23/24/23 | 8 | 0 | sim/sim | **parcial**, um item descartado; sem guia estruturado |
| 5 | Personal Information and To Be | dados pessoais e `to be` (inferido) | 107 -> 100 | 43/12/17/28 | 8 | 0 | sim/sim | **parcial**, sete itens descartados |
| 6 | Greetings | cumprimentos (inferido) | 47 -> 100 | 42/14/19/25 | 32 | 0 | limitada/sim | **incompleta**; 45 repetições semânticas carregadas |
| 7 | Days, Months, and Dates | dias, meses e datas (inferido) | 49 -> 100 | 34/19/21/26 | 24 | 0 | limitada/sim | **incompleta**; 43 repetições |
| 8 | Spoken Patterns | padrões orais (genérico) | 46 -> 100 | 21/33/21/25 | 31 | 0 | limitada/sim | **incompleta**; 46 repetições |
| 9 | Practical Speaking | fala prática (genérico) | 43 -> 100 | 18/32/21/29 | 20 | 0 | limitada/sim | **incompleta**; 52 repetições |
| 10 | Months and Seasons | meses, estações, in/on/at | 44 -> 100 | 27/27/21/25 | 20 | 0 | sim/sim | **incompleta**; 47 repetições |
| 11 | Asking Questions | perguntas (genérico) | 43 -> 100 | 14/33/19/34 | 20 | 0 | limitada/sim | **incompleta**; 53 repetições |
| 12 | Past Tense Regular Verbs | passado regular | 43 -> 100 | 20/27/19/34 | 20 | 0 | limitada/sim | **incompleta**; 51 repetições |

MC = multiple-choice; ID = identification; SP = speaking; WR = writing. Todas têm objetos de speaking, listening por TTS, writing e review no carregamento. Não há `dialogue` real nas 10.800 atividades, apesar de o tipo existir.

## Progressão pedagógica real

O padrão carregado não deriva do propósito pedagógico de cada exercício. O normalizador seleciona por prioridade de dias, força o Dia 4 para `speaking` e o Dia 5 para `writing`. Em `toWritingExercise`, quando a origem possui opções, o fallback visual é literalmente `Answer: ${correctValue}` (`normalizeOfficialWorkbookLessons.ts:19-29`), podendo revelar a resposta. Em `toSpeakingExercise`, a resposta de identificação/múltipla escolha é reaproveitada como alvo oral (`:31-43`).

Consequências:

- a sequência reconhecimento -> produção é sintética, não autoral;
- dias 4/5 podem cobrar modalidade incompatível com o estímulo original;
- excesso bruto é silenciosamente descartado;
- déficit é preenchido por repetição circular (`:84-95`);
- a UI sempre vê 100 e não consegue denunciar o conteúdo incompleto;
- “revisão” é prioridade de seleção, não uma curadoria explícita.

O app expande o PDF em áudio, fala e feedback, mas parte relevante ainda é escrita/múltipla escolha digitalizada. A modalidade reading não é um tipo: é inferida pela presença de quebras de linha/tradução (`UI.tsx:749-760,1255-1267`).

---

# E. Validação dos 100 exercícios

## Contagem efetivamente carregada

Cada uma das 108 lições retorna a mesma distribuição abaixo. Para deixar cada lição explícita, os IDs são enumerados; a diferença é sempre zero **após transformação**.

| Livro | Lições | D1 | D2 | D3 | D4 | D5 | D6 | D7 | Total | Dif. |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 2 | L13, L14, L15, L16, L17, L18, L19, L20, L21, L22, L23, L24 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 3 | L25, L26, L27, L28, L29, L30, L31, L32, L33, L34, L35, L36 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 4 | L37, L38, L39, L40, L41, L42, L43, L44, L45, L46, L47, L48 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 5 | L49, L50, L51, L52, L53, L54, L55, L56, L57, L58, L59, L60 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 6 | L61, L62, L63, L64, L65, L66, L67, L68, L69, L70, L71, L72 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 7 | L73, L74, L75, L76, L77, L78, L79, L80, L81, L82, L83, L84 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 8 | L85, L86, L87, L88, L89, L90, L91, L92, L93, L94, L95, L96 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |
| 9 | L97, L98, L99, L100, L101, L102, L103, L104, L105, L106, L107, L108 | 15 | 15 | 15 | 10 | 15 | 15 | 15 | 100 | 0 |

## Contagem bruta antes do normalizador

| Escopo | Distribuição bruta | Total | Efeito |
|---|---|---:|---|
| L1–L2 | 25/10/10/10/10/10/25 | 100 | reordena/converte mesmo sem déficit |
| L3 | 20/15/12/10/15/12/20 | 104 | descarta 4 |
| L4 | 15/15/12/14/12/15/18 | 101 | descarta 1 |
| L5 | 16/16/14/14/13/16/18 | 107 | descarta 7 |
| L6 | 7/6/7/6/7/7/7 | 47 | preenche 53 objetos; 45 repetições semânticas finais |
| L7 | 7/7/7/7/7/7/7 | 49 | preenche 51; 43 repetições finais |
| L8 | 7/7/7/6/6/6/7 | 46 | preenche 54; 46 repetições finais |
| L9 | 6/6/6/6/6/6/7 | 43 | preenche 57; 52 repetições finais |
| L10 | 6/7/6/6/6/6/7 | 44 | preenche 56; 47 repetições finais |
| L11–L12 | 6/6/6/6/6/6/7 | 43 | preenche 57; 53/51 repetições finais |
| Cada L13–L48 | 25/10/10/10/10/10/20 | 95 | adiciona 5 derivados |
| L49–L108 | já geradas em 15/15/15/10/15/15/15 | 100 | sem normalizador central |

## Pontuação e conclusão

`ExercisePractice` calcula `score = round(correct / exercises.length * 100)` (`ExercisePractice.tsx:101-119`). A conclusão é por dia, não por exercício. O app acumula estimativas a partir do percentual (`App.tsx:2151-2159`) e grava em vários locais. `progressService` registra `totalQuestions` real (`progressService.ts:11-52`), mas outro payload fixa `totalAnswers: 100` por dia (`App.tsx:2626-2630`), embora um dia tenha 10 ou 15 itens.

## Script de validação proposto (não aplicado)

Criar `scripts/validate-content.ts` e executá-lo no CI antes do build:

```ts
import { workbook1 } from '../apps/main/src/data/workbook1';
import { workbook2 } from '../apps/main/src/data/workbook2';
import { workbook3 } from '../apps/main/src/data/workbook3';
import { workbook4 } from '../apps/main/src/data/workbook4';
import { workbook5 } from '../apps/main/src/data/workbook5';
import { workbook6 } from '../apps/main/src/data/workbook6';
import { workbook7 } from '../apps/main/src/data/workbook7';
import { workbook8 } from '../apps/main/src/data/workbook8';
import { workbook9 } from '../apps/main/src/data/workbook9';

const books = [workbook1, workbook2, workbook3, workbook4, workbook5,
  workbook6, workbook7, workbook8, workbook9];
const types = new Set(['speaking', 'multiple-choice', 'writing', 'identification', 'dialogue']);
const ids = new Map<string, string[]>();
const errors: string[] = [];

for (const book of books) for (const lesson of book.lessons) {
  const where = `${book.id}/${lesson.id}`;
  if (lesson.days.length !== 7) errors.push(`${where}: ${lesson.days.length} dias`);
  const exercises = lesson.days.flatMap(day => day.exercises);
  if (exercises.length !== 100) errors.push(`${where}: ${exercises.length}/100`);
  lesson.days.forEach((day, d) => day.exercises.forEach((ex, e) => {
    const at = `${where}/d${d + 1}/e${e + 1}`;
    for (const key of ['id', 'type', 'instruction', 'audioValue', 'correctValue'] as const)
      if (!String(ex[key] ?? '').trim()) errors.push(`${at}: ${key} vazio`);
    if (!types.has(ex.type)) errors.push(`${at}: tipo ${ex.type}`);
    if (['multiple-choice', 'identification'].includes(ex.type) && !ex.options?.length)
      errors.push(`${at}: opções ausentes`);
    if (ex.options?.length && !ex.options.includes(ex.correctValue))
      errors.push(`${at}: correctValue não está nas opções`);
    const locations = ids.get(ex.id) ?? [];
    locations.push(at); ids.set(ex.id, locations);
  }));
}
for (const [id, locations] of ids)
  if (locations.length > 1) errors.push(`ID duplicado ${id}: ${locations.join(', ')}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Conteúdo válido');
```

O validador deve ser executado também sobre os dados **antes** de qualquer normalização; caso contrário continuará certificando clones.

---

# F. Lousa colaborativa

## Fluxo atual

```text
Professor abre Live -> escolhe aula -> ExerciseSessionPanel carrega registry
-> escolhe workbook/lição/trilha -> seedLiveTrailExerciseSession
-> grava session/state + session/exerciseSession + exerciseBlocks
-> mainStageMode='trail'
-> alunos recebem onSnapshot -> LiveTrailExerciseOverlay
-> cada aluno altera apenas mapas do próprio UID
-> professor avança/encerra -> volta mainStageMode='workspace'
-> workspace e presença permanecem em documentos Firestore separados
```

Evidências: carregamento e seed em `liveSessionService.ts:920-1047`; seleção em `ExerciseSessionPanel.tsx:635-675,888-933`; sincronização app em `App.tsx:1920-2005`; regras por UID em `firestore.rules:178-211,311-328`.

## O que funciona por código

- livro, lição, trilhas e exercícios vêm do mesmo registry;
- professor controla `activeWorkbookId`, `activeLessonId`, `activeExerciseId` e `mainStageMode`;
- aluno segue estado remoto; admin/professor não é forçado a seguir (`App.tsx:1923-1931`);
- resposta de cada aluno é separada por UID e as regras limitam os mapas alterados;
- estado de sessão, lousa, workspace, exercício, presença e chat são documentos/subcoleções distintos;
- recarga pode reconstruir estado via `onSnapshot`.

## Riscos e lacunas

- não houve teste real com professor + dois alunos + reload;
- `shared/workspace` aceita qualquer autenticado se a aula existe (`firestore.rules:296-307`);
- `WorkspaceCanvas.tsx` tem 6.802 linhas e três erros TypeScript;
- a mesma atividade individual aberta fora da aula grava progresso pessoal; a trilha ao vivo usa blocos separados, mas a coexistência não foi testada;
- links `/live-class/:id` existem, mas links diretos de livro/lição/dia não;
- o retorno de trilha é controlado por estado, não por uma pilha transacional de contexto;
- quando LiveKit falha, a aula pode continuar sem áudio/vídeo interno, mas speaking/TTS e colaboração Firestore são dependências diferentes.

## Fluxo recomendado

```text
Entrar na aula (validar atribuição no servidor)
-> restaurar LiveContext versionado {class, course, workbook, lesson, trails, block}
-> professor seleciona conteúdo validado
-> transação cria sessão e blocos com contentVersion
-> clientes seguem snapshot monotônico (revision)
-> respostas individuais em documentos por UID
-> voltar restaura exatamente workspace/page/selection anteriores
-> reload reidrata sessão e presença sem gravar progresso individual
-> encerrar arquiva snapshot e revoga token LiveKit
```

---

# G. Placement test

## Implementação encontrada

- **45 questões**, cinco por Livro 1–9 (`placementTestQuestions.ts:167-223`);
- todas têm `type: 'listening'` (`:3-14,143-164`);
- quatro opções; posição correta redistribuída no padrão fixo A,C,D,B (`:53-55,351-376`);
- confiança pondera acerto/erro: certeza +1/-0,5; talvez +0,7/-0,2; chute +0,3/0 (`:63-67`);
- bloco passa com 4/5 pontos, mas recomendação usa percentuais atual/rolante (`:247-344`);
- aluno pode parar ao fim de cada bloco e começar no livro recomendado (`PlacementTest.tsx:330-350,763-807`);
- resultado é salvo em `progress/{uid}.tests` e histórico `users/{uid}/placementTests/*` (`:352-415`);
- nome completo e WhatsApp são obrigatórios; validador aceita apenas padrão brasileiro (`:911-938`);
- retake existe e incrementa `attemptNumber`;
- não há retomada intermediária: todas as respostas ficam em `useState` até finalizar (`:263-272`);
- alternativa errada mostra resposta correta e permite continuar;
- TTS toca texto; não há microfone no placement.

## Planejado x encontrado

| Dimensão | Planejado | Encontrado | Status |
|---|---|---|---|
| Total | 40 | 45 | divergente |
| Listening | 40% (16) | 100% (45) | divergente |
| Speaking | 30% (12) | 0 | ausente |
| Reading | 15% (6) | 0 | ausente |
| Grammar | 15% (6) | tópicos embutidos em listening; sem bloco próprio | parcial |
| Writing PT->EN | previsto | 0 | ausente |
| Aleatoriedade | desejável | opções fixas e padrão A,C,D,B repetido | previsível |
| Retomada | desejável | não existe | ausente |
| Repetição | controlada | mesmas 45 em todo retake | previsível |

Risco pedagógico: o resultado recomenda níveis A1–C1 com base exclusivamente em reconhecimento auditivo/múltipla escolha e autodeclaração de confiança. Não mede produção oral ou escrita.

---

# H. Exercícios e validação

## Tipos

| Tipo | Definição/render | Uso inglês | Validação | Persistência |
|---|---|---:|---|---|
| `multiple-choice` | `types.ts:12-26`; `PracticeSection` | presente | opção embaralhada; normalização textual | apenas resultado agregado do dia |
| `identification` | mesmo componente de choice | presente | igual a múltipla escolha | idem |
| `writing` | input/textarea | presente | normalização; ditado pode ser estrito | idem |
| `speaking` | textarea + Web Speech API | presente | transcript comparado com alvos flexíveis | idem |
| `dialogue` | permitido no tipo | **0 em 10.800** | sem fluxo especializado encontrado | idem |

Obrigatórios no TypeScript: `id`, `type`, `instruction`, `audioValue`, `correctValue`. Opcionais: `displayValue`, `options`, `acceptedAnswers`, `translation`, `character`, `isNewVocab` e campos auxiliares de áudio. Não há Zod/JSON Schema/runtime validator.

## Respostas

Pontos positivos:

- remove caixa, diacríticos e pontuação; expande contrações (`UI.tsx:159-205`);
- normaliza números e horas;
- speaking aceita múltiplos alvos e AM/PM com regras explícitas (`:254-350`);
- opções são embaralhadas (`:353-359`);
- callbacks de STT tentam impedir transcript atrasado em outro exercício (`:769-844,901-934`).

Problemas:

- Livro 1 não usa `acceptedAnswers`; equivalências dependem só de heurística;
- `promptAudioText` é lido antes da declaração em speaking (`:723,738`);
- erro/permissão de microfone só desliga o estado; a mensagem é `alert("Mic not supported")` e `rec.onerror` não explica causa (`:901-934`);
- Web Speech API não é portátil, especialmente Firefox/iOS; não há fallback de gravação+avaliação no exercício comum;
- `PronunciationTrainer` grava com `MediaRecorder`, mas é uma funcionalidade separada;
- audioValue é texto TTS, não ativo versionado; vozes e pronúncia mudam por dispositivo;
- TTS remoto depende de endpoint Google Translate não oficial e não tem teste contratual.

## Áudio

Foram encontrados 10.800/10.800 `audioValue` não vazios e **0 referências estáticas de arquivo quebradas**, porque o catálogo não referencia arquivos: envia texto ao TTS. Isso não equivale a 10.800 áudios validados. Sem voz local, `/api/tts` é usado (`ttsService.ts:397-416`); se ambos falharem, há callback/console, não uma garantia de reprodução.

---

# I. Navegação, progresso e persistência

## Fluxos por inspeção

| Fluxo | Estado |
|---|---|
| cadastro/login/reset/logout | implementado com Firebase; não executado contra produção |
| escolha de idioma/curso/livro | implementado; catálogo Livro 1 confirmado visualmente |
| abrir lição/dia | implementado, mas abrir lição chama `ensureLessonStarted` e grava Firestore (`courseProgressEngine.ts:275-323`); não executado |
| exercício/avanço | implementado; risco TDZ em speaking |
| conclusão/retomada | implementado em múltiplas fontes; não homologado |
| voltar | botões por `SectionType`; live class usa history; demais sem deep link |
| placement | UI e cálculo implementados; persistência final não executada |
| perfil/logout | implementados por código |

## Fontes concorrentes de progresso

1. `localStorage` `learnendo_progress_v1:{uid}` (`progressEngine.ts:3-59`);
2. `users/{uid}/courseProgress/main` para navegação e mapa de dias (`App.tsx:1042+`);
3. `users/{uid}/courseProgress/{courseId}_{book}` para sete dias/analytics (`courseProgressEngine.ts:243-430`);
4. `progress/{uid}` flat para dashboard/ranking (`progressService.ts:4-57`);
5. weekly progress, stats e marcadores `completedActivities`.

Há comentário de migração pendente: “Remove weeklyProgress parallel writes” (`courseProgressEngine.ts:335`). O `App.tsx` faz diversas escritas otimistas e assíncronas. Isso aumenta risco de divergência entre progresso visual e salvo.

## Versionamento de conteúdo

Não há `contentVersion` em Workbook/Lesson/Day/Exercise nem no progresso. O normalizador reutiliza IDs posicionais (`lesson_dN_eN`) depois de reordenar a semântica. Uma mudança de conteúdo pode manter o ID e atribuir progresso antigo a uma atividade nova.

Estratégia recomendada:

- `courseVersion`, `lessonVersion` e ID semântico imutável por exercício;
- salvar progresso como `{exerciseId, exerciseVersion, contentHash}`;
- migrations explícitas `oldId -> newId` apenas quando pedagogicamente equivalentes;
- invalidar/recalcular somente a lição alterada;
- manter snapshot da versão concluída para auditoria;
- separar progresso individual de participação coletiva.

---

# J. Problemas classificados

| ID | Sev. | Área / arquivo:linha | Evidência e impacto | Causa provável | Recomendação | Esforço | Dependências / regressão |
|---|---|---|---|---|---|---|---|
| SEC-01 | **Crítico** | LiveKit `api/getToken.ts:164-250` | POST sem autenticação aceita sala/identidade/metadados e emite token publish/subscribe. Acesso e impersonação de sala. | endpoint confia no cliente | validar Firebase ID token, matrícula/teacher role e sala; limitar claims/TTL/rate | médio | Firebase Admin + LiveKit; regressão alta na live |
| PED-01 | **Alto** | Conteúdo `normalizeOfficialWorkbookLessons.ts:84-200` | clona, corta e converte para forçar 100; mascara L6=47 e L9=43 | meta numérica aplicada em runtime | validar dados brutos; normalizador não deve inventar conteúdo | grande | autoria dos livros; regressão alta |
| PED-02 | **Alto** | Writing `normalize...ts:19-29` | fallback mostra `Answer: correctValue` | conversão automática de choice para writing | criar prompts autorais por modalidade | médio | conteúdo; regressão média |
| PED-03 | **Alto** | PDF x app `lesson3.ts:3-5`, `constants.tsx:512-543`, PDF p.04-06 | Cardinal Numbers no PDF versus Daily Routines no app | transferência incompleta/arquivo PDF parcial | obter fonte integral e matriz de rastreabilidade | médio | equipe pedagógica; regressão baixa |
| FUN-01 | **Alto** | Speaking `UI.tsx:723,738` | variável usada antes da declaração; TS2448 e provável ReferenceError em speaking | ordem de declaração | corrigir ordem e criar teste de render | pequeno | typecheck; regressão baixa |
| QUAL-01 | **Alto** | App principal | 15 erros TypeScript em battle, workspace, UI e workbooks 5–7 | build não executa typecheck | zerar erros; `build = tsc --noEmit && vite build` | médio | várias áreas; regressão média |
| SEC-02 | **Alto** | Firestore `firestore.rules:296-307` | qualquer autenticado pode escrever workspace de aula existente | regra usa `signedIn` em vez de acesso à sala | exigir `canAccessLiveClassRoom` e validar diffs por papel | pequeno | deploy/teste de regras; regressão alta |
| FUN-02 | **Alto** | Battle `BattleSetupModal.tsx:369-374` | `repairBattleTextEncoding` não existe; três erros | import/função removida | restaurar contrato e testar setup | pequeno | battle; regressão média |
| PED-04 | **Alto** | Placement `placementTestQuestions.ts:3-14,167-223` | 45 questões, todas listening; recomenda A1–C1 | implementação distinta da proposta | redesenhar blueprint 40/40-30-15-15 | grande | áudio/STT/conteúdo; regressão alta |
| DATA-01 | **Alto** | Progresso `App.tsx`, engines | cinco fontes concorrentes e sem versão | migração incremental incompleta | definir fonte canônica e outbox/transação | grande | migração de dados; regressão alta |
| SEC-03 | **Alto** | TTS `api/tts.ts:74-118` | proxy público, texto sem limite/rate limit, upstream não oficial | endpoint utilitário aberto | autenticar, limitar tamanho/rate/cache e provedor suportado | médio | infra; regressão média |
| QUAL-02 | **Alto** | Testes | zero testes unitários/integração/E2E encontrados | crescimento sem harness | Vitest + rules emulator + Playwright + content validation | grande | CI; regressão baixa |
| FUN-03 | **Médio** | Placement `PlacementTest.tsx:263-272` | refresh perde todas as respostas | estado somente React | checkpoint local/Firestore por tentativa | médio | privacy/versionamento; regressão média |
| PED-05 | **Médio** | Placement `placementTestQuestions.ts:351-376` | padrão A,C,D,B é repetido e previsível | balanceamento determinístico | randomização seedada por tentativa e análise psicométrica | pequeno | relatórios; regressão baixa |
| DATA-02 | **Médio** | Livro 1 | zero `acceptedAnswers` em 1.200 objetos | conteúdo antigo | revisão linguística por exercício produtivo | grande | autoria; regressão média |
| NAV-01 | **Médio** | `App.tsx`, `LiveClassesPage.tsx` | só live class tem URL profunda; reload/share de lição não é contratual | navegação por enum | router e rota canônica curso/livro/lição/dia | grande | PWA/history; regressão alta |
| QUAL-03 | **Médio** | `WorkspaceCanvas.tsx` etc. | arquivos de 6.802, 3.594 e 3.330 linhas | responsabilidades acumuladas | modularização após estabilização/testes | grande | testes primeiro; regressão alta |
| ARCH-01 | **Médio** | árvores `apps/*` e `Learnendo/apps/*` | cópias rastreadas concorrentes | migrações/copias históricas | declarar app canônico e arquivar espelhos | médio | deploy paths; regressão média |
| DATA-03 | **Médio** | `constants.tsx:489-545` | conteúdo/grammar antigo duplica dados dos lesson files; L4–L24 sem guia equivalente | modelos sucessivos | schema único de LessonMetadata | médio | conteúdo/UI; regressão média |
| FUN-04 | **Médio** | STT `UI.tsx:901-934` | erro de mic sem causa/recuperação; Web Speech sem fallback | API browser-only | matriz de suporte, mensagens por erro e fallback | médio | privacy/permissions; regressão média |
| QUAL-04 | **Médio** | Build | Vite gera bundle apesar dos 15 erros; JS principal 2,8 MB | build desacoplado do TS e pouco code splitting | gate de typecheck e chunks | médio | CI; regressão média |
| PRIV-01 | **Médio** | Placement/LiveKit | nome, WhatsApp, UID/role em Firestore/logs; política de retenção não encontrada | diagnóstico e logs extensos | minimização, retenção, consentimento e redaction | médio | jurídico/privacidade; regressão baixa |
| MAINT-01 | **Baixo** | `pronounceItems.ts:55-155` | pronúncia WB4–8 usa stubs | expansão incompleta | marcar indisponível ou completar | médio | conteúdo; regressão baixa |
| MAINT-02 | **Baixo** | dependências | várias versões atrás; `@google/genai` 1.3 -> 2.11, Vite 6 -> 8 | atualização adiada | atualizar em lotes com testes | médio | Node/TS; regressão média |

---

# K. Matriz planejado x implementado

| Funcionalidade | Planejado | Encontrado | Status | Evidência | Ação necessária |
|---|---|---|---|---|---|
| 9 livros | 9 | 9 inglês | atendido | registry | preservar |
| 12 lições/livro | 108 total | 108 | atendido estruturalmente | analisador | homologar E2E |
| 7 dias | todos | 108/108 | atendido carregado | analisador | validar bruto |
| 100 exercícios | autorais | 108/108 após transformação | enganoso | normalizador | retirar preenchimento runtime |
| IDs únicos | únicos | 0 duplicados carregados | atendido | analisador | validar no CI e versionar |
| Áudios | funcionais | texto TTS, não arquivos | parcial | ttsService | testes e provedor |
| Speaking | real/flexível | Web Speech real, browser-dependent | parcial | UI.tsx | corrigir TDZ/fallback |
| Reading | modalidade | heurística visual, sem tipo | parcial | UI.tsx | tipo/schema explícito |
| Dialogue | modalidade | tipo existe, zero uso inglês | ausente | types/analisador | componente e conteúdo |
| Lousa + trilhas | integrada | implementação real Firestore | parcial | liveSessionService | segurança/teste multiusuário |
| Progresso | consistente | múltiplas fontes | parcial/risco | engines/App | consolidar/versionar |
| Placement 40 questões | 40, mix 40/30/15/15 | 45, 100% listening | divergente | placement data | redesenhar |
| Retomar placement | sim | não | ausente | useState | checkpoint |
| Deep links | navegação robusta | apenas live class | parcial | history code | router |
| Testes | prevenção | nenhum | ausente | inventário | suíte + CI |
| Segurança live | papéis | regras em parte boas, dois endpoints/regras críticos | inadequado | rules/getToken | corrigir antes de uso real |

---

# L. Plano de correção por fases

1. **Correções críticas**
   - proteger `/api/getToken` e `/api/tts`;
   - restringir `shared/workspace`;
   - corrigir `promptAudioText`, battle e os 15 erros TypeScript;
   - fazer CI falhar no typecheck.

2. **Estabilização do Livro 1**
   - obter PDF integral/canônico;
   - congelar títulos, objetivos, grammar, vocabulário e estruturas L1–L12;
   - reconstruir L3 conforme o PDF e decidir o destino das rotinas;
   - substituir padding das L6–L12 por conteúdo autoral;
   - revisar alternativas e traduções.

3. **Padronização das trilhas**
   - schema por sessão com função pedagógica explícita;
   - exatamente 100 nos dados brutos;
   - proibir conversão automática de modalidade e resposta revelada;
   - validador + relatório de duplicidade semântica.

4. **Integração com a lousa**
   - testes com professor/dois alunos, reload e concorrência;
   - revisionamento de sessão e restauração de contexto;
   - confirmar que participação coletiva não grava progresso pessoal.

5. **Estabilização do placement**
   - aprovar blueprint de 40 itens;
   - implementar speaking/reading/grammar/writing;
   - randomização seedada, checkpoint e retake versionado;
   - validar corte de níveis com dados pedagógicos.

6. **Progresso e versionamento**
   - fonte canônica por curso/livro/lição;
   - `contentVersion`/hash e migration map;
   - remover weekly/flat writes redundantes depois de migração testada.

7. **Expansão segura para Livros 2–9**
   - corrigir os 36 lessons brutos de 95 em Livros 2–4;
   - revisar alta repetição do Livro 9 (45 assinaturas/100 por lição);
   - completar traduções/alternativas e eliminar stubs.

8. **Testes e prevenção de regressão**
   - Vitest para normalização/validação/placement/scoring;
   - Firebase Emulator para regras e concorrência;
   - Playwright para auth, livro, lição, speaking fallback, placement e live;
   - cobertura mínima e bundle budget.

---

# M. Próximo passo recomendado

**Primeira intervenção concreta:** criar uma branch de estabilização que (1) proteja LiveKit/workspace, (2) zere o typecheck e (3) introduza o validador sobre conteúdo bruto. Só então iniciar a reautoria da Lição 3 e das L6–L12 com o PDF integral. Sem esse gate, qualquer expansão continuará transformando déficits em “100” e herdará progresso incompatível.

---

# Verificações executadas e limitações

| Verificação | Resultado |
|---|---|
| Análise dos exports TypeScript | 9 livros, 108 lições, 10.800 objetos, 0 IDs duplicados |
| Campos mínimos/opção correta | 0 violações nos objetos carregados |
| Typecheck `apps/main` | falhou: 15 erros |
| Build `apps/main` | passou: 771 módulos, JS principal 2.804,67 kB; warnings de chunk/import Firebase |
| Typecheck `apps/wbk-5` | falhou: 7 erros |
| Build `apps/wbk-5` | inconclusivo: timeout na execução paralela |
| Build `apps/lab` | falhou antes de compilar: `tsc` não encontrado |
| Testes | 0 aprovados, 0 reprovados; nenhuma suíte encontrada |
| `npm outdated` | executado; 16 pacotes listados com atualização |
| `npm audit` | não executado: envio da árvore ao registry externo não foi autorizado pelo revisor de segurança |
| PDF | 3 páginas renderizadas e verificadas; somente Lição 3 |
| UI local | catálogo Workbook 1 e 12 títulos renderizados; warning de voz vazia |
| Auth/progresso/live E2E | não executado porque a configuração local aponta para Firebase e a auditoria proíbe produção |
| Microfone/navegadores | não testado por exigir permissões e matriz de dispositivos |

## Erros TypeScript do app principal

- `battleQuestionHistoryService.ts:86,113` — propriedade `courseId` incompatível;
- `BattleSetupModal.tsx:369,371,374` — função ausente;
- `WorkspaceCanvas.tsx:2040,6646,6650` — comparação/event types incompatíveis;
- `UI.tsx:520,723` — união inválida e variável antes da declaração;
- `workbook5/lessons.ts:313`, `workbook6/lessons.ts:312`, `workbook7/lessons.ts:297` — `ExerciseInput` ausente;
- `workbook6/lessons.ts:652,872` — `string[]` onde `CorrectionItem` é exigido.

## Estado do Git preservado

Antes da auditoria já existiam um submódulo/caminho modificado e arquivos não rastreados de guias/extratos. Nenhum foi editado. O único artefato permanente criado por esta auditoria é este relatório.
