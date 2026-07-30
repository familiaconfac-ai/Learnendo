# Sistema editorial administrativo de exercícios

## Resultado

O Learnendo mantém os exercícios locais como fonte base e aplica apenas correções publicadas no Firestore. Não houve migração em massa. O mesmo `PracticeSection`, normalizador de respostas, mastery queue, progresso, relatório e botão final continuam executando o exercício resolvido.

## Arquivos

Criados:

- `apps/main/src/models/exerciseOverride.ts` e teste unitário;
- `apps/main/src/services/exerciseOverrideService.ts`;
- `apps/main/src/services/exerciseImageService.ts`;
- `apps/main/src/components/ProblemReports/ExerciseEditorModal.tsx`;
- `apps/main/scripts/exercise-overrides-ui.test.mjs`;
- `storage.rules`;
- este documento.

Alterados: `types.ts`, `firebase.ts`, `ExercisePractice.tsx`, `UI.tsx`, `ProblemReportsDashboard.tsx`, `exerciseReportsService.ts`, `firestore.rules`, `firestore.indexes.json`, `firebase.json` e `package.json`.

## Firestore e histórico

- `publishedExerciseOverrides/{exerciseId}`: projeção mínima que alunos autenticados podem ler. Contém identidade, status, versão, campos pedagógicos e `publishedAt`; não contém motivo, nota ou administrador.
- `exerciseOverrides/{exerciseId}`: documento editorial canônico, somente admin.
- `exerciseDrafts/{exerciseId}`: rascunho, somente admin.
- `exerciseOverrides/{exerciseId}/versions/{000001}`: versões imutáveis, somente admin.

Publicar usa uma transação para atualizar documento canônico, projeção pública, histórico e remover o rascunho. Apenas diferenças em relação ao original são gravadas. `draftRevision` e `baseVersion` detectam edição concorrente sem apagar o formulário local. Restaurar cria uma versão nova. “Voltar ao original” arquiva uma nova versão e remove somente a projeção pública.

Os relatórios resolvidos por edição registram `resolutionVersion`, `resolutionType: editorial` e `resolvedByEditorialAt`. É possível resolver o atual ou todos os abertos do mesmo `exerciseId`. Problemas estruturais podem ser marcados com `requiresCodeChange`.

## Combinação e fallback

`applyExerciseOverride(original, published)` valida ID e tipo, sanitiza uma lista fechada de campos e preserva os campos locais obrigatórios. Metadados administrativos nunca entram no objeto do aluno. `ExercisePractice` carrega todos os overrides do dia em uma consulta com `workbookId + lessonId + dayId + language`, combina em memória e passa o resultado para o fluxo existente.

O conteúdo local é exibido imediatamente. Há cache em memória e `localStorage` por cinco minutos, por dia/idioma. Uma falha do Firestore devolve cache válido ou os exercícios locais e não bloqueia a lição. Publicação e restauração invalidam o cache do dia no dispositivo administrativo. Não existe leitura individual por avanço nem carregamento dos 10.600 exercícios.

## Editor e tipos

O editor é aberto por relatório ou pela busca manual limitada a um workbook carregado, com no máximo 30 resultados. A busca cobre ID, tipo, instrução, texto e resposta e pode ser refinada por livro/lição/dia.

Os cinco tipos reais são `speaking`, `multiple-choice`, `writing`, `identification` e `dialogue`. Campos de alternativas aparecem para múltipla escolha; os demais compartilham apenas campos compatíveis com o modelo real. ID, localização, idioma e tipo ficam somente leitura. A validação impede resposta vazia, resposta de múltipla escolha fora das opções, opções duplicadas, listas acima de 100, textos acima do limite, idioma inválido e mudança de tipo/ID.

Rascunho não afeta alunos. A prévia mostra conteúdo/mídia e o teste usa o normalizador global. A verificação administrativa existente continua oferecendo o componente real após a publicação, sem gravar progresso. Alterações não salvas exigem confirmação ao fechar.

## Imagem e áudio

Uploads aceitam PNG, JPEG ou WEBP até 5 MB, usam caminho único `exercise-images/wb{n}/{lessonId}/{exerciseId}/{timestamp-uuid}.{ext}`, mostram progresso, podem ser cancelados e só alteram o formulário após sucesso. Falha mantém a imagem anterior. A imagem publicada e o texto alternativo são renderizados no exercício real.

