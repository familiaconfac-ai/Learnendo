# Fase 2 — perfil linguístico persistente e contexto de runtime

Implementação local em 2026-09-02. Sem commit, push, deploy ou backfill. A arquitetura
de Grammar Focus validada anteriormente permanece intacta. Fase 3 não iniciada.

## Auditoria do estado anterior

Antes de alterar código, foram revisados `languageContext.ts`, `App.tsx`, `userRoles.ts`,
`db.ts`, `profileLoginPolicy.ts`, `firebase.ts`, os pontos de registro/conversão,
Settings, `tabScopedStorage.ts`, view mode e as Rules de `users/{uid}`.

A Fase 1 separava base e target no modelo, mas a base do App era um `useState`
inicializado uma vez por storage não segregado. O App regravava
`learnendo_base_ui_lang` e não possuía editor persistente da base. Isso não atendia a
troca de conta no mesmo navegador nem a sincronização entre dispositivos.

`learnendo_user_language` representa seleção de target, não preferência de apoio.
O helper histórico também podia usá-lo como fallback da base. O runtime da Fase 2
não utiliza esse helper nem esse campo para resolver preferência pessoal.

### Inventário de escritas e ownership

| Ponto auditado | Situação e tratamento |
|---|---|
| `App.onAuthStateChanged` → `createOrUpdateUserProfile` | Executa em login/refresh. Antes lia perfil e reenviava name/displayName/email com merge, sujeito a sobrescrita por snapshot antigo. Agora transação; perfil existente recebe somente isAnonymous/wasAnonymous/lastLoginAt. |
| `createStudentProfile` | Chamado pelo login/registro do App. Já retornava se existia perfil, mas fazia leitura/escrita separadas. Agora verifica a existência dentro de transação. |
| `loginWithEmail`, `registerWithEmail` | Alteram Firebase Auth. Registro pode definir Auth displayName; os helpers de Firestore criam identidade somente se o perfil não existe. |
| `ensureAnonAuth`, `convertAnonymousToUser` | Autenticação/link de credencial. Link mantém UID. Não gravam preferências. |
| `App.handleLogin/handleRegister` e `AnonymousConversion/ConversionModal` | Reutilizam os dois helpers acima. Conversão pode passar emailOverride, mas isso não substitui identidade de um perfil existente. |
| `userRoles.updateUserAccountRole`, `updateUserAssignedTeacher`, `updateUserAccountProfileDetails`, `updateStudentDisplayName` | Escritas administrativas específicas com merge/batch. Não reconstroem perfil nem incluem preferências. |
| `api/admin-students` | Criação administrativa de usuário e edição por campo, com batches/merge. Preserva outros campos. Nenhum backfill incluído. |
| `db.updateLastActive`, `updateStudyTime`, `updateAdaptiveDifficulty`, `updateUserTotalProgress`, `savePlacementTestResult` | Atualizam somente campos de atividade/estatística/resultado. Mantidos em allowlist própria. |
| `db.processPaymentUpgrade` | Atualiza campos de acesso; não é preferência pessoal. Continua disponível ao admin; proprietário comum não pode autopromover acesso. |
| Sessions, answers, courseProgress, vocabulary, notifications, profile/study, meta/status | Subcoleções existentes, sem cópia de base/learningLanguages. Permissões anteriores das subcoleções mantidas. |
| `progress/{uid}` | Mirror de identidade só é inicializado pelo login se ausente. Administração continua atualizando explicitamente nome/email. Preferências linguísticas nunca são escritas aqui. |

As Rules antigas permitiam ao proprietário alterar qualquer campo exceto `role`.
Além disso, o wildcard recursivo `/{document=**}` em Rules v2 podia corresponder a
zero segmentos e atingir o próprio perfil, contornando a restrição do pai. A nova
regra exige um segmento de subcoleção antes do wildcard. O teste de segurança no
emulador confirma que a política do perfil não é contornada.

## Modelo final

`UserAccountProfile` estende `UserLanguagePreferences`:

