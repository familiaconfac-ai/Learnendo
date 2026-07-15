import assert from 'node:assert/strict';
import test from 'node:test';
import { isWritingPromptResponseCorrect, questionProductionFields } from './writingPrompt.ts';

test('question to answer accepts the authored natural responses', () => {
  const item = { promptMode: 'answer-question' as const, correctValue: "I'm fine.", acceptedAnswers: ["I'm fine, thank you.", 'I am fine.', 'I am fine, thank you.', 'Fine, thank you.'] };
  for (const answer of ["I'm fine.", "I'm fine, thank you.", 'I am fine.']) {
    assert.equal(isWritingPromptResponseCorrect(item, answer), true, answer);
  }
});

test('answer to question accepts only the corresponding question', () => {
  const item = { promptMode: 'write-question' as const, correctValue: 'How are you?' };
  assert.equal(isWritingPromptResponseCorrect(item, 'How are you?'), true);
  assert.equal(isWritingPromptResponseCorrect(item, 'how are you'), true);
  assert.equal(isWritingPromptResponseCorrect(item, "I'm fine, thank you."), false);
  assert.equal(isWritingPromptResponseCorrect(item, 'What are you?'), false);
  assert.equal(isWritingPromptResponseCorrect(item, 'Who are you?'), false);
});

for (const example of [
  { answer: 'My name is Lucas.', full: 'What is your name?', contracted: "What's your name?" },
  { answer: 'My first name is Lucas.', full: 'What is your first name?', contracted: "What's your first name?" },
  { answer: 'My last name is Silva.', full: 'What is your last name?', contracted: "What's your last name?" },
  { answer: 'I am twelve years old.', full: 'How old are you?', contracted: 'How old are you?' },
  { answer: 'I am from Brazil.', full: 'Where are you from?', contracted: 'Where are you from?' },
]) {
  test(`builds an explicit write-question prompt for ${example.answer}`, () => {
    const fields = questionProductionFields({ type: 'multiple-choice', audioValue: example.full, correctValue: example.answer, options: [example.answer, 'Other'] });
    assert.ok(fields);
    assert.equal(fields.promptMode, 'write-question');
    assert.equal(fields.instruction, 'Write the question.');
    assert.equal(fields.displayValue, `Answer: ${example.answer}`);
    assert.equal(isWritingPromptResponseCorrect(fields, example.full), true);
    assert.equal(isWritingPromptResponseCorrect(fields, example.contracted), true);
    assert.equal(isWritingPromptResponseCorrect(fields, example.answer), false);
  });
}

test('does not invert a bare yes/no answer without an explicit target question', () => {
  assert.equal(questionProductionFields({ type: 'writing', audioValue: 'Yes, I am.', correctValue: 'Yes, I am.' }), null);
});
