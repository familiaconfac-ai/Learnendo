# Grammar Focus — compatibilidade após a Fase 1

## Diagnóstico e limite da evidência

Investigação do histórico Git e reprodução em Auth/Firestore Emulator, em 2026-09-02.
Não houve leitura nem alteração de documentos de produção nesta tarefa. Portanto, o
documentId e o locale do exemplo específico de produção ainda precisam ser conferidos
numa exportação/leitura desse documento. As causas abaixo foram confirmadas no código
e reproduzidas com documentos no formato exato dos escritores históricos; não são uma
afirmação de que inspecionamos todo o acervo de produção.

### Identidades realmente usadas pelo código antigo

| Versão | English Lesson 1 | Spanish Lesson 1 | Portuguese Lesson 1 |
|---|---|---|---|
| ID da lesson atual | `wb1_l1` | `es_wb1_l1` | `pt_wb1_l1` |
| Escritor inicial, commit `392a105` | `wb1_l1` | `wb1_es_wb1_l1` | `wb1_pt_wb1_l1` |
| Antes da Fase 1, commit `216dae6` | `wb1_l1` | `wb1_l1` | `wb1_l1` |
| Documento oficial após Fase 1, `589492b` | `english__wb1_l1` | `spanish__wb1_l1` | `portuguese_foreigners__wb1_l1` |

O escritor inicial mantinha o prefixo do idioma e acrescentava `wbN_` quando o ID
não começava por ele. O modal passava o ID original da lesson. A versão `216dae6`
introduziu `canonicalGrammarFocusLessonId`, removendo `en_/es_/pt_/el_/he_`.
`legacyGrammarFocusDocumentId` da Fase 1 manteve somente esse segundo algoritmo.
Logo, a incompatibilidade com a primeira geração já existia antes da Fase 1; a nova
separação curricular tornou indispensável uma leitura de compatibilidade completa.

IDs reais confirmados em `data/workbook1/lesson1Authored.ts` e
`courses/shared/replicatedWorkbook1.ts` (`transformLesson`). Os dois currículos de
Português compartilham o prefixo `pt_`; esse prefixo não permite distingui-los.

### Formato persistido pelos dois escritores antigos

```js
// grammarFocus/wb1_l1, ou chave histórica com prefixo preservado
{
  workbookId: 1,
  lessonId: 'wb1_l1', // escritor inicial preservava es_wb1_l1 / pt_wb1_l1
  schemaVersion: 1,
  content: {
    en: { title: '...', body: '...' },
    pt: { title: '', body: '' },
    es: { title: '', body: '' }
  },
  updatedAt: Timestamp,
  updatedBy: 'uid'
}
```

Não havia `courseId` nem `targetLanguage`. Um texto em português pode ser apoio
ao curso de inglês; o locale do texto não comprova a origem curricular.

O leitor `216dae6` também aceitava `translations.{en,pt,es}.{title,content|body}`,
`title`/`body` no topo e `content` textual no topo, com fallback histórico para EN.
Esses são formatos de compatibilidade comprovados pelo leitor, não uma alegação de
que todos foram encontrados em produção. A correção combina os campos de
`translations` e `content` sem deixar um mapa vazio esconder traduções; aceita
traduções textuais e respeita `locale`/`language` explícito para campos no topo.
Quando há campos concorrentes, o campo não vazio de `content` tem precedência.
Os campos originais completos continuam consultáveis e são arquivados na atribuição.

### Por que a Fase 1 parecia perder conteúdo

1. `subscribeGrammarFocus` passou a consultar somente o documento scoped. Sem uma
   migração anterior, `documentValue = null` é esperado; isso não significa exclusão.
2. `subscribeLegacyGrammarFocus` consultava apenas uma chave canonicalizada. Um
   documento da primeira geração, como `wb1_es_wb1_l1`, não era encontrado.
3. Para o documento encontrado, `GrammarFocusModal` colocava a prévia legada em
   `<details>` fechado e renderizava somente `activeLanguage`. Um documento apenas
   em EN, visto com base PT, tinha prévia vazia, embora `hasGrammarFocusContent`
   identificasse conteúdo. Não havia seletor dos locales disponíveis.