```ts
interface UserLanguagePreferences {
  baseLanguage?: 'en' | 'pt' | 'es';
  learningLanguages?: Array<'en' | 'pt' | 'es' | 'el' | 'he'>;
  languagePreferencesVersion?: 1;
  languagePreferencesUpdatedAt?: unknown; // Firestore Timestamp
  languagePreferencesUpdatedBy?: string;  // UID do ator
}
```

Campos ausentes são válidos e continuam ausentes após leitura/login. O mapper
ignora uma base inválida e ignora uma lista inválida ou duplicada, sem fabricar
`en` persistido nem corrigir Firestore automaticamente. A lista aceita até cinco
targets únicos. O serviço valida os dados e constrói o payload por allowlist.

`updateUserLanguagePreferences` usa `updateDoc` apenas no perfil existente. É
chamado por confirmação no formulário pessoal ou por ação administrativa explícita.
Não há chamada de atualização nas rotinas de login, hidratação ou troca de curso.

## Fonte de verdade, resolução e fallback

`resolveRuntimeLanguageContext` centraliza o contexto de self-study. A resolução
verifica primeiro se o perfil pertence ao UID atualmente autenticado.

1. `users/{uid}.baseLanguage` válido ganha de qualquer cache.
2. Sem base válida no perfil, usa cache confirmado do próprio UID.
3. `learnendo_base_ui_lang` válido é somente **candidato para pré-seleção do setup**.
   Não altera o runtime de outra conta, não gera cache novo e não provoca write.
4. Sem perfil/cache válido, o runtime usa `en` temporariamente.

A distinção do passo 3 é intencional: o formulário pode sugerir PT enquanto o runtime
temporário é EN. A preferência compartilhada antiga não prova quem fez a escolha.
Isso implementa a exigência de usar o legado apenas como pré-seleção para confirmação.

Para self-study:

```text
targetLanguage      = getCourseTargetLanguage(courseId)
baseLanguage        = resolução acima
instructionLanguage = baseLanguage
uiLanguage          = baseLanguage por padrão
```

O modelo mantém UiLanguage independente e o resolvedor admite uma preferência UI
explícita válida. A auditoria não encontrou uma escolha persistente separada de UI
no produto; nesta fase não se cria esse campo nem uma terceira escolha obrigatória.
Greek/Hebrew só são targets, nunca base/UI. O seletor de curso continua alterando o
target e não escreve preferências pessoais.

O App usa `useRuntimeLanguageContext`. Mudança da base não chama setters de curso,
Workbook, Lesson ou progresso. PT + English produz target EN/base/instruction/UI PT;
ao abrir Spanish, somente o target passa a ES.

## Cache por UID e limites de conta

Chave: `learnendo_base_language_<uid>`, em localStorage. Não consulta uma versão
compartilhada em sessionStorage. As chaves antigas permanecem disponíveis para
compatibilidade, mas o App não regrava `learnendo_base_ui_lang`.

O hook grava cache apenas para base válida confirmada pelo perfil. Falta de storage
não impede o uso do perfil. O runtime não guarda uma base anterior em React state.
Snapshots com writes locais pendentes são ignorados até commit/rollback; eventos de
metadata estão habilitados para que o commit seja observado. Uma tentativa negada
pelas Rules não promove a preferência otimista ao runtime/cache.
No logout, sem UID, o perfil/cache anterior é ignorado e o contexto retorna ao
fallback. Num novo login, o cache é lido pela chave do novo UID. Os caches das contas
podem permanecer no navegador para o próximo login sem serem compartilhados.

`App` também verifica `profileSnapshot.uid === user.uid` antes de expor o perfil.
Callbacks de subscriptions encerradas são descartados. Após awaits de login, o App
confere se o UID continua atual antes de prosseguir com a inicialização de navegação.

## Cross-device

A subscription de perfil existente é a sincronização. Um dispositivo sem cache
recebe a base do Firestore. Ao editar a base num segundo cliente, o snapshot atualiza
o primeiro; Firestore ganha inclusive de um cache local divergente. Não há protocolo
adicional de sincronização nem gravação automática para reconciliar fallback.

## Setup e Settings

`LanguagePreferencesSettings` oferece duas escolhas distintas:

- Idioma para explicações: English, Português ou Español.
- Idiomas que a pessoa quer estudar: EN/PT/ES/EL/HE, com seleção de um ou mais na UI.

