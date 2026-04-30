
const EVALUATE_RESPONSE_ENDPOINT = '/api/evaluateResponse';

export async function evaluateResponse(
  questionContext: string,
  userResponse: string,
  category: 'WRITING' | 'SPEAKING' | 'READING'
): Promise<{ score: number; feedback: string }> {
  try {
    const response = await fetch(EVALUATE_RESPONSE_ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        questionContext,
        userResponse,
        category,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.error === 'string'
        ? payload.error
        : 'Failed to evaluate response.';
      throw new Error(message);
    }

    return {
      score: Math.min(5, Math.max(0, Number(payload?.score) || 0)),
      feedback: typeof payload?.feedback === 'string'
        ? payload.feedback
        : 'Feedback currently unavailable.',
    };
  } catch (error: any) {
    console.error('Evaluation Error:', error);
    
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      return { 
        score: 3, 
        feedback: 'Note: AI limit reached. Your answer was saved, but detailed feedback is unavailable.',
      };
    }
    
    return { 
      score: 3, 
      feedback: 'There was an error communicating with the AI. Your score was saved.',
    };
  }
}
