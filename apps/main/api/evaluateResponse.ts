import { GoogleGenAI, Type } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequestLike = IncomingMessage & {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => VercelResponseLike;
  json?: (body: unknown) => void;
};

interface EvaluateResponseBody {
  questionContext?: string;
  userResponse?: string;
  category?: 'WRITING' | 'SPEAKING' | 'READING';
}

function sendJson(res: VercelResponseLike, statusCode: number, body: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(body);
    return;
  }

  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<EvaluateResponseBody> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) return {};

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody) as EvaluateResponseBody;
  } catch {
    throw new Error('Request body was not valid JSON.');
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    sendJson(res, 500, { error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  try {
    const rawBody = typeof req.body === 'object' && req.body !== null
      ? (req.body as EvaluateResponseBody)
      : await readJsonBody(req);

    const questionContext = rawBody.questionContext?.trim() ?? '';
    const userResponse = rawBody.userResponse?.trim() ?? '';
    const category = rawBody.category;

    if (!questionContext || !userResponse || !category) {
      sendJson(res, 400, {
        error: 'questionContext, userResponse, and category are required.',
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Evaluate this English learner's ${category} performance.
      
Question Context: "${questionContext}"
Student's Response: "${userResponse}"
      
Instructions for evaluation:
1. Assign a score from 0 (blank/nonsense) to 5 (excellent proficiency).
2. Provide constructive feedback ONLY IN ENGLISH.
3. CRITICAL: For SPEAKING tasks, the input is a Speech-to-Text transcript. DO NOT penalize the student for lack of punctuation, capitalization, or minor phonetic misspellings (e.g., "gonna" vs "going to") unless it completely changes the meaning.
4. Focus on grammar, vocabulary usage, and sentence structure.
      
Format the feedback with clear sections like "Feedback" and "Grammar Correction".`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Numeric score from 0 to 5' },
            feedback: { type: Type.STRING, description: 'Detailed feedback in English' },
          },
          required: ['score', 'feedback'],
          propertyOrdering: ['score', 'feedback'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    sendJson(res, 200, {
      score: Math.min(5, Math.max(0, result.score || 0)),
      feedback: result.feedback || 'Feedback currently unavailable.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to evaluate response.';
    sendJson(res, 500, { error: message });
  }
}