O target aberto pode ser sugerido quando não há intenção declarada; só é persistido
após **Confirmar idiomas**. O modelo/serviço admite lista vazia para compatibilidade,
mas o formulário pede ao menos uma escolha. Nenhum histórico é usado para inferir
ou gravar uma lista completa.

Novos usuários e usuários antigos sem base veem o formulário em pontos seguros:
Courses, Dashboard, Workbook List ou início do Workbook sem lesson/day aberto.
É um cartão não bloqueante, que permite continuar usando o app. Não aparece em
Placement/exercícios nem com uma Live ativa. A configuração permanece acessível em
Settings, inclusive para usuários anônimos; notificações continuam exigindo conta
persistente. Um erro de salvamento é exibido e mantém o formulário disponível.

`learningLanguages` é intenção declarada, não matrícula, autorização, catálogo,
filtro permanente de cursos ou fonte de progresso. Mudar a lista não altera
`progress.courses`, turmas, Workbooks ou lessons.

## Professores, admin e view mode

A preferência pertence ao usuário real, independentemente do modo de visualização.
Admin/Teacher simulando Student não troca UID nem base. A preferência do professor
não é escrita como `class.instructionLanguage`.

Na aba administrativa de usuários, o botão **Languages** abre o formulário para o
perfil escolhido, identifica nome/UID e registra o UID do admin como ator. Salvar
outro perfil não muda a preferência pessoal do administrador. Nome, email, papel e
professor continuam sendo editados pelas operações administrativas existentes.

## Rules e publicação

- Leitura do perfil continua permitida ao proprietário, admin e teacher conforme
  o comportamento existente.
- Criação pelo próprio usuário permite apenas campos de identidade/bootstrap; role
  ausente ou student. Preferências exigem confirmação posterior, via update.
- Atualização pessoal de idioma exige diff limitado aos cinco campos de preferência,
  base válida, lista válida/única, versão 1, timestamp do request e ator autenticado.
- Metadados de login e campos de atividade têm uma allowlist separada. Esses campos
  não permitem mudar nome, email, role, professor ou autorização.
- Admin mantém atualizações administrativas. Validação de idioma aplica-se quando
  altera campos de idioma; um campo linguístico legado inválido não bloqueia uma
  edição administrativa de nome/role sem relação com idioma.
- Exclusão do perfil pelo cliente comum é bloqueada para impedir apagar/recriar o
  perfil como forma de contornar ownership. O fluxo administrativo de exclusão
  existente permanece disponível.
- A regra recursiva agora é `/{collectionId}/{document=**}`: subcoleções continuam
  disponíveis, mas não concedem escrita irrestrita no próprio `users/{uid}`.

**Publicar as Rules antes do frontend dependente.** Não foi feito deploy nesta
tarefa. Durante uma janela com frontend antigo, o login que tente reescrever um
campo administrativo divergente poderá receber permission-denied; a regra protege
o dado e o login novo usa somente os campos que possui. Não restaurar as Rules
permissivas para contornar esse comportamento. Fazer rollout coordenado e smoke
com contas student/teacher/admin após a publicação autorizada.

## Grammar, Placement e TTS

Grammar Focus continua usando a base pessoal como locale inicial, com seletor manual
independente. Nenhuma alteração no serviço/editor/Rules específicas do Grammar foi
necessária: scoped, legacy/unassigned, atribuição explícita, Board/Slides e permissões
continuam iguais. Os testes de upgrade e isolamento foram reexecutados.

Placement continua restrito a English; base/UI não alteram a identidade do banco.
TTS não deriva globalmente da base ou target. Resolvedor de texto falado, SpeechRequest,
resolvedAudioText, audioLanguage, voz/provider e runtime report permaneceram intactos.

## Testes executados

