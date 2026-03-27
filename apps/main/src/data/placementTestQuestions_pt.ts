// ─────────────────────────────────────────────────────────────────────────────
// Placement Test — Banco de questões PORTUGUÊS  (v1)
//
// 50 questões em 5 níveis (10 cada): A1 · A2 · B1 · B2 · C1/C2
// A última opção é sempre "Não sei." e NUNCA é a resposta correta.
// correctAnswerIndex é sempre 0–3 (compatível com classifyPlacementLevel).
//
// Classificação pedagógica por questão:
//   A = Tradução direta       (estrutura idêntica ao inglês)
//   B = Adaptação             (mesma ideia, forma ajustada ao PT)
//   C = Substituição          (estrutura do inglês não existe em PT;
//                              questão equivalente criada no alvo)
// ─────────────────────────────────────────────────────────────────────────────

import { PlacementQuestion } from './placementTestQuestions';

/** Helper — igual ao do banco EN mas adiciona "Não sei." como 5ª opção. */
function q(
  id: string,
  part: number,
  levelBand: PlacementQuestion['levelBand'],
  type: PlacementQuestion['type'],
  prompt: string,
  opts4: [string, string, string, string],
  correctAnswerIndex: number,
  audioText?: string,
  explanation?: string,
  grammarTopic?: string,
  explanationTranslations?: { en: string; es: string },
): PlacementQuestion {
  return {
    id, part, levelBand, type, prompt,
    audioText,
    options: [...opts4, 'Não sei.'],
    correctAnswerIndex,
    explanation,
    grammarTopic,
    explanationTranslations,
  };
}

