const PORTUGUESE_GENDER_VARIANT_GROUPS: string[][] = [
  ['o diretor', 'a diretora'],
  ['os diretores', 'as diretoras'],
  ['o professor', 'a professora'],
  ['os professores', 'as professoras'],
  ['o aluno', 'a aluna'],
  ['os alunos', 'as alunas'],
  ['o estudante', 'a estudante'],
  ['os estudantes', 'as estudantes'],
  ['o principal', 'a principal'],
  ['os principais', 'as principais'],
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyVariantReplacement(source: string, from: string, to: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi');
  return source.replace(pattern, (match) => {
    if (match.toUpperCase() === match) return to.toUpperCase();
    if (match[0] === match[0]?.toUpperCase()) {
      return to.charAt(0).toUpperCase() + to.slice(1);
    }
    return to;
  });
}

function expandPortugueseGenderVariants(answer: string) {
  const variants = new Set<string>([answer]);
  const queue = [answer];

  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    PORTUGUESE_GENDER_VARIANT_GROUPS.forEach((group) => {
      group.forEach((from) => {
        if (!new RegExp(`\\b${escapeRegExp(from)}\\b`, 'i').test(current)) return;

        group.forEach((to) => {
          if (to === from) return;
          const next = applyVariantReplacement(current, from, to).trim();
          if (!next || variants.has(next)) return;
          variants.add(next);
          queue.push(next);
        });
      });
    });
  }

  return Array.from(variants);
}

export function expandAcceptedAnswerVariants(answers: Array<string | null | undefined>) {
  const uniqueAnswers = new Set<string>();

  answers
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .forEach((value) => {
      expandPortugueseGenderVariants(value).forEach((variant) => {
        uniqueAnswers.add(variant);
      });
    });

  return Array.from(uniqueAnswers);
}
