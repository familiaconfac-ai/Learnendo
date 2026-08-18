# Workbook 1 Exercise Consistency Audit V2

## Resumo executivo

- Exercícios efetivos auditados: **1.200** (12 lições, 84 dias).
- Problemas confirmados nesta segunda auditoria: **94**.
- Problemas anteriores que continuam inválidos: **59**.
- Falsos negativos agora encontrados (NEWLY_FOUND): **35**.
- Falsos positivos removidos da auditoria anterior: **87**.
- Casos que realmente exigem decisão humana (NEEDS_HUMAN_REVIEW): **8**.
- Exercícios com override publicado internamente coerente e agora OK: **10**.
- Entre os 155 não-OK da V1: 59 STILL_INVALID + 8 NEEDS_HUMAN_REVIEW + 1 FIXED_BY_OVERRIDE + 87 FALSE_POSITIVE = 155.

A auditoria recompôs o estado atual por exercício como base empacotada + sequência diária publicada + override individual publicado. Há uma sequência diária publicada: wb1_l2_d7 v1, com 20 itens; os demais 83 dias estão em v0. Há 19 overrides individuais publicados e um rascunho privado não efetivo em wb1_l5_d3.

A análise V2 não reutiliza automaticamente o Status da V1. Cada item passou pela matriz instruction/type/mode, display/expected, audio/instruction, display/audio, options/lacuna e expected/accepted. As classificações separam falhas MECHANICAL, LINGUISTIC, PEDAGOGICAL e STRUCTURAL.

## Diferenças em relação à auditoria anterior

+A tabela abaixo registra todas as mudanças ou reavaliações materiais de status. A tabela completa de 1.200 itens permanece na seção por lição.

| Exercise ID | Status anterior | Status novo | Motivo |
|---|---|---|---|
| wb1_l1_speak_number_12 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_identify_letter | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_identify_number | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_yes_letter | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_no_letter | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_plural_letters | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l1_final_speak_plural_numbers | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l2_final_v2_speak_1 | EDITORIAL + TECHNICAL | INVALID | STILL_INVALID — MISSING_CONTEXT. |
| wb1_l2_final_v2_speak_2 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l2_final_v2_speak_3 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l2_final_v2_speak_4 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l2_final_v2_speak_5 | EDITORIAL + TECHNICAL | INVALID | STILL_INVALID — TYPE_MODE_MISMATCH, PROMPT_ANSWER_MISMATCH. |
| wb1_l2_final_v2_speak_6 | EDITORIAL | INVALID | STILL_INVALID — PROMPT_ANSWER_MISMATCH. |
| wb1_l3_final_v2_listen_write_3 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l3_final_v2_listen_write_8 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l3_final_v2_speak_3 | EDITORIAL | INVALID | STILL_INVALID — DISPLAY_REVEALS_ANSWER. |
| wb1_l3_final_v2_speak_4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l3_final_v2_speak_5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l3_final_v2_speak_6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l4_d4_e10 | EDITORIAL | INVALID | STILL_INVALID — DUPLICATE_ACCEPTED. |
| wb1_l4_final_v2_listen_write_1 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l4_final_v2_listen_write_4 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l4_final_v2_speak_3 | EDITORIAL | INVALID | STILL_INVALID — VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED. |
| wb1_l4_final_v2_speak_4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l4_final_v2_speak_5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l4_final_v2_speak_6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d2_e1 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e2 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e3 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e4 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e5 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e6 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e7 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e8 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e9 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d2_e10 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l5_d5_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e2 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e3 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e7 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e8 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e9 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_d5_e10 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_final_v2_speak_1 | REVIEW | INVALID | STILL_INVALID — OPEN_RESPONSE_TOO_NARROW. |
| wb1_l5_final_v2_speak_3 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_final_v2_speak_4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_final_v2_speak_5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l5_final_v2_speak_6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d1_e8 | EDITORIAL | INVALID | STILL_INVALID — INVALID_OPTIONS, AUDIO_GIVES_ANSWER. |
| wb1_l6_d1_e9 | EDITORIAL | INVALID | STILL_INVALID — INVALID_OPTIONS, AUDIO_GIVES_ANSWER. |
| wb1_l6_d2_e1 | EDITORIAL | INVALID | STILL_INVALID — INVALID_OPTIONS, AUDIO_GIVES_ANSWER. |
| wb1_l6_d2_e2 | EDITORIAL | INVALID | STILL_INVALID — INVALID_OPTIONS, AUDIO_GIVES_ANSWER. |
| wb1_l6_d4_e1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l6_d4_e4 | EDITORIAL | INVALID | STILL_INVALID — AUDIO_GIVES_ANSWER. |
| wb1_l6_d5_e4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d5_e6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d5_e7 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d5_e8 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l6_d5_e13 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d5_e14 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l6_d5_e15 | EDITORIAL | INVALID | STILL_INVALID — INVALID_OPTIONS, AUDIO_GIVES_ANSWER. |
| wb1_l6_d6_e1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l6_d6_e2 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l6_d6_e3 | EDITORIAL | OK | FIXED_BY_OVERRIDE — composição efetiva atual coerente. |
| wb1_l6_d6_e4 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l6_d6_e5 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l6_d6_e7 | OK | INVALID | NEWLY_FOUND — TYPE_MODE_MISMATCH. |
| wb1_l6_d6_e8 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l6_final_v2_listen_write_4 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l6_final_v2_listen_write_5 | EDITORIAL | INVALID | STILL_INVALID — DUPLICATE_ACCEPTED. |
| wb1_l6_final_v2_listen_write_6 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY, LONG_DICTATION. |
| wb1_l6_final_v2_listen_write_7 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l6_final_v2_listen_write_8 | OK | INVALID | NEWLY_FOUND — DICTATION_ORTHOGRAPHY. |
| wb1_l6_final_v2_shadow_4 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l6_final_v2_shadow_6 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l6_final_v2_speak_3 | EDITORIAL | INVALID | STILL_INVALID — MISSING_CONTEXT. |
| wb1_l6_final_v2_speak_4 | EDITORIAL | INVALID | STILL_INVALID — VISIBLE_LISTENING_PROMPT. |
| wb1_l6_final_v2_speak_5 | EDITORIAL | INVALID | STILL_INVALID — VISIBLE_LISTENING_PROMPT. |
| wb1_l6_final_v2_speak_6 | EDITORIAL | INVALID | STILL_INVALID — VISIBLE_LISTENING_PROMPT. |
| wb1_l7_d4_e1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l7_d5_e8 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l7_d6_e1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l7_d6_e2 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e3 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e4 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e5 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e6 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e8 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l7_d6_e9 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_d6_e10 | EDITORIAL | INVALID | STILL_INVALID — AMBIGUOUS_WRITE_QUESTION. |
| wb1_l7_final_v2_listen_write_6 | EDITORIAL | INVALID | STILL_INVALID — DUPLICATE_ACCEPTED. |
| wb1_l7_final_v2_speak_2 | EDITORIAL | INVALID | STILL_INVALID — VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED. |
| wb1_l7_final_v2_speak_3 | EDITORIAL | INVALID | STILL_INVALID — DUPLICATE_ACCEPTED. |
| wb1_l8_d1_e15 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l8_d3_e8 | EDITORIAL | INVALID | STILL_INVALID — AUDIO_GIVES_ANSWER. |
| wb1_l8_d3_e10 | EDITORIAL | INVALID | STILL_INVALID — AUDIO_GIVES_ANSWER. |
| wb1_l8_d3_e12 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l8_d3_e13 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l8_d3_e14 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l8_d3_e15 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l8_d5_e1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l8_d5_e2 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l8_d6_e7 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l8_final_v2_listen_write_3 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l8_final_v2_listen_write_7 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY, LONG_DICTATION. |
| wb1_l8_final_v2_speak_4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l8_final_v2_speak_5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d2_e8 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l9_d2_e9 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l9_d2_e11 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l9_d2_e12 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l9_d5_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e2 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e3 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e7 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e8 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e9 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e10 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e11 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e12 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e13 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e14 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d5_e15 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_d6_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l9_final_v2_listen_write_1 | OK | INVALID | NEWLY_FOUND — DICTATION_ORTHOGRAPHY. |
| wb1_l9_final_v2_listen_write_3 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l9_final_v2_listen_write_6 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l9_final_v2_listen_write_8 | OK | INVALID | NEWLY_FOUND — DICTATION_ORTHOGRAPHY. |
| wb1_l9_final_v2_shadow_1 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d2_e1 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e2 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e3 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e4 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e5 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e6 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e7 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e8 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e9 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e10 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e11 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e12 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e13 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e14 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d2_e15 | OK | INVALID | NEWLY_FOUND — AUDIO_GIVES_ANSWER. |
| wb1_l10_d5_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e2 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e3 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e7 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e8 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e9 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e10 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e11 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e12 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e13 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e14 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d5_e15 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_d6_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l10_final_v2_shadow_6 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e2 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e3 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e4 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e5 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e6 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e7 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e8 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e9 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e10 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e11 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e12 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e13 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e14 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d5_e15 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_d6_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l11_final_v2_listen_write_5 | OK | INVALID | NEWLY_FOUND — DICTATION_ORTHOGRAPHY, LONG_DICTATION. |
| wb1_l11_final_v2_listen_write_6 | OK | INVALID | NEWLY_FOUND — DICTATION_ORTHOGRAPHY. |
| wb1_l11_final_v2_shadow_4 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l11_final_v2_shadow_5 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l11_final_v2_shadow_6 | REVIEW | NEEDS_HUMAN_REVIEW | NEEDS_HUMAN_REVIEW — -. |
| wb1_l11_final_v2_speak_1 | REVIEW | INVALID | STILL_INVALID — OPEN_RESPONSE_TOO_NARROW. |
| wb1_l12_d6_e1 | EDITORIAL | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |
| wb1_l12_final_v2_listen_write_5 | REVIEW | INVALID | STILL_INVALID — DICTATION_ORTHOGRAPHY. |
| wb1_l12_final_v2_shadow_1 | EDITORIAL | INVALID | STILL_INVALID — LONG_SHADOWING. |
| wb1_l12_final_v2_shadow_6 | REVIEW | OK | FALSE_POSITIVE — o diagnóstico da V1 não se sustenta no estado efetivo. |