4. A mensagem “No grammar notes…” e as ações Board/Slides dependiam exclusivamente
   do documento oficial e do locale ativo. O estado vazio ocultava a distinção entre
   ausência de conteúdo, conteúdo legado sem atribuição e conteúdo em outro idioma.
5. O normalizador escolhia `content` quando era um objeto, mesmo vazio, descartando
   `translations` nessa leitura. Isso agrava documentos de formato misto.

As Rules versionadas na Fase 1 permitiam leitura de `grammarFocus/*` para usuários
autenticados, independentemente do schema. A validação do formato restringia apenas
escritas. Assim, essas Rules não explicam por si só uma leitura legada vazia.
Não foi comparada uma cópia das Rules efetivamente instaladas em produção.

## Compatibilidade e atribuição implementadas

- A identidade oficial continua `courseId + workbookId + canonical lessonId`.
- O leitor consulta as duas gerações de IDs documentadas, retornando cada documento
  separadamente com ID, conteúdo, campos originais e atribuição registrada.
- Os documentos aparecem abertos, como **Legacy / sem curso confirmado — somente
  leitura**, em qualquer currículo com a mesma lesson key. Isso é consulta ao mesmo
  arquivo histórico, não duplicação nem adoção como conteúdo oficial desses cursos.
- O idioma disponível é exibido e selecionável. Se o idioma-base não tiver conteúdo,
  a primeira versão disponível é mostrada com seu nome, sem alterar o idioma-base.
  O mesmo seletor está disponível para o documento oficial após a atribuição.
- O estado vazio não afirma ausência total quando há legado. Falhas de leitura são
  exibidas separadamente. Se uma leitura de recibo falhar, fontes já encontradas
  continuam visíveis, mas a atribuição fica desabilitada.
- O admin escolhe o currículo e a lesson na navegação, abre **Revisar atribuição**,
  vê o destino exato e confirma. O preview usado na confirmação é congelado; uma
  mudança da origem antes do commit exige nova revisão.
- A transação cria o documento scoped e um recibo imutável
  `grammarFocusLegacyAssignments/{sourceId}`, contendo destino, curso, UID, timestamp,
  conteúdo copiado e **todos os campos originais** em `sourceData`.
- O scoped recebe `legacySourceId`. Edições posteriores preservam esse vínculo.
- Nenhum write é feito na origem. Destino existente, recibo existente, conflito de
  metadados/prefixo e fonte alterada abortam a operação sem criar conteúdo parcial.
- As Rules exigem admin, fonte idêntica ao snapshot arquivado, destino novo e
  transação completa; proíbem alteração/exclusão do legado e do recibo. Uma segunda
  atribuição da mesma origem, inclusive simultânea para outro curso, é bloqueada.
- O arquivo legado continua consultável após a atribuição, com o curso e ID do
  destino indicados. Board/Slides usam exclusivamente o documento scoped confirmado.

### Origem inequívoca e documentos ambíguos

Mesmo quando existe evidência inequívoca, esta correção exige confirmação explícita
do admin; não executa migração em lote automaticamente. `courseId` explícito válido,
sem conflitos com workbook, lesson ou target, vincula a escolha. Um prefixo histórico
`es_` restringe o destino a Spanish. `pt_` restringe a Português, mas não distingue
Native de Foreigners. A chave canonicalizada `wb1_l1` não autoriza inferir English.

Documentos ambíguos ficam sem atribuição até revisão editorial. O admin consegue
consultar todos os idiomas e os campos originais. Formatos não reconhecidos continuam
aparecendo como documentos existentes que exigem revisão dos campos; não podem ser
migrados automaticamente para um conteúdo vazio. Conteúdo inválido para o schema
oficial também permanece legível, sem modificar a origem; exige conversão editorial
supervisionada. Esta implementação não converte automaticamente campos arbitrários,
não mescla duas origens conflitantes e não substitui um documento oficial existente.

## Validação

Executados em `apps/main`:

- `npm run test:grammar-focus`: normalização, IDs históricos, origem, permissões,
  contrato de UI e Rules — passou.
