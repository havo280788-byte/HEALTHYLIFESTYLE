import { GoogleGenAI, Type } from "@google/genai";
import { Question, QuestionType } from "../types";
import { FALLBACK_QUESTIONS } from "../constants";

export const generateQuestions = async (apiKey: string, modelId: string): Promise<Question[]> => {
  if (!apiKey) {
    console.warn("No API key provided, using fallback questions.");
    return FALLBACK_QUESTIONS;
  }

  const ai = new GoogleGenAI({ apiKey });

  // Schema for True/False questions
  const tfSchema = {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING },
      correctAnswerId: { type: Type.STRING, enum: ["true", "false"] },
      explanation: { type: Type.STRING }
    },
    required: ["content", "correctAnswerId", "explanation"]
  };

  // Schema for Multiple Choice questions
  const mcSchema = {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING }
          },
          required: ["id", "text"]
        }
      },
      correctAnswerId: { type: Type.STRING },
      explanation: { type: Type.STRING }
    },
    required: ["content", "options", "correctAnswerId", "explanation"]
  };

  const finalSchema = {
    type: Type.OBJECT,
    properties: {
      trueFalseQuestions: {
        type: Type.ARRAY,
        items: tfSchema
      },
      multipleChoiceQuestions: {
        type: Type.ARRAY,
        items: mcSchema
      }
    },
    required: ["trueFalseQuestions", "multipleChoiceQuestions"]
  };

  const prompt = `
    Generate a quiz about "Healthy Lifestyle" for 6th-grade students learning English.
    
    1. Provide 5 True/False questions.
    2. Provide 5 Multiple Choice questions (4 options each).
    
    The content should cover diet, exercise, sleep, and hygiene.
    Ensure the English is simple but educational.
    The output must strictly follow the JSON schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: finalSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const data = JSON.parse(text);

    // Map the raw data to our internal Question interface
    const tfQuestions: Question[] = data.trueFalseQuestions.map((q: any, index: number) => ({
      id: `ai-tf-${index}-${Date.now()}`,
      type: QuestionType.TRUE_FALSE,
      content: q.content,
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' }
      ],
      correctAnswerId: q.correctAnswerId,
      explanation: q.explanation
    }));

    const mcQuestions: Question[] = data.multipleChoiceQuestions.map((q: any, index: number) => ({
      id: `ai-mc-${index}-${Date.now()}`,
      type: QuestionType.MULTIPLE_CHOICE,
      content: q.content,
      options: q.options,
      correctAnswerId: q.correctAnswerId,
      explanation: q.explanation
    }));

    return [...tfQuestions, ...mcQuestions];

  } catch (error) {
    console.error("Gemini API Error:", error);
    // If rate limited or error, return fallback
    return FALLBACK_QUESTIONS;
  }
};