Regras de transição:

| Estado anterior | Situação V2 | Classificação |
|---|---|---|
| Não-OK | problema confirmado | STILL_INVALID |
| Não-OK | composição agora coerente por override | FIXED_BY_OVERRIDE |
| Não-OK | diagnóstico anterior não se sustenta | FALSE_POSITIVE |
| Não-OK | depende de objetivo/limite A1 | NEEDS_HUMAN_REVIEW |
| OK | problema confirmado agora | NEWLY_FOUND |
| OK | nenhuma inconsistência encontrada | OK |

O falso positivo comprovado wb1_l6_d6_e3 mudou de EDITORIAL para FIXED_BY_OVERRIDE: o display efetivo em português determina exatamente a pergunta inglesa esperada.

O falso negativo comprovado wb1_l6_d6_e7 mudou de OK para NEWLY_FOUND / TYPE_MODE_MISMATCH. O gabarito efetivo foi atualizado depois da evidência inicial e agora corresponde ao texto, mas type e modalidade continuam incompatíveis com a tarefa editorial pedida.

## Overrides publicados

Overrides individuais não podem alterar type nem assessmentMode. Eles podem alterar instruction, display, audio, expected e respostas. O type/mode abaixo é o da base publicada (sequência v1 em wb1_l2_d7; pacote nos demais) e permanece efetivo. “Ausente” significa herança; “vazio” significa limpeza explícita.

| ID | Base type/mode | Base instruction / display / audio / expected | Override instruction / display / audio / expected | Estado efetivo | Coerente? |
|---|---|---|---|---|---|
| wb1_l6_final_v2_listen_write_5 | writing / listening-writing | Listen and write exactly what you hear. / — / Good afternoon, Ana. / Good afternoon, Ana. | ausente / ausente / ausente / ausente; accepted inclui Ana e Anna | Mesmo prompt/áudio/gabarito; variantes de grafia | **Não totalmente**: DUPLICATE_ACCEPTED após normalização, embora resolva Ana/Anna |
| wb1_l6_final_v2_speak_6 | speaking / speaking | Listen and answer aloud in English. / What is the boy’s name? / mesma pergunta / Ben | instruction/display/audio herdados; expected His name is Ben | Pergunta continua visível; aceita também formas curtas | **Não**: VISIBLE_LISTENING_PROMPT; objetivo de frase completa parcialmente diluído |
| wb1_l6_final_v2_speak_3 | speaking / speaking | Listen and answer aloud in English. / Where is Ben? / mesma pergunta / In the classroom | display vazio; demais herdados | Pergunta só no áudio, sem imagem/contexto | **Não**: MISSING_CONTEXT |
| wb1_l6_final_v2_speak_2 | speaking / speaking | Listen and answer aloud in English. / How are you? lacuna / How are you? / I am fine. | display vazio; expected I'm fine, thanks.; variantes completas naturais | Listening + speaking com conjunto amplo de frases completas | **Sim** |
| wb1_l6_final_v2_speak_1 | speaking / speaking | Listen and answer aloud in English. / diálogo How are you / How are you? / I am fine, thank you. | display vazio; expected herdado; variantes completas | Pergunta oculta e respostas naturais completas | **Sim** |
| wb1_l6_final_v2_shadow_6 | speaking / shadowing | Listen and repeat exactly what you hear. / — / quatro expressões desconectadas / mesmas | audio e expected: Good morning, teacher. How are you? | Duas frases relacionadas | **Revisão humana**: cabe em uma gravação A1? |
| wb1_l6_final_v2_shadow_3 | speaking / shadowing | Listen and repeat exactly what you hear. / — / diálogo com Teacher/Students / diálogo | audio e expected: We are fine, thank you. | Unidade curta e coerente | **Sim** |
| wb1_l6_d6_e7 | speaking / assessmentMode ausente (renderer speaking) | Read and repeat. / quatro expressões / mesmas / mesmas | Translate into English. / Bom dia, professor. Como você está? / vazio / Good morning, teacher. How are you? | Prompt e gabarito alinhados, mas resposta continua no renderer speaking | **Não**: TYPE_MODE_MISMATCH |
| wb1_l6_d6_e3 | writing / write-question | Write the question. / Answer: In the classroom / In the classroom / Where is Ben? | Write the Question in English / Onde está Ben? / vazio / expected herdado | Onde está Ben? → Where is Ben?; aceita Where's Ben? | **Sim**; FIXED_BY_OVERRIDE |
| wb1_l3_d4_e1 | multiple-choice / default | thirty vs thirteen / — / thirty thirteen / different | conteúdo principal herdado | opções same/different coerentes | **Sim** |
| wb1_l3_d4_e4 | multiple-choice / default | walk vs talk / — / walk talk / different | conteúdo principal herdado | opções same/different coerentes | **Sim** |
| wb1_l3_d4_e5 | multiple-choice / default | ship vs sheep / — / ship sheep / different | conteúdo principal herdado | opções same/different coerentes | **Sim** |
| wb1_l3_d4_e7 | multiple-choice / default | shower vs shower / — / shower shower / same | conteúdo principal herdado | opções same/different coerentes | **Sim** |
| wb1_l3_final_v2_speak_3 | speaking / speaking | Listen and answer aloud. / He takes a shower and gets dressed. / texto + pergunta / take a shower | expected He takes a shower.; variantes | Display revela a resposta pedida pelo áudio | **Não**: DISPLAY_REVEALS_ANSWER |
| wb1_l3_final_v2_speak_1 | speaking / speaking | Listen and answer aloud. / — / Lisa... What does she do at 8? / get ready for school | áudio reescrito; expected She gets ready for school.; variantes | Contexto auditivo e resposta completa | **Sim** |
| wb1_l3_final_v2_listen_write_7 | writing / listening-writing | ditado fragmentado dinner at 6 thirty PM | áudio frase completa; expected 6:30; variantes por palavras/dígitos | Ditado e equivalências temporais alinhados | **Sim** |
| wb1_l2_final_v2_speak_1 | speaking / speaking, base da sequência v1 | artigo an / pergunta de artigo / an | Listen and answer. / display herdado vazio / What is this? / This is a kite | Não existe imagem/contexto que identifique kite | **Não**: MISSING_CONTEXT |
| wb1_l2_final_v2_speak_5 | speaking / speaking, base da sequência v1 | pergunta de artigo / — / frase com lacuna / a | Listen and choose the correct article. / herdado / It is an apple. / it is an apple | Instruction pede artigo, expected pede frase; renderer é speaking | **Não**: TYPE_MODE_MISMATCH + PROMPT_ANSWER_MISMATCH |
| wb1_l2_final_v2_speak_6 | speaking / speaking, base da sequência v1 | What is Sol in English? / — / pergunta / sun | audio What is sun in Portuguese?; expected sol | Instruction diz responder em inglês, áudio pede português | **Não**: PROMPT_ANSWER_MISMATCH |

