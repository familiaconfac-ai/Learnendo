# Modelo de domínio de vocabulário

## Separação de produtos

O serviço existente de vocabulário salva traduções escolhidas pelo usuário. Ele é uma lista pessoal e não deve ser usado como prova pedagógica de exposição ou domínio.

O domínio pedagógico precisa de alvos curriculares explícitos. Texto de instrução, alternativas distratoras, traduções auxiliares e frases incidentais não contam automaticamente como palavras aprendidas.

## Fonte de verdade inicial

Nesta entrega, somente exercícios explicitamente marcados com `isNewVocab: true` geram alvo. O valor canônico é derivado de `correctValue`, normalizado para um ID estável. Essa é uma ponte compatível com o conteúdo atual, não o estado final desejado.

O próximo passo editorial é um catálogo versionado por workbook:

```ts
interface VocabularyTarget {
  id: string;
  language: string;
  lemma: string;
  display: string;
  meanings: string[];
  workbookId: number;
  introducedIn: { lessonId: string; dayId: string; exerciseId: string };
  forms?: string[];
  status: 'published' | 'planned' | 'retired';
}
```

Exercícios devem referenciar `vocabularyTargetIds`. Isso evita inferir palavras de frases completas e permite decidir editorialmente se contrações, flexões e expressões são um único alvo ou alvos diferentes.

## Estados de aprendizagem

| Estado | Critério sugerido |
|---|---|
| apresentado | primeiro exercício explícito concluído |
| praticado | alvo acertado em pelo menos duas sessões |
| em consolidação | acerto após intervalo de 1–6 dias |
| dominado | três recuperações corretas, incluindo uma após 7+ dias |
| para revisar | erro após apresentação ou janela de revisão vencida |

Esses estados não foram ativados nesta correção porque exigem datas de revisão e sincronização remota confiáveis. A UI atual relata apenas “novo vocabulário” explícito concluído no dia, sem prometer domínio.

## Eventos necessários

Cada tentativa relacionada a vocabulário deve carregar `targetId`, exercício, timestamp, correção, modalidade e sessão. O domínio deve deduplicar conclusão por exercício, mas conservar tentativas para análise e agendamento de revisão.

## Métricas válidas

- alvos publicados no catálogo;
- alvos apresentados;
- alvos praticados;
- alvos dominados;
- alvos pendentes de revisão;
- cobertura por workbook/lição.

Não são métricas válidas: número de tokens vistos, todas as palavras de `displayValue`, alternativas erradas ou itens da lista pessoal de traduções.

## Auditoria de `isNewVocab`

`isNewVocab` é semanticamente útil, mas insuficiente como catálogo: é opcional, está embutido em exercícios e pode marcar uma frase inteira. A implementação atual o usa de modo conservador e testado, ignorando todo item sem a flag. Antes de lançar mastery completo, o Workbook 1 deve receber uma revisão editorial que transforme cada flag em referências explícitas a `VocabularyTarget` e valide lemas, expressões, traduções e formas flexionadas.