- `npm run test:grammar-upgrade`: Auth/Firestore Emulator, projeto
  `demo-learnendo-grammar-upgrade` — passou.
  - Semeia documentos com os campos, timestamp, schema e IDs exatos do escritor antigo.
  - Inicia os leitores novos: oficial nulo, três fontes históricas disponíveis.
  - Renderiza o componente React real do cartão legado, inclusive com base PT e
    conteúdo apenas EN/ES; texto visível e locale identificado.
  - Atribui explicitamente EN, ES e PT; confere scoped, todos os locales e recibos.
  - Chama o publicador real de Board e Slides nos três currículos e verifica texto
    preservado e `grammarSource` com o documento correto.
  - Testa destino ocupado, corrida de duas atribuições, confirmação desatualizada,
    tentativa direta de atribuição ao curso errado, exclusão/alteração de origem e
    recibo, aluno sem permissão e edição oficial posterior preservando proveniência.
  - Compara integralmente as três origens com seus valores iniciais e `sourceData`
    arquivado: igualdade completa, inclusive timestamp e autoria.
- `npm run test:language-integrity`: seis currículos isolados, reload, merge, Rules,
  Board/Slides e legado — passou.
- `npm run test:language-context` e `npm run test:placement` — passaram.
- `npm run build` — passou, incluindo service worker. Avisos existentes sobre tamanho
  de bundle, importação mista de Firestore e Browserslist desatualizado.
- `npm run lint` — ainda falha nos 14 erros conhecidos em Battle, WorkspaceCanvas,
  UI e workbooks 5/6/7. Nenhum erro nos arquivos alterados desta correção.

O teste de renderização é SSR do componente real, combinado com integração real dos
serviços no emulador. Não substitui um smoke interativo no navegador em produção.
Os asserts de preservação provam a integridade das fontes testadas; não constituem
um inventário ou prova de integridade de todos os documentos de produção.

## Procedimento para produção (não executado)

1. Conferir o documentId e campos do exemplo afetado: workbook/lesson, schema,
   `content`/`translations`, locales não vazios e eventual proveniência explícita.
   Conferir as duas gerações de chaves antes de concluir que a origem não existe.
2. Revisar e publicar separadamente, com autorização, as Rules e o frontend desta
   correção. O fluxo de atribuição exige as novas Rules e a nova coleção de recibos.
   As Rules antigas não permitem o novo recibo; o cliente mostrará erro e manterá
   a origem intacta. As novas Rules bloqueiam escritores antigos de schema 1.
3. Como admin, selecionar o curso e a lesson corretos; verificar o cartão legado,
   idioma e campos originais. Não inferir curso pela língua do texto.
4. Para origem confirmada, usar **Revisar atribuição → Confirmar atribuição**. Conferir
   o scoped e o recibo. Se o scoped já existir, revisar editorialmente o conflito;
   o sistema não o substituirá. Origem duvidosa permanece sem atribuição.
5. Reabrir a lesson, selecionar o locale disponível e testar Board/Slides. Conferir
   que English e Spanish na mesma lesson key permanecem separados e que o documento
   legado continua presente. Repetir para Portuguese Foreigners.

Nenhum deploy nem migração de produção foi executado. A Fase 2 não foi iniciada.
Registry e quantidade de Workbooks não foram alterados.

## Arquivos

- `apps/main/src/models/grammarFocus.ts`: compatibilidade de campos e proveniência.
- `apps/main/src/models/legacyGrammarFocus.ts`: IDs históricos, locale visível,
  snapshot de revisão e validação de atribuição.
- `apps/main/src/services/grammarFocusService.ts`: descoberta e transação de atribuição.
- `apps/main/src/components/GrammarFocus/GrammarFocusModal.tsx`: leitura e revisão explícitas.
- `firestore.rules`: origens e recibos imutáveis; atribuição atômica por admin.
- `apps/main/src/models/grammarFocus.test.ts`: casos de compatibilidade e identidade.
- `apps/main/scripts/grammar-focus-upgrade.integration.tsx`: upgrade real no emulador.
- `apps/main/scripts/language-phase1.integration.{mjs,ts}`: runner e novo retorno do leitor.
- `apps/main/scripts/grammar-focus-{rules,ui}.test.mjs`: contratos atualizados.
- `apps/main/package.json`: comando `test:grammar-upgrade`.
- Este relatório.