Resumo dos overrides: **10 coerentes e OK**, **1 NEEDS_HUMAN_REVIEW**, **8 com problema confirmado**.

## Problemas estruturais

| Categoria | Quantidade | Natureza | Regra |
|---|---:|---|---|
| TYPE_MODE_MISMATCH | 2 | STRUCTURAL | Instruction implica modalidade diferente do renderer |
| PROMPT_ANSWER_MISMATCH | 2 | STRUCTURAL/PEDAGOGICAL | Expected não atende ao prompt efetivo |
| DISPLAY_REVEALS_ANSWER | 1 | PEDAGOGICAL | Display entrega a resposta da pergunta auditiva |
| VISIBLE_LISTENING_PROMPT | 5 | PEDAGOGICAL | Pergunta do áudio também fica escrita |
| MISSING_CONTEXT | 2 | PEDAGOGICAL | Resposta específica não é dedutível |
| AMBIGUOUS_WRITE_QUESTION | 10 | PEDAGOGICAL | Uma resposta admite várias perguntas |
| INVALID_OPTIONS | 5 | STRUCTURAL | Opções não completam literalmente a lacuna |
| AUDIO_GIVES_ANSWER | 37 | PEDAGOGICAL | Áudio entrega o item fora de mode listening declarado |
| LONG_SHADOWING | 13 | STRUCTURAL/PEDAGOGICAL | Várias frases ou marcadores de diálogo em uma gravação |
| LONG_DICTATION | 3 | STRUCTURAL/PEDAGOGICAL | Ditado exige passagem/diálogo inteiro em um input |
| DUPLICATE_ACCEPTED | 6 | MECHANICAL | Duplicação exata ou após normalização |
| DICTATION_ORTHOGRAPHY | 17 | LINGUISTIC | Nome próprio/grafia não determinável somente pelo áudio |
| OPEN_RESPONSE_TOO_NARROW | 2 | PEDAGOGICAL | Pergunta pessoal aberta restringida a identidade fixa |

As categorias se sobrepõem; **94 IDs únicos** precisam de modificação.

## REVIEW humano

Somente estes oito casos dependem de decisão pedagógica humana. Todos são pares curtos e semanticamente relacionados, mas exigem decidir se um aluno A1 deve repeti-los em uma única gravação.

| ID | Estado efetivo | Dúvida | Opções plausíveis | Recomendação |
|---|---|---|---|---|
| wb1_l6_final_v2_shadow_4 | It is night. You go to bed. | Duas frases curtas | manter como uma unidade ou dividir | Teste A1 real; não decidir por contagem de palavras |
| wb1_l6_final_v2_shadow_6 | Good morning, teacher. How are you? | Saudação + pergunta | manter diálogo mínimo ou dividir | Teste de retenção em uma gravação |
| wb1_l8_d3_e12 | Are you ready? Yes, I am. | pergunta + resposta | shadowing conjunto ou dois turnos | Definir se o objetivo é padrão completo |
| wb1_l8_d3_e13 | Is Lucas afraid? No, he isn't. | pergunta + resposta | conjunto ou dois turnos | Validar objetivo de contração |
| wb1_l8_d3_e14 | Is Emily near the giraffes? Yes, she is. | pergunta + resposta | conjunto ou dois turnos | Teste manual A1 |
| wb1_l8_d3_e15 | Are they late? No, they aren't. | pergunta + resposta | conjunto ou dois turnos | Validar objetivo de contração |
| wb1_l11_final_v2_shadow_5 | Who is he? He is Leo. | pergunta + resposta | conjunto ou dois turnos | Decisão editorial explícita |
| wb1_l11_final_v2_shadow_6 | When is the class? It is at nine o'clock. | pergunta + resposta | conjunto ou dois turnos | Teste manual de retenção |

## Caso wb1_l6_d6_e7

Estado efetivo atual observado:

- type: speaking; assessmentMode ausente; PracticeSection usa textarea/microfone e classifica o item como produção oral.
- instruction: Translate into English.
- display: Bom dia, professor. Como você está?
- audio: vazio explícito.
- expected atual: Good morning, teacher. How are you?
- acceptedAnswers alternativos: vazio.

A evidência inicial dizia que o expected ainda continha quatro expressões antigas. Isso não é mais verdade no estado remoto lido nesta V2: o override publicado v1, atualizado em 17/08/2026 às 12:36:15, também substituiu o expected. Portanto, STALE_EXPECTED_ANSWER não se aplica ao estado atual.

O problema restante é TYPE_MODE_MISMATCH: a tarefa foi transformada de read/repeat para tradução, mas o type imutável do override continua speaking. Pela regra editorial fornecida, a resposta deveria usar modalidade writing quando o aluno deve digitar a tradução.

Por que a V1 marcou OK: ela aplicou instruction/display/audio do override, mas herdou incorretamente o expected do pacote na própria representação e não executou a checagem obrigatória instruction × type. Foi simultaneamente um falso negativo de modalidade e uma leitura incompleta do override.

Conclusão sobre Enter/CHECK:

1. Editorial/alvo: o alvo atual está semanticamente alinhado ao display; o problema é modalidade, não gabarito stale.
2. Renderer: type=speaking produz textarea, microfone e matcher oral, não o input writing esperado pela tarefa.
3. TTS/loading: com audio vazio, promptAudioText é vazio e o effect define audioStatus=ready. Além disso, exerciseActionLocked só depende de audioStatus=loading para isDictationWriting; este item é speaking. Remover áudio não o deixa preso em loading.
4. Handler: textarea speaking possui onKeyDown=handleKeyDown; Enter chama performPrimaryAction → handleCheck. O ExercisePractice não passa actionLocked, logo o default é false.
5. A ausência total de feedback relatada não é explicada pelo estado estático atual. Ela requer reprodução da build/instante observado. Type/mode errado explica o renderer inadequado, mas não deveria, sozinho, impedir Enter.

Correção futura necessária: reconstruir/publicar o exercício com type writing e mode coerente, preservando display e expected atuais; depois testar Enter, botão CHECK, resposta correta/incorreta e ausência de TTS lock. Nenhuma correção foi feita nesta auditoria.

## Por lição

### Lesson 1: The Alphabet and Numbers

#### Day 1 (wb1_l1_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_letter_recognition_a | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_b | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_c | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_d | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_e | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_f | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_g | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_h | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_i | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_j | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_k | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_l | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_m | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_n | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_o | OK | OK | multiple-choice | default | - | OK | - |

#### Day 2 (wb1_l1_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_letter_recognition_p | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_q | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_r | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_s | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_t | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_u | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_v | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_w | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_x | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_y | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_recognition_z | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_number_recognition_0 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_1 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_2 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_3 | OK | OK | identification | default | - | OK | - |

#### Day 3 (wb1_l1_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_number_recognition_4 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_5 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_6 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_7 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_8 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_9 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_10 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_11 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_12 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_13 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_14 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_15 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_16 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_17 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_18 | OK | OK | identification | default | - | OK | - |

