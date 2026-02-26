
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Evaluating performance and providing grammar feedback is a complex reasoning task; use gemini-3-pro-preview.
export async function evaluateResponse(
  questionContext: string,
  userResponse: string,
  category: 'WRITING' | 'SPEAKING' | 'READING'
): Promise<{ score: number; feedback: string }> {
  try {
    // Fix: Use process.env.API_KEY directly to initialize client.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fix: Call generateContent directly on ai.models with correct parameters.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
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
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Numeric score from 0 to 5" },
            feedback: { type: Type.STRING, description: "Detailed feedback in English" },
          },
          required: ["score", "feedback"],
          propertyOrdering: ["score", "feedback"],
        },
      },
    });

    // Fix: Use the response.text property directly to extract the string content.
    const result = JSON.parse(response.text || "{}");
    return {
      score: Math.min(5, Math.max(0, result.score || 0)),
      feedback: result.feedback || "Feedback currently unavailable."
    };
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      return { 
        score: 3, 
        feedback: "Note: AI limit reached. Your answer was saved, but detailed feedback is unavailable." 
      };
    }
    
    return { 
      score: 3, 
      feedback: "There was an error communicating with the AI. Your score was saved." 
    };
  }
}
