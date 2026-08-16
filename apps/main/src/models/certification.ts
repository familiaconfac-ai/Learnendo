export const FINAL_CERTIFICATION_PASSING_SCORE = 70;
export const LEARNENDO_PROGRAM_EXERCISE_COUNT = 10_800;
export const CERTIFICATION_PERSISTENCE = {
  attemptsCollection: 'finalCertificationAttempts',
  certificatesCollection: 'studentCertificates',
} as const;

export type CertificationSkill = 'listening' | 'pronunciation' | 'grammar' | 'vocabulary' | 'reading' | 'speaking' | 'writing';

export interface FinalCertificationQuestionResult {
  questionId: string;
  correct: boolean;
  skill: CertificationSkill;
  workbookId?: number;
  lessonId: string;
  content: string;
  objective: string;
}

export interface CertificationRemediationRequirement {
  skill: CertificationSkill;
  lessonIds: string[];
  content: string[];
  objectives: string[];
  status: 'required' | 'completed';
}

export interface FinalCertificationAttempt {
  attemptId: string;
  studentId: string;
  score: number;
  status: 'passed' | 'not-passed';
  completedAt: string;
  passedAt?: string;
  questionResults: FinalCertificationQuestionResult[];
  remediation: CertificationRemediationRequirement[];
}

export interface LearnendoCertificateRecord {
  certificateId: string;
  studentId: string;
  studentDisplayName: string;
  programId: 'learnendo-english-program';
  certificationAttemptId: string;
  finalScore: number;
  passedAt: string;
  certificateDate: string;
  status: 'issued';
}

export interface CertificateEligibility {
  courseCompleted: boolean;
  passedAttempt?: FinalCertificationAttempt | null;
}

export function isEligibleForCertificate({ courseCompleted, passedAttempt }: CertificateEligibility): boolean {
  return courseCompleted
    && passedAttempt?.status === 'passed'
    && passedAttempt.score >= FINAL_CERTIFICATION_PASSING_SCORE;
}

export function canStartFinalCertificationTest(
  courseCompleted: boolean,
  attempts: FinalCertificationAttempt[],
): boolean {
  if (!courseCompleted || attempts.some((attempt) => attempt.status === 'passed')) return false;
  const latest = attempts.at(-1);
  return !latest || latest.remediation.every((requirement) => requirement.status === 'completed');
}

export function buildRemediation(results: FinalCertificationQuestionResult[]): CertificationRemediationRequirement[] {
  const incorrect = results.filter((result) => !result.correct);
  const bySkill = new Map<CertificationSkill, FinalCertificationQuestionResult[]>();
  for (const result of incorrect) bySkill.set(result.skill, [...(bySkill.get(result.skill) ?? []), result]);
  return [...bySkill.entries()].map(([skill, failures]) => ({
    skill,
    lessonIds: [...new Set(failures.map((failure) => failure.lessonId))],
    content: [...new Set(failures.map((failure) => failure.content))],
    objectives: [...new Set(failures.map((failure) => failure.objective))],
    status: 'required',
  }));
}

export function evaluateFinalCertificationAttempt(input: {
  attemptId: string;
  studentId: string;
  completedAt: string;
  questionResults: FinalCertificationQuestionResult[];
  previousAttempts?: FinalCertificationAttempt[];
}): FinalCertificationAttempt {
  if (input.previousAttempts?.some((attempt) => attempt.status === 'passed')) {
    throw new Error('Final Certification Test is locked after the first passing result.');
  }
  if (!input.questionResults.length) throw new Error('Certification requires scored questions.');
  const correct = input.questionResults.filter((result) => result.correct).length;
  const score = Math.round((correct / input.questionResults.length) * 100);
  const passed = score >= FINAL_CERTIFICATION_PASSING_SCORE;
  return {
    attemptId: input.attemptId,
    studentId: input.studentId,
    score,
    status: passed ? 'passed' : 'not-passed',
    completedAt: input.completedAt,
    passedAt: passed ? input.completedAt : undefined,
    questionResults: input.questionResults,
    remediation: passed ? [] : buildRemediation(input.questionResults),
  };
}

export function isValidCertificateStudentName(value: string | null | undefined): value is string {
  const name = value?.trim() ?? '';
  if (name.length < 2 || name.includes('@')) return false;
  return !/^(?:anonymous|user|player[_-]|teacher|professor|admin)/i.test(name);
}

export function issueCertificateRecord(input: {
  certificateId: string;
  studentId: string;
  studentDisplayName: string | null | undefined;
  courseCompleted: boolean;
  attempt: FinalCertificationAttempt;
}): LearnendoCertificateRecord {
  if (!isEligibleForCertificate({ courseCompleted: input.courseCompleted, passedAttempt: input.attempt })) {
    throw new Error('Certificate requirements have not been fulfilled.');
  }
  if (!isValidCertificateStudentName(input.studentDisplayName)) {
    throw new Error('A verified student display name is required.');
  }
  if (!/^LND-\d{4}-\d{6,}$/.test(input.certificateId)) throw new Error('Invalid certificate ID.');
  const passedAt = input.attempt.passedAt ?? input.attempt.completedAt;
  return {
    certificateId: input.certificateId,
    studentId: input.studentId,
    studentDisplayName: input.studentDisplayName.trim(),
    programId: 'learnendo-english-program',
    certificationAttemptId: input.attempt.attemptId,
    finalScore: input.attempt.score,
    passedAt,
    certificateDate: passedAt,
    status: 'issued',
  };
}

export function formatCertificateDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(value));
}