#### Day 4 (wb1_l1_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_number_recognition_19 | OK | OK | identification | default | - | OK | - |
| wb1_l1_number_recognition_20 | OK | OK | identification | default | - | OK | - |
| wb1_l1_letter_yes_no_a | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_b | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_c | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_d | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_e | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_f | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_g | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_h | OK | OK | multiple-choice | default | - | OK | - |

#### Day 5 (wb1_l1_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_letter_yes_no_i | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_j | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_k | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_l | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_m | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_n | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_o | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_p | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_q | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_r | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_s | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_t | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_u | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_v | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_w | OK | OK | multiple-choice | default | - | OK | - |

#### Day 6 (wb1_l1_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_letter_yes_no_x | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_y | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_letter_yes_no_z | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_number_yes_no_14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l1_number_write_7 | OK | OK | writing | default | - | OK | - |
| wb1_l1_number_write_16 | OK | OK | writing | default | - | OK | - |
| wb1_l1_shadow_letters | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_shadow_numbers | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_shadow_number_20 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_speak_number_12 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

#### Day 7 (wb1_l1_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l1_final_listen_write_letter_a | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_letter_e | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_letter_h | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_letter_z | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_number_0 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_number_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_number_14 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_listen_write_number_20 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l1_final_shadow_letter_a | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_shadow_letter_z | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_shadow_number_0 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_shadow_number_20 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_shadow_letters | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_shadow_numbers | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l1_final_speak_identify_letter | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l1_final_speak_identify_number | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l1_final_speak_yes_letter | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l1_final_speak_no_letter | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l1_final_speak_plural_letters | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l1_final_speak_plural_numbers | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

### Lesson 2: A Day in Nature

#### Day 1 (wb1_l2_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d1_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d1_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d1_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d1_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d1_e15 | OK | OK | identification | default | - | OK | - |

#### Day 2 (wb1_l2_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d2_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l2_d2_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l2_d2_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d2_e15 | OK | OK | identification | default | - | OK | - |

#### Day 3 (wb1_l2_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d3_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d3_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d3_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d3_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d3_e10 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d3_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d3_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d3_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d3_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d3_e15 | OK | OK | identification | default | - | OK | - |

#### Day 4 (wb1_l2_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d4_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d4_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d4_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 5 (wb1_l2_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d5_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e10 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d5_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d5_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d5_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d5_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d5_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 6 (wb1_l2_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_d6_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l2_d6_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d6_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l2_d6_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d6_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l2_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l2_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l2_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l2_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l2_final_v2_speak_1 | EDITORIAL + TECHNICAL | INVALID | speaking | speaking | MISSING_CONTEXT | STILL_INVALID | Add effective visual/audio/text context. |
| wb1_l2_final_v2_speak_2 | REVIEW | OK | multiple-choice | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l2_final_v2_speak_3 | REVIEW | OK | speaking | shadowing | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l2_final_v2_speak_4 | REVIEW | OK | multiple-choice | listening | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l2_final_v2_speak_5 | EDITORIAL + TECHNICAL | INVALID | speaking | speaking | TYPE_MODE_MISMATCH, PROMPT_ANSWER_MISMATCH | STILL_INVALID | Rebuild with modality matching the instruction. Align prompt, language and expected answer. |
| wb1_l2_final_v2_speak_6 | EDITORIAL | INVALID | speaking | speaking | PROMPT_ANSWER_MISMATCH | STILL_INVALID | Align prompt, language and expected answer. |

### Lesson 3: Daily Routines and Activities

#### Day 1 (wb1_l3_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d1_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d1_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d1_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d1_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d1_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d1_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 2 (wb1_l3_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d2_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d2_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d2_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 3 (wb1_l3_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d3_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d3_e15 | OK | OK | identification | default | - | OK | - |

#### Day 4 (wb1_l3_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d4_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d4_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 5 (wb1_l3_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d5_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d5_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d5_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l3_d5_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l3_d5_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l3_d5_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d5_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 6 (wb1_l3_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_d6_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l3_d6_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 7 (wb1_l3_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l3_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_3 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l3_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l3_final_v2_listen_write_8 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l3_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l3_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l3_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l3_final_v2_speak_3 | EDITORIAL | INVALID | speaking | speaking | DISPLAY_REVEALS_ANSWER | STILL_INVALID | Remove answer leakage while preserving context. |
| wb1_l3_final_v2_speak_4 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l3_final_v2_speak_5 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l3_final_v2_speak_6 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

### Lesson 4: Ordinal Numbers and Sequence

#### Day 1 (wb1_l4_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d1_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l4_d1_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l4_d1_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d1_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d1_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 2 (wb1_l4_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d2_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d2_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l4_d2_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l4_d2_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l4_d2_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d2_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d2_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 3 (wb1_l4_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d3_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d3_e11 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d3_e12 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d3_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l4_d3_e15 | OK | OK | identification | default | - | OK | - |

#### Day 4 (wb1_l4_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d4_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d4_e10 | EDITORIAL | INVALID | multiple-choice | default | DUPLICATE_ACCEPTED | STILL_INVALID | Deduplicate after current validator normalization. |

