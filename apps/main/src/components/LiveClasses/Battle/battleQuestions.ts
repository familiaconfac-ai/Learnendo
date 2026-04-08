// ── Learnendo Battle — question picker ────────────────────────────────────────
import { PRACTICE_ITEMS, WORKBOOK_NUMBER } from '../../../constants';
import type { BattleConfig, BattleQuestion } from './battleTypes';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ensureFourOptions(opts: string[] | undefined, correct: string): string[] {
  const pool = new Set<string>();
  if (opts) opts.forEach(o => pool.add(o));
  pool.add(correct);

  // Se tivermos menos de 4 opções, pegamos de outros itens para completar
  if (pool.size < 4) {
    const extras = PRACTICE_ITEMS
      .filter(p => p.correctValue && p.correctValue !== correct)
      .map(p => p.correctValue);
    
    const shuffledExtras = shuffle(extras);
    for (const e of shuffledExtras) {
      pool.add(e);
      if (pool.size >= 4) break;
    }
  }
  return [...pool].slice(0, 4);
}

export function getBattleQuestions(
  config: Pick<BattleConfig, 'questionCount' | 'scope' | 'lessonId' | 'workbookId'>
): BattleQuestion[] {
  const { questionCount, scope, lessonId, workbookId } = config;

  // Filtra apenas itens válidos
  let pool = PRACTICE_ITEMS.filter(
    p => p.type === 'multiple-choice' || p.type === 'identification'
  );

  console.log(`[Battle] Iniciando busca. Total no banco: ${pool.length}`);

  if (scope === 'current-lesson' && lessonId) {
    // Converte lessonId para número puro caso venha como string "lesson-1"
    const lessonNum = typeof lessonId === 'number' ? lessonId : Number(String(lessonId).replace(/\D/g, ''));
    
    const filtered = pool.filter(p => Number(p.lessonId) === lessonNum);
    if (filtered.length > 0) {
      pool = filtered;
      console.log(`[Battle] Filtrado por lição ${lessonNum}: ${pool.length} itens encontrados.`);
    }
  } else if (scope === 'current-book') {
    // O banco atual exposto em constants.tsx representa apenas o workbook ativo.
    // Mantemos o filtro compatível com o dado tipado até a origem passar a carregar
    // múltiplos workbooks explicitamente.
    const normalizedWorkbookId = workbookId ?? WORKBOOK_NUMBER;
    const filtered = normalizedWorkbookId === WORKBOOK_NUMBER ? pool : [];
    if (filtered.length > 0) {
      pool = filtered;
      console.log(`[Battle] Filtrado por Workbook ${normalizedWorkbookId}: ${pool.length} itens encontrados.`);
    }
  }

  // Se após os filtros a lista estiver vazia (erro que estava acontecendo), 
  // voltamos para o pool geral para o jogo não travar.
  if (pool.length === 0) {
    console.warn("[Battle] Nenhum item encontrado no filtro. Usando banco geral.");
    pool = PRACTICE_ITEMS.filter(p => p.correctValue);
  }

  const selected = shuffle(pool).slice(0, questionCount);

  return selected.map((item): BattleQuestion => {
    let rawOptions: string[];
    
    // Tratamos identificação como múltipla escolha criando opções falsas
    if (item.type === 'multiple-choice' && item.options && item.options.length >= 2) {
      rawOptions = ensureFourOptions(item.options, item.correctValue);
    } else {
      rawOptions = ensureFourOptions([], item.correctValue);
    }

    const shuffledOptions = shuffle(rawOptions);
    const correctIndex = shuffledOptions.indexOf(item.correctValue);

    // Texto da pergunta prioriza instrução + valor ou apenas o valor
    const questionText = item.instruction 
      ? `${item.instruction}: ${item.audioValue || item.correctValue}`
      : (item.audioValue || item.correctValue);

    return {
      id: item.id || Math.random().toString(),
      text: questionText,
      options: shuffledOptions,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
    };
  });
}