O áudio segue a arquitetura existente: `audioValue` contém texto consumido pelo TTS. A voz é resolvida pelo idioma explícito do exercício, depois pelo idioma pedagógico do workbook/curso e, por último, pelo fallback pedagógico inglês. O idioma da interface não escolhe a voz. O editor e a experiência do aluno usam o mesmo resolvedor central.

Não existe biblioteca central de imagens no projeto; portanto “selecionar imagem existente” fica para a segunda etapa. Arquivos enviados e depois abandonados antes da publicação também pedem uma rotina administrativa futura de limpeza de órfãos.

## Segurança

As regras do Firestore usam o `role == admin` real em `users/{uid}` para todas as escritas editoriais e leituras de rascunho/histórico. Validam chaves, identidade, idioma, status, tipos, timestamps e limites. A projeção pública aceita somente campos explicitamente permitidos.

As regras do Storage restringem escrita/exclusão a admin, caminho de exercício, MIME permitido e 5 MB. Leitura exige autenticação e um override público com status `published`. Outros caminhos são negados. `firebase.json` referencia as regras e o emulador de Storage.

## Ativação futura do Storage

O código de upload e `storage.rules` permanecem preservados, mas a interface continua desativada. Quando houver autorização explícita, a ordem segura é:

1. o usuário confirma pessoalmente o upgrade para Blaze;
2. o usuário cadastra ou seleciona pessoalmente a conta de faturamento;
3. inicializar o bucket no projeto `learnendo-6f4d3`;
4. confirmar o bucket `learnendo-6f4d3.firebasestorage.app`;
5. publicar somente `storage.rules`;
6. reativar a interface de upload;
7. testar PNG, JPEG e WEBP dentro dos limites;
8. confirmar upload, URL HTTPS publicada e exibição para o aluno.

O agente não deve inserir dados de pagamento, confirmar cobrança, inicializar o bucket ou publicar regras do Storage sem autorização específica.

## Como testar

Admin: abra Administração → Relatórios de problemas; escolha um relatório e “Editar exercício”, ou selecione um livro e use “Localizar exercício sem relatório”. Salve/reabra rascunho, teste respostas, publique, inspecione histórico, restaure, desative/reative e volte ao original. Para mídia, envie/cancele uma imagem e reproduza/troque o áudio. Abra o mesmo exercício em duas sessões admin para confirmar o aviso de conflito.

Aluno: entre no mesmo idioma/dia e confirme override publicado, imagem, áudio, resposta/feedback, relatório, repetição e o único botão final Continue. Confirme que rascunhos e controles admin não aparecem. Teste outro exercício sem override e indisponibilidade do Firestore para validar fallback.

## Verificação executada

- `npm run test:exercise-overrides`: 7 testes aprovados (modelo, regras/estrutura, cache e UI);
- `npm run test:answer-normalization`: 22 testes aprovados;
- `npm run test:exercise-reports`: 8 verificações aprovadas;
- `npm run build`: aprovado (796 módulos).

O `npm run lint` encontrou um crash interno do TypeScript 5.8 sob Node 24 (`getModifierFlagsWorker`), sem diagnóstico de código; o build Vite completo passou. O Firebase CLI instalado não iniciou os emuladores a partir desta configuração e informou “No emulators to start”; por isso as regras foram verificadas pelos testes estruturais, mas ainda devem receber um teste integrado no ambiente Firebase do projeto antes de publicação.

## Limitações e segunda etapa

- teste do rascunho é uma sandbox compacta; a verificação pós-publicação usa a experiência real;
- validação de “áudio existente” depende de um catálogo que o projeto ainda não possui;
- busca manual não cria um índice dos 10.600 itens: carrega apenas o workbook escolhido;
- seleção de imagem existente, limpeza de órfãos e comparação visual campo a campo podem ser ampliadas;
- recomenda-se suíte integrada Auth/Firestore/Storage, teste mobile/desktop real e cobertura E2E de todos os cinco tipos antes do deploy.

Não houve deploy, git push, migração de exercícios, alteração em massa de conteúdo nem instalação de biblioteca.