#### Day 5 (wb1_l4_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d5_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e10 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e11 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e12 | OK | OK | speaking | default | - | OK | - |
| wb1_l4_d5_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d5_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d5_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 6 (wb1_l4_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_d6_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l4_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l4_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l4_final_v2_listen_write_1 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l4_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_listen_write_4 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l4_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l4_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l4_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l4_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l4_final_v2_speak_3 | EDITORIAL | INVALID | speaking | speaking | VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED | STILL_INVALID | Hide the audio question unless visual context is required. Deduplicate after current validator normalization. |
| wb1_l4_final_v2_speak_4 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l4_final_v2_speak_5 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l4_final_v2_speak_6 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

### Lesson 5: Personal Information and To Be

#### Day 1 (wb1_l5_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d1_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d1_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d1_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d1_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d1_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 2 (wb1_l5_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d2_e1 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e2 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e3 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e4 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e5 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e6 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e7 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e8 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e9 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e10 | OK | INVALID | multiple-choice | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l5_d2_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d2_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d2_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d2_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d2_e15 | OK | OK | writing | default | - | OK | - |

#### Day 3 (wb1_l5_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d3_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d3_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d3_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d3_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l5_d3_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d3_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l5_d3_e12 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d3_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d3_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l5_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d4_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d4_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d4_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d4_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d4_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d4_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d4_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 5 (wb1_l5_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d5_e1 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e2 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e3 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e7 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e8 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e9 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e10 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_d5_e11 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e12 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l5_d5_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d5_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 6 (wb1_l5_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_d6_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l5_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l5_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l5_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l5_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l5_final_v2_speak_1 | REVIEW | INVALID | speaking | speaking | OPEN_RESPONSE_TOO_NARROW | STILL_INVALID | Use natural complete-answer variants or a personal template. |
| wb1_l5_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l5_final_v2_speak_3 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_final_v2_speak_4 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_final_v2_speak_5 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l5_final_v2_speak_6 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

### Lesson 6: Greetings

#### Day 1 (wb1_l6_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d1_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d1_e8 | EDITORIAL | INVALID | multiple-choice | default | INVALID_OPTIONS, AUDIO_GIVES_ANSWER | STILL_INVALID | Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l6_d1_e9 | EDITORIAL | INVALID | multiple-choice | default | INVALID_OPTIONS, AUDIO_GIVES_ANSWER | STILL_INVALID | Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l6_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d1_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d1_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d1_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d1_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 2 (wb1_l6_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d2_e1 | EDITORIAL | INVALID | multiple-choice | default | INVALID_OPTIONS, AUDIO_GIVES_ANSWER | STILL_INVALID | Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l6_d2_e2 | EDITORIAL | INVALID | multiple-choice | default | INVALID_OPTIONS, AUDIO_GIVES_ANSWER | STILL_INVALID | Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l6_d2_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d2_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d2_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d2_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d2_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d2_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d2_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d2_e15 | OK | OK | identification | default | - | OK | - |

#### Day 3 (wb1_l6_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d3_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d3_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d3_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d3_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d3_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l6_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d4_e1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l6_d4_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d4_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d4_e4 | EDITORIAL | INVALID | writing | default | AUDIO_GIVES_ANSWER | STILL_INVALID | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l6_d4_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d4_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d4_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d4_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d4_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 5 (wb1_l6_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d5_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d5_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d5_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l6_d5_e4 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l6_d5_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d5_e6 | EDITORIAL | OK | writing | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l6_d5_e7 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l6_d5_e8 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l6_d5_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d5_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d5_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d5_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l6_d5_e13 | EDITORIAL | OK | writing | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l6_d5_e14 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l6_d5_e15 | EDITORIAL | INVALID | multiple-choice | default | INVALID_OPTIONS, AUDIO_GIVES_ANSWER | STILL_INVALID | Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening. |

#### Day 6 (wb1_l6_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_d6_e1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l6_d6_e2 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l6_d6_e3 | EDITORIAL | OK | writing | write-question | - | FIXED_BY_OVERRIDE | No content change needed; keep regression coverage. |
| wb1_l6_d6_e4 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l6_d6_e5 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l6_d6_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l6_d6_e7 | OK | INVALID | speaking | default | TYPE_MODE_MISMATCH | NEWLY_FOUND | Rebuild with modality matching the instruction. |
| wb1_l6_d6_e8 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l6_d6_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l6_d6_e10 | OK | OK | identification | default | - | OK | - |

#### Day 7 (wb1_l6_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l6_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l6_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l6_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l6_final_v2_listen_write_4 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l6_final_v2_listen_write_5 | EDITORIAL | INVALID | writing | listening-writing | DUPLICATE_ACCEPTED | STILL_INVALID | Deduplicate after current validator normalization. |
| wb1_l6_final_v2_listen_write_6 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY, LONG_DICTATION | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units. |
| wb1_l6_final_v2_listen_write_7 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l6_final_v2_listen_write_8 | OK | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | NEWLY_FOUND | Accept audibly indistinguishable spellings or provide context. |
| wb1_l6_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l6_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l6_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l6_final_v2_shadow_4 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l6_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l6_final_v2_shadow_6 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l6_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l6_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l6_final_v2_speak_3 | EDITORIAL | INVALID | speaking | speaking | MISSING_CONTEXT | STILL_INVALID | Add effective visual/audio/text context. |
| wb1_l6_final_v2_speak_4 | EDITORIAL | INVALID | speaking | speaking | VISIBLE_LISTENING_PROMPT | STILL_INVALID | Hide the audio question unless visual context is required. |
| wb1_l6_final_v2_speak_5 | EDITORIAL | INVALID | speaking | speaking | VISIBLE_LISTENING_PROMPT | STILL_INVALID | Hide the audio question unless visual context is required. |
| wb1_l6_final_v2_speak_6 | EDITORIAL | INVALID | speaking | speaking | VISIBLE_LISTENING_PROMPT | STILL_INVALID | Hide the audio question unless visual context is required. |

### Lesson 7: Days, Months, and Dates

#### Day 1 (wb1_l7_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d1_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d1_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d1_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d1_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d1_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d1_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d1_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d1_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 2 (wb1_l7_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d2_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d2_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d2_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d2_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d2_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d2_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d2_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d2_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d2_e15 | OK | OK | identification | default | - | OK | - |

#### Day 3 (wb1_l7_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d3_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d3_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d3_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d3_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d3_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d3_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d3_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l7_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d4_e1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l7_d4_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d4_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d4_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d4_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d4_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d4_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d4_e8 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d4_e9 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d4_e10 | OK | OK | speaking | speaking | - | OK | - |

#### Day 5 (wb1_l7_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d5_e1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d5_e2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d5_e3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d5_e4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_d5_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d5_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d5_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l7_d5_e8 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l7_d5_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d5_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d5_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l7_d5_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d5_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l7_d5_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d5_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 6 (wb1_l7_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_d6_e1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l7_d6_e2 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e3 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e4 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e5 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e6 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l7_d6_e8 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l7_d6_e9 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |
| wb1_l7_d6_e10 | EDITORIAL | INVALID | writing | write-question | AMBIGUOUS_WRITE_QUESTION | STILL_INVALID | Provide a determinate translated question or context. |

#### Day 7 (wb1_l7_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l7_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_6 | EDITORIAL | INVALID | writing | listening-writing | DUPLICATE_ACCEPTED | STILL_INVALID | Deduplicate after current validator normalization. |
| wb1_l7_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l7_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l7_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_final_v2_speak_2 | EDITORIAL | INVALID | speaking | speaking | VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED | STILL_INVALID | Hide the audio question unless visual context is required. Deduplicate after current validator normalization. |
| wb1_l7_final_v2_speak_3 | EDITORIAL | INVALID | speaking | speaking | DUPLICATE_ACCEPTED | STILL_INVALID | Deduplicate after current validator normalization. |
| wb1_l7_final_v2_speak_4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_final_v2_speak_5 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l7_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

### Lesson 8: Spoken Patterns

#### Day 1 (wb1_l8_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l8_d1_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d1_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d1_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d1_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d1_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d1_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d1_e14 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d1_e15 | REVIEW | OK | speaking | shadowing | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

#### Day 2 (wb1_l8_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d2_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d2_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d2_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d2_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d2_e14 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d2_e15 | OK | OK | speaking | shadowing | - | OK | - |

#### Day 3 (wb1_l8_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d3_e8 | EDITORIAL | INVALID | writing | default | AUDIO_GIVES_ANSWER | STILL_INVALID | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l8_d3_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d3_e10 | EDITORIAL | INVALID | writing | default | AUDIO_GIVES_ANSWER | STILL_INVALID | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l8_d3_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d3_e12 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l8_d3_e13 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l8_d3_e14 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l8_d3_e15 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |

#### Day 4 (wb1_l8_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d4_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d4_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d4_e9 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d4_e10 | OK | OK | speaking | shadowing | - | OK | - |

#### Day 5 (wb1_l8_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d5_e1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l8_d5_e2 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l8_d5_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d5_e11 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d5_e12 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d5_e13 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d5_e14 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d5_e15 | OK | OK | speaking | shadowing | - | OK | - |

#### Day 6 (wb1_l8_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_d6_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l8_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e7 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l8_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l8_d6_e9 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_d6_e10 | OK | OK | speaking | shadowing | - | OK | - |

#### Day 7 (wb1_l8_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l8_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_listen_write_3 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l8_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_listen_write_7 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY, LONG_DICTATION | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units. |
| wb1_l8_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l8_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l8_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l8_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l8_final_v2_speak_3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l8_final_v2_speak_4 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l8_final_v2_speak_5 | EDITORIAL | OK | speaking | speaking | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l8_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

### Lesson 9: Practical Speaking

#### Day 1 (wb1_l9_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l9_d1_e15 | OK | OK | identification | default | - | OK | - |

#### Day 2 (wb1_l9_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d2_e1 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e2 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e3 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e4 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e8 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l9_d2_e9 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l9_d2_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e11 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l9_d2_e12 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l9_d2_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d2_e15 | OK | OK | writing | default | - | OK | - |

#### Day 3 (wb1_l9_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l9_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d4_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l9_d4_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l9_d4_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l9_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d4_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d4_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l9_d4_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d4_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 5 (wb1_l9_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d5_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e2 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e3 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e4 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e5 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e6 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e7 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e8 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e9 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e10 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e11 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e12 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e13 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e14 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d5_e15 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

#### Day 6 (wb1_l9_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_d6_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l9_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l9_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l9_final_v2_listen_write_1 | OK | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | NEWLY_FOUND | Accept audibly indistinguishable spellings or provide context. |
| wb1_l9_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l9_final_v2_listen_write_3 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l9_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l9_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l9_final_v2_listen_write_6 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l9_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l9_final_v2_listen_write_8 | OK | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | NEWLY_FOUND | Accept audibly indistinguishable spellings or provide context. |
| wb1_l9_final_v2_shadow_1 | REVIEW | OK | speaking | shadowing | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l9_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l9_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l9_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l9_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l9_final_v2_shadow_6 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l9_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l9_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l9_final_v2_speak_3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l9_final_v2_speak_4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l9_final_v2_speak_5 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l9_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

### Lesson 10: Months & Seasons

#### Day 1 (wb1_l10_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l10_d1_e15 | OK | OK | identification | default | - | OK | - |

#### Day 2 (wb1_l10_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d2_e1 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e2 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e3 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e4 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e5 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e6 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e7 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e8 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e9 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e10 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e11 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e12 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e13 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e14 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |
| wb1_l10_d2_e15 | OK | INVALID | writing | default | AUDIO_GIVES_ANSWER | NEWLY_FOUND | Remove answer-bearing audio or explicitly redesign as listening. |

#### Day 3 (wb1_l10_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l10_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d4_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l10_d4_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l10_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d4_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l10_d4_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l10_d4_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l10_d4_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 5 (wb1_l10_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d5_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e2 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e3 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e4 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e5 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e6 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e7 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e8 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e9 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e10 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e11 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e12 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e13 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e14 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d5_e15 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

#### Day 6 (wb1_l10_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_d6_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l10_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l10_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l10_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_5 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l10_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l10_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l10_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l10_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l10_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l10_final_v2_shadow_6 | REVIEW | OK | speaking | shadowing | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l10_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l10_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l10_final_v2_speak_3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l10_final_v2_speak_4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l10_final_v2_speak_5 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l10_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

### Lesson 11: Asking Questions

#### Day 1 (wb1_l11_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l11_d1_e15 | OK | OK | identification | default | - | OK | - |

#### Day 2 (wb1_l11_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d2_e1 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e2 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e3 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e4 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d2_e15 | OK | OK | writing | default | - | OK | - |

#### Day 3 (wb1_l11_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l11_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d4_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l11_d4_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l11_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d4_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l11_d4_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 5 (wb1_l11_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d5_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e2 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e3 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e4 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e5 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e6 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e7 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e8 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e9 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e10 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e11 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e12 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e13 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e14 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d5_e15 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |

#### Day 6 (wb1_l11_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_d6_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l11_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l11_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l11_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l11_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_listen_write_5 | OK | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY, LONG_DICTATION | NEWLY_FOUND | Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units. |
| wb1_l11_final_v2_listen_write_6 | OK | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | NEWLY_FOUND | Accept audibly indistinguishable spellings or provide context. |
| wb1_l11_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l11_final_v2_shadow_1 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l11_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l11_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l11_final_v2_shadow_4 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l11_final_v2_shadow_5 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l11_final_v2_shadow_6 | REVIEW | NEEDS_HUMAN_REVIEW | speaking | shadowing | - | NEEDS_HUMAN_REVIEW | Run an A1 one-recording test and make the editorial decision explicit. |
| wb1_l11_final_v2_speak_1 | REVIEW | INVALID | speaking | speaking | OPEN_RESPONSE_TOO_NARROW | STILL_INVALID | Use natural complete-answer variants or a personal template. |
| wb1_l11_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l11_final_v2_speak_3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l11_final_v2_speak_4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l11_final_v2_speak_5 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l11_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

### Lesson 12: Past Tense Regular Verbs

#### Day 1 (wb1_l12_d1)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d1_e1 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e2 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e3 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e4 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e5 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e6 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e7 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e8 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e9 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e10 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e11 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e12 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e13 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e14 | OK | OK | identification | default | - | OK | - |
| wb1_l12_d1_e15 | OK | OK | identification | default | - | OK | - |

#### Day 2 (wb1_l12_d2)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d2_e1 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e2 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e3 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e4 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e5 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e6 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e7 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e10 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e11 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e12 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e13 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e14 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d2_e15 | OK | OK | writing | default | - | OK | - |

#### Day 3 (wb1_l12_d3)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d3_e1 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e10 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e11 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e12 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e13 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e14 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d3_e15 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 4 (wb1_l12_d4)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d4_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d4_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d4_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d4_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d4_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d4_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d4_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d4_e8 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d4_e9 | OK | OK | writing | default | - | OK | - |
| wb1_l12_d4_e10 | OK | OK | speaking | default | - | OK | - |

#### Day 5 (wb1_l12_d5)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d5_e1 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e2 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e3 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e4 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e5 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e6 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e7 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e8 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e9 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e10 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e11 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e12 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e13 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e14 | OK | OK | speaking | default | - | OK | - |
| wb1_l12_d5_e15 | OK | OK | speaking | default | - | OK | - |

#### Day 6 (wb1_l12_d6)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_d6_e1 | EDITORIAL | OK | speaking | default | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l12_d6_e2 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e3 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e4 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e5 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e6 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e7 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e8 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e9 | OK | OK | multiple-choice | default | - | OK | - |
| wb1_l12_d6_e10 | OK | OK | multiple-choice | default | - | OK | - |

#### Day 7 (wb1_l12_d7)

| ID | Previous | New | Type | Mode | Problem | Classification | Proposed correction |
|---|---|---|---|---|---|---|---|
| wb1_l12_final_v2_listen_write_1 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_2 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_3 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_4 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_5 | REVIEW | INVALID | writing | listening-writing | DICTATION_ORTHOGRAPHY | STILL_INVALID | Accept audibly indistinguishable spellings or provide context. |
| wb1_l12_final_v2_listen_write_6 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_7 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_listen_write_8 | OK | OK | writing | listening-writing | - | OK | - |
| wb1_l12_final_v2_shadow_1 | EDITORIAL | INVALID | speaking | shadowing | LONG_SHADOWING | STILL_INVALID | Split into coherent one-recording units. |
| wb1_l12_final_v2_shadow_2 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l12_final_v2_shadow_3 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l12_final_v2_shadow_4 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l12_final_v2_shadow_5 | OK | OK | speaking | shadowing | - | OK | - |
| wb1_l12_final_v2_shadow_6 | REVIEW | OK | speaking | shadowing | - | FALSE_POSITIVE | Do not modify based on V1 diagnosis. |
| wb1_l12_final_v2_speak_1 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l12_final_v2_speak_2 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l12_final_v2_speak_3 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l12_final_v2_speak_4 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l12_final_v2_speak_5 | OK | OK | speaking | speaking | - | OK | - |
| wb1_l12_final_v2_speak_6 | OK | OK | speaking | speaking | - | OK | - |

+## Lista final para correção em lote

Total: **94 exercícios confirmados como inválidos**. IDs agrupados por lição/dia; as categorias podem se sobrepor.

### Lesson 2 — Day 7

- `wb1_l2_final_v2_speak_1` — MISSING_CONTEXT; Add effective visual/audio/text context.
- `wb1_l2_final_v2_speak_5` — TYPE_MODE_MISMATCH, PROMPT_ANSWER_MISMATCH; Rebuild with modality matching the instruction. Align prompt, language and expected answer.
- `wb1_l2_final_v2_speak_6` — PROMPT_ANSWER_MISMATCH; Align prompt, language and expected answer.

### Lesson 3 — Day 7

- `wb1_l3_final_v2_listen_write_3` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l3_final_v2_listen_write_8` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l3_final_v2_speak_3` — DISPLAY_REVEALS_ANSWER; Remove answer leakage while preserving context.

### Lesson 4 — Day 4

- `wb1_l4_d4_e10` — DUPLICATE_ACCEPTED; Deduplicate after current validator normalization.

### Lesson 4 — Day 7

- `wb1_l4_final_v2_listen_write_1` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l4_final_v2_listen_write_4` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l4_final_v2_speak_3` — VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED; Hide the audio question unless visual context is required. Deduplicate after current validator normalization.

### Lesson 5 — Day 2

- `wb1_l5_d2_e1` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e2` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e3` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e4` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e5` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e6` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e7` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e8` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e9` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l5_d2_e10` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 5 — Day 7

- `wb1_l5_final_v2_speak_1` — OPEN_RESPONSE_TOO_NARROW; Use natural complete-answer variants or a personal template.

### Lesson 6 — Day 1

- `wb1_l6_d1_e8` — INVALID_OPTIONS, AUDIO_GIVES_ANSWER; Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l6_d1_e9` — INVALID_OPTIONS, AUDIO_GIVES_ANSWER; Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 6 — Day 2

- `wb1_l6_d2_e1` — INVALID_OPTIONS, AUDIO_GIVES_ANSWER; Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l6_d2_e2` — INVALID_OPTIONS, AUDIO_GIVES_ANSWER; Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 6 — Day 4

- `wb1_l6_d4_e1` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l6_d4_e4` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 6 — Day 5

- `wb1_l6_d5_e8` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l6_d5_e15` — INVALID_OPTIONS, AUDIO_GIVES_ANSWER; Use options that fill the blank literally. Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 6 — Day 6

- `wb1_l6_d6_e1` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l6_d6_e2` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l6_d6_e4` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l6_d6_e5` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l6_d6_e7` — TYPE_MODE_MISMATCH; Rebuild with modality matching the instruction.
- `wb1_l6_d6_e8` — LONG_SHADOWING; Split into coherent one-recording units.

### Lesson 6 — Day 7

- `wb1_l6_final_v2_listen_write_4` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l6_final_v2_listen_write_5` — DUPLICATE_ACCEPTED; Deduplicate after current validator normalization.
- `wb1_l6_final_v2_listen_write_6` — DICTATION_ORTHOGRAPHY, LONG_DICTATION; Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.
- `wb1_l6_final_v2_listen_write_7` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l6_final_v2_listen_write_8` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l6_final_v2_speak_3` — MISSING_CONTEXT; Add effective visual/audio/text context.
- `wb1_l6_final_v2_speak_4` — VISIBLE_LISTENING_PROMPT; Hide the audio question unless visual context is required.
- `wb1_l6_final_v2_speak_5` — VISIBLE_LISTENING_PROMPT; Hide the audio question unless visual context is required.
- `wb1_l6_final_v2_speak_6` — VISIBLE_LISTENING_PROMPT; Hide the audio question unless visual context is required.

### Lesson 7 — Day 4

- `wb1_l7_d4_e1` — LONG_SHADOWING; Split into coherent one-recording units.

### Lesson 7 — Day 5

- `wb1_l7_d5_e8` — LONG_SHADOWING; Split into coherent one-recording units.

### Lesson 7 — Day 6

- `wb1_l7_d6_e1` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l7_d6_e2` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e3` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e4` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e5` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e6` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e8` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l7_d6_e9` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.
- `wb1_l7_d6_e10` — AMBIGUOUS_WRITE_QUESTION; Provide a determinate translated question or context.

### Lesson 7 — Day 7

- `wb1_l7_final_v2_listen_write_6` — DUPLICATE_ACCEPTED; Deduplicate after current validator normalization.
- `wb1_l7_final_v2_speak_2` — VISIBLE_LISTENING_PROMPT, DUPLICATE_ACCEPTED; Hide the audio question unless visual context is required. Deduplicate after current validator normalization.
- `wb1_l7_final_v2_speak_3` — DUPLICATE_ACCEPTED; Deduplicate after current validator normalization.

### Lesson 8 — Day 3

- `wb1_l8_d3_e8` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l8_d3_e10` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 8 — Day 5

- `wb1_l8_d5_e1` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l8_d5_e2` — LONG_SHADOWING; Split into coherent one-recording units.

### Lesson 8 — Day 6

- `wb1_l8_d6_e7` — LONG_SHADOWING; Split into coherent one-recording units.

### Lesson 8 — Day 7

- `wb1_l8_final_v2_listen_write_3` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l8_final_v2_listen_write_7` — DICTATION_ORTHOGRAPHY, LONG_DICTATION; Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.

### Lesson 9 — Day 2

- `wb1_l9_d2_e8` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l9_d2_e9` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l9_d2_e11` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l9_d2_e12` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 9 — Day 7

- `wb1_l9_final_v2_listen_write_1` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l9_final_v2_listen_write_3` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l9_final_v2_listen_write_6` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l9_final_v2_listen_write_8` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.

### Lesson 10 — Day 2

- `wb1_l10_d2_e1` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e2` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e3` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e4` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e5` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e6` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e7` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e8` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e9` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e10` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e11` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e12` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e13` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e14` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.
- `wb1_l10_d2_e15` — AUDIO_GIVES_ANSWER; Remove answer-bearing audio or explicitly redesign as listening.

### Lesson 11 — Day 7

- `wb1_l11_final_v2_listen_write_5` — DICTATION_ORTHOGRAPHY, LONG_DICTATION; Accept audibly indistinguishable spellings or provide context. Split the passage/dialogue into short dictation units.
- `wb1_l11_final_v2_listen_write_6` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l11_final_v2_shadow_4` — LONG_SHADOWING; Split into coherent one-recording units.
- `wb1_l11_final_v2_speak_1` — OPEN_RESPONSE_TOO_NARROW; Use natural complete-answer variants or a personal template.

### Lesson 12 — Day 7

- `wb1_l12_final_v2_listen_write_5` — DICTATION_ORTHOGRAPHY; Accept audibly indistinguishable spellings or provide context.
- `wb1_l12_final_v2_shadow_1` — LONG_SHADOWING; Split into coherent one-recording units.

## Lista de falsos positivos da V1

Total: **87 exercícios** que a V1 havia sinalizado, mas que a V2 classificou como coerentes no estado efetivo atual.

### Lesson 1 — Day 6

- `wb1_l1_speak_number_12`

### Lesson 1 — Day 7

- `wb1_l1_final_speak_identify_letter`
- `wb1_l1_final_speak_identify_number`
- `wb1_l1_final_speak_yes_letter`
- `wb1_l1_final_speak_no_letter`
- `wb1_l1_final_speak_plural_letters`
- `wb1_l1_final_speak_plural_numbers`

### Lesson 2 — Day 7

- `wb1_l2_final_v2_speak_2`
- `wb1_l2_final_v2_speak_3`
- `wb1_l2_final_v2_speak_4`

### Lesson 3 — Day 7

- `wb1_l3_final_v2_speak_4`
- `wb1_l3_final_v2_speak_5`
- `wb1_l3_final_v2_speak_6`

### Lesson 4 — Day 7

- `wb1_l4_final_v2_speak_4`
- `wb1_l4_final_v2_speak_5`
- `wb1_l4_final_v2_speak_6`

### Lesson 5 — Day 5

- `wb1_l5_d5_e1`
- `wb1_l5_d5_e2`
- `wb1_l5_d5_e3`
- `wb1_l5_d5_e7`
- `wb1_l5_d5_e8`
- `wb1_l5_d5_e9`
- `wb1_l5_d5_e10`

### Lesson 5 — Day 7

- `wb1_l5_final_v2_speak_3`
- `wb1_l5_final_v2_speak_4`
- `wb1_l5_final_v2_speak_5`
- `wb1_l5_final_v2_speak_6`

### Lesson 6 — Day 5

- `wb1_l6_d5_e4`
- `wb1_l6_d5_e6`
- `wb1_l6_d5_e7`
- `wb1_l6_d5_e13`
- `wb1_l6_d5_e14`

### Lesson 8 — Day 1

- `wb1_l8_d1_e15`

### Lesson 8 — Day 7

- `wb1_l8_final_v2_speak_4`
- `wb1_l8_final_v2_speak_5`

### Lesson 9 — Day 5

- `wb1_l9_d5_e1`
- `wb1_l9_d5_e2`
- `wb1_l9_d5_e3`
- `wb1_l9_d5_e4`
- `wb1_l9_d5_e5`
- `wb1_l9_d5_e6`
- `wb1_l9_d5_e7`
- `wb1_l9_d5_e8`
- `wb1_l9_d5_e9`
- `wb1_l9_d5_e10`
- `wb1_l9_d5_e11`
- `wb1_l9_d5_e12`
- `wb1_l9_d5_e13`
- `wb1_l9_d5_e14`
- `wb1_l9_d5_e15`

### Lesson 9 — Day 6

- `wb1_l9_d6_e1`

### Lesson 9 — Day 7

- `wb1_l9_final_v2_shadow_1`

### Lesson 10 — Day 5

- `wb1_l10_d5_e1`
- `wb1_l10_d5_e2`
- `wb1_l10_d5_e3`
- `wb1_l10_d5_e4`
- `wb1_l10_d5_e5`
- `wb1_l10_d5_e6`
- `wb1_l10_d5_e7`
- `wb1_l10_d5_e8`
- `wb1_l10_d5_e9`
- `wb1_l10_d5_e10`
- `wb1_l10_d5_e11`
- `wb1_l10_d5_e12`
- `wb1_l10_d5_e13`
- `wb1_l10_d5_e14`
- `wb1_l10_d5_e15`

### Lesson 10 — Day 6

- `wb1_l10_d6_e1`

### Lesson 10 — Day 7

- `wb1_l10_final_v2_shadow_6`

### Lesson 11 — Day 5

- `wb1_l11_d5_e1`
- `wb1_l11_d5_e2`
- `wb1_l11_d5_e3`
- `wb1_l11_d5_e4`
- `wb1_l11_d5_e5`
- `wb1_l11_d5_e6`
- `wb1_l11_d5_e7`
- `wb1_l11_d5_e8`
- `wb1_l11_d5_e9`
- `wb1_l11_d5_e10`
- `wb1_l11_d5_e11`
- `wb1_l11_d5_e12`
- `wb1_l11_d5_e13`
- `wb1_l11_d5_e14`
- `wb1_l11_d5_e15`

### Lesson 11 — Day 6

- `wb1_l11_d6_e1`

### Lesson 12 — Day 6

- `wb1_l12_d6_e1`

### Lesson 12 — Day 7

- `wb1_l12_final_v2_shadow_6`

## Lista para teste manual final

Total: **102 exercícios** (94 inválidos e 8 dependentes de revisão humana).

Após eventual lote de correções, testar cada ID abaixo no exercício renderizado, cobrindo: carregamento, áudio, enunciado visível, opções, resposta correta, Enter/CHECK, feedback, avanço, replay e ausência de nova conclusão curricular indevida.

### Lesson 2 — Day 7

- `wb1_l2_final_v2_speak_1`
- `wb1_l2_final_v2_speak_5`
- `wb1_l2_final_v2_speak_6`

### Lesson 3 — Day 7

- `wb1_l3_final_v2_listen_write_3`
- `wb1_l3_final_v2_listen_write_8`
- `wb1_l3_final_v2_speak_3`

### Lesson 4 — Day 4

- `wb1_l4_d4_e10`

### Lesson 4 — Day 7

- `wb1_l4_final_v2_listen_write_1`
- `wb1_l4_final_v2_listen_write_4`
- `wb1_l4_final_v2_speak_3`

### Lesson 5 — Day 2

- `wb1_l5_d2_e1`
- `wb1_l5_d2_e2`
- `wb1_l5_d2_e3`
- `wb1_l5_d2_e4`
- `wb1_l5_d2_e5`
- `wb1_l5_d2_e6`
- `wb1_l5_d2_e7`
- `wb1_l5_d2_e8`
- `wb1_l5_d2_e9`
- `wb1_l5_d2_e10`

### Lesson 5 — Day 7

- `wb1_l5_final_v2_speak_1`

### Lesson 6 — Day 1

- `wb1_l6_d1_e8`
- `wb1_l6_d1_e9`

### Lesson 6 — Day 2

- `wb1_l6_d2_e1`
- `wb1_l6_d2_e2`

### Lesson 6 — Day 4

- `wb1_l6_d4_e1`
- `wb1_l6_d4_e4`

### Lesson 6 — Day 5

- `wb1_l6_d5_e8`
- `wb1_l6_d5_e15`

### Lesson 6 — Day 6

- `wb1_l6_d6_e1`
- `wb1_l6_d6_e2`
- `wb1_l6_d6_e4`
- `wb1_l6_d6_e5`
- `wb1_l6_d6_e7`
- `wb1_l6_d6_e8`

### Lesson 6 — Day 7

- `wb1_l6_final_v2_listen_write_4`
- `wb1_l6_final_v2_listen_write_5`
- `wb1_l6_final_v2_listen_write_6`
- `wb1_l6_final_v2_listen_write_7`
- `wb1_l6_final_v2_listen_write_8`
- `wb1_l6_final_v2_shadow_4`
- `wb1_l6_final_v2_shadow_6`
- `wb1_l6_final_v2_speak_3`
- `wb1_l6_final_v2_speak_4`
- `wb1_l6_final_v2_speak_5`
- `wb1_l6_final_v2_speak_6`

### Lesson 7 — Day 4

- `wb1_l7_d4_e1`

### Lesson 7 — Day 5

- `wb1_l7_d5_e8`

### Lesson 7 — Day 6

- `wb1_l7_d6_e1`
- `wb1_l7_d6_e2`
- `wb1_l7_d6_e3`
- `wb1_l7_d6_e4`
- `wb1_l7_d6_e5`
- `wb1_l7_d6_e6`
- `wb1_l7_d6_e8`
- `wb1_l7_d6_e9`
- `wb1_l7_d6_e10`

### Lesson 7 — Day 7

- `wb1_l7_final_v2_listen_write_6`
- `wb1_l7_final_v2_speak_2`
- `wb1_l7_final_v2_speak_3`

### Lesson 8 — Day 3

- `wb1_l8_d3_e8`
- `wb1_l8_d3_e10`
- `wb1_l8_d3_e12`
- `wb1_l8_d3_e13`
- `wb1_l8_d3_e14`
- `wb1_l8_d3_e15`

### Lesson 8 — Day 5

- `wb1_l8_d5_e1`
- `wb1_l8_d5_e2`

### Lesson 8 — Day 6

- `wb1_l8_d6_e7`

### Lesson 8 — Day 7

- `wb1_l8_final_v2_listen_write_3`
- `wb1_l8_final_v2_listen_write_7`

### Lesson 9 — Day 2

- `wb1_l9_d2_e8`
- `wb1_l9_d2_e9`
- `wb1_l9_d2_e11`
- `wb1_l9_d2_e12`

### Lesson 9 — Day 7

- `wb1_l9_final_v2_listen_write_1`
- `wb1_l9_final_v2_listen_write_3`
- `wb1_l9_final_v2_listen_write_6`
- `wb1_l9_final_v2_listen_write_8`

### Lesson 10 — Day 2

- `wb1_l10_d2_e1`
- `wb1_l10_d2_e2`
- `wb1_l10_d2_e3`
- `wb1_l10_d2_e4`
- `wb1_l10_d2_e5`
- `wb1_l10_d2_e6`
- `wb1_l10_d2_e7`
- `wb1_l10_d2_e8`
- `wb1_l10_d2_e9`
- `wb1_l10_d2_e10`
- `wb1_l10_d2_e11`
- `wb1_l10_d2_e12`
- `wb1_l10_d2_e13`
- `wb1_l10_d2_e14`
- `wb1_l10_d2_e15`

### Lesson 11 — Day 7

- `wb1_l11_final_v2_listen_write_5`
- `wb1_l11_final_v2_listen_write_6`
- `wb1_l11_final_v2_shadow_4`
- `wb1_l11_final_v2_shadow_5`
- `wb1_l11_final_v2_shadow_6`
- `wb1_l11_final_v2_speak_1`

### Lesson 12 — Day 7

- `wb1_l12_final_v2_listen_write_5`
- `wb1_l12_final_v2_shadow_1`

## Conclusão

- Exercícios auditados: **1.200**.
- Problemas confirmados: **94**.
- Falsos positivos da V1: **87**.
- Problemas novos (falsos negativos da V1): **35**.
- Revisão humana: **8**.
- Corrigido por override e atualmente OK: **1**.

Esta auditoria foi somente leitura. Nenhum exercício, override, sequência publicada, código ou dado remoto foi alterado.
