import React, { useEffect, useState } from 'react';
import { BASE_LANGUAGES, TARGET_LANGUAGES, type BaseLanguage, type TargetLanguage } from '../models/languageContext';
import { updateUserLanguagePreferences, type UserAccountProfile } from '../services/userRoles';

const names: Record<TargetLanguage, string> = { en: 'English', pt: 'Português', es: 'Español', el: 'Greek', he: 'Hebrew' };
const copy = {
  en: { title: 'Your languages', question: 'Which language should Learnendo use to explain the content to you?',
    learning: 'Languages you want to study', hint: 'This is your study preference. All courses and your progress remain available.',
    save: 'Confirm languages', saving: 'Saving…', saved: 'Language preferences saved.', suggestion: 'Review the suggested options and confirm your preferences.',
    later: 'You can do this later in Settings.' },
  pt: { title: 'Seus idiomas', question: 'Qual idioma o Learnendo deve usar para explicar o conteúdo para você?',
    learning: 'Idiomas que você quer estudar', hint: 'Esta é sua preferência de estudo. Todos os cursos e seu progresso continuam disponíveis.',
    save: 'Confirmar idiomas', saving: 'Salvando…', saved: 'Preferências de idioma salvas.', suggestion: 'Revise as opções sugeridas e confirme suas preferências.',
    later: 'Você pode fazer isso depois em Settings.' },
  es: { title: 'Tus idiomas', question: '¿Qué idioma debe usar Learnendo para explicarte el contenido?',
    learning: 'Idiomas que quieres estudiar', hint: 'Esta es tu preferencia de estudio. Todos los cursos y tu progreso siguen disponibles.',
    save: 'Confirmar idiomas', saving: 'Guardando…', saved: 'Preferencias de idioma guardadas.', suggestion: 'Revisa las opciones sugeridas y confirma tus preferencias.',
    later: 'Puedes hacerlo más tarde en Settings.' },
};

export function LanguagePreferencesSettings({ profile, suggestedBaseLanguage, targetLanguage, uiLanguage, updatedByUid = profile.uid }: {
  profile: UserAccountProfile; suggestedBaseLanguage: BaseLanguage; targetLanguage: TargetLanguage; uiLanguage: BaseLanguage;
  updatedByUid?: string;
}) {
  const [base, setBase] = useState<BaseLanguage>(suggestedBaseLanguage);
  const [learning, setLearning] = useState<TargetLanguage[]>(profile.learningLanguages ?? [targetLanguage]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const learningKey = JSON.stringify(profile.learningLanguages);
  useEffect(() => {
    if (!dirty) { setBase(suggestedBaseLanguage); setLearning(profile.learningLanguages ?? [targetLanguage]); }
  }, [profile.uid, suggestedBaseLanguage, learningKey, targetLanguage, dirty]);
  const text = copy[uiLanguage];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      await updateUserLanguagePreferences(profile.uid, { baseLanguage: base, learningLanguages: learning }, updatedByUid);
      setDirty(false); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  };
  return <section className="mx-auto my-6 max-w-xl rounded-3xl border border-slate-600 bg-slate-800 p-6 text-slate-100" aria-label={text.title}>
    <h2 className="text-2xl font-bold">{text.title}</h2>
    {!profile.baseLanguage && <p className="my-3 text-sm text-slate-300">{text.suggestion} {text.later}</p>}
    <form onSubmit={submit} className="mt-5 space-y-5">
      <fieldset disabled={saving} className="space-y-3">
        <legend className="mb-2 font-semibold">{text.question}</legend>
        {BASE_LANGUAGES.map(language => <label key={language} className="mr-4 inline-flex items-center gap-2">
          <input type="radio" name="explanation-language" value={language} checked={base === language} onChange={() => { setBase(language); setDirty(true); setSaved(false); }} />{names[language]}
        </label>)}
      </fieldset>
      <fieldset disabled={saving}>
        <legend className="mb-2 font-semibold">{text.learning}</legend>
        <p className="mb-3 text-sm text-slate-300">{text.hint}</p>
        <div className="flex flex-wrap gap-4">{TARGET_LANGUAGES.map(language => <label key={language} className="inline-flex items-center gap-2">
          <input type="checkbox" checked={learning.includes(language)} onChange={() => {
            setLearning(current => current.includes(language) ? current.filter(value => value !== language) : [...current, language]);
            setDirty(true); setSaved(false);
          }} />{names[language]}
        </label>)}</div>
      </fieldset>
      <button type="submit" disabled={saving || learning.length === 0} className="rounded-xl bg-blue-600 px-5 py-3 font-bold disabled:opacity-50">{saving ? text.saving : text.save}</button>
      {error && <p role="alert" className="text-red-300">{error}</p>}
      {saved && <p role="status" className="text-emerald-300">{text.saved}</p>}
    </form>
  </section>;
}
