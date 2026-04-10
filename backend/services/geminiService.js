import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import '../loadEnv.js';

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY,
});

export async function getGeminiResponse(prompt) {
  try {
    console.log("Prompt sent to Gemini:", prompt);
    const response = await model.invoke([new HumanMessage(prompt)]);
    return response.content;
  } catch (error) {
    console.error('Gemini API error:', error.message || error);
    return "I'm sorry, I couldn't generate a response.";
  }
}

export async function getGeminiStreamResponse(prompt) {
  const stream = await model.stream([new HumanMessage(prompt)]);

  async function* streamChunks() {
    for await (const chunk of stream) {
      if (chunk.content) yield chunk.content;
    }
  }

  return streamChunks();
}

/**
 * Multi-turn memory-enabled chat using Gemini 2.0 Flash
 */
export async function getGeminiChatResponse(sessionId, history, currentMessage) {
  try {
    // History should be converted to LangChain messages if it's not already
    const messages = history.map(msg =>
      msg.role === 'user' ? new HumanMessage(msg.parts) : new AIMessage(msg.parts)
    );
    messages.push(new HumanMessage(currentMessage));

    const response = await model.invoke(messages);
    return response.content;
  } catch (error) {
    console.error('Gemini Chat API error:', error.message || error);
    return "I'm sorry, I couldn't generate a response.";
  }
}
