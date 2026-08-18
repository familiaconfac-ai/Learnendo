# Correção de upload, rascunho e publicação editorial

## Diagnóstico de causa raiz

1. O upload usava `uploadBytesResumable`, mas não possuía limite para início ou ausência de progresso. O SDK do Storage pode retentar uma operação negada/indisponível por vários minutos; nesse intervalo a UI permanecia em 0% sem entrar no callback final de erro.
2. Erros de upload, rascunho e publicação eram colocados apenas no topo de um modal longo. Ao acionar os botões no rodapé, a mensagem ficava fora da área visível. Os botões também não trocavam o texto para “Salvando”/“Publicando”. Isso produzia a aparência de clique sem ação.
3. Publicação e resolução do relatório estavam dentro do mesmo `try/catch`. Se publicar funcionasse e resolver falhasse, a interface informava genericamente que a publicação falhou.
4. O frontend identifica admin pelo perfil carregado de `users/{uid}` (com fallback reservado para contas conhecidas), enquanto Firestore e Storage verificam diretamente `users/{uid}.role == "admin"`. Não são usados custom claims. Faltava um preflight que revelasse quando a UI considerava a conta admin, mas o documento Firestore não tinha essa role.
5. O app aponta para `projectId: learnendo-6f4d3` e bucket `learnendo-6f4d3.firebasestorage.app`, coerentes com `.firebaserc`. Porém `storage.rules` continua apenas local/não rastreado e `firestore.rules` está modificado localmente. O deploy Vercel não publica regras Firebase. O Firebase CLI local informou credencial expirada, portanto não foi possível consultar ou testar o estado remoto. Não há evidência local de que as regras editoriais tenham sido publicadas; isso é a explicação mais forte para `permission-denied` nas três operações.

## Correções de código

- `exerciseImageService.ts`: watchdog de 20 s para o primeiro byte e 30 s sem avanço; cancelamento automático; `getDownloadURL` com rejeição capturada.
- `ExerciseEditorModal.tsx`: estados `selected`, `uploading`, `completed`, `canceled` e `error`; prévia local separada; nome, tamanho, dimensões, progresso e caminho; cancelamento e limpeza; mensagens fixas junto aos botões; bloqueio explícito durante upload; textos “Salvando” e “Publicando”.
- `editorialAccessService.ts`: confirma sessão, UID e `users/{uid}.role == admin` antes de Storage/Firestore.
- `editorialFirebaseError.ts`: traduz e preserva códigos Firebase, mantendo o erro técnico no Console.
- `exerciseOverrideService.ts`: preflight administrativo antes de rascunho/publicação.
- Publicação e resolução agora são duas etapas: falha ao resolver não desfaz nem oculta uma publicação confirmada.
- `blob:` permanece apenas na prévia. Modelo e regras rejeitam URL local na publicação; `imageUrl` só é atualizado após upload + `getDownloadURL`.
- Imagem real usa `object-fit: contain`, largura máxima de 100%, 260 px no celular e 360 px em telas maiores.

## Regras e autenticação

Frontend: `userAccountProfile.role === "admin"`, carregado pelo serviço de usuários. O editor recebe o UID autenticado.

Firestore: `isAdmin()` lê `users/{request.auth.uid}` e exige `role == "admin"`.

Storage: `isAdmin()` usa `firestore.get/exists` no mesmo documento e exige a mesma role. Não espera `request.auth.token.role`.

As regras estão modificadas somente no workspace. Nenhum deploy foi executado. Após reautenticar o Firebase CLI, o comando necessário para publicar somente regras é:

```powershell
firebase deploy --only firestore:rules,storage --project learnendo-6f4d3
```

## Persistência da imagem

O arquivo é enviado para:

`exercise-images/wb{workbookId}/{lessonId}/{exerciseId}/{timestamp-uuid}.{png|jpg|webp}`

Somente após conclusão são gravados no formulário:

- `imagePath`: caminho acima;
- `imageUrl`: URL HTTPS retornada por `getDownloadURL`.

O `blob:` local nunca entra no objeto editorial. PNG, JPEG e WEBP até 5 MB são aceitos sem restrição de dimensão. Um teste puro confirma PNG de aproximadamente 70 KB.

## Testes e limitações

Automatizados:

- validação do modelo e bloqueio de `blob:`;
- PNG ~70 KB, JPEG/WEBP e limite de 5 MB;
- tradução de erros Firebase;
- presença dos estados visuais, timeout e alinhamento das roles;
- regressões de respostas, áudio e relatórios;
- build Vite.

Os testes reais A–H contra produção não podem ser concluídos sem duas condições externas: regras publicadas e uma sessão administrativa Firebase válida. O CLI está com credencial expirada e não houve autorização para deploy. Por isso não é correto afirmar que um arquivo/documento remoto foi criado nesta execução. Após publicar as regras, os testes A–H devem ser realizados antes de considerar o incidente encerrado em produção.

Não houve git push, deploy ou migração de exercícios.