| Comando em `apps/main` | Resultado |
|---|---|
| `npm run test:language-profile` | Passou: modelo, defaults ausentes, cache por UID, P0, contextos, view mode, profileLoginPolicy e contratos de integração UI. |
| `npm run test:language-profile-integration` | Passou em Auth/Firestore demo: criação, perfil antigo, renderização React do setup sem writes, save/reload, logins A/B/A, proteção de campos, dados inválidos/duplicados, admin, dois clientes, conversão anônima. |
| `npm run test:language-context` | Passou. |
| `npm run test:grammar-focus` | Passou. |
| `npm run test:grammar-upgrade` | Passou em emulador: legado, atribuição, EN/ES/PT, Board/Slides e preservação das origens. |
| `npm run test:language-integrity` | Passou em emulador: seis currículos, persistência e isolamento. |
| `npm run test:placement` | Passou: banco somente EN. |
| `npm run test:role-mode` | Passou. |
| `npm run test:tts-locale` | Passou. |
| `npm run test:runtime-audio` | Passou: EN/ES/PT reais, texto, voz/provider e runtime report. |
| `npm run test:exercise-reports` | Passou. |
| `npm run test:admin-persistence` | Passou. |
| `npm run test:admin-student-update` | Passou. |
| `npm run build` | Passou, incluindo PWA/service worker. |
| `npm run lint` | Os mesmos 14 erros históricos em Battle/WorkspaceCanvas/UI/workbooks 5/6/7; nenhum erro nos arquivos novos/alterados. |
| `npm run test:notifications` (adicional) | Falhou em assert preexistente de `closeObsoleteInactivityNotifications` no serviço Live. A asserção já está em HEAD e o serviço testado não foi alterado nesta fase. Não foi corrigido por estar fora do escopo. A suíte encerrou antes dos testes subsequentes do comando. |

O teste de segurança inclui tentativas diretas de combinar idioma com role/name/
displayName/email/assignedTeacher/access/customAuthorization, alteração de outro UID,
base EL/HE e listas inválidas/duplicadas. As tentativas foram negadas. Atividade,
courseProgress e notificationSettings continuam graváveis nos caminhos existentes.

Os testes usam exclusivamente projetos `demo-*`, com guarda que exige Auth/Firestore
Emulator. O setup foi renderizado via React SSR; não foi executado um smoke manual
interativo de navegador/produção. Build mantém avisos prévios de bundle grande,
importação mista do Firestore e Browserslist desatualizado.

## Arquivos alterados/criados

- `apps/main/src/models/languageContext.ts`
- `apps/main/src/models/userLanguagePreferences.ts` (novo)
- `apps/main/src/models/userLanguagePreferences.test.ts` (novo)
- `apps/main/src/utils/userLanguageStorage.ts` (novo)
- `apps/main/src/hooks/useRuntimeLanguageContext.ts` (novo)
- `apps/main/src/services/userRoles.ts`
- `apps/main/src/services/profileLoginPolicy.ts`
- `apps/main/src/services/profileLoginPolicy.test.ts`
- `apps/main/src/services/db.ts`
- `apps/main/src/App.tsx`
- `apps/main/src/components/LanguagePreferencesSettings.tsx` (novo)
- `apps/main/src/components/TeacherDashboard/AdminUserAccessTab.tsx`
- `firestore.rules`
- `apps/main/scripts/language-phase2.integration.tsx` (novo)
- `apps/main/scripts/language-profile-ui.test.mjs` (novo)
- `apps/main/scripts/language-phase1.integration.mjs` (runner demo compartilhado)
- `apps/main/server/notificationSystem.test.ts` (contrato da regra de subcoleções)
- `apps/main/package.json`
- Este documento.

## Riscos restantes e Fase 3

Perfis sem base continuarão usando fallback até confirmação. Falta de rede/storage
não justifica persistir defaults. A conversão anônima conserva inclusive nome/email
administrativos anteriores; corrigir identidade é ação editorial/administrativa,
não efeito implícito do login. Os testes demonstram a política nos cenários emulados,
não um inventário de todos os perfis de produção.

Ficam explicitamente adiados: migração de `translation?: string`, traduções por
idioma em massa, duplicação/tradução automática de Workbooks, IA de tradução em
runtime, configuração completa de `class.instructionLanguage`, refactor completo de
Live/Battle/Vocabulary/Translator, novos bancos Placement, áudio bíblico, backfill
em massa, exclusão de históricos, alterações editoriais do Grammar e contagem de
Workbooks. Nenhum desses itens foi iniciado automaticamente.