export const PLACEMENT_TEST_QUESTIONS_PT: PlacementQuestion[] = [

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 1 — A1  (questões 1–10)
  // Cobertura: verbo ser/estar, pronomes, vocabulário básico, audição
  // ══════════════════════════════════════════════════════════════════════

  // [A] Tradução direta — saudação e apresentação
  q('pt_a1_01', 1, 'A1', 'listening',
    'Escute e escolha o que o falante diz.',
    ['Olá! Meu nome é Tom.', 'Tchau! Até amanhã.', 'Muito obrigado.', 'Desculpe, não entendo.'],
    0,
    'Olá! Meu nome é Tom.',
    '"Olá! Meu nome é Tom." é uma saudação e apresentação.',
    'Compreensão Auditiva',
    { en: '"Olá! Meu nome é Tom." is a greeting and self-introduction.', es: '"Olá! Meu nome é Tom." es un saludo y una presentación personal.' },
  ),

  // [A] Tradução direta — números em audição
  q('pt_a1_02', 1, 'A1', 'listening',
    'Escute e escolha o número correto.',
    ['Quinze', 'Cinquenta', 'Quatorze', 'Quarenta'],
    0,
    'Quinze.',
    'O falante diz "quinze" — 15.',
    'Números (Audição)',
    { en: 'The speaker says "quinze" — 15.', es: 'El hablante dice "quinze" — 15.' },
  ),

  // [B] Adaptação — verbo ser (3ª pessoa)
  q('pt_a1_03', 1, 'A1', 'multiple-choice',
    'Escolha a forma correta: "Ele ___ professor."',
    ['é', 'são', 'sou', 'ser'],
    0,
    undefined,
    '"Ele" (3ª pessoa singular) usa "é" do verbo ser.',
    'Verbo Ser — 3ª Pessoa',
    { en: '"Ele" (3rd person singular) uses "é" from the verb ser.', es: '"Ele" (3ª persona singular) usa "é" del verbo ser.' },
  ),

  // [B] Adaptação — verbo ser em perguntas
  q('pt_a1_04', 1, 'A1', 'multiple-choice',
    '"Você ___ do Brasil?"',
    ['é', 'são', 'sou', 'ser'],
    0,
    undefined,
    '"Você é do Brasil?" é a pergunta correta com "você".',
    'Verbo Ser — Perguntas',
    { en: '"Você é do Brasil?" is the correct question form with "você".', es: '"Você é do Brasil?" es la forma correcta de pregunta con "você".' },
  ),

  // [B] Adaptação — pronomes sujeito
  q('pt_a1_05', 1, 'A1', 'multiple-choice',
    'Escolha o pronome correto: "___ é minha irmã."',
    ['Ela', 'Dela', 'Ele', 'Eles'],
    0,
    undefined,
    '"Ela" é o pronome sujeito feminino.',
    'Pronomes Pessoais — Sujeito',
    { en: '"Ela" is the feminine subject pronoun.', es: '"Ela" es el pronombre sujeto femenino.' },
  ),

  // [A] Tradução direta — dias da semana
  q('pt_a1_06', 1, 'A1', 'vocabulary',
    'Qual palavra é um DIA DA SEMANA?',
    ['Abril', 'Segunda-feira', 'Verão', 'Manhã'],
    1,
    undefined,
    'Segunda-feira é um dia da semana.',
    'Dias da Semana',
    { en: '"Segunda-feira" is a day of the week.', es: '"Segunda-feira" es un día de la semana.' },
  ),

  // [A] Tradução direta — vocabulário cotidiano
  q('pt_a1_07', 1, 'A1', 'vocabulary',
    'O que você usa para beber água?',
    ['Prato', 'Garfo', 'Copo', 'Caneta'],
    2,
    undefined,
    'Um copo é usado para beber.',
    'Vocabulário Cotidiano',
    { en: 'A glass is used for drinking.', es: 'Un vaso se usa para beber.' },
  ),

  // [B] Adaptação — negativa do verbo ser
  q('pt_a1_08', 1, 'A1', 'multiple-choice',
    'Escolha a negativa correta: "Eu ___ médico."',
    ['não sou', 'não são', 'não é', 'não ser'],
    0,
    undefined,
    '"Eu não sou" é a forma negativa correta de "eu sou".',
    'Verbo Ser — Negativas',
    { en: '"Eu não sou" is the correct negative form of "eu sou".', es: '"Eu não sou" es la forma negativa correcta de "eu sou".' },
  ),

  // [A] Tradução direta — preposição de lugar em audição
  q('pt_a1_09', 1, 'A1', 'listening',
    'Escute e escolha onde a pessoa está.',
    ['Na escola', 'Em casa', 'No parque', 'No trabalho'],
    1,
    'Estou em casa com minha família hoje.',
    'O falante diz "em casa".',
    'Preposições de Lugar (Audição)',
    { en: 'The speaker says "em casa" (at home).', es: 'El hablante dice "em casa" (en casa).' },
  ),

  // [A] Tradução direta — antônimos básicos
  q('pt_a1_10', 1, 'A1', 'vocabulary',
    'Qual palavra significa "o oposto de quente"?',
    ['Grande', 'Rápido', 'Frio', 'Escuro'],
    2,
    undefined,
    'Frio é o oposto de quente.',
    'Antônimos — Adjetivos Básicos',
    { en: '"Frio" (cold) is the opposite of "quente" (hot).', es: '"Frio" (frío) es el opuesto de "quente" (caliente).' },
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 2 — A2  (questões 11–20)
  // Cobertura: ser/estar, concordância, presente simples, preposições, audição
  // ══════════════════════════════════════════════════════════════════════

  // [A] Tradução direta — habilidade em audição
  q('pt_a2_11', 2, 'A2', 'listening',
    'Escute e escolha o que a pessoa sabe fazer.',
    ['Ela sabe dirigir um carro.', 'Ela sabe tocar violão.', 'Ela sabe falar francês.', 'Ela sabe nadar muito bem.'],
    3,
    'Ela sabe nadar muito bem.',
    'O falante diz "ela sabe nadar".',
    'Verbos Modais — Saber/Conseguir (Audição)',
    { en: 'The speaker says "ela sabe nadar" (she knows how to swim).', es: 'El hablante dice "ela sabe nadar" (ella sabe nadar).' },
  ),

  // [C] Substituição — "there is" não existe em PT; testa ser vs. estar para estados temporários (A2)
  q('pt_a2_12', 2, 'A2', 'multiple-choice',
    '"Ela ___ doente hoje."',
    ['está', 'é', 'foi', 'era'],
    0,
    undefined,
    '"Estar" é usado para estados temporários. "Está doente" indica condição passageira.',
    'Ser vs. Estar — Estados Temporários',
    { en: '"Estar" is used for temporary states. "Está doente" indicates a passing condition.', es: '"Estar" se usa para estados temporales. "Está doente" indica una condición pasajera.' },
  ),

  // [C] Substituição — "there are + plural" → concordância verbal com sujeito plural (A2)
  q('pt_a2_13', 2, 'A2', 'multiple-choice',
    '"Os alunos ___ na sala de aula agora."',
    ['estão', 'está', 'são', 'é'],
    0,
    undefined,
    '"Os alunos" é plural; o verbo concorda: "estão".',
    'Concordância Verbal — Plural',
    { en: '"Os alunos" is plural; the verb agrees: "estão".', es: '"Os alunos" es plural; el verbo concuerda: "estão".' },
  ),

  // [B] Adaptação — presente simples 3ª pessoa
  q('pt_a2_14', 2, 'A2', 'multiple-choice',
    '"Ela ___ café toda manhã."',
    ['toma', 'tomam', 'está tomando', 'tomou'],
    0,
    undefined,
    '"Ela toma" — presente simples na 3ª pessoa do singular.',
    'Presente Simples — 3ª Pessoa',
    { en: '"Ela toma" — simple present in the 3rd person singular.', es: '"Ela toma" — presente simple en la 3ª persona del singular.' },
  ),

  // [C] Substituição — "can't" → "não saber" para habilidade não adquirida (mais natural em PT)
  q('pt_a2_15', 2, 'A2', 'multiple-choice',
    '"Eu ___ jogar xadrez — nunca aprendi as regras."',
    ['sei', 'não sei', 'posso', 'quero'],
    1,
    undefined,
    '"Não sei jogar" expressa incapacidade por falta de aprendizado.',
    'Verbos Modais — Saber / Não Saber',
    { en: '"Não sei jogar" expresses inability due to lack of learning.', es: '"Não sei jogar" expresa incapacidad por falta de aprendizaje.' },
  ),

  // [B] Adaptação — preposições de lugar
  q('pt_a2_16', 2, 'A2', 'vocabulary',
    'Escolha a preposição correta: "O gato está ___ da caixa."',
    ['dentro', 'em cima', 'atrás', 'na frente'],
    0,
    undefined,
    '"Dentro da caixa" significa no interior.',
    'Preposições de Lugar',
    { en: '"Dentro da caixa" means inside the box.', es: '"Dentro da caixa" significa en el interior de la caja.' },
  ),

  // [A] Tradução direta — frequência em audição
  q('pt_a2_17', 2, 'A2', 'listening',
    'Escute e escolha com que frequência a pessoa se exercita.',
    ['Todo dia', 'Nunca', 'Três vezes por semana', 'Uma vez por mês'],
    2,
    'Vou à academia três vezes por semana.',
    'O falante diz "três vezes por semana".',
    'Advérbios de Frequência (Audição)',
    { en: 'The speaker says "três vezes por semana" (three times a week).', es: 'El hablante dice "três vezes por semana" (tres veces a la semana).' },
  ),

  // [C] Substituição — "Does she work here?" → forma correta de pergunta no presente em PT
  q('pt_a2_18', 2, 'A2', 'multiple-choice',
    'Qual é a frase correta?',
    ['Você trabalha aqui?', 'Você trabalhas aqui?', 'Ela trábalha aqui?', 'Tu trabalha aqui?'],
    0,
    undefined,
    '"Você trabalha aqui?" é o único com conjugação correta para "você".',
    'Presente Simples — Perguntas',
    { en: '"Você trabalha aqui?" is the only option with correct conjugation for "você".', es: '"Você trabalha aqui?" es la única opción con conjugación correcta para "você".' },
  ),

  // [A] Tradução direta — antônimo de "caro"
  q('pt_a2_19', 2, 'A2', 'vocabulary',
    'Qual é o oposto de "caro"?',
    ['Rico', 'Grande', 'Barato', 'Lento'],
    2,
    undefined,
    '"Barato" é o oposto de "caro".',
    'Antônimos — Adjetivos',
    { en: '"Barato" (cheap) is the opposite of "caro" (expensive).', es: '"Barato" (barato) es el opuesto de "caro" (caro).' },
  ),

  // [B] Adaptação — presente contínuo (gerúndio)
  q('pt_a2_20', 2, 'A2', 'multiple-choice',
    '"Eles ___ assistindo TV agora."',
    ['estão', 'são', 'está', 'eram'],
    1,
    undefined,
    '"Eles estão" + gerúndio (-ndo) para ação em progresso.',
    'Presente Contínuo — Gerúndio',
    { en: '"Eles estão" + gerund (-ndo) for an action in progress.', es: '"Eles estão" + gerundio (-ndo) para una acción en progreso.' },
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 3 — B1  (questões 21–30)
  // Cobertura: pretérito perfeito, futuro com ir, comparativos, modais, leitura/audição
  // ══════════════════════════════════════════════════════════════════════

  // [B] Adaptação — pretérito perfeito irregular
  q('pt_b1_21', 3, 'B1', 'multiple-choice',
    '"Nós ___ a Paris no verão passado."',
    ['fomos', 'imos', 'vamos', 'íamos'],
    0,
    undefined,
    '"Fomos" é o pretérito perfeito de "ir" na 1ª pessoa do plural.',
    'Pretérito Perfeito — Verbos Irregulares',
    { en: '"Fomos" is the preterite of "ir" in the 1st person plural.', es: '"Fomos" es el pretérito perfecto de "ir" en la 1ª persona del plural.' },
  ),

  // [C] Substituição — PT não usa auxiliar "did"; testa pergunta correta no pretérito perfeito (B1)
  q('pt_b1_22', 3, 'B1', 'multiple-choice',
    'Qual é a pergunta correta no pretérito?',
    ['Você foi ao cinema ontem?', 'Você vai ao cinema ontem?', 'Você fez ao cinema ontem?', 'Você estava ao cinema ontem?'],
    0,
    undefined,
    '"Você foi ao cinema ontem?" usa corretamente o pretérito perfeito de "ir".',
    'Pretérito Perfeito — Perguntas',
    { en: '"Você foi ao cinema ontem?" correctly uses the preterite of "ir".', es: '"Você foi ao cinema ontem?" usa correctamente el pretérito perfecto de "ir".' },
  ),

  // [C] Substituição — "be going to" → "ir + infinitivo" para planos futuros (B1)
  q('pt_b1_23', 3, 'B1', 'multiple-choice',
    '"Nós ___ visitar meus pais este fim de semana."',
    ['vamos', 'iremos', 'fomos', 'vamos de'],
    0,
    undefined,
    '"Ir + infinitivo" (vamos visitar) expresa plano futuro imediato.',
    'Futuro com Ir + Infinitivo',
    { en: '"Ir + infinitivo" (vamos visitar) expresses an immediate future plan.', es: '"Ir + infinitivo" (vamos visitar) expresa un plan futuro inmediato.' },
  ),

  // [B] Adaptação — adjetivos comparativos
  q('pt_b1_24', 3, 'B1', 'multiple-choice',
    '"Esta bolsa é ___ do que aquela."',
    ['mais pesada', 'mais peso', 'a mais pesada', 'pesada'],
    0,
    undefined,
    '"Mais pesada" é a forma comparativa correta em português.',
    'Adjetivos Comparativos',
    { en: '"Mais pesada" is the correct comparative form in Portuguese.', es: '"Mais pesada" es la forma comparativa correcta en portugués.' },
  ),

  // [C] Substituição — "must" → "ter que" para obrigação (B1)
  q('pt_b1_25', 3, 'B1', 'multiple-choice',
    '"Você ___ usar o cinto de segurança. É lei."',
    ['tem que', 'deve', 'pode', 'quer'],
    0,
    undefined,
    '"Ter que" expressa obrigação (lei). "Deve" expressa conselho ou probabilidade.',
    'Verbos Modais — Ter Que / Dever',
    { en: '"Ter que" expresses obligation (law). "Deve" expresses advice or probability.', es: '"Ter que" expresa obligación (ley). "Deve" expresa consejo o probabilidad.' },
  ),

  // [A] Tradução direta — planos futuros em audição
  q('pt_b1_26', 3, 'B1', 'listening',
    'Escute e responda: o que a pessoa vai fazer amanhã?',
    ['Ir ao cinema', 'Visitar um amigo', 'Ir à academia', 'Ficar em casa'],
    2,
    'Amanhã de manhã vou à academia. Quero me manter em forma.',
    'O falante diz "vou à academia".',
    'Planos Futuros (Audição)',
    { en: 'The speaker says "vou à academia" (I\'m going to the gym).', es: 'El hablante dice "vou à academia" (voy al gimnasio).' },
  ),

  // [A] Tradução direta — compreensão de leitura, causa e efeito
  q('pt_b1_27', 3, 'B1', 'reading',
    'Leia: "Maria saiu cedo do trabalho porque estava com dor de cabeça. Ela foi para casa e descansou a tarde toda." Por que Maria saiu cedo?',
    ['Estava com fome.', 'Tinha uma reunião.', 'Estava com dor de cabeça.', 'Estava entediada.'],
    2,
    undefined,
    'O texto diz "porque estava com dor de cabeça".',
    'Compreensão de Leitura — Causa e Efeito',
    { en: 'The text says "because she had a headache".', es: 'El texto dice "porque estava com dor de cabeça" (porque tenía dolor de cabeza).' },
  ),

  // [C] Substituição — present perfect → pretérito perfeito para ação recente com relevância presente (B1 no PT brasileiro)
  q('pt_b1_28', 3, 'B1', 'multiple-choice',
    '"Eu ___ meu celular. Você o viu em algum lugar?"',
    ['perdi', 'tenho perdido', 'tinha perdido', 'estou perdendo'],
    0,
    undefined,
    '"Perdi" (pretérito perfeito) expressa ação recente com relevância presente no português brasileiro.',
    'Pretérito Perfeito — Relevância Presente',
    { en: '"Perdi" (preterite) expresses a recent action with present relevance in Brazilian Portuguese.', es: '"Perdi" (pretérito perfecto) expresa una acción reciente con relevancia presente en el portugués brasileño.' },
  ),

  // [B] Adaptação — vocabulário em contexto
  q('pt_b1_29', 3, 'B1', 'vocabulary',
    '"Ela fez um discurso muito ___ — todos ficaram emocionados."',
    ['entediante', 'poderoso', 'silencioso', 'curto'],
    1,
    undefined,
    '"Poderoso" é adequado para um discurso que emocionou pessoas.',
    'Vocabulário em Contexto',
    { en: '"Poderoso" (powerful) is appropriate for a speech that moved people.', es: '"Poderoso" (poderoso) es adecuado para un discurso que emocionó a las personas.' },
  ),

  // [B] Adaptação — período condicional (leitura)
  q('pt_b1_30', 3, 'B1', 'reading',
    'Leia: "Se você praticar falar todos os dias, sua fluência vai melhorar rapidamente." Qual é a condição para melhorar?',
    ['Ler todo dia', 'Estudar gramática', 'Praticar a fala diariamente', 'Assistir filmes'],
    2,
    undefined,
    '"Se você praticar falar todos os dias" é a condição expressa no texto.',
    'Período Condicional — 1ª Condicional (Leitura)',
    { en: '"Se você praticar falar todos os dias" (if you practice speaking every day) is the condition expressed in the text.', es: '"Se você praticar falar todos os dias" (si practicas hablar todos los días) es la condición expresada en el texto.' },
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 4 — B2  (questões 31–40)
  // Cobertura: há/faz (duração), voz passiva, subjuntivo, leitura/audição
  // ══════════════════════════════════════════════════════════════════════

  // [C] Substituição — present perfect + duration → "há" para duração contínua (B2 em PT)
  q('pt_b2_31', 4, 'B2', 'multiple-choice',
    '"Ela trabalha aqui ___ dez anos."',
    ['há', 'faz', 'desde', 'por'],
    0,
    undefined,
    '"Há + tempo" indica duração de ação que continua no presente.',
    'Preposição Há — Duração',
    { en: '"Há + time" indicates the duration of an action that continues in the present.', es: '"Há + tiempo" indica la duración de una acción que continúa en el presente.' },
  ),

  // [C] Substituição — present perfect continuous → "faz ... que" para duração em progresso (B2 em PT)
  q('pt_b2_32', 4, 'B2', 'multiple-choice',
    '"___ uma hora que eu espero você. Onde estava?"',
    ['Faz', 'Desde', 'Há', 'Por'],
    0,
    undefined,
    '"Faz + tempo + que" expressa duração de ação em curso — equivalente ao present perfect continuous inglês.',
    'Faz... Que — Duração Contínua',
    { en: '"Faz + time + que" expresses the duration of an ongoing action — equivalent to the English present perfect continuous.', es: '"Faz + tiempo + que" expresa la duración de una acción en curso — equivalente al present perfect continuous del inglés.' },
  ),

  // [A] Tradução direta — voz passiva pretérito perfeito
  q('pt_b2_33', 4, 'B2', 'multiple-choice',
    '"O relatório ___ escrito pela equipe na semana passada."',
    ['foi', 'era', 'é', 'estava'],
    0,
    undefined,
    '"Foi escrito" — voz passiva no pretérito perfeito.',
    'Voz Passiva — Pretérito Perfeito',
    { en: '"Foi escrito" — passive voice in the preterite.', es: '"Foi escrito" — voz pasiva en el pretérito perfecto.' },
  ),

  // [B] Adaptação — período hipotético com subjuntivo imperfeito (2ª condicional)
  q('pt_b2_34', 4, 'B2', 'multiple-choice',
    '"Se eu ___ mais dinheiro, compraria uma casa maior."',
    ['tivesse', 'tenho', 'terei', 'tive'],
    0,
    undefined,
    '"Se + imperfeito do subjuntivo, condicional" — período hipotético.',
    'Período Hipotético — Subjuntivo Imperfeito',
    { en: '"Se + imperfect subjunctive, conditional" — hypothetical sentence.', es: '"Se + imperfecto del subjuntivo, condicional" — oración hipotética.' },
  ),

  // [A] Tradução direta — voz passiva em audição
  q('pt_b2_35', 4, 'B2', 'listening',
    'Escute e escolha a ideia principal da mensagem.',
    ['A reunião foi cancelada.', 'A reunião foi transferida para quinta-feira.', 'Não há reunião esta semana.', 'O horário da reunião foi mudado para 14h.'],
    1,
    'Oi, só para avisar que a reunião de segunda foi transferida para quinta-feira, no mesmo horário. Por favor, atualize sua agenda.',
    'O falante diz "a reunião foi transferida para quinta-feira".',
    'Voz Passiva (Audição)',
    { en: 'The speaker says "a reunião foi transferida para quinta-feira" (the meeting was moved to Thursday).', es: 'El hablante dice "a reunião foi transferida para quinta-feira" (la reunión fue trasladada al jueves).' },
  ),

  // [A] Tradução direta — compreensão crítica (leitura)
  q('pt_b2_36', 4, 'B2', 'reading',
    'Leia: "Embora as redes sociais ofereçam conectividade, o uso excessivo tem sido associado ao aumento de ansiedade e à redução da atenção em adolescentes." Qual é a preocupação do autor?',
    ['Redes sociais não são populares entre jovens.', 'Jovens não conseguem se conectar uns com os outros.', 'O uso excessivo de redes sociais pode prejudicar o bem-estar de adolescentes.', 'Redes sociais deveriam ser proibidas nas escolas.'],
    2,
    undefined,
    'O texto associa o uso excessivo à ansiedade e redução da atenção.',
    'Compreensão de Leitura — Análise Crítica',
    { en: 'The text associates excessive use with anxiety and reduced attention span.', es: 'El texto asocia el uso excesivo con la ansiedad y la reducción de la atención.' },
  ),

  // [B] Adaptação — vocabulário avançado (meticuloso existe em PT)
  q('pt_b2_37', 4, 'B2', 'vocabulary',
    'O que significa "meticuloso"?',
    ['Descuidado e apressado', 'Muito atento aos detalhes', 'Barulhento e agressivo', 'Flexível e descontraído'],
    1,
    undefined,
    '"Meticuloso" significa muito cuidadoso e preciso.',
    'Vocabulário Avançado',
    { en: '"Meticuloso" (meticulous) means very careful and precise.', es: '"Meticuloso" (meticuloso) significa muy cuidadoso y preciso.' },
  ),

  // [C] Substituição — "Not only..." inversion → "embora" + subjuntivo para orações concessivas (B2 em PT)
  q('pt_b2_38', 4, 'B2', 'multiple-choice',
    '"Embora ele ___ muito ocupado, sempre ajuda os amigos."',
    ['seja', 'é', 'foi', 'esteja'],
    0,
    undefined,
    '"Embora" exige subjuntivo presente. "Embora ele seja" = estrutura concessiva hipotética.',
    'Subjuntivo — Orações Concessivas com Embora',
    { en: '"Embora" requires the present subjunctive. "Embora ele seja" = hypothetical concessive structure.', es: '"Embora" exige subjuntivo presente. "Embora ele seja" = estructura concesiva hipotética.' },
  ),

  // [C] Substituição — "used to" → imperfeito para hábitos passados (B2 em PT)
  q('pt_b2_39', 4, 'B2', 'multiple-choice',
    'Qual frase usa corretamente o imperfeito para hábitos passados?',
    ['Quando éramos crianças, brincávamos na rua todo dia.', 'Quando éramos crianças, brincamos na rua todo dia.', 'Quando erámos crianças, brincávamos na rua.', 'Quando seríamos crianças, brincávamos na rua.'],
    0,
    undefined,
    '"Brincávamos" (imperfeito) expressa hábito passado. "Brincamos" indicaria ação pontual e concluída.',
    'Imperfeito — Hábitos Passados',
    { en: '"Brincávamos" (imperfect) expresses a past habit. "Brincamos" would indicate a one-time completed action.', es: '"Brincávamos" (imperfecto) expresa un hábito pasado. "Brincamos" indicaría una acción puntual y concluida.' },
  ),

  // [B] Adaptação — sinônimo de "ambíguo" (palavra existe em PT)
  q('pt_b2_40', 4, 'B2', 'vocabulary',
    'Qual palavra está mais próxima do significado de "ambíguo"?',
    ['Claro e direto', 'Aberto a mais de uma interpretação', 'Completamente falso', 'Fortemente opinado'],
    1,
    undefined,
    '"Ambíguo" significa ter mais de um significado possível.',
    'Sinônimos — Avançado',
    { en: '"Ambíguo" (ambiguous) means having more than one possible meaning.', es: '"Ambíguo" (ambiguo) significa tener más de un significado posible.' },
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 5 — C1/C2  (questões 41–50)
  // Cobertura: mais-que-perfeito subjuntivo, condicional composto,
  //            "para que", marcadores discursivos, leitura/audição avançados
  // ══════════════════════════════════════════════════════════════════════

  // [B] Adaptação — "if only + past perfect" → mais-que-perfeito do subjuntivo (arrependimento) (C1)
  q('pt_c1_41', 5, 'C1', 'multiple-choice',
    '"Se eu ___ mais para a prova. Me arrependo agora."',
    ['estudar', 'estudei', 'tivesse estudado', 'estivesse estudando'],
    2,
    undefined,
    '"Tivesse estudado" (mais-que-perfeito do subjuntivo) expressa arrependimento sobre ação passada.',
    'Mais-que-perfeito do Subjuntivo — Arrependimento',
    { en: '"Tivesse estudado" (pluperfect subjunctive) expresses regret about a past action.', es: '"Tivesse estudado" (pluscuamperfecto del subjuntivo) expresa arrepentimiento sobre una acción pasada.' },
  ),

  // [B] Adaptação — "should have" → "deveria ter" para crítica/arrependimento sobre o passado (C1)
  q('pt_c1_42', 5, 'C1', 'multiple-choice',
    '"Você ___ me ligado — eu estava preocupado com você."',
    ['deveria ter', 'deve ter', 'devia ter', 'teria'],
    0,
    undefined,
    '"Deveria ter ligado" expressa crítica ou arrependimento sobre ação passada não realizada.',
    'Condicional Composto — Dever',
    { en: '"Deveria ter ligado" expresses criticism or regret about a past action that was not carried out.', es: '"Deveria ter ligado" expresa crítica o arrepentimiento sobre una acción pasada que no se realizó.' },
  ),

  // [C] Substituição — inversion in 3rd conditional → "para que + subjuntivo" para orações finais com sujeitos diferentes (C1)
  q('pt_c1_43', 5, 'C1', 'multiple-choice',
    '"Chamei um táxi ___ não perdêssemos o voo."',
    ['para que', 'para', 'embora', 'caso'],
    0,
    undefined,
    '"Para que" + subjuntivo expresa finalidade com sujeitos diferentes. "Para" + infinitivo só funciona com o mesmo sujeito.',
    'Orações Finais — Para Que + Subjuntivo',
    { en: '"Para que" + subjunctive expresses purpose with different subjects. "Para" + infinitive only works with the same subject.', es: '"Para que" + subjuntivo expresa finalidad con sujetos diferentes. "Para" + infinitivo solo funciona con el mismo sujeto.' },
  ),

  // [A] Tradução direta — marcadores discursivos (causa → consequência)
  q('pt_c1_44', 5, 'C1', 'multiple-choice',
    '"A fábrica não cumpriu as normas de segurança. ___, foi fechada pelas autoridades."',
    ['Apesar disso', 'Embora', 'Consequentemente', 'No entanto'],
    2,
    undefined,
    '"Consequentemente" indica resultado direto. "Apesar disso" e "No entanto" expressam contraste; "Embora" exige oração subordinada.',
    'Marcadores Discursivos — Causa e Efeito',
    { en: '"Consequentemente" (consequently) indicates a direct result. "Apesar disso" and "No entanto" express contrast; "Embora" requires a subordinate clause.', es: '"Consequentemente" (consecuentemente) indica un resultado directo. "Apesar disso" y "No entanto" expresan contraste; "Embora" requiere una oración subordinada.' },
  ),

  // [A] Tradução direta — compreensão auditiva extendida
  q('pt_c1_45', 5, 'C1', 'listening',
    'Escute e escolha o melhor resumo do argumento do falante.',
    [
      'A tecnologia sempre facilita o aprendizado.',
      'Os alunos devem evitar toda forma de tecnologia.',
      'A tecnologia pode beneficiar o aprendizado quando usada de forma crítica e seletiva.',
      'Os professores devem usar tecnologia em vez de livros.',
    ],
    2,
    'Embora a tecnologia possa certamente melhorar o aprendizado, é importante que os alunos desenvolvam habilidades críticas para avaliar a informação digital, em vez de aceitar tudo o que leem online. Usada com sabedoria, é uma ferramenta poderosa.',
    'O falante defende o uso crítico da tecnologia, não a rejeição total.',
    'Compreensão Auditiva Extendida',
    { en: 'The speaker advocates for the critical use of technology, not total rejection.', es: 'El hablante defiende el uso crítico de la tecnología, no el rechazo total.' },
  ),

  // [A] Tradução direta — texto científico/acadêmico (leitura)
  q('pt_c1_46', 5, 'C1', 'reading',
    'Leia: "O teorema de não-comunicação estabelece que o entrelaçamento quântico, apesar de teoricamente intrigante, não pode ser explorado para transmitir informação mais rápido do que a luz, refutando assim especulações anteriores." Qual é a afirmação principal?',
    ['O entrelaçamento quântico permite comunicação instantânea.', 'A comunicação mais rápida que a luz é teoricamente possível.', 'Um teorema descarta o uso do entrelaçamento para comunicação superluminal.', 'A física quântica é complexa demais para entender.'],
    2,
    undefined,
    'O teorema "refuta" a especulação — o entrelaçamento não pode ser usado para comunicação superluminal.',
    'Compreensão de Leitura — Texto Acadêmico/Científico',
    { en: 'The theorem "refutes" the speculation — entanglement cannot be used for superluminal communication.', es: 'El teorema "refuta" la especulación — el entrelazamiento no puede usarse para comunicación superluminal.' },
  ),

  // [B] Adaptação — sinônimo de "elucidar" (palavra existe em PT)
  q('pt_c1_47', 5, 'C1', 'vocabulary',
    'Qual é o sinônimo de "elucidar"?',
    ['Obscurecer', 'Esclarecer', 'Complicar', 'Contradizer'],
    1,
    undefined,
    '"Elucidar" significa tornar algo claro e compreensível.',
    'Vocabulário Avançado — Sinônimos',
    { en: '"Elucidar" (to elucidate) means to make something clear and understandable.', es: '"Elucidar" (elucidar) significa hacer algo claro y comprensible.' },
  ),

  // [B] Adaptação — vocabulário em contexto avançado ("encobrimento")
  q('pt_c1_48', 5, 'C1', 'vocabulary',
    '"O ___ do escândalo pela empresa prejudicou irreparavelmente a confiança pública."',
    ['documentação', 'descoberta', 'encobrimento', 'análise'],
    2,
    undefined,
    '"Encobrimento" (ocultar informação) é o que prejudicaria a confiança pública.',
    'Vocabulário em Contexto — Avançado',
    { en: '"Encobrimento" (cover-up — hiding information) is what would damage public trust.', es: '"Encobrimento" (encubrimiento — ocultar información) es lo que perjudicaría la confianza pública.' },
  ),

  // [A] Tradução direta — prosa acadêmica/pós-moderna (leitura C2)
  q('pt_c2_49', 5, 'C2', 'reading',
    'Leia: "A ofuscação inerente ao discurso pós-moderno obstrui o engajamento hermenêutico significativo com primitivos textuais. Não obstante a proliferação de metodologias desconstrutivistas, questões epistemológicas fundamentais permanecem irresolutas." O que o autor implica?',
    [
      'A escrita pós-moderna é admirável por sua clareza e rigor.',
      'A desconstrução resolveu as principais questões da filosofia.',
      'A complexidade pós-moderna impede a compreensão genuína e deixa questões-chave em aberto.',
      'A hermenêutica não é mais uma disciplina relevante.',
    ],
    2,
    undefined,
    '"Ofuscação", "permanecem irresolutas" e "não obstante" indicam que a complexidade persiste apesar dos esforços teóricos.',
    'Compreensão de Leitura — Prosa Acadêmica/Pós-Moderna',
    { en: '"Ofuscação" (obfuscation), "permanecem irresolutas" (remain unresolved), and "não obstante" (notwithstanding) indicate that complexity persists despite theoretical efforts.', es: '"Ofuscação" (ofuscación), "permanecem irresolutas" (permanecen sin resolver) y "não obstante" (no obstante) indican que la complejidad persiste a pesar de los esfuerzos teóricos.' },
  ),

  // [B] Adaptação — vocabulário de registro elevado ("ofuscatório")
  q('pt_c2_50', 5, 'C2', 'vocabulary',
    'Qual palavra significa "deliberadamente pouco claro ou feito para confundir"?',
    ['Diáfano', 'Perspícuo', 'Ofuscatório', 'Lúcido'],
    2,
    undefined,
    '"Ofuscatório" significa feito para tornar algo difícil de compreender.',
    'Vocabulário Avançado — Registro',
    { en: '"Ofuscatório" (obfuscatory) means made to make something difficult to understand.', es: '"Ofuscatório" (ofuscatorio) significa hecho para hacer algo difícil de comprender.' },
  ),
];
