import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use 'gemini-2.0-flash' model from v1
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
//const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function getGeminiResponse(prompt) {
  try {
    console.log("Prompt sent to Gemini:", prompt);

    const result = await model.generateContent([prompt]);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message || error);
    return "I'm sorry, I couldn't generate a response.";
  }
}

/**
 * Multi-turn memory-enabled chat using Gemini 2.0 Flash
 * @param {Array<{ role: 'user' | 'model', parts: string }>} history - Previous chat messages
 * @param {string} currentMessage - The current user message (with context injected)
 */
export async function getGeminiChatResponse(sessionId, history, currentMessage) {
  try {
        let chat = chatInstances[sessionId];
    // const chat = model.startChat({
    //   history,
    //   generationConfig: {
    //     temperature: 0.7,
    //     maxOutputTokens: 2048,
    //   },
    // });
// First message for this session → build with history
    if (!chat) {
      chat = model.startChat({
        history, // structured [{ role, parts }]
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      });
      chatInstances[sessionId] = chat;
    }
    
    const result = await chat.sendMessage(currentMessage);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error('Gemini Chat API error:', error.response?.data || error.message || error);
    return "I'm sorry, I couldn't generate a response.";
  }
}
