import type { ExerciseReport } from '../services/exerciseReportsService';

/** Shared historical runtime details in the report dashboard and editorial editor. */
export const exerciseRuntimeReportRows = (report: ExerciseReport): Array<[string, string | null | undefined]> => [
  ['Texto enviado ao TTS', report.resolvedAudioText],
  ['Idioma do áudio', report.audioLanguage],
  ['Voz', report.audioVoice],
  ['Idioma da voz', report.audioVoiceLanguage],
  ['Provedor', report.audioProvider],
  ['Texto visível na tela', report.renderedText],
  ['Alternativas exibidas (ordem)', report.displayedOptions?.join(' · ')],
  ['Respostas aceitas em execução', report.resolvedAcceptedAnswers?.join(' · ')],
  ['Histórico de áudio (últimas 50 tentativas)', report.audioHistory?.length ? JSON.stringify(report.audioHistory, null, 2) : null],
];
