import type { Lesson } from '../../types';
import { buildLesson, makeChoices, makeSpeakings, makeWritings } from '../../data/workbook2/helpers';

const CHOOSE_FORM = 'Escucha y elige la forma correcta.';
const CHOOSE_ANSWER = 'Escucha y elige la respuesta correcta.';
const SHORT_SPEAKING = 'Escucha y responde con una frase corta.';
const TRANSLATE_PT = 'Traduce al portugués.';
const TYPE_EXACTLY = 'Escribe exactamente lo que oyes.';
const WRITE_SHORT = 'Escribe la respuesta corta.';

function prefixLessonIds(lesson: Lesson, prefix: string): Lesson {
  return {
    ...lesson,
    id: `${prefix}_${lesson.id}`,
    days: lesson.days.map((day) => ({
      ...day,
      id: `${prefix}_${day.id}`,
      exercises: day.exercises.map((exercise) => ({
        ...exercise,
        id: `${prefix}_${exercise.id}`,
      })),
    })),
  };
}

const lesson13 = prefixLessonIds(
  buildLesson(13, 'Lección 13: Tercera Persona y Presente Simple', [
    {
      type: 'practice',
      exercises: makeChoices([
        { display: 'Ella ___ inglés cada noche.', audio: 'Ella estudia inglés cada noche.', options: ['estudiar', 'estudia', 'estudiando', 'estudió'], correct: 'estudia', translation: 'Ela estuda inglês todas as noites.' },
        { display: 'Él ___ en el hospital.', audio: 'Él trabaja en el hospital.', options: ['trabajar', 'trabaja', 'trabajando', 'trabajó'], correct: 'trabaja', translation: 'Ele trabalha no hospital.' },
        { display: 'Mi hermano ___ el autobús para ir a la escuela.', audio: 'Mi hermano toma el autobús para ir a la escuela.', options: ['tomar', 'toma', 'tomando', 'tomó'], correct: 'toma', translation: 'Meu irmão pega o ônibus para ir à escola.' },
        { display: 'Ana ___ café por la mañana.', audio: 'Ana bebe café por la mañana.', options: ['beber', 'bebe', 'bebiendo', 'bebió'], correct: 'bebe', translation: 'Ana bebe café pela manhã.' },
        { display: 'La profesora ___ la lección con claridad.', audio: 'La profesora explica la lección con claridad.', options: ['explicar', 'explica', 'explicando', 'explicó'], correct: 'explica', translation: 'A professora explica a lição com clareza.' },
        { display: 'Lucas ___ fútbol los viernes.', audio: 'Lucas juega fútbol los viernes.', options: ['jugar', 'juega', 'jugando', 'jugó'], correct: 'juega', translation: 'Lucas joga futebol nas sextas-feiras.' },
        { display: 'Mi madre ___ la cena a las seis.', audio: 'Mi madre prepara la cena a las seis.', options: ['preparar', 'prepara', 'preparando', 'preparó'], correct: 'prepara', translation: 'Minha mãe prepara o jantar às seis.' },
        { display: 'El perro ___ fuerte por la noche.', audio: 'El perro ladra fuerte por la noche.', options: ['ladrar', 'ladra', 'ladrando', 'ladró'], correct: 'ladra', translation: 'O cachorro late alto à noite.' },
        { display: 'Ella ___ la tarea después de la escuela.', audio: 'Ella hace la tarea después de la escuela.', options: ['hacer', 'hace', 'haciendo', 'hizo'], correct: 'hace', translation: 'Ela faz a tarefa depois da escola.' },
        { display: 'Él ___ la televisión después de cenar.', audio: 'Él mira la televisión después de cenar.', options: ['mirar', 'mira', 'mirando', 'miró'], correct: 'mira', translation: 'Ele assiste televisão depois do jantar.' },
        { display: 'María ___ a la iglesia los domingos.', audio: 'María va a la iglesia los domingos.', options: ['ir', 'va', 'yendo', 'fue'], correct: 'va', translation: 'Maria vai à igreja aos domingos.' },
        { display: 'El bebé ___ cuando tiene hambre.', audio: 'El bebé llora cuando tiene hambre.', options: ['llorar', 'llora', 'llorando', 'lloró'], correct: 'llora', translation: 'O bebê chora quando sente fome.' },
        { display: 'Él ___ su cuarto todos los sábados.', audio: 'Él limpia su cuarto todos los sábados.', options: ['limpiar', 'limpia', 'limpiando', 'limpió'], correct: 'limpia', translation: 'Ele limpa o quarto todos os sábados.' },
        { display: 'Julia ___ francés en la escuela.', audio: 'Julia estudia francés en la escuela.', options: ['estudiar', 'estudia', 'estudiando', 'estudió'], correct: 'estudia', translation: 'Julia estuda francês na escola.' },
        { display: 'Mi padre ___ el periódico cada mañana.', audio: 'Mi padre lee el periódico cada mañana.', options: ['leer', 'lee', 'leyendo', 'leyó'], correct: 'lee', translation: 'Meu pai lê o jornal todas as manhãs.' },
        { display: 'El sol ___ por el este.', audio: 'El sol sale por el este.', options: ['salir', 'sale', 'saliendo', 'salió'], correct: 'sale', translation: 'O sol nasce no leste.' },
        { display: 'El tren ___ a las ocho.', audio: 'El tren sale a las ocho.', options: ['salir', 'sale', 'saliendo', 'salió'], correct: 'sale', translation: 'O trem sai às oito.' },
        { display: 'Carla ___ a sus abuelos cada fin de semana.', audio: 'Carla visita a sus abuelos cada fin de semana.', options: ['visitar', 'visita', 'visitando', 'visitó'], correct: 'visita', translation: 'Carla visita os avós todo fim de semana.' },
        { display: 'La tienda ___ a las nueve.', audio: 'La tienda abre a las nueve.', options: ['abrir', 'abre', 'abriendo', 'abrió'], correct: 'abre', translation: 'A loja abre às nove.' },
        { display: 'Mi primo ___ en Río.', audio: 'Mi primo vive en Río.', options: ['vivir', 'vive', 'viviendo', 'vivió'], correct: 'vive', translation: 'Meu primo mora no Rio.' },
        { display: 'Él ___ español muy bien.', audio: 'Él habla español muy bien.', options: ['hablar', 'habla', 'hablando', 'habló'], correct: 'habla', translation: 'Ele fala espanhol muito bem.' },
        { display: 'Laura ___ en línea por la noche.', audio: 'Laura estudia en línea por la noche.', options: ['estudiar', 'estudia', 'estudiando', 'estudió'], correct: 'estudia', translation: 'Laura estuda online à noite.' },
        { display: 'El niño ___ en bicicleta a la escuela.', audio: 'El niño va en bicicleta a la escuela.', options: ['ir', 'va', 'yendo', 'fue'], correct: 'va', translation: 'O menino vai de bicicleta para a escola.' },
        { display: 'Mi tía ___ el té después del almuerzo.', audio: 'Mi tía disfruta el té después del almuerzo.', options: ['disfrutar', 'disfruta', 'disfrutando', 'disfrutó'], correct: 'disfruta', translation: 'Minha tia aprecia chá depois do almoço.' },
        { display: 'La clase ___ a las siete y media.', audio: 'La clase empieza a las siete y media.', options: ['empezar', 'empieza', 'empezando', 'empezó'], correct: 'empieza', translation: 'A aula começa às sete e meia.' },
      ], CHOOSE_FORM, 'identification'),
    },
    {
      type: 'practice',
      exercises: makeChoices([
        { display: 'Ella ___ tarde a clase.', audio: 'Ella no llega tarde a clase.', options: ['no llega', 'no llegó', 'no llegando', 'no llegar'], correct: 'no llega', translation: 'Ela não chega atrasada à aula.' },
        { display: 'Él ___ carne.', audio: 'Él no come carne.', options: ['no come', 'no comió', 'no comiendo', 'no comer'], correct: 'no come', translation: 'Ele não come carne.' },
        { display: 'Mi hermano ___ café.', audio: 'Mi hermano no bebe café.', options: ['no bebe', 'no bebió', 'no bebiendo', 'no beber'], correct: 'no bebe', translation: 'Meu irmão não bebe café.' },
        { display: 'El perro ___ en el sofá.', audio: 'El perro no duerme en el sofá.', options: ['no duerme', 'no durmió', 'no durmiendo', 'no dormir'], correct: 'no duerme', translation: 'O cachorro não dorme no sofá.' },
        { display: 'Ana ___ en autobús.', audio: 'Ana no va en autobús.', options: ['no va', 'no fue', 'no yendo', 'no ir'], correct: 'no va', translation: 'Ana não vai de ônibus.' },
        { display: 'Mi profesor ___ los domingos.', audio: 'Mi profesor no trabaja los domingos.', options: ['no trabaja', 'no trabajó', 'no trabajando', 'no trabajar'], correct: 'no trabaja', translation: 'Meu professor não trabalha aos domingos.' },
        { display: 'Pedro ___ la televisión por la mañana.', audio: 'Pedro no mira la televisión por la mañana.', options: ['no mira', 'no miró', 'no mirando', 'no mirar'], correct: 'no mira', translation: 'Pedro não assiste televisão de manhã.' },
        { display: 'Ella ___ comida rápida todos los días.', audio: 'Ella no come comida rápida todos los días.', options: ['no come', 'no comió', 'no comiendo', 'no comer'], correct: 'no come', translation: 'Ela não come fast food todos os dias.' },
        { display: 'La tienda ___ a medianoche.', audio: 'La tienda no abre a medianoche.', options: ['no abre', 'no abrió', 'no abriendo', 'no abrir'], correct: 'no abre', translation: 'A loja não abre à meia-noite.' },
        { display: 'Él ___ la tarea antes del almuerzo.', audio: 'Él no hace la tarea antes del almuerzo.', options: ['no hace', 'no hizo', 'no haciendo', 'no hacer'], correct: 'no hace', translation: 'Ele não faz a tarefa antes do almoço.' },
      ], CHOOSE_FORM),
    },
    {
      type: 'practice',
      exercises: makeChoices([
        { display: '¿Qué hace ella después de la escuela?', audio: '¿Qué hace ella después de la escuela?', options: ['Estudia en casa.', 'Estudian en casa.', 'Estudiando en casa.', 'Estudió en casa.'], correct: 'Estudia en casa.', translation: 'Ela estuda em casa.' },
        { display: '¿Dónde vive él?', audio: '¿Dónde vive él?', options: ['Vive en Recife.', 'Viven en Recife.', 'Viviendo en Recife.', 'Vivió en Recife.'], correct: 'Vive en Recife.', translation: 'Ele mora em Recife.' },
        { display: '¿A qué hora empieza la película?', audio: '¿A qué hora empieza la película?', options: ['Empieza a las siete.', 'Empiezan a las siete.', 'Empezando a las siete.', 'Empezó a las siete.'], correct: 'Empieza a las siete.', translation: 'Começa às sete.' },
        { display: '¿Qué cocina tu madre?', audio: '¿Qué cocina tu madre?', options: ['Cocina arroz.', 'Cocinan arroz.', 'Cocinando arroz.', 'Cocinó arroz.'], correct: 'Cocina arroz.', translation: 'Ela cozinha arroz.' },
        { display: '¿Ella trabaja los sábados?', audio: '¿Ella trabaja los sábados?', options: ['Sí, trabaja los sábados.', 'Sí, trabajan los sábados.', 'Sí, trabajando los sábados.', 'Sí, trabajó los sábados.'], correct: 'Sí, trabaja los sábados.', translation: 'Sim, ela trabalha aos sábados.' },
        { display: '¿Qué hace tu hermano por la mañana?', audio: '¿Qué hace tu hermano por la mañana?', options: ['Lee el periódico.', 'Leen el periódico.', 'Leyendo el periódico.', 'Leyó el periódico.'], correct: 'Lee el periódico.', translation: 'Ele lê o jornal.' },
        { display: '¿Dónde estudia Julia?', audio: '¿Dónde estudia Julia?', options: ['Estudia en la escuela.', 'Estudian en la escuela.', 'Estudiando en la escuela.', 'Estudió en la escuela.'], correct: 'Estudia en la escuela.', translation: 'Ela estuda na escola.' },
        { display: '¿Qué bebe Ana por la mañana?', audio: '¿Qué bebe Ana por la mañana?', options: ['Bebe café.', 'Beben café.', 'Bebiendo café.', 'Bebió café.'], correct: 'Bebe café.', translation: 'Ela bebe café.' },
        { display: '¿Qué hace la profesora?', audio: '¿Qué hace la profesora?', options: ['Explica la lección.', 'Explican la lección.', 'Explicando la lección.', 'Explicó la lección.'], correct: 'Explica la lección.', translation: 'Ela explica a lição.' },
        { display: '¿Él habla español muy bien?', audio: '¿Él habla español muy bien?', options: ['Sí, habla muy bien.', 'Sí, hablan muy bien.', 'Sí, hablando muy bien.', 'Sí, habló muy bien.'], correct: 'Sí, habla muy bien.', translation: 'Sim, ele fala muito bem.' },
      ], CHOOSE_ANSWER),
    },
    {
      type: 'practice',
      exercises: makeSpeakings([
        { display: '¿Ella estudia todos los días?', audio: '¿Ella estudia todos los días?', correct: 'Sí, estudia todos los días.', accepted: ['Sí, ella estudia todos los días.'], translation: 'Sim, ela estuda todos os dias.' },
        { display: '¿Él trabaja de noche?', audio: '¿Él trabaja de noche?', correct: 'No, no trabaja de noche.', accepted: ['No, él no trabaja de noche.'], translation: 'Não, ele não trabalha à noite.' },
        { display: '¿Qué hace tu hermano?', audio: '¿Qué hace tu hermano?', correct: 'Trabaja en el centro.', accepted: ['Él trabaja en el centro.'], translation: 'Ele trabalha no centro.' },
        { display: '¿Dónde vive ella?', audio: '¿Dónde vive ella?', correct: 'Vive en Salvador.', accepted: ['Ella vive en Salvador.'], translation: 'Ela mora em Salvador.' },
        { display: '¿A qué hora empieza la clase?', audio: '¿A qué hora empieza la clase?', correct: 'Empieza a las ocho.', accepted: ['La clase empieza a las ocho.'], translation: 'Começa às oito.' },
        { display: '¿Tu padre toma café?', audio: '¿Tu padre toma café?', correct: 'Sí, toma café.', accepted: ['Sí, él toma café.'], translation: 'Sim, ele toma café.' },
        { display: '¿Qué mira Ana?', audio: '¿Qué mira Ana?', correct: 'Mira la televisión.', accepted: ['Ana mira la televisión.'], translation: 'Ela assiste televisão.' },
        { display: '¿El perro duerme afuera?', audio: '¿El perro duerme afuera?', correct: 'No, no duerme afuera.', accepted: ['No, el perro no duerme afuera.'], translation: 'Não, ele não dorme fora.' },
        { display: '¿Qué explica la profesora?', audio: '¿Qué explica la profesora?', correct: 'Explica gramática.', accepted: ['La profesora explica gramática.'], translation: 'Ela explica gramática.' },
        { display: '¿Él va en autobús?', audio: '¿Él va en autobús?', correct: 'Sí, va en autobús.', accepted: ['Sí, él va en autobús.'], translation: 'Sim, ele vai de ônibus.' },
      ], SHORT_SPEAKING),
    },
    {
      type: 'practice',
      exercises: makeWritings([
        { display: 'Ella estudia inglés cada noche.', audio: 'Ella estudia inglés cada noche.', correct: 'Ela estuda inglês todas as noites.', accepted: ['Ela estuda inglês toda noite.', 'Estuda inglês todas as noites.'] },
        { display: 'Él trabaja en el hospital.', audio: 'Él trabaja en el hospital.', correct: 'Ele trabalha no hospital.', accepted: ['Trabalha no hospital.'] },
        { display: 'Mi hermano toma el autobús para ir a la escuela.', audio: 'Mi hermano toma el autobús para ir a la escuela.', correct: 'Meu irmão pega o ônibus para ir à escola.', accepted: ['Meu irmão vai de ônibus para a escola.'] },
        { display: 'Ana bebe café por la mañana.', audio: 'Ana bebe café por la mañana.', correct: 'Ana bebe café pela manhã.', accepted: ['Ana toma café pela manhã.'] },
        { display: 'La profesora explica la lección con claridad.', audio: 'La profesora explica la lección con claridad.', correct: 'A professora explica a lição com clareza.', accepted: ['O professor explica a lição com clareza.'] },
        { display: 'Lucas juega fútbol los viernes.', audio: 'Lucas juega fútbol los viernes.', correct: 'Lucas joga futebol nas sextas-feiras.', accepted: ['Lucas joga futebol nas sextas.'] },
        { display: 'María va a la iglesia los domingos.', audio: 'María va a la iglesia los domingos.', correct: 'Maria vai à igreja aos domingos.', accepted: ['Maria vai para a igreja aos domingos.'] },
        { display: 'El sol sale por el este.', audio: 'El sol sale por el este.', correct: 'O sol nasce no leste.', accepted: ['Sol nasce no leste.'] },
        { display: 'Él habla español muy bien.', audio: 'Él habla español muy bien.', correct: 'Ele fala espanhol muito bem.', accepted: ['Fala espanhol muito bem.'] },
        { display: 'La clase empieza a las siete y media.', audio: 'La clase empieza a las siete y media.', correct: 'A aula começa às sete e meia.', accepted: ['A aula inicia às sete e meia.'] },
      ], TRANSLATE_PT),
    },
    {
      type: 'practice',
      exercises: [
        ...makeWritings([
          { audio: 'Ella estudia inglés cada noche.', correct: 'Ella estudia inglés cada noche.', instruction: TYPE_EXACTLY, translation: 'Ela estuda inglês todas as noites.' },
          { audio: 'Él trabaja en el hospital.', correct: 'Él trabaja en el hospital.', instruction: TYPE_EXACTLY, translation: 'Ele trabalha no hospital.' },
          { audio: 'Mi madre prepara la cena a las seis.', correct: 'Mi madre prepara la cena a las seis.', instruction: TYPE_EXACTLY, translation: 'Minha mãe prepara o jantar às seis.' },
          { audio: 'La tienda abre a las nueve.', correct: 'La tienda abre a las nueve.', instruction: TYPE_EXACTLY, translation: 'A loja abre às nove.' },
          { audio: 'Laura estudia en línea por la noche.', correct: 'Laura estudia en línea por la noche.', instruction: TYPE_EXACTLY, translation: 'Laura estuda online à noite.' },
        ], TYPE_EXACTLY),
        ...makeWritings([
          { display: 'Él ___ la televisión después de cenar.', audio: 'Él mira la televisión después de cenar.', correct: 'mira', instruction: WRITE_SHORT, translation: 'Ele assiste televisão depois do jantar.' },
          { display: 'El bebé ___ cuando tiene hambre.', audio: 'El bebé llora cuando tiene hambre.', correct: 'llora', instruction: WRITE_SHORT, translation: 'O bebê chora quando sente fome.' },
          { display: 'Mi padre ___ el periódico cada mañana.', audio: 'Mi padre lee el periódico cada mañana.', correct: 'lee', instruction: WRITE_SHORT, translation: 'Meu pai lê o jornal todas as manhãs.' },
          { display: 'El tren ___ a las ocho.', audio: 'El tren sale a las ocho.', correct: 'sale', instruction: WRITE_SHORT, translation: 'O trem sai às oito.' },
          { display: 'Mi primo ___ en Río.', audio: 'Mi primo vive en Río.', correct: 'vive', instruction: WRITE_SHORT, translation: 'Meu primo mora no Rio.' },
        ], WRITE_SHORT),
      ],
    },
    {
      type: 'review',
      exercises: [
        ...makeChoices([
          { display: 'Ella ___ en casa después de clase.', audio: 'Ella se queda en casa después de clase.', options: ['quedarse', 'se queda', 'quedándose', 'se quedó'], correct: 'se queda' },
          { display: 'Él ___ la guitarra los domingos.', audio: 'Él toca la guitarra los domingos.', options: ['tocar', 'toca', 'tocando', 'tocó'], correct: 'toca' },
          { display: 'El autobús ___ a las seis.', audio: 'El autobús sale a las seis.', options: ['salir', 'sale', 'saliendo', 'salió'], correct: 'sale' },
          { display: 'Mi hermana ___ francés en la escuela.', audio: 'Mi hermana estudia francés en la escuela.', options: ['estudiar', 'estudia', 'estudiando', 'estudió'], correct: 'estudia' },
          { display: 'El perro ___ fuerte por la noche.', audio: 'El perro ladra fuerte por la noche.', options: ['ladrar', 'ladra', 'ladrando', 'ladró'], correct: 'ladra' },
        ], CHOOSE_FORM, 'identification'),
        ...makeChoices([
          { display: '¿Qué bebe Ana por la mañana?', audio: '¿Qué bebe Ana por la mañana?', options: ['Bebe café.', 'Beben café.', 'Bebiendo café.', 'Bebió café.'], correct: 'Bebe café.' },
          { display: '¿Dónde vive él?', audio: '¿Dónde vive él?', options: ['Vive en Recife.', 'Viven en Recife.', 'Viviendo en Recife.', 'Vivió en Recife.'], correct: 'Vive en Recife.' },
          { display: '¿Qué explica la profesora?', audio: '¿Qué explica la profesora?', options: ['Explica gramática.', 'Explican gramática.', 'Explicando gramática.', 'Explicó gramática.'], correct: 'Explica gramática.' },
          { display: '¿Ella trabaja los sábados?', audio: '¿Ella trabaja los sábados?', options: ['Sí, trabaja los sábados.', 'Sí, trabajan los sábados.', 'Sí, trabajando los sábados.', 'Sí, trabajó los sábados.'], correct: 'Sí, trabaja los sábados.' },
          { display: '¿Él habla español muy bien?', audio: '¿Él habla español muy bien?', options: ['Sí, habla muy bien.', 'Sí, hablan muy bien.', 'Sí, hablando muy bien.', 'Sí, habló muy bien.'], correct: 'Sí, habla muy bien.' },
        ], CHOOSE_ANSWER),
        ...makeSpeakings([
          { display: '¿Ella estudia todos los días?', audio: '¿Ella estudia todos los días?', correct: 'Sí, estudia todos los días.', accepted: ['Sí, ella estudia todos los días.'] },
          { display: '¿Qué hace tu hermano?', audio: '¿Qué hace tu hermano?', correct: 'Trabaja en el centro.', accepted: ['Él trabaja en el centro.'] },
          { display: '¿El perro duerme afuera?', audio: '¿El perro duerme afuera?', correct: 'No, no duerme afuera.', accepted: ['No, el perro no duerme afuera.'] },
          { display: '¿A qué hora empieza la clase?', audio: '¿A qué hora empieza la clase?', correct: 'Empieza a las ocho.', accepted: ['La clase empieza a las ocho.'] },
          { display: '¿Qué mira Ana?', audio: '¿Qué mira Ana?', correct: 'Mira la televisión.', accepted: ['Ana mira la televisión.'] },
        ], SHORT_SPEAKING),
        ...makeWritings([
          { display: 'Él trabaja en el hospital.', audio: 'Él trabaja en el hospital.', correct: 'Ele trabalha no hospital.', accepted: ['Trabalha no hospital.'], instruction: TRANSLATE_PT },
          { display: 'María va a la iglesia los domingos.', audio: 'María va a la iglesia los domingos.', correct: 'Maria vai à igreja aos domingos.', accepted: ['Maria vai para a igreja aos domingos.'], instruction: TRANSLATE_PT },
          { audio: 'La clase empieza a las siete y media.', correct: 'La clase empieza a las siete y media.', instruction: TYPE_EXACTLY },
          { display: 'Mi padre ___ el periódico cada mañana.', audio: 'Mi padre lee el periódico cada mañana.', correct: 'lee', instruction: WRITE_SHORT },
          { audio: 'Ella estudia inglés cada noche.', correct: 'Ella estudia inglés cada noche.', instruction: TYPE_EXACTLY },
        ], TRANSLATE_PT),
      ],
    },
  ]),
  'es',
);

export const workbook2 = {
  id: 'es_wb2',
  title: 'Libro 2',
  lessons: [lesson13],
};
