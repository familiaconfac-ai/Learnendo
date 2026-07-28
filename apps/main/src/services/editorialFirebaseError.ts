export type FirebaseLikeError = Error & { code?: string; serverResponse?: string };

export function firebaseErrorCode(error: unknown): string {
  const candidate = error as FirebaseLikeError | null;
  return String(candidate?.code ?? '').trim().toLowerCase();
}

export function describeEditorialFirebaseError(error: unknown, operation: 'upload' | 'draft' | 'publish' | 'resolve' | 'load'): string {
  const code = firebaseErrorCode(error);
  const detail = error instanceof Error ? error.message : String(error ?? 'Erro desconhecido');
  const suffix = code ? ` (${code})` : '';

  if (code === 'storage/unauthorized' || code === 'permission-denied') {
    return `O Firebase negou a operação para esta conta. Confirme se users/{uid}.role é "admin" e publique as regras editoriais no projeto learnendo-6f4d3.${suffix}`;
  }
  if (code === 'storage/canceled') return `Upload cancelado. Nenhuma referência de imagem foi salva.${suffix}`;
  if (code === 'storage/upload-stalled' || code === 'storage/retry-limit-exceeded') {
    return `Não foi possível iniciar o envio da imagem. Verifique as permissões do Firebase Storage, a conexão e tente novamente.${suffix}`;
  }
  if (code === 'storage/object-not-found') return `O arquivo não foi encontrado no Firebase Storage.${suffix}`;
  if (code === 'storage/unknown') return `O Firebase Storage retornou um erro desconhecido. Tente novamente e confira o Console/Network.${suffix}`;
  if (code === 'unauthenticated' || code === 'storage/unauthenticated') return `A sessão expirou ou não está autenticada. Entre novamente antes de continuar.${suffix}`;
  if (code === 'failed-precondition') return `O Firebase recusou a operação porque uma condição obrigatória não foi atendida.${suffix}`;
  if (code === 'aborted') return `A operação foi interrompida por conflito. Recarregue o exercício e compare as versões.${suffix}`;
  if (code === 'unavailable') return `O Firebase está temporariamente indisponível. Seus dados digitados foram mantidos.${suffix}`;
  if (/alterado por outro administrador/i.test(detail)) return detail;
  if (/resposta correta|alternativas duplicadas|motivo da alteração|idioma inválido|sem resposta principal/i.test(detail)) return detail;

  const labels = { upload: 'enviar a imagem', draft: 'salvar o rascunho', publish: 'publicar a correção', resolve: 'resolver o relatório', load: 'carregar o estado editorial' } as const;
  return `Não foi possível ${labels[operation]}. ${detail}${suffix && !detail.includes(suffix) ? suffix : ''}`;
}

export function logEditorialFirebaseError(context: string, error: unknown): void {
  console.error(`[ExerciseEditorial] ${context}`, {
    code: firebaseErrorCode(error) || 'unknown',
    error,
  });
}
