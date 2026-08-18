# Workbook 1 Exercise Batch Fix Report

## Resumo

- Exercícios corrigidos localmente: **94**, exatamente o conjunto `INVALID` da auditoria V2.
- Estrutura recomposta: **12 lessons, 84 days, 1.200 exercícios e 1.200 IDs únicos**.
- Comparação semântica completa com a build local anterior: **94 IDs alterados dentro do escopo e 0 fora dele**. Metadados internos de seleção não mudam o conteúdo renderizado.
- Falsos positivos da V1 alterados: **0 de 87**.
- Shadowings aprovados alterados: **0 de 8**.
- `wb1_l6_d6_e3`: preservado; o override publicado continua sendo a camada que o torna inequívoco.
- Build PWA: **aprovado**.
- Escritas remotas, publicação, commit, push e deploy: **nenhum**.

### Arquivos alterados

- `apps/main/src/data/workbook1/lesson4.ts`
- `apps/main/src/data/workbook1/lesson5.ts`
- `apps/main/src/data/workbook1/lesson6.ts`
- `apps/main/src/data/workbook1/lesson7.ts`
- `apps/main/src/data/workbook1/lesson8.ts`
- `apps/main/src/data/workbook1/lesson9.ts`
- `apps/main/src/data/workbook1/lesson10.ts`
- `apps/main/src/data/workbook1/lessonBuilder.ts`
- `apps/main/src/data/workbook1/finalizeWorkbook1Lesson.ts`
- `apps/main/src/utils/writingPrompt.ts`
- `apps/main/src/types.ts`
- `apps/main/scripts/workbook1-batch-fixes.test.mjs`
- `apps/main/scripts/workbook1-curriculum.test.mjs`
- `apps/main/scripts/workbook1-rendered-audit.mjs`
- `apps/main/package.json`
- `docs/audits/WORKBOOK1_EXERCISE_BATCH_FIX_REPORT.md`

### Quantidade por categoria

| Categoria V2 | Ocorrências | Implementação |
|---|---:|---|
| AUDIO_GIVES_ANSWER | 37 | áudio-resposta removido localmente |
| INVALID_OPTIONS | 5 | opções e expected reduzidos ao preenchimento literal |
| AMBIGUOUS_WRITE_QUESTION | 10 | prompt PT-BR determinístico, sem áudio, com write-question |
| TYPE_MODE_MISMATCH | 2 | modalidade efetiva alinhada; speaking oral preservado no item de artigo |
| PROMPT_ANSWER_MISMATCH | 2 | prompt e alvo realinhados |
| MISSING_CONTEXT | 2 | contexto visual adicionado |
| DISPLAY_REVEALS_ANSWER | 1 | leakage visual removido |
| VISIBLE_LISTENING_PROMPT | 5 | pergunta textual redundante removida; contexto preservado |
| LONG_SHADOWING | 13 | alvo reduzido a unidade curta sem marcadores de papel |
| LONG_DICTATION | 3 | alvo reduzido a frase curta |
| DICTATION_ORTHOGRAPHY | 17 | variante plausível específica ou contexto explícito de grafia |
| DUPLICATE_ACCEPTED | 6 | deduplicação pela normalização do matcher |
| OPEN_RESPONSE_TOO_NARROW | 2 | templates completos `{name}` adicionados |

As categorias se sobrepõem; o total único permanece 94.

## Correções

### Workbook 1 → Lesson 2 — Day 7

#### `wb1_l2_final_v2_speak_1`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=Which article completes this sentence: "It is ___ apple"?; options=—; expected=an; accepted=[an]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=fa-kite; audio=What is this?; options=—; expected=This is a kite.; accepted=[It is a kite. / It's a kite.]; promptMode=—`
- Motivo: MISSING_CONTEXT. Add effective visual/audio/text context.

#### `wb1_l2_final_v2_speak_5`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=Which article completes this sentence: "It is ___ sunny day"?; options=—; expected=a; accepted=[a]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Complete the sentence aloud in English.; display=It is ___ apple.; audio=—; options=—; expected=It is an apple.; accepted=—; promptMode=—`
- Motivo: TYPE_MODE_MISMATCH, PROMPT_ANSWER_MISMATCH. Rebuild with modality matching the instruction. Align prompt, language and expected answer.

#### `wb1_l2_final_v2_speak_6`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is "Sol" in English?; options=—; expected=sun; accepted=[sun]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is "sol" in English?; options=—; expected=sun; accepted=—; promptMode=—`
- Motivo: PROMPT_ANSWER_MISMATCH. Align prompt, language and expected answer.

### Workbook 1 → Lesson 3 — Day 7

#### `wb1_l3_final_v2_listen_write_3`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Daniel has lunch at 12 o'clock noon.; options=—; expected=Daniel has lunch at 12 o'clock noon.; accepted=[Daniel has lunch at 12 o'clock noon.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Daniel; audio=Daniel has lunch at 12 o'clock noon.; options=—; expected=Daniel has lunch at 12 o'clock noon.; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l3_final_v2_listen_write_8`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=When does Daniel eat breakfast?; options=—; expected=When does Daniel eat breakfast?; accepted=[When does Daniel eat breakfast?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Daniel; audio=When does Daniel eat breakfast?; options=—; expected=When does Daniel eat breakfast?; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l3_final_v2_speak_3`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=He takes a shower and gets dressed.; audio=Read: He takes a shower and gets dressed. What does he do after waking up?; options=—; expected=take a shower; accepted=[take a shower]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=He takes a shower and gets dressed. What does he do after waking up?; options=—; expected=He takes a shower.; accepted=—; promptMode=—`
- Motivo: DISPLAY_REVEALS_ANSWER. Remove answer leakage while preserving context.

### Workbook 1 → Lesson 4 — Day 4

#### `wb1_l4_d4_e10`

- Before: `type=multiple-choice; mode=—; instruction=What is the address?; display=—; audio=It is at 21 First Street.; options=[12 First Street / 21 First Street / 31 Third Street / 41 Fourth Street]; expected=21 First Street; accepted=[It is at 21 First Street / It is at 21 First Street.]; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=What is the address?; display=—; audio=It is at 21 First Street.; options=[12 First Street / 21 First Street / 31 Third Street / 41 Fourth Street]; expected=21 First Street; accepted=[It is at 21 First Street.]; promptMode=—`
- Motivo: DUPLICATE_ACCEPTED. Deduplicate after current validator normalization.

### Workbook 1 → Lesson 4 — Day 7

