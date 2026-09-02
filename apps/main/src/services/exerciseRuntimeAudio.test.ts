import assert from 'node:assert/strict';
import test from 'node:test';
import { speak, cancelSpeechPlayback } from './ttsService.ts';
import { createExerciseAudioRecorder } from '../models/exerciseRuntimeSnapshot.ts';
import { resolvePromptAudioText } from '../utils/fillInBlankAudio.ts';
import { resolveExerciseSpeechLocale } from '../utils/exerciseSpeechLocale.ts';
import { workbook1 as spanish } from '../courses/spanish/workbook1.ts';
import { workbook1 as portuguese } from '../courses/portuguese_foreigners/workbook1.ts';
import { workbook1 as english } from '../data/workbook1/index.ts';

const voices = ['en-US', 'es-ES', 'pt-BR'].map((lang) => ({ name: `Test ${lang}`, lang }));
let delivered: any;
const browser = {
  paused: false, getVoices: () => voices, cancel() {}, resume() {},
  speak(utterance: any) { delivered = utterance; utterance.onstart?.(); utterance.onend?.(); },
};
class Utterance {
  text: string; voice = null;
  constructor(text: string) { this.text = text; }
}

test('real EN/ES/PT curriculum -> resolver -> synthesis -> runtime report snapshot', async () => {
  (globalThis as any).window = { speechSynthesis: browser };
  (globalThis as any).SpeechSynthesisUtterance = Utterance;
  const cases = [
    { language: 'en', workbook: english, expected: 'R. This is the letter R.' },
    { language: 'es', workbook: spanish, expected: 'Esta es la letra R.' },
    { language: 'pt', workbook: portuguese, expected: 'Esta é a letra R.' },
  ];
  for (const { language, workbook, expected } of cases) {
    const exercises = workbook.lessons.flatMap((lesson) => lesson.days.flatMap((day) => day.exercises));
    const exercise = language === 'en'
      ? exercises.find((exercise) => exercise.audioValue === 'R. This is the letter R.')!
      : exercises.find((exercise) => exercise.id === `${language}_wb1_l1_d1_e9`)!;
    assert.ok(exercise, language);
    const recorder = createExerciseAudioRecorder();
    const locale = resolveExerciseSpeechLocale(exercise, language, 'en');
    const playback = speak(resolvePromptAudioText(exercise, locale), locale, {
      onSynthesis: (audio) => recorder.record({ ...audio, role: 'prompt', origin: 'autoplay' }),
    });
    assert.equal((await playback.promise).state, 'completed');
    const report = { audioText: exercise.audioValue, ...recorder.snapshot() };
    assert.equal(report.audioText, language === 'en' ? expected : 'R');
    assert.equal(report.resolvedAudioText, expected);
    assert.equal(report.resolvedAudioText, delivered.text);
    assert.equal(report.audioLanguage, delivered.lang);
    assert.equal(report.audioVoice, delivered.voice.name);
    assert.equal(report.audioHistory[0].state, 'completed');
    await speak(language === 'es' ? '¡Correcto!' : language === 'pt' ? 'Correto!' : 'Correct!', locale, {
      onSynthesis: (audio) => recorder.record({ ...audio, role: 'feedback', origin: 'interaction' }),
    }).promise;
    assert.equal(recorder.snapshot().resolvedAudioText, expected, 'feedback must not erase prompt');
    assert.equal(recorder.snapshot().audioHistory.length, 2);
    assert.equal(report.audioHistory.length, 1, 'captured reports must be immutable');
    assert.equal(createExerciseAudioRecorder().snapshot().resolvedAudioText, null, 'new presentation starts empty');
    console.log(JSON.stringify({ exerciseId: exercise.id, ...report }));
  }
});

test('remote fallback records the exact normalized request and provider, retaining the failed browser attempt', async () => {
  (globalThis as any).window = { speechSynthesis: { ...browser, speak(utterance: any) { utterance.onerror({ error: 'voice-unavailable' }); } } };
  (globalThis as any).SpeechSynthesisUtterance = Utterance;
  const originalFetch = globalThis.fetch;
  let body: any;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(init!.body as string);
    return new Response('{}', { status: 503 });
  };
  try {
    const recorder = createExerciseAudioRecorder();
    const handle = speak('  Esta es la letra Ñ.  ', 'es-ES', {
      onSynthesis: (audio) => recorder.record({ ...audio, role: 'prompt', origin: 'retry' }),
    });
    assert.equal((await handle.promise).state, 'error');
    const report = recorder.snapshot();
    assert.equal(report.resolvedAudioText, body.text);
    assert.equal(report.resolvedAudioText, 'Esta es la letra Ñ.');
    assert.equal(report.audioLanguage, body.langCode);
    assert.equal(report.audioLanguage, 'es');
    assert.equal(report.audioVoice, null);
    assert.equal(report.audioProvider, 'google-translate');
    assert.equal(report.audioHistory.length, 2);
    assert.equal(report.audioHistory[0].resolvedAudioText, '  Esta es la letra Ñ.  ');
    assert.ok(report.audioHistory.every((entry) => entry.state === 'error'));
  } finally { globalThis.fetch = originalFetch; cancelSpeechPlayback(); }
});

test('letters, blanks, numbers and authored text respect the speech locale', () => {
  for (const [locale, letterText, blankText] of [
    ['en-US', 'This is the letter Q.', 'blank'],
    ['es-ES', 'Esta es la letra Q.', 'espacio en blanco'],
    ['pt-BR', 'Esta é a letra Q.', 'em branco'],
  ]) {
    assert.equal(resolvePromptAudioText({ audioValue: 'q' }, locale), letterText);
    assert.equal(resolvePromptAudioText({ displayValue: '___' }, locale), blankText);
    assert.equal(resolvePromptAudioText({ audioValue: '42' }, locale), '42');
  }
  assert.equal(resolvePromptAudioText({ audioValue: 'ñ' }, 'es-ES'), 'Esta es la letra Ñ.');
  assert.equal(resolvePromptAudioText({ audioValue: 'Olá, tudo bem?' }, 'pt-BR'), 'Olá, tudo bem?');
  assert.equal(resolvePromptAudioText({ audioValue: 'α' }, 'el-GR'), 'α');
  for (const [workbook, number] of [[spanish, 'diez'], [portuguese, 'dez']] as const) {
    const exercise = workbook.lessons[0].days.flatMap((day) => day.exercises).find((exercise) => exercise.audioValue === number);
    assert.ok(exercise, `${number} remains translated by the existing curriculum`);
  }
});
