// ─────────────────────────────────────────────────────────────────────────────
// Placement Test — Banco de preguntas ESPAÑOL  (v1)
//
// 50 preguntas en 5 niveles (10 cada): A1 · A2 · B1 · B2 · C1/C2
// La última opción es siempre "No sé." y NUNCA es la respuesta correcta.
// correctAnswerIndex es siempre 0–3 (compatible con classifyPlacementLevel).
//
// Clasificación pedagógica por pregunta:
//   A = Traducción directa    (estructura idéntica al inglés)
//   B = Adaptación            (misma idea, forma ajustada al ES)
//   C = Sustitución           (estructura del inglés no existe en ES;
//                              pregunta equivalente creada en el idioma meta)
// ─────────────────────────────────────────────────────────────────────────────

import { PlacementQuestion } from './placementTestQuestions';

/** Helper — igual al del banco EN pero añade "No sé." como 5ª opción. */
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
): PlacementQuestion {
  return {
    id, part, levelBand, type, prompt,
    audioText,
    options: [...opts4, 'No sé.'],
    correctAnswerIndex,
    explanation,
    grammarTopic,
  };
}

export const PLACEMENT_TEST_QUESTIONS_ES: PlacementQuestion[] = [

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 1 — A1  (preguntas 1–10)
  // Cobertura: verbo ser/estar, pronombres, vocabulario básico, escucha
  // ══════════════════════════════════════════════════════════════════════

  // [A] Traducción directa — saludo y presentación
  q('es_a1_01', 1, 'A1', 'listening',
    'Escucha y elige lo que dice el hablante.',
    ['¡Hola! Mi nombre es Tom.', '¡Adiós! Hasta mañana.', 'Muchas gracias.', 'Lo siento, no entiendo.'],
    0,
    '¡Hola! Mi nombre es Tom.',
    '"¡Hola! Mi nombre es Tom." es un saludo y una presentación.',
    'Comprensión Auditiva',
  ),

  // [A] Traducción directa — números en escucha
  q('es_a1_02', 1, 'A1', 'listening',
    'Escucha y elige el número correcto.',
    ['Quince', 'Cincuenta', 'Catorce', 'Cuarenta'],
    0,
    'Quince.',
    'El hablante dice "quince" — 15.',
    'Números (Escucha)',
  ),

  // [A] Traducción directa — verbo ser (3ª persona)
  q('es_a1_03', 1, 'A1', 'multiple-choice',
    'Elige la forma correcta: "Él ___ profesor."',
    ['es', 'son', 'soy', 'ser'],
    0,
    undefined,
    '"Él" (3ª persona singular) usa "es" del verbo ser.',
    'Verbo Ser — 3ª Persona',
  ),

  // [A] Traducción directa — verbo ser en preguntas
  q('es_a1_04', 1, 'A1', 'multiple-choice',
    '"¿___ tú de Brasil?"',
    ['Eres', 'Es', 'Soy', 'Ser'],
    0,
    undefined,
    '"¿Eres tú?" es la forma correcta de pregunta con "tú".',
    'Verbo Ser — Preguntas',
  ),

  // [A] Traducción directa — pronombres sujeto
  q('es_a1_05', 1, 'A1', 'multiple-choice',
    'Elige el pronombre correcto: "___ es mi hermana."',
    ['Ella', 'Su', 'Él', 'Ellos'],
    0,
    undefined,
    '"Ella" es el pronombre sujeto femenino.',
    'Pronombres Personales — Sujeto',
  ),

  // [A] Traducción directa — días de la semana
  q('es_a1_06', 1, 'A1', 'vocabulary',
    '¿Cuál es un DÍA DE LA SEMANA?',
    ['Abril', 'Lunes', 'Verano', 'Mañana'],
    1,
    undefined,
    'Lunes es un día de la semana.',
    'Días de la Semana',
  ),

  // [A] Traducción directa — vocabulario cotidiano
  q('es_a1_07', 1, 'A1', 'vocabulary',
    '¿Qué usas para beber agua?',
    ['Plato', 'Tenedor', 'Vaso', 'Bolígrafo'],
    2,
    undefined,
    'Un vaso se usa para beber.',
    'Vocabulario Cotidiano',
  ),

  // [A] Traducción directa — negativa del verbo ser
  q('es_a1_08', 1, 'A1', 'multiple-choice',
    'Elige la negativa correcta: "Yo ___ médico."',
    ['no soy', 'no son', 'no es', 'no ser'],
    0,
    undefined,
    '"Yo no soy" es la forma negativa correcta de "yo soy".',
    'Verbo Ser — Negativas',
  ),

  // [A] Traducción directa — preposición de lugar en escucha
  q('es_a1_09', 1, 'A1', 'listening',
    'Escucha y elige dónde está la persona.',
    ['En la escuela', 'En casa', 'En el parque', 'En el trabajo'],
    1,
    'Estoy en casa con mi familia hoy.',
    'El hablante dice "en casa".',
    'Preposiciones de Lugar (Escucha)',
  ),

  // [A] Traducción directa — antónimos básicos
  q('es_a1_10', 1, 'A1', 'vocabulary',
    '¿Qué palabra significa "el opuesto de caliente"?',
    ['Grande', 'Rápido', 'Frío', 'Oscuro'],
    2,
    undefined,
    'Frío es el opuesto de caliente.',
    'Antónimos — Adjetivos Básicos',
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 2 — A2  (preguntas 11–20)
  // Cobertura: hay, ser/estar, presente simple, preposiciones, escucha
  // ══════════════════════════════════════════════════════════════════════

  // [A] Traducción directa — habilidad en escucha
  q('es_a2_11', 2, 'A2', 'listening',
    'Escucha y elige qué sabe hacer la persona.',
    ['Ella sabe manejar un coche.', 'Ella sabe tocar la guitarra.', 'Ella sabe hablar francés.', 'Ella sabe nadar muy bien.'],
    3,
    'Ella sabe nadar muy bien.',
    'El hablante dice "sabe nadar".',
    'Verbos Modales — Saber/Poder (Escucha)',
  ),

  // [B] Adaptación — "is there" → "hay" para preguntar por existencia (A2 en ES)
  q('es_a2_12', 2, 'A2', 'multiple-choice',
    '"¿___ un supermercado cerca de tu casa?"',
    ['Hay', 'Tiene', 'Es', 'Está'],
    0,
    undefined,
    '"Hay" es la forma impersonal que indica existencia en español.',
    'Hay — Existencia',
  ),

  // [B] Adaptación — "there are" → "hay" (invariable) con plural (A2)
  q('es_a2_13', 2, 'A2', 'multiple-choice',
    '"___ cinco estudiantes en el aula."',
    ['Hay', 'Han', 'Tiene', 'Son'],
    0,
    undefined,
    '"Hay" es invariable y se usa para expresar existencia tanto en singular como en plural.',
    'Hay — Singular y Plural',
  ),

  // [A] Traducción directa — presente simple 3ª persona
  q('es_a2_14', 2, 'A2', 'multiple-choice',
    '"Ella ___ café todas las mañanas."',
    ['toma', 'toman', 'está tomando', 'tomó'],
    0,
    undefined,
    '"Ella toma" — presente simple en 3ª persona singular.',
    'Presente Simple — 3ª Persona',
  ),

  // [C] Sustitución — "can't" → "no saber" para habilidad no adquirida (más natural en ES)
  q('es_a2_15', 2, 'A2', 'multiple-choice',
    '"Yo ___ jugar ajedrez — nunca aprendí las reglas."',
    ['sé', 'no sé', 'puedo', 'quiero'],
    1,
    undefined,
    '"No sé jugar" expresa incapacidad por falta de aprendizaje.',
    'Verbos Modales — Saber / No Saber',
  ),

  // [A] Traducción directa — preposiciones de lugar
  q('es_a2_16', 2, 'A2', 'vocabulary',
    'Elige la preposición correcta: "El gato está ___ la caja."',
    ['dentro de', 'encima de', 'detrás de', 'delante de'],
    0,
    undefined,
    '"Dentro de la caja" significa en el interior.',
    'Preposiciones de Lugar',
  ),

  // [A] Traducción directa — frecuencia en escucha
  q('es_a2_17', 2, 'A2', 'listening',
    'Escucha y elige con qué frecuencia la persona hace ejercicio.',
    ['Todos los días', 'Nunca', 'Tres veces a la semana', 'Una vez al mes'],
    2,
    'Voy al gimnasio tres veces a la semana.',
    'El hablante dice "tres veces a la semana".',
    'Adverbios de Frecuencia (Escucha)',
  ),

  // [C] Sustitución — "Does she work here?" → forma correcta de pregunta en presente en ES
  q('es_a2_18', 2, 'A2', 'multiple-choice',
    '¿Cuál es la pregunta correcta?',
    ['¿Trabaja ella aquí?', '¿Trabajas ella aquí?', '¿Trabajan ella aquí?', '¿Ella trabajar aquí?'],
    0,
    undefined,
    '"¿Trabaja ella aquí?" usa la conjugación correcta para 3ª persona singular.',
    'Presente Simple — Preguntas',
  ),

  // [A] Traducción directa — antónimo de "caro"
  q('es_a2_19', 2, 'A2', 'vocabulary',
    '¿Cuál es el opuesto de "caro"?',
    ['Rico', 'Grande', 'Barato', 'Lento'],
    2,
    undefined,
    '"Barato" es el opuesto de "caro".',
    'Antónimos — Adjetivos',
  ),

  // [A] Traducción directa — presente continuo (estar + gerundio)
  q('es_a2_20', 2, 'A2', 'multiple-choice',
    '"Ellos ___ viendo la televisión ahora mismo."',
    ['están', 'son', 'estás', 'eran'],
    0,
    undefined,
    '"Ellos están" + gerundio (-ndo) para acción en progreso.',
    'Presente Continuo — Estar + Gerundio',
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 3 — B1  (preguntas 21–30)
  // Cobertura: pretérito indefinido, ir a + infinitivo, comparativos, modales, lectura/escucha
  // ══════════════════════════════════════════════════════════════════════

  // [B] Adaptación — pretérito indefinido irregular
  q('es_b1_21', 3, 'B1', 'multiple-choice',
    '"Nosotros ___ a París el verano pasado."',
    ['fuimos', 'imos', 'vamos', 'íbamos'],
    0,
    undefined,
    '"Fuimos" es el pretérito indefinido de "ir" en primera persona del plural.',
    'Pretérito Indefinido — Verbos Irregulares',
  ),

  // [C] Sustitución — ES no usa auxiliar "did"; testa pregunta correcta en el pasado (B1)
  q('es_b1_22', 3, 'B1', 'multiple-choice',
    '¿Cuál es la pregunta correcta en el pasado?',
    ['¿Fuiste al cine ayer?', '¿Vas al cine ayer?', '¿Ibas al cine ayer?', '¿Has ido al cine ayer?'],
    0,
    undefined,
    '"¿Fuiste al cine ayer?" usa correctamente el pretérito indefinido para preguntar sobre el pasado.',
    'Pretérito Indefinido — Preguntas',
  ),

  // [B] Adaptación — "be going to" → "ir a + infinitivo" para planes futuros (B1)
  q('es_b1_23', 3, 'B1', 'multiple-choice',
    '"Nosotros ___ a visitar a mis padres este fin de semana."',
    ['vamos', 'iremos', 'fuimos', 'vamos de'],
    0,
    undefined,
    '"Ir a + infinitivo" (vamos a visitar) expresa plan futuro inmediato.',
    'Futuro Próximo — Ir a + Infinitivo',
  ),

  // [B] Adaptación — adjetivos comparativos
  q('es_b1_24', 3, 'B1', 'multiple-choice',
    '"Esta bolsa es ___ que aquella."',
    ['más pesada', 'más peso', 'la más pesada', 'pesada'],
    0,
    undefined,
    '"Más pesada" es la forma comparativa correcta en español.',
    'Adjetivos Comparativos',
  ),

  // [B] Adaptación — "must" → "deber" para obligación (B1)
  q('es_b1_25', 3, 'B1', 'multiple-choice',
    '"Tú ___ usar el cinturón de seguridad. Es la ley."',
    ['debes', 'deberías', 'puedes', 'quieres'],
    0,
    undefined,
    '"Deber" en indicativo expresa obligación. "Deberías" sería un consejo, no una norma legal.',
    'Verbos Modales — Deber / Tener Que',
  ),

  // [A] Traducción directa — planes futuros en escucha
  q('es_b1_26', 3, 'B1', 'listening',
    'Escucha y responde: ¿qué va a hacer la persona mañana?',
    ['Ir al cine', 'Visitar a un amigo', 'Ir al gimnasio', 'Quedarse en casa'],
    2,
    'Mañana por la mañana voy al gimnasio. Quiero estar en forma.',
    'El hablante dice "voy al gimnasio".',
    'Planes Futuros (Escucha)',
  ),

  // [A] Traducción directa — comprensión de lectura, causa y efecto
  q('es_b1_27', 3, 'B1', 'reading',
    'Lea: "María se fue temprano del trabajo porque tenía dolor de cabeza. Fue a casa y descansó toda la tarde." ¿Por qué se fue María temprano?',
    ['Tenía hambre.', 'Tenía una reunión.', 'Tenía dolor de cabeza.', 'Estaba aburrida.'],
    2,
    undefined,
    'El texto dice "porque tenía dolor de cabeza".',
    'Comprensión de Lectura — Causa y Efecto',
  ),

  // [B] Adaptación — present perfect → pretérito perfecto para acción reciente con relevancia presente (B1 en ES)
  q('es_b1_28', 3, 'B1', 'multiple-choice',
    '"Yo ___ mis llaves. ¿Sabes dónde están?"',
    ['he perdido', 'perdí', 'había perdido', 'estaba perdiendo'],
    0,
    undefined,
    '"He perdido" (pretérito perfecto) expresa acción reciente con relevancia en el presente.',
    'Pretérito Perfecto — Relevancia Presente',
  ),

  // [A] Traducción directa — vocabulario en contexto
  q('es_b1_29', 3, 'B1', 'vocabulary',
    '"Ella dio un discurso muy ___ — todos quedaron emocionados."',
    ['aburrido', 'poderoso', 'silencioso', 'corto'],
    1,
    undefined,
    '"Poderoso" es adecuado para un discurso que emocionó a la gente.',
    'Vocabulario en Contexto',
  ),

  // [B] Adaptación — período condicional (lectura)
  q('es_b1_30', 3, 'B1', 'reading',
    'Lea: "Si practicas hablar todos los días, tu fluidez mejorará rápidamente." ¿Cuál es la condición para mejorar?',
    ['Leer todos los días', 'Estudiar gramática', 'Practicar hablar a diario', 'Ver películas'],
    2,
    undefined,
    '"Si practicas hablar todos los días" es la condición expresada en el texto.',
    'Condicional — Primera Condicional (Lectura)',
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 4 — B2  (preguntas 31–40)
  // Cobertura: llevar + gerundio, voz pasiva, subjuntivo, lectura/escucha
  // ══════════════════════════════════════════════════════════════════════

  // [B] Adaptación — present perfect + duration → "llevar + gerundio" para duración continua (B2 en ES)
  q('es_b2_31', 4, 'B2', 'multiple-choice',
    '"Ella ___ trabajando aquí diez años."',
    ['lleva', 'ha estado', 'tiene', 'estaba'],
    0,
    undefined,
    '"Llevar + gerundio" expresa acción continua que comenzó en el pasado y sigue en el presente.',
    'Llevar + Gerundio — Duración',
  ),

  // [B] Adaptación — present perfect continuous → "llevar + gerundio" en progreso (B2)
  q('es_b2_32', 4, 'B2', 'multiple-choice',
    '"Llevo una hora ___ ti. ¿Dónde estabas?"',
    ['esperando', 'esperado', 'espero', 'esperé'],
    0,
    undefined,
    '"Llevar + gerundio" para duración continua de acción hasta el presente.',
    'Llevar + Gerundio — Duración Continua',
  ),

  // [A] Traducción directa — voz pasiva pretérito indefinido
  q('es_b2_33', 4, 'B2', 'multiple-choice',
    '"El informe ___ escrito por el equipo la semana pasada."',
    ['fue', 'era', 'es', 'estaba'],
    0,
    undefined,
    '"Fue escrito" — voz pasiva en pretérito indefinido.',
    'Voz Pasiva — Pretérito Indefinido',
  ),

  // [A] Traducción directa — condicional hipotético (subjuntivo imperfecto)
  q('es_b2_34', 4, 'B2', 'multiple-choice',
    '"Si yo ___ más dinero, compraría una casa más grande."',
    ['tuviera', 'tengo', 'tendré', 'tuve'],
    0,
    undefined,
    '"Si + imperfecto de subjuntivo, condicional" — período hipotético.',
    'Condicional Hipotético — Subjuntivo Imperfecto',
  ),

  // [A] Traducción directa — voz pasiva en escucha
  q('es_b2_35', 4, 'B2', 'listening',
    'Escucha y elige la idea principal del mensaje.',
    ['La reunión ha sido cancelada.', 'La reunión fue trasladada al jueves.', 'No hay reunión esta semana.', 'El horario de la reunión se cambió a las 14h.'],
    1,
    'Hola, solo para avisarte que la reunión del lunes fue trasladada al jueves a la misma hora. Por favor, actualiza tu calendario.',
    'El hablante dice que la reunión fue trasladada al jueves.',
    'Voz Pasiva (Escucha)',
  ),

  // [A] Traducción directa — análisis crítico (lectura)
  q('es_b2_36', 4, 'B2', 'reading',
    'Lea: "Aunque las redes sociales ofrecen conectividad, el uso excesivo se ha asociado con mayores niveles de ansiedad y menor capacidad de atención en adolescentes." ¿Cuál es la preocupación del autor?',
    ['Las redes sociales no son populares entre jóvenes.', 'Los adolescentes no pueden conectarse entre sí.', 'El uso excesivo de redes sociales puede perjudicar el bienestar de los adolescentes.', 'Las redes sociales deberían prohibirse en las escuelas.'],
    2,
    undefined,
    'El texto asocia el uso excesivo con la ansiedad y la reducción de la atención.',
    'Comprensión de Lectura — Análisis Crítico',
  ),

  // [A] Traducción directa — vocabulario avanzado ("meticuloso" existe en ES)
  q('es_b2_37', 4, 'B2', 'vocabulary',
    '¿Qué significa "meticuloso"?',
    ['Descuidado y apresurado', 'Muy atento a los detalles', 'Ruidoso y agresivo', 'Flexible y relajado'],
    1,
    undefined,
    '"Meticuloso" significa muy cuidadoso y preciso.',
    'Vocabulario Avanzado',
  ),

  // [C] Sustitución — "Not only..." inversion → subjuntivo en oraciones impersonales (B2 en ES)
  q('es_b2_38', 4, 'B2', 'multiple-choice',
    '"Es importante que todos ___ las instrucciones."',
    ['sigan', 'siguen', 'siguieron', 'seguirán'],
    0,
    undefined,
    '"Es importante que" exige subjuntivo presente. "Sigan" es la forma correcta de "seguir" en subjuntivo.',
    'Subjuntivo — Oraciones Impersonales',
  ),

  // [C] Sustitución — "used to" → imperfecto para hábitos pasados (B2 en ES)
  q('es_b2_39', 4, 'B2', 'multiple-choice',
    '¿Cuál frase usa el imperfecto correctamente para hábitos pasados?',
    ['Cuando éramos niños, jugábamos en la calle todos los días.', 'Cuando éramos niños, jugamos en la calle todos los días.', 'Cuando fuimos niños, jugábamos en la calle.', 'Cuando seríamos niños, jugábamos en la calle.'],
    0,
    undefined,
    '"Jugábamos" (imperfecto) expresa hábito pasado. "Jugamos" es pretérito indefinido (acción puntual y concluida).',
    'Imperfecto — Hábitos Pasados',
  ),

  // [A] Traducción directa — sinónimo de "ambiguo" (existe en ES)
  q('es_b2_40', 4, 'B2', 'vocabulary',
    '¿Qué palabra está más cercana al significado de "ambiguo"?',
    ['Claro y directo', 'Abierto a más de una interpretación', 'Completamente falso', 'Fuertemente opinado'],
    1,
    undefined,
    '"Ambiguo" significa tener más de un significado posible.',
    'Sinónimos — Avanzado',
  ),

  // ══════════════════════════════════════════════════════════════════════
  // PARTE 5 — C1/C2  (preguntas 41–50)
  // Cobertura: ojalá + pluscuamperfecto subjuntivo, condicional compuesto,
  //            "para que", marcadores discursivos, lectura/escucha avanzados
  // ══════════════════════════════════════════════════════════════════════

  // [B] Adaptación — "if only + past perfect" → "ojalá + pluscuamperfecto de subjuntivo" (arrepentimiento) (C1)
  q('es_c1_41', 5, 'C1', 'multiple-choice',
    '"Ojalá yo ___ más para el examen. Ahora me arrepiento."',
    ['estudie', 'estudié', 'hubiera estudiado', 'estudiara'],
    2,
    undefined,
    '"Ojalá + pluscuamperfecto de subjuntivo" expresa arrepentimiento sobre algo en el pasado.',
    'Ojalá + Pluscuamperfecto de Subjuntivo — Arrepentimiento',
  ),

  // [B] Adaptación — "should have" → "deberías haber" para crítica/arrepentimiento sobre el pasado (C1)
  q('es_c1_42', 5, 'C1', 'multiple-choice',
    '"Deberías ___ llamado. Estaba preocupado por ti."',
    ['haber', 'habías', 'hubieras', 'tenías'],
    0,
    undefined,
    '"Deberías haber llamado" expresa crítica o arrepentimiento sobre una acción pasada no realizada.',
    'Condicional Compuesto — Deber',
  ),

  // [C] Sustitución — inversion in 3rd conditional → "para que + subjuntivo" para oraciones finales con sujetos distintos (C1)
  q('es_c1_43', 5, 'C1', 'multiple-choice',
    '"Llamé un taxi ___ no perdiéramos el vuelo."',
    ['para que', 'para', 'aunque', 'cuando'],
    0,
    undefined,
    '"Para que" + subjuntivo expresa finalidad con sujetos diferentes. "Para" + infinitivo solo funciona con el mismo sujeto.',
    'Oraciones Finales — Para Que + Subjuntivo',
  ),

  // [A] Traducción directa — marcadores discursivos (causa → consecuencia)
  q('es_c1_44', 5, 'C1', 'multiple-choice',
    '"La fábrica no cumplió las normas de seguridad. ___, fue cerrada por las autoridades."',
    ['A pesar de eso', 'Aunque', 'Consecuentemente', 'Sin embargo'],
    2,
    undefined,
    '"Consecuentemente" indica resultado directo. "A pesar de eso" y "Sin embargo" expresan contraste; "Aunque" requiere oración subordinada.',
    'Marcadores Discursivos — Causa y Efecto',
  ),

  // [A] Traducción directa — comprensión auditiva extendida
  q('es_c1_45', 5, 'C1', 'listening',
    'Escucha y elige el mejor resumen del argumento del hablante.',
    [
      'La tecnología siempre facilita el aprendizaje.',
      'Los estudiantes deben evitar toda forma de tecnología.',
      'La tecnología puede beneficiar el aprendizaje cuando se usa de forma crítica y selectiva.',
      'Los profesores deben usar tecnología en lugar de libros.',
    ],
    2,
    'Si bien la tecnología puede mejorar el aprendizaje, es importante que los estudiantes desarrollen habilidades críticas para evaluar la información digital, en vez de aceptar todo lo que leen en línea. Usada sabiamente, es una herramienta poderosa.',
    'El hablante defiende el uso crítico de la tecnología, no el rechazo total.',
    'Comprensión Auditiva Extendida',
  ),

  // [A] Traducción directa — texto científico/académico (lectura)
  q('es_c1_46', 5, 'C1', 'reading',
    'Lea: "El teorema de no-comunicación establece que el entrelazamiento cuántico, aunque teóricamente intrigante, no puede explotarse para transmitir información más rápido que la luz, refutando así especulaciones anteriores." ¿Cuál es la afirmación principal?',
    ['El entrelazamiento cuántico permite comunicación instantánea.', 'La comunicación más rápida que la luz es teóricamente posible.', 'Un teorema descarta el uso del entrelazamiento para comunicación superluminal.', 'La física cuántica es demasiado compleja para entender.'],
    2,
    undefined,
    'El teorema "refuta" la especulación — el entrelazamiento no puede usarse para comunicación superluminal.',
    'Comprensión de Lectura — Texto Académico/Científico',
  ),

  // [A] Traducción directa — sinónimo de "elucidar" (existe en ES)
  q('es_c1_47', 5, 'C1', 'vocabulary',
    '¿Cuál es el sinónimo de "elucidar"?',
    ['Oscurecer', 'Aclarar', 'Complicar', 'Contradecir'],
    1,
    undefined,
    '"Elucidar" significa hacer algo claro y comprensible.',
    'Vocabulario Avanzado — Sinónimos',
  ),

  // [B] Adaptación — vocabulario en contexto avanzado ("encubrimiento")
  q('es_c1_48', 5, 'C1', 'vocabulary',
    '"El ___ del escándalo por parte de la empresa dañó irremediablemente la confianza pública."',
    ['documentación', 'descubrimiento', 'encubrimiento', 'análisis'],
    2,
    undefined,
    '"Encubrimiento" (ocultar información) es lo que dañaría la confianza pública.',
    'Vocabulario en Contexto — Avanzado',
  ),

  // [A] Traducción directa — prosa académica/posmoderna (lectura C2)
  q('es_c2_49', 5, 'C2', 'reading',
    'Lea: "La ofuscación inherente al discurso posmoderno obstruye el compromiso hermenéutico significativo con los primitivos textuales. No obstante la proliferación de metodologías deconstructivistas, las cuestiones epistemológicas fundamentales permanecen irresueltas." ¿Qué implica el autor?',
    [
      'La escritura posmoderna es admirablemente clara y rigurosa.',
      'La deconstrucción ha resuelto las grandes preguntas de la filosofía.',
      'La complejidad posmoderna impide la comprensión genuina y deja preguntas clave sin resolver.',
      'La hermenéutica ya no es una disciplina relevante.',
    ],
    2,
    undefined,
    '"Ofuscación", "permanecen irresueltas" y "no obstante" indican que la complejidad persiste pese a los esfuerzos teóricos.',
    'Comprensión de Lectura — Prosa Académica/Posmoderna',
  ),

  // [B] Adaptación — vocabulario de registro elevado ("ofuscatorio")
  q('es_c2_50', 5, 'C2', 'vocabulary',
    '¿Qué palabra significa "deliberadamente poco claro o diseñado para confundir"?',
    ['Diáfano', 'Perspicuo', 'Ofuscatorio', 'Lúcido'],
    2,
    undefined,
    '"Ofuscatorio" significa hecho para hacer algo difícil de entender.',
    'Vocabulario Avanzado — Registro',
  ),
];