#### `wb1_l4_final_v2_listen_write_1`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Daniel is the first one.; options=—; expected=Daniel is the first one.; accepted=[Daniel is the first one.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Daniel; audio=Daniel is the first one.; options=—; expected=Daniel is the first one.; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l4_final_v2_listen_write_4`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Emily is second.; options=—; expected=Emily is second.; accepted=[Emily is second.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Emily; audio=Emily is second.; options=—; expected=Emily is second.; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l4_final_v2_speak_3`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=Who is first in line?; audio=Who is first in line?; options=—; expected=anna; accepted=[anna / Anna. / Anna is first. / Anna is first in line.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=Who is first in line?; options=—; expected=Anna is first in line.; accepted=[Anna. / Anna is first.]; promptMode=—`
- Motivo: VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED. Hide the audio question unless visual context is required. Deduplicate after current validator normalization.

### Workbook 1 → Lesson 5 — Day 2

#### `wb1_l5_d2_e1`

- Before: `type=multiple-choice; mode=—; instruction=Complete: I ___ Daniel.; display=—; audio=I am Daniel.; options=[am / is / are]; expected=am; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: I ___ Daniel.; display=—; audio=—; options=[am / is / are]; expected=am; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e2`

- Before: `type=multiple-choice; mode=—; instruction=Complete: She ___ from Mexico.; display=—; audio=She is from Mexico.; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: She ___ from Mexico.; display=—; audio=—; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e3`

- Before: `type=multiple-choice; mode=—; instruction=Complete: He ___ a student.; display=—; audio=He is a student.; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: He ___ a student.; display=—; audio=—; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e4`

- Before: `type=multiple-choice; mode=—; instruction=Complete: We ___ friends.; display=—; audio=We are friends.; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: We ___ friends.; display=—; audio=—; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e5`

- Before: `type=multiple-choice; mode=—; instruction=Complete: You ___ my teacher.; display=—; audio=You are my teacher.; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: You ___ my teacher.; display=—; audio=—; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e6`

- Before: `type=multiple-choice; mode=—; instruction=Complete: They ___ in the classroom.; display=—; audio=They are in the classroom.; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: They ___ in the classroom.; display=—; audio=—; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e7`

- Before: `type=multiple-choice; mode=—; instruction=Complete: I ___ eleven years old.; display=—; audio=I am eleven years old.; options=[am / is / are]; expected=am; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: I ___ eleven years old.; display=—; audio=—; options=[am / is / are]; expected=am; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e8`

- Before: `type=multiple-choice; mode=—; instruction=Complete: She ___ from Brazil.; display=—; audio=She is from Brazil.; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: She ___ from Brazil.; display=—; audio=—; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e9`

- Before: `type=multiple-choice; mode=—; instruction=Complete: He ___ my classmate.; display=—; audio=He is my classmate.; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: He ___ my classmate.; display=—; audio=—; options=[am / is / are]; expected=is; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l5_d2_e10`

- Before: `type=multiple-choice; mode=—; instruction=Complete: We ___ students.; display=—; audio=We are students.; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete: We ___ students.; display=—; audio=—; options=[am / is / are]; expected=are; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 5 — Day 7

#### `wb1_l5_final_v2_speak_1`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is your name?; options=—; expected=My name is Anna.; accepted=[My name is Anna.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is your name?; options=—; expected=My name is Ana.; accepted=[My name is {name}. / I am {name}.]; promptMode=—`
- Motivo: OPEN_RESPONSE_TOO_NARROW. Use natural complete-answer variants or a personal template.

### Workbook 1 → Lesson 6 — Day 1

#### `wb1_l6_d1_e8`

- Before: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=Good morning!; options=[Good morning! / Good night! / Goodbye!]; expected=Good morning!; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=—; options=[morning / afternoon / night]; expected=morning; accepted=—; promptMode=—`
- Motivo: INVALID_OPTIONS, AUDIO_GIVES_ANSWER. Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l6_d1_e9`

- Before: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=Good afternoon!; options=[Good afternoon! / Goodbye! / See you!]; expected=Good afternoon!; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=—; options=[afternoon / morning / evening]; expected=afternoon; accepted=—; promptMode=—`
- Motivo: INVALID_OPTIONS, AUDIO_GIVES_ANSWER. Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 6 — Day 2

#### `wb1_l6_d2_e1`

- Before: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=Good morning!; options=[Good morning! / Good night! / Goodbye!]; expected=Good morning!; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=—; options=[morning / afternoon / night]; expected=morning; accepted=—; promptMode=—`
- Motivo: INVALID_OPTIONS, AUDIO_GIVES_ANSWER. Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l6_d2_e2`

- Before: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=Good afternoon!; options=[Good afternoon! / Goodbye! / See you!]; expected=Good afternoon!; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=—; options=[afternoon / morning / evening]; expected=afternoon; accepted=—; promptMode=—`
- Motivo: INVALID_OPTIONS, AUDIO_GIVES_ANSWER. Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 6 — Day 4

#### `wb1_l6_d4_e1`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat the dialogue.; display=Teacher: Good morning, class. ↵ Students: Good morning, teacher. ↵ Teacher: How are you? ↵ Students: We are fine, thank you.; audio=Teacher: Good morning, class. Students: Good morning, teacher. Teacher: How are you? Students: We are fine, thank you.; options=—; expected=Teacher: Good morning, class. Students: Good morning, teacher. Teacher: How are you? Students: We are fine, thank you.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat.; display=Good morning, class. How are you?; audio=Good morning, class. How are you?; options=—; expected=Good morning, class. How are you?; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l6_d4_e4`

- Before: `type=writing; mode=—; instruction=Complete the dialogue.; display=Teacher: Good afternoon, Ana. ↵ Ana: ______, teacher.; audio=Good afternoon, Ana.; options=—; expected=Good afternoon; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete the dialogue.; display=Teacher: Good afternoon, Ana. ↵ Ana: ______, teacher.; audio=—; options=—; expected=Good afternoon; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 6 — Day 5

#### `wb1_l6_d5_e8`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: Greetings at School; audio=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; options=—; expected=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: Greetings at School; audio=Good morning! My name is Ben.; options=—; expected=Good morning! My name is Ben.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l6_d5_e15`

