/** The locale accepted by the existing remote synthesis provider. */
export function normalizeTranslateLang(langCode?: string): string {
  const value = (langCode || 'en-US').trim();
  if (!value) return 'en';
  const lower = value.toLowerCase();
  if (lower.startsWith('pt-br')) return 'pt-BR';
  for (const language of ['en', 'es', 'pt', 'el', 'he']) {
    if (lower === language || lower.startsWith(`${language}-`)) return language;
  }
  return value;
}