- Before: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=Good morning!; options=[Good morning! / Good night! / Goodbye!]; expected=Good morning!; accepted=—; promptMode=—`
- After: `type=multiple-choice; mode=—; instruction=Complete the sentence.; display=Good ______!; audio=—; options=[morning / afternoon / night]; expected=morning; accepted=—; promptMode=—`
- Motivo: INVALID_OPTIONS, AUDIO_GIVES_ANSWER. Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 6 — Day 6

#### `wb1_l6_d6_e1`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: Greetings at School; audio=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; options=—; expected=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: Greetings at School; audio=Good morning! My name is Ben.; options=—; expected=Good morning! My name is Ben.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l6_d6_e2`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: Ben; audio=Ben; options=—; expected=What is the boy’s name?; accepted=[What's the boy’s name?]; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Qual é o nome do menino?; audio=—; options=—; expected=What is the boy’s name?; accepted=[What's the boy’s name?]; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l6_d6_e4`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: Hello, teacher!; audio=Hello, teacher!; options=—; expected=What does Ben say to the teacher?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=O que Ben diz para o professor?; audio=—; options=—; expected=What does Ben say to the teacher?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l6_d6_e5`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: Yes, they are.; audio=Yes, they are.; options=—; expected=Are Ben and Anna happy?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Ben e Anna estão felizes?; audio=—; options=—; expected=Are Ben and Anna happy?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l6_d6_e7`

- Before: `type=speaking; mode=—; instruction=Read and repeat.; display=Good morning, teacher. / Hello, friends. / Goodbye. / See you!; audio=Good morning, teacher. Hello, friends. Goodbye. See you!; options=—; expected=Good morning, teacher. Hello, friends. Goodbye. See you!; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Translate into English.; display=Bom dia, professor. Como você está?; audio=—; options=—; expected=Good morning, teacher. How are you?; accepted=—; promptMode=—`
- Motivo: TYPE_MODE_MISMATCH. Rebuild with modality matching the instruction.

#### `wb1_l6_d6_e8`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat the dialogue.; display=Teacher: Good morning, class. ↵ Students: Good morning, teacher. ↵ Teacher: How are you? ↵ Students: We are fine, thank you.; audio=Teacher: Good morning, class. Students: Good morning, teacher. Teacher: How are you? Students: We are fine, thank you.; options=—; expected=Teacher: Good morning, class. Students: Good morning, teacher. Teacher: How are you? Students: We are fine, thank you.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Good morning, class. How are you?; audio=Good morning, class. How are you?; options=—; expected=Good morning, class. How are you?; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

### Workbook 1 → Lesson 6 — Day 7

#### `wb1_l6_final_v2_listen_write_4`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=My name is Anna.; options=—; expected=My name is Anna.; accepted=[My name is Anna.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=My name is Anna.; options=—; expected=My name is Anna.; accepted=[My name is Ana.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l6_final_v2_listen_write_5`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Good afternoon, Ana.; options=—; expected=Good afternoon, Ana.; accepted=[Good afternoon, Ana.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Good afternoon, Ana.; options=—; expected=Good afternoon, Ana.; accepted=[Good afternoon, Anna.]; promptMode=—`
- Motivo: DUPLICATE_ACCEPTED. Deduplicate after current validator normalization.

#### `wb1_l6_final_v2_listen_write_6`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; options=—; expected=Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!; accepted=[Good morning! My name is Ben. I am in my classroom. I see my teacher and my friends. I say, Hello, teacher! My teacher says, Good morning, Ben! Anna says, Hi, Ben! I say, Hi, Anna! We are happy. In the afternoon, I say, Goodbye, friends! They say, See you, Ben!]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Good morning! My name is Ben.; options=—; expected=Good morning! My name is Ben.; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY, LONG_DICTATION. Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.

#### `wb1_l6_final_v2_listen_write_7`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Are Ben and Anna happy?; options=—; expected=Are Ben and Anna happy?; accepted=[Are Ben and Anna happy?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Are Ben and Anna happy?; options=—; expected=Are Ben and Anna happy?; accepted=[Are Ben and Ana happy?]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l6_final_v2_listen_write_8`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Ben; options=—; expected=Ben; accepted=[Ben / What's the boy’s name?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=See you; options=—; expected=See you; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l6_final_v2_speak_3`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=Where is Ben?; audio=Where is Ben?; options=—; expected=In the classroom; accepted=[In the classroom]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=fa-chalkboard-user; audio=Where is Ben?; options=—; expected=Ben is in the classroom.; accepted=[He is in the classroom.]; promptMode=—`
- Motivo: MISSING_CONTEXT. Add effective visual/audio/text context.

#### `wb1_l6_final_v2_speak_4`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=What does Ben say to the teacher?; audio=What does Ben say to the teacher?; options=—; expected=Hello, teacher!; accepted=[Hello, teacher!]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What does Ben say to the teacher?; options=—; expected=Hello, teacher!; accepted=—; promptMode=—`
- Motivo: VISIBLE_LISTENING_PROMPT. Hide the audio question unless visual context is required.

#### `wb1_l6_final_v2_speak_5`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=Are Ben and Anna happy?; audio=Are Ben and Anna happy?; options=—; expected=Yes, they are.; accepted=[Yes, they are.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=Are Ben and Anna happy?; options=—; expected=Yes, they are.; accepted=—; promptMode=—`
- Motivo: VISIBLE_LISTENING_PROMPT. Hide the audio question unless visual context is required.

#### `wb1_l6_final_v2_speak_6`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=What is the boy’s name?; audio=What is the boy’s name?; options=—; expected=Ben; accepted=[Ben]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is the boy’s name?; options=—; expected=His name is Ben.; accepted=[It's Ben.]; promptMode=—`
- Motivo: VISIBLE_LISTENING_PROMPT. Hide the audio question unless visual context is required.

### Workbook 1 → Lesson 7 — Day 4

#### `wb1_l7_d4_e1`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat the dialogue.; display=Teacher: What day is it today? ↵ Ben: It is Monday. ↵ Teacher: What month is it? ↵ Anna: It is January. ↵ Teacher: What is the date? ↵ Lucas: It is January first.; audio=Teacher: What day is it today? Ben: It is Monday. Teacher: What month is it? Anna: It is January. Teacher: What is the date? Lucas: It is January first.; options=—; expected=Teacher: What day is it today? Ben: It is Monday. Teacher: What month is it? Anna: It is January. Teacher: What is the date? Lucas: It is January first.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat.; display=What day is it today? It is Monday.; audio=What day is it today? It is Monday.; options=—; expected=What day is it today? It is Monday.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

### Workbook 1 → Lesson 7 — Day 5

#### `wb1_l7_d5_e8`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: The Calendar in Class; audio=Today is Monday. The month is January. Ben is in the classroom. The teacher writes the date on the board. It is January first. Anna says, My birthday is in March. Lucas says, My birthday is in July. The students read the days and the months. They are happy.; options=—; expected=Today is Monday. The month is January. Ben is in the classroom. The teacher writes the date on the board. It is January first. Anna says, My birthday is in March. Lucas says, My birthday is in July. The students read the days and the months. They are happy.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: The Calendar in Class; audio=Today is Monday. The month is January.; options=—; expected=Today is Monday. The month is January.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

### Workbook 1 → Lesson 7 — Day 6

#### `wb1_l7_d6_e1`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: The Calendar in Class; audio=Today is Monday. The month is January. Ben is in the classroom. The teacher writes the date on the board. It is January first. Anna says, My birthday is in March. Lucas says, My birthday is in July. The students read the days and the months. They are happy.; options=—; expected=Today is Monday. The month is January. Ben is in the classroom. The teacher writes the date on the board. It is January first. Anna says, My birthday is in March. Lucas says, My birthday is in July. The students read the days and the months. They are happy.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Reading: The Calendar in Class; audio=Today is Monday. The month is January.; options=—; expected=Today is Monday. The month is January.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l7_d6_e2`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: Monday; audio=Monday; options=—; expected=What day is it?; accepted=[What day is it today?]; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Que dia é hoje?; audio=—; options=—; expected=What day is it?; accepted=[What day is it today?]; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e3`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: January; audio=January; options=—; expected=What month is it?; accepted=[What month is it now?]; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Que mês é?; audio=—; options=—; expected=What month is it?; accepted=[What month is it now?]; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e4`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: January first; audio=January first; options=—; expected=What is the date?; accepted=[What's the date?]; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Qual é a data?; audio=—; options=—; expected=What is the date?; accepted=[What's the date?]; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e5`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: In March; audio=In March; options=—; expected=When is Anna’s birthday?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Quando é o aniversário da Anna?; audio=—; options=—; expected=When is Anna’s birthday?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e6`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: In July; audio=In July; options=—; expected=When is Lucas’s birthday?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Quando é o aniversário do Lucas?; audio=—; options=—; expected=When is Lucas’s birthday?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e8`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat the dialogue.; display=Teacher: What day is it today? ↵ Ben: It is Monday. ↵ Teacher: What month is it? ↵ Anna: It is January. ↵ Teacher: What is the date? ↵ Lucas: It is January first.; audio=Teacher: What day is it today? Ben: It is Monday. Teacher: What month is it? Anna: It is January. Teacher: What is the date? Lucas: It is January first.; options=—; expected=Teacher: What day is it today? Ben: It is Monday. Teacher: What month is it? Anna: It is January. Teacher: What is the date? Lucas: It is January first.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=What day is it today? It is Monday.; audio=What day is it today? It is Monday.; options=—; expected=What day is it today? It is Monday.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l7_d6_e9`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: It is Monday.; audio=It is Monday.; options=—; expected=What day is it today?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Que dia é hoje?; audio=—; options=—; expected=What day is it today?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

#### `wb1_l7_d6_e10`

- Before: `type=writing; mode=—; instruction=Write the question.; display=Answer: It is January.; audio=It is January.; options=—; expected=What month is it?; accepted=—; promptMode=write-question`
- After: `type=writing; mode=—; instruction=Write the question in English.; display=Que mês é?; audio=—; options=—; expected=What month is it?; accepted=—; promptMode=write-question`
- Motivo: AMBIGUOUS_WRITE_QUESTION. Provide a determinate translated question or context.

### Workbook 1 → Lesson 7 — Day 7

#### `wb1_l7_final_v2_listen_write_6`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=April; options=—; expected=April; accepted=[April / April / It is April. / The month is April.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=April; options=—; expected=April; accepted=[It is April. / The month is April.]; promptMode=—`
- Motivo: DUPLICATE_ACCEPTED. Deduplicate after current validator normalization.

#### `wb1_l7_final_v2_speak_2`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=What month is it? ______; audio=What month is it?; options=—; expected=It is January.; accepted=[It is January. / January / It is January. / The month is January. / February / It is February. / The month is February. / March / It is March. / The month is March. / April / It is April. / The month is April. / May / It is May. / The month is May. / June / It is June. / The month is June. / July / It is July. / The month is July. / August / It is August. / The month is August. / September / It is September. / The month is September. / October / It is October. / The month is October. / November / It is November. / The month is November. / December / It is December. / The month is December.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What month is it?; options=—; expected=It is January.; accepted=[January / The month is January. / February / It is February. / The month is February. / March / It is March. / The month is March. / April / It is April. / The month is April. / May / It is May. / The month is May. / June / It is June. / The month is June. / July / It is July. / The month is July. / August / It is August. / The month is August. / September / It is September. / The month is September. / October / It is October. / The month is October. / November / It is November. / The month is November. / December / It is December. / The month is December.]; promptMode=—`
- Motivo: VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED. Hide the audio question unless visual context is required. Deduplicate after current validator normalization.

#### `wb1_l7_final_v2_speak_3`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=A: What month is it? ↵ B: It is ______.; audio=What month is it?; options=—; expected=It is May.; accepted=[It is May. / January / It is January. / The month is January. / February / It is February. / The month is February. / March / It is March. / The month is March. / April / It is April. / The month is April. / May / It is May. / The month is May. / June / It is June. / The month is June. / July / It is July. / The month is July. / August / It is August. / The month is August. / September / It is September. / The month is September. / October / It is October. / The month is October. / November / It is November. / The month is November. / December / It is December. / The month is December.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=A: What month is it? ↵ B: It is ______.; audio=What month is it?; options=—; expected=It is May.; accepted=[January / It is January. / The month is January. / February / It is February. / The month is February. / March / It is March. / The month is March. / April / It is April. / The month is April. / May / The month is May. / June / It is June. / The month is June. / July / It is July. / The month is July. / August / It is August. / The month is August. / September / It is September. / The month is September. / October / It is October. / The month is October. / November / It is November. / The month is November. / December / It is December. / The month is December.]; promptMode=—`
- Motivo: DUPLICATE_ACCEPTED. Deduplicate after current validator normalization.

### Workbook 1 → Lesson 8 — Day 3

#### `wb1_l8_d3_e8`

- Before: `type=writing; mode=—; instruction=Write a complete short answer.; display=Answer the question: Are Anna and Ben ready?; audio=Are Anna and Ben ready? Yes, they are.; options=—; expected=Yes, they are.; accepted=[Yes, Anna and Ben are.]; promptMode=—`
- After: `type=writing; mode=—; instruction=Write a complete short answer.; display=Answer the question: Are Anna and Ben ready?; audio=—; options=—; expected=Yes, they are.; accepted=[Yes, Anna and Ben are.]; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l8_d3_e10`

- Before: `type=writing; mode=—; instruction=Write a complete short answer.; display=Answer the question: Is Emily near the giraffes?; audio=Is Emily near the giraffes? Yes, she is.; options=—; expected=Yes, she is.; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Write a complete short answer.; display=Answer the question: Is Emily near the giraffes?; audio=—; options=—; expected=Yes, she is.; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 8 — Day 5

#### `wb1_l8_d5_e1`

- Before: `type=speaking; mode=shadowing; instruction=Listen to Reading — At the Zoo, then shadow it.; display=Reading — At the Zoo ↵ Today is Tuesday. Ben, Anna, Lucas, and Emily are at the zoo. They are not late. They're ready to explore. The guide says, 'Good morning, everyone. Are you ready?' Ben says, 'Yes, I am. I'm ready.' Anna says, 'I'm ready too. I'm not tired today.' Lucas is happy. He isn't afraid. He is with his friends. Emily is near the giraffes. She isn't at the entrance. She is beside a tall tree. The guide points to a lion and says, 'He's strong.' Then she points to a zebra and says, 'It's beautiful too.' After that, the guide looks at the group and says, 'You're all ready. We're ready to see more animals.' The students smile. They're happy because they can enjoy nature and understand contractions in English.; audio=Today is Tuesday. Ben, Anna, Lucas, and Emily are at the zoo. They are not late. They're ready to explore. The guide says, 'Good morning, everyone. Are you ready?' Ben says, 'Yes, I am. I'm ready.' Anna says, 'I'm ready too. I'm not tired today.' Lucas is happy. He isn't afraid. He is with his friends. Emily is near the giraffes. She isn't at the entrance. She is beside a tall tree. The guide points to a lion and says, 'He's strong.' Then she points to a zebra and says, 'It's beautiful too.' After that, the guide looks at the group and says, 'You're all ready. We're ready to see more animals.' The students smile. They're happy because they can enjoy nature and understand contractions in English.; options=—; expected=Today is Tuesday. Ben, Anna, Lucas, and Emily are at the zoo. They are not late. They're ready to explore. The guide says, 'Good morning, everyone. Are you ready?' Ben says, 'Yes, I am. I'm ready.' Anna says, 'I'm ready too. I'm not tired today.' Lucas is happy. He isn't afraid. He is with his friends. Emily is near the giraffes. She isn't at the entrance. She is beside a tall tree. The guide points to a lion and says, 'He's strong.' Then she points to a zebra and says, 'It's beautiful too.' After that, the guide looks at the group and says, 'You're all ready. We're ready to see more animals.' The students smile. They're happy because they can enjoy nature and understand contractions in English.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Read the context, then listen and repeat the short model.; display=Reading — At the Zoo ↵ Today is Tuesday. Ben, Anna, Lucas, and Emily are at the zoo. They are not late. They're ready to explore. The guide says, 'Good morning, everyone. Are you ready?' Ben says, 'Yes, I am. I'm ready.' Anna says, 'I'm ready too. I'm not tired today.' Lucas is happy. He isn't afraid. He is with his friends. Emily is near the giraffes. She isn't at the entrance. She is beside a tall tree. The guide points to a lion and says, 'He's strong.' Then she points to a zebra and says, 'It's beautiful too.' After that, the guide looks at the group and says, 'You're all ready. We're ready to see more animals.' The students smile. They're happy because they can enjoy nature and understand contractions in English.; audio=Today is Tuesday. The students are ready to explore the zoo.; options=—; expected=Today is Tuesday. The students are ready to explore the zoo.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l8_d5_e2`

- Before: `type=speaking; mode=shadowing; instruction=Listen to Dialogue 17 — Lucas Isn’t Afraid, then shadow it.; display=Dialogue 17 — Lucas Isn’t Afraid ↵ Guide: Where is Lucas? ↵ Anna: He's near the lion. ↵ Guide: Is he afraid? ↵ Anna: No, he isn't. ↵ Guide: Is he happy? ↵ Anna: Yes, he is. ↵ Lucas: I'm happy today!; audio=Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!; options=—; expected=Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=Lucas is near the lion. He isn't afraid.; audio=Lucas is near the lion. He isn't afraid.; options=—; expected=Lucas is near the lion. He isn't afraid.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

### Workbook 1 → Lesson 8 — Day 6

#### `wb1_l8_d6_e7`

- Before: `type=speaking; mode=shadowing; instruction=Informal English — listen to Dialogue 18 and shadow it.; display=Dialogue 18 — They Ain't Late ↵ Informal Spoken English ↵  ↵ Guide: Are Ben and Anna late? ↵ Lucas: No, they ain't. ↵ Guide: Are they near the giraffes? ↵ Lucas: Yes, they are. ↵ Guide: Are they ready to see more animals? ↵ Lucas: Yes, they are. ↵ Guide: Good. They ain't late, and they're ready.; audio=Guide: Are Ben and Anna late? Lucas: No, they ain't. Guide: Are they near the giraffes? Lucas: Yes, they are. Guide: Are they ready to see more animals? Lucas: Yes, they are. Guide: Good. They ain't late, and they're ready.; options=—; expected=Guide: Are Ben and Anna late? Lucas: No, they ain't. Guide: Are they near the giraffes? Lucas: Yes, they are. Guide: Are they ready to see more animals? Lucas: Yes, they are. Guide: Good. They ain't late, and they're ready.; accepted=—; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Informal English — listen and repeat exactly what you hear.; display=Dialogue 18 — They Ain't Late ↵ Informal Spoken English ↵  ↵ Ben and Anna ain't late. They're ready.; audio=Ben and Anna ain't late. They're ready.; options=—; expected=Ben and Anna ain't late. They're ready.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

### Workbook 1 → Lesson 8 — Day 7

#### `wb1_l8_final_v2_listen_write_3`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Lucas is not afraid.; options=—; expected=Lucas is not afraid.; accepted=[Lucas is not afraid.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Lucas is not afraid.; options=—; expected=Lucas is not afraid.; accepted=[Lukas is not afraid.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l8_final_v2_listen_write_7`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!; options=—; expected=Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!; accepted=[Guide: Where is Lucas? Anna: He's near the lion. Guide: Is he afraid? Anna: No, he isn't. Guide: Is he happy? Anna: Yes, he is. Lucas: I'm happy today!]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Lucas is near the lion. He isn't afraid.; options=—; expected=Lucas is near the lion. He isn't afraid.; accepted=[Lukas is near the lion. He isn't afraid.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY, LONG_DICTATION. Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.

### Workbook 1 → Lesson 9 — Day 2

#### `wb1_l9_d2_e8`

- Before: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What ______ is it today?; audio=Complete the day question.; options=—; expected=day; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What ______ is it today?; audio=—; options=—; expected=day; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l9_d2_e9`

- Before: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What's the ______?; audio=Complete the date question.; options=—; expected=date; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What's the ______?; audio=—; options=—; expected=date; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l9_d2_e11`

- Before: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=Could you ______ your name?; audio=Complete the spelling request.; options=—; expected=spell; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=Could you ______ your name?; audio=—; options=—; expected=spell; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l9_d2_e12`

- Before: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What's your phone ______?; audio=Complete the number question.; options=—; expected=number; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete the practical speaking pattern.; display=What's your phone ______?; audio=—; options=—; expected=number; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 9 — Day 7

#### `wb1_l9_final_v2_listen_write_1`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Hi! I’m Sofia.; options=—; expected=Hi! I’m Sofia.; accepted=[Hi! I’m Sofia.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Hi! I’m Sofia.; options=—; expected=Hi! I’m Sofia.; accepted=[Hi! I’m Sophia.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l9_final_v2_listen_write_3`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Hi, Sofia! I’m Ben.; options=—; expected=Hi, Sofia! I’m Ben.; accepted=[Hi, Sofia! I’m Ben.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Hi, Sofia! I’m Ben.; options=—; expected=Hi, Sofia! I’m Ben.; accepted=[Hi, Sophia! I’m Ben.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l9_final_v2_listen_write_6`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Is the girl Ben’s sister?; options=—; expected=Is the girl Ben’s sister?; accepted=[Is the girl Ben’s sister?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Ben; audio=Is the girl Ben’s sister?; options=—; expected=Is the girl Ben’s sister?; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l9_final_v2_listen_write_8`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=How old is Sofia?; options=—; expected=How old is Sofia?; accepted=[How old is Sofia?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=How old is Sofia?; options=—; expected=How old is Sofia?; accepted=[How old is Sophia?]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

### Workbook 1 → Lesson 10 — Day 2

#### `wb1_l10_d2_e1`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ January; audio=in January; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ January; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e2`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ March; audio=in March; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ March; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e3`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ summer; audio=in summer; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ summer; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e4`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ winter; audio=in winter; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ winter; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e5`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ 2026; audio=in 2026; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ 2026; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e6`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ Monday; audio=on Monday; options=—; expected=on; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ Monday; audio=—; options=—; expected=on; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e7`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ April eighth; audio=on April eighth; options=—; expected=on; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ April eighth; audio=—; options=—; expected=on; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e8`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ my birthday; audio=on my birthday; options=—; expected=on; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ my birthday; audio=—; options=—; expected=on; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e9`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ seven o'clock; audio=at seven o'clock; options=—; expected=at; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ seven o'clock; audio=—; options=—; expected=at; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e10`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ noon; audio=at noon; options=—; expected=at; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ noon; audio=—; options=—; expected=at; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e11`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ night; audio=at night; options=—; expected=at; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ night; audio=—; options=—; expected=at; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e12`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ Friday morning; audio=on Friday morning; options=—; expected=on; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ Friday morning; audio=—; options=—; expected=on; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e13`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ September third; audio=on September third; options=—; expected=on; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ September third; audio=—; options=—; expected=on; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e14`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ the afternoon; audio=in the afternoon; options=—; expected=in; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ the afternoon; audio=—; options=—; expected=in; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

#### `wb1_l10_d2_e15`

- Before: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ midnight; audio=at midnight; options=—; expected=at; accepted=—; promptMode=—`
- After: `type=writing; mode=—; instruction=Complete with in, on, or at.; display=____ midnight; audio=—; options=—; expected=at; accepted=—; promptMode=—`
- Motivo: AUDIO_GIVES_ANSWER. Remove answer-bearing audio or explicitly redesign as listening.

### Workbook 1 → Lesson 11 — Day 7

#### `wb1_l11_final_v2_listen_write_5`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.; options=—; expected=Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.; accepted=[Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=She's in the classroom.; options=—; expected=She's in the classroom.; accepted=[She is in the classroom.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY, LONG_DICTATION. Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.

#### `wb1_l11_final_v2_listen_write_6`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Who is she? She is Ms. Green.; options=—; expected=Who is she? She is Ms. Green.; accepted=[Who is she? She is Ms. Green. / Who is she? She's Ms. Green.]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Who is she? She is Ms. Green.; options=—; expected=Who is she? She is Ms. Green.; accepted=[Who is she? She's Ms. Green. / Who is she? She is Ms. Greene. / Who is she? She's Ms. Greene.]; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l11_final_v2_shadow_4`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=—; audio=Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.; options=—; expected=Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.; accepted=[Amir: Who is she? Leo: She's Ms. Green. Amir: Where is she? Leo: She's in the classroom. Amir: When is English class? Leo: It's on Monday at nine.]; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=—; audio=It's on Monday at nine.; options=—; expected=It's on Monday at nine.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

#### `wb1_l11_final_v2_speak_1`

- Before: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is your name?; options=—; expected=My name is Maya.; accepted=[My name is Maya.]; promptMode=—`
- After: `type=speaking; mode=speaking; instruction=Listen and answer aloud in English.; display=—; audio=What is your name?; options=—; expected=My name is Maya.; accepted=[My name is {name}. / I am {name}.]; promptMode=—`
- Motivo: OPEN_RESPONSE_TOO_NARROW. Use natural complete-answer variants or a personal template.

### Workbook 1 → Lesson 12 — Day 7

#### `wb1_l12_final_v2_listen_write_5`

- Before: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=—; audio=Who did Ben help?; options=—; expected=Who did Ben help?; accepted=[Who did Ben help?]; promptMode=—`
- After: `type=writing; mode=listening-writing; instruction=Listen and write exactly what you hear.; display=Name: Ben; audio=Who did Ben help?; options=—; expected=Who did Ben help?; accepted=—; promptMode=—`
- Motivo: DICTATION_ORTHOGRAPHY. Accept audibly indistinguishable spellings or provide context.

#### `wb1_l12_final_v2_shadow_1`

- Before: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=—; audio=Teacher: What did you do yesterday? Ben: I played a number game and helped Leo. Teacher: Did class start at nine? Ben: Yes. It started at nine.; options=—; expected=Teacher: What did you do yesterday? Ben: I played a number game and helped Leo. Teacher: Did class start at nine? Ben: Yes. It started at nine.; accepted=[Teacher: What did you do yesterday? Ben: I played a number game and helped Leo. Teacher: Did class start at nine? Ben: Yes. It started at nine.]; promptMode=—`
- After: `type=speaking; mode=shadowing; instruction=Listen and repeat exactly what you hear.; display=—; audio=I played a number game and helped Leo.; options=—; expected=I played a number game and helped Leo.; accepted=—; promptMode=—`
- Motivo: LONG_SHADOWING. Split into coherent one-recording units.

## Camadas remotas

A aplicação em produção continua inalterada. Todos os 94 itens dependem de um futuro deploy para receber o patch local. Dentro desse conjunto:

- **88 IDs** dependem somente do futuro deploy da base/código.
- **3 IDs** em `wb1_l2_d7` exigem nova publicação da day sequence e também atualização dos overrides individuais.
- **3 IDs adicionais** exigem atualização de override depois do deploy.
- Total que exige publicação editorial remota além do deploy: **6 IDs**.

### Nova publicação de day sequence `wb1_l2_d7`

- `wb1_l2_final_v2_speak_1`
- `wb1_l2_final_v2_speak_5`
- `wb1_l2_final_v2_speak_6`

A sequência publicada substitui o Day 7 local. A publicação deve conter os 20 exercícios do lote, preservando os outros 17; somente os três IDs acima fazem parte desta correção.

### Atualização de override individual

- `wb1_l2_final_v2_speak_1`
- `wb1_l2_final_v2_speak_5`
- `wb1_l2_final_v2_speak_6`
- `wb1_l6_final_v2_listen_write_5`
- `wb1_l6_final_v2_speak_3`
- `wb1_l6_final_v2_speak_6`

Os três IDs da Lesson 2 têm override sobre a sequência publicada. Em Lesson 6, `wb1_l6_final_v2_listen_write_5` precisa da lista deduplicada Ana/Anna; `wb1_l6_final_v2_speak_3` precisa deixar de limpar o contexto visual e receber o alvo completo; e `wb1_l6_final_v2_speak_6` precisa substituir `It's Ben.` por `The boy's name is Ben.`. Os demais overrides publicados permanecem compatíveis com o patch local.
`wb1_l6_d6_e7` não precisa de novo override: o override atual já contém instruction/display/audio/expected desejados, e o deploy local fornece o novo `type=writing`.

### Somente deploy da base/código

### Workbook 1 → Lesson 3 — Day 7

- `wb1_l3_final_v2_listen_write_3`
- `wb1_l3_final_v2_listen_write_8`
- `wb1_l3_final_v2_speak_3`
### Workbook 1 → Lesson 4 — Day 4

- `wb1_l4_d4_e10`
### Workbook 1 → Lesson 4 — Day 7

- `wb1_l4_final_v2_listen_write_1`
- `wb1_l4_final_v2_listen_write_4`
- `wb1_l4_final_v2_speak_3`
### Workbook 1 → Lesson 5 — Day 2

- `wb1_l5_d2_e1`
- `wb1_l5_d2_e2`
- `wb1_l5_d2_e3`
- `wb1_l5_d2_e4`
- `wb1_l5_d2_e5`
- `wb1_l5_d2_e6`
- `wb1_l5_d2_e7`
- `wb1_l5_d2_e8`
- `wb1_l5_d2_e9`
- `wb1_l5_d2_e10`
### Workbook 1 → Lesson 5 — Day 7

- `wb1_l5_final_v2_speak_1`
### Workbook 1 → Lesson 6 — Day 1

- `wb1_l6_d1_e8`
- `wb1_l6_d1_e9`
### Workbook 1 → Lesson 6 — Day 2

- `wb1_l6_d2_e1`
- `wb1_l6_d2_e2`
### Workbook 1 → Lesson 6 — Day 4

- `wb1_l6_d4_e1`
- `wb1_l6_d4_e4`
### Workbook 1 → Lesson 6 — Day 5

- `wb1_l6_d5_e8`
- `wb1_l6_d5_e15`
### Workbook 1 → Lesson 6 — Day 6

- `wb1_l6_d6_e1`
- `wb1_l6_d6_e2`
- `wb1_l6_d6_e4`
- `wb1_l6_d6_e5`
- `wb1_l6_d6_e7`
- `wb1_l6_d6_e8`
### Workbook 1 → Lesson 6 — Day 7

- `wb1_l6_final_v2_listen_write_4`
- `wb1_l6_final_v2_listen_write_6`
- `wb1_l6_final_v2_listen_write_7`
- `wb1_l6_final_v2_listen_write_8`
- `wb1_l6_final_v2_speak_4`
- `wb1_l6_final_v2_speak_5`
### Workbook 1 → Lesson 7 — Day 4

- `wb1_l7_d4_e1`
### Workbook 1 → Lesson 7 — Day 5

- `wb1_l7_d5_e8`
### Workbook 1 → Lesson 7 — Day 6

- `wb1_l7_d6_e1`
- `wb1_l7_d6_e2`
- `wb1_l7_d6_e3`
- `wb1_l7_d6_e4`
- `wb1_l7_d6_e5`
- `wb1_l7_d6_e6`
- `wb1_l7_d6_e8`
- `wb1_l7_d6_e9`
- `wb1_l7_d6_e10`
### Workbook 1 → Lesson 7 — Day 7

- `wb1_l7_final_v2_listen_write_6`
- `wb1_l7_final_v2_speak_2`
- `wb1_l7_final_v2_speak_3`
### Workbook 1 → Lesson 8 — Day 3

- `wb1_l8_d3_e8`
- `wb1_l8_d3_e10`
### Workbook 1 → Lesson 8 — Day 5

- `wb1_l8_d5_e1`
- `wb1_l8_d5_e2`
### Workbook 1 → Lesson 8 — Day 6

- `wb1_l8_d6_e7`
### Workbook 1 → Lesson 8 — Day 7

- `wb1_l8_final_v2_listen_write_3`
- `wb1_l8_final_v2_listen_write_7`
### Workbook 1 → Lesson 9 — Day 2

- `wb1_l9_d2_e8`
- `wb1_l9_d2_e9`
- `wb1_l9_d2_e11`
- `wb1_l9_d2_e12`
### Workbook 1 → Lesson 9 — Day 7

- `wb1_l9_final_v2_listen_write_1`
- `wb1_l9_final_v2_listen_write_3`
- `wb1_l9_final_v2_listen_write_6`
- `wb1_l9_final_v2_listen_write_8`
### Workbook 1 → Lesson 10 — Day 2

- `wb1_l10_d2_e1`
- `wb1_l10_d2_e2`
- `wb1_l10_d2_e3`
- `wb1_l10_d2_e4`
- `wb1_l10_d2_e5`
- `wb1_l10_d2_e6`
- `wb1_l10_d2_e7`
- `wb1_l10_d2_e8`
- `wb1_l10_d2_e9`
- `wb1_l10_d2_e10`
- `wb1_l10_d2_e11`
- `wb1_l10_d2_e12`
- `wb1_l10_d2_e13`
- `wb1_l10_d2_e14`
- `wb1_l10_d2_e15`
### Workbook 1 → Lesson 11 — Day 7

- `wb1_l11_final_v2_listen_write_5`
- `wb1_l11_final_v2_listen_write_6`
- `wb1_l11_final_v2_shadow_4`
- `wb1_l11_final_v2_speak_1`
### Workbook 1 → Lesson 12 — Day 7

- `wb1_l12_final_v2_listen_write_5`
- `wb1_l12_final_v2_shadow_1`
## wb1_l6_d6_e7

| Campo | Antes efetivo | Depois local |
|---|---|---|
| type | speaking | writing |
| renderer | speaking: textarea + microfone | writing: input textual, sem microfone |
| instruction | Translate into English. via override | Translate into English. |
| display | Bom dia, professor. Como você está? via override | Bom dia, professor. Como você está? |
| audio | nenhum | nenhum |
| expected | Good morning, teacher. How are you? | Good morning, teacher. How are you? |
| accepted | somente variantes justificadas | nenhuma enumeração mecânica adicional |

Validações específicas:

- O item recomposto tem `type=writing` e `assessmentMode` ausente.
- Enter continua ligado a `handleKeyDown → performPrimaryAction → handleCheck`.
- O botão CHECK usa a mesma ação primária.
- Resposta correta e incorreta seguem o matcher de writing e o footer de feedback.
- CONTINUE permanece coberto pelo teste de fluxo contextual.
- Não há microfone porque o renderer não é speaking.
- `audioValue` vazio não ativa TTS.
- O lock de áudio só depende de `audioStatus=loading` em dictation writing; este item não é dictation.

## Itens não modificados

- Os **87 FALSE_POSITIVE** foram comparados campo a campo contra a fotografia anterior: nenhuma diferença.
- Os oito shadowings aprovados foram comparados campo a campo: nenhuma diferença.
- Todos os demais exercícios OK foram comparados semanticamente com a build anterior: nenhuma diferença de conteúdo renderizado.
- `wb1_l6_d6_e3` não foi alterado; seu estado efetivo correto continua dependendo do override já publicado.

Shadowings aprovados preservados:

- `wb1_l6_final_v2_shadow_4`
- `wb1_l6_final_v2_shadow_6`
- `wb1_l8_d3_e12`
- `wb1_l8_d3_e13`
- `wb1_l8_d3_e14`
- `wb1_l8_d3_e15`
- `wb1_l11_final_v2_shadow_5`
- `wb1_l11_final_v2_shadow_6`

## Testes

| Comando | Resultado |
|---|---|
| `npm run test:exercise-flow` | PASS; inclui fluxo, Enter/CHECK/CONTINUE, replay, tipos, currículo e 12 testes focados, incluindo o patch cirúrgico |
| `npm run test:answer-normalization` | PASS; 24 testes no total; inclui transcrição lexical exata e resposta oral completa para January/May |
| `npm run audit:workbook1-rendered` | PASS em diretório temporário; 12 lessons, 1.200 rows, 0 issues |
| `npm run build` | PASS; build Vite e service worker PWA gerados localmente |
| `npm run lint` | FAIL por erros preexistentes fora deste escopo em Battle, Workspace, UI e Workbooks 5–7; nenhum erro aponta para os arquivos da correção Workbook 1 |
| `git diff --check` | PASS |

Revalidação estrutural:

- 12 lessons.
- 84 days.
- 1.200 exercícios.
- 1.200 IDs únicos.
- 0 IDs perdidos.
- 0 IDs duplicados.
- 94/94 itens V2 INVALID alterados e cobertos pelo teste focado.
- 0 alterações semânticas fora dos 94 IDs.
- 87/87 falsos positivos preservados.
- 8/8 shadowings aprovados preservados.

## Estado de publicação

Este relatório descreve somente o patch local. Não houve escrita no Firestore, publicação de override, publicação de day sequence, commit, push ou deploy.

## Patch final cirúrgico — revisão pedagógica humana

Sete IDs receberam o ajuste final solicitado, sem qualquer outra alteração editorial automática:

- `wb1_l4_final_v2_speak_3`: removido `Anna.`; preservadas apenas as respostas frasais aprovadas.
- `wb1_l6_final_v2_speak_6`: removido `It's Ben.`; adicionado `The boy's name is Ben.`; alvo mantido como `His name is Ben.`.
- `wb1_l7_final_v2_listen_write_6`: `April` passa a ser o único alvo lexical; removidas as frases com palavras não pronunciadas.
- `wb1_l7_final_v2_speak_2`: listening determinável pelo primeiro mês do ano, alvo `It is January.` e duas equivalências frasais completas.
- `wb1_l7_final_v2_speak_3`: listening determinável pelo mês posterior a April, alvo `It is May.` e duas equivalências frasais completas.
- `wb1_l11_final_v2_listen_write_5`: removida a expansão `She is in the classroom.` para o áudio contraído.
- `wb1_l11_final_v2_listen_write_6`: preservada somente a grafia auditivamente indistinguível `Green/Greene`, ambas na forma não contraída pronunciada.

O matcher do Final Test em `listening-writing` agora usa somente os targets efetivamente authored e uma normalização mecânica de case, pontuação e whitespace. Ele não expande contrações, não remove prefixos e não injeta variantes semânticas. Os dois itens redesenhados de meses foram marcados para exigir resposta oral completa; bare `January` e bare `May` são rejeitados.

### Varredura direcionada de listening-writing

- Total de exercícios `listening-writing`: **96**.
- Com a instrução exata `Listen and write exactly what you hear.`: **88**.
- Variantes auditivamente justificadas encontradas e preservadas: Ana/Anna, Lucas/Lukas, Sofia/Sophia e Green/Greene em **9 IDs**.
- Outros casos semanticamente duvidosos encontrados: **7 IDs / 8 variantes**.
- A decisão pedagógica humana final foi remover as oito variantes. Não permanece caso pendente nesse grupo.

Decisões aplicadas:

- `wb1_l4_final_v2_listen_write_5`: removido `My birthday is January 21st.`.
- `wb1_l4_final_v2_listen_write_6`: removidos `Lucas.` e `Lucas is second.`.
- `wb1_l7_final_v2_listen_write_1`: removido `What day is it today?`.
- `wb1_l7_final_v2_listen_write_5`: removido `What's the date?`.
- `wb1_l8_final_v2_listen_write_6`: removida a expansão `are not` para o áudio contraído `aren't`.
- `wb1_l11_final_v2_listen_write_7`: removido `It is Monday.`.
- `wb1_l11_final_v2_listen_write_8`: removido `They are at school.`.

Os oito exercícios da Lesson 1 com instruction `Listen and write.` foram preservados integralmente e continuam fora do matcher lexical ativado pela instruction exata.

### Revalidação do patch final

| Comando | Resultado |
|---|---|
| `npm run test:exercise-flow` | PASS; 12 testes focados do batch, incluindo os 7 IDs finais |
| `npm run test:answer-normalization` | PASS; `April` rejeita frase adicionada, contrações permanecem lexicais e respostas completas January/May são exigidas |
| `npm run audit:workbook1-rendered` | PASS em diretório temporário; 12 lessons, 1.200 rows, 0 issues |
| `npm run build` | PASS; Vite + PWA service worker gerados localmente |
| `git diff --check` | PASS |

A estrutura permanece em **12 lessons, 84 days, 1.200 exercícios e 1.200 IDs únicos**. Nenhuma escrita remota, commit, push ou deploy foi executado.
