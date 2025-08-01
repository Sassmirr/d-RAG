// server/controllers/chatController.js

import mongoose from 'mongoose';
import ChatSession from '../models/ChatSession.js';
import { getGeminiResponse } from '../services/geminiService.js';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { qdrantClient } from '../services/vectorStore.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import UploadedFile from '../models/UploadedFile.js';


const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'embedding-001',
  apiKey: process.env.GEMINI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function formatGeminiText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(?<=\d)\. (?=[A-Z])/g, '.\n')
    .replace(/(?<=\n)(\d+)\. (?=[A-Z])/g, '$1. ')
    .replace(/\u2022\s*/g, '\n\u2022 ')
    .replace(/([a-z])(\d+\.)/g, '$1\n$2')
    .replace(/\n{2,}/g, '\n')
    .replace(/([^\n])(\d+\.)/g, '$1\n$2')
    .trim();
}

export async function getGeminiStreamResponse(prompt) {
  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  async function* streamChunks() {
    for await (const chunk of result.stream) {
      const part = chunk.text();
      if (part) yield part;
    }
  }

  return streamChunks();
}

export const createChatSession = async (req, res) => {
  try {
    const userId = req.user?.uid;
    let { title } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    if (!title || typeof title !== 'string' || !title.trim()) title = 'Untitled';

    const session = await ChatSession.create({
      userId,
      title: title.slice(0, 50),
      messages: [],
    });

    res.status(201).json({ sessionId: session._id.toString() });
  } catch (err) {
    console.error('❌ Failed to create session:', err);
    res.status(500).json({ error: 'Could not create session', details: err.message });
  }
};

export const streamChatResponse = async (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const { message, sessionId } = req.body;
  const userId = req.user?.uid;

  if (!message || !sessionId || !userId) {
    res.status(400).end('Invalid request');
    return;
  }

  try {
    const embedding = await embeddings.embedQuery(message);
    const searchResult = await qdrantClient.search('RAG_FILES', {
      vector: embedding,
      limit: 4,
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'sessionId', match: { value: sessionId } },
        ],
      },
      with_payload: true,
    });

    const contextChunks = searchResult.map(item => item.payload?.text).filter(Boolean);
    const chatSession = await ChatSession.findById(sessionId);
    const memory = chatSession.messages.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

    const prompt = `
You are a helpful assistant.
Here is the previous conversation:
${memory || 'No memory available.'}

Relevant context from uploaded documents:
${contextChunks.join('\n\n') || 'No context available.'}

User's question:
${message}

Instructions:
- Answer naturally and informatively.
- Use Markdown formatting.
- Do not repeat previous messages.
`;

    let fullAssistantResponse = '';
    const stream = await getGeminiStreamResponse(prompt);
    for await (const chunk of stream) {
      fullAssistantResponse += chunk;
      res.write(chunk);
    }
    res.end();

    await ChatSession.findByIdAndUpdate(sessionId, {
      $push: {
        messages: [
          { sender: 'user', text: message, timestamp: new Date() },
          { sender: 'bot', text: fullAssistantResponse, timestamp: new Date() },
        ],
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).end('Internal Server Error');
  }
};

export const handleChat = async (req, res) => {
  const { message, sessionId } = req.body;
  const userId = req.user?.uid || 'anonymous';

  if (!message?.trim()) return res.status(400).json({ response: 'Empty message' });

  try {
    let chatSession;
    if (!sessionId) {
      chatSession = await ChatSession.create({
        userId,
        title: message.slice(0, 30) + '...',
        messages: [],
      });
    } else {
      chatSession = await ChatSession.findOne({ _id: sessionId, userId });
      if (!chatSession) return res.status(404).json({ error: 'Chat session not found' });
    }

    const embedding = await embeddings.embedQuery(message);
    const searchResult = await qdrantClient.search('RAG_FILES', {
      vector: embedding,
      limit: 4,
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'sessionId', match: { value: chatSession._id.toString() } },
        ],
      },
      with_payload: true,
    });

    const context = searchResult.map(item => item.payload?.text).filter(Boolean).join('\n\n');
    const memory = chatSession.messages.slice(-6).map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');

    const prompt = `
You are a helpful AI assistant.
Refer to this previous chat history:
${memory || 'No memory available.'}

Use this document context:
${context || 'No context available.'}

User's question:
${message}

Instructions:
- Use memory and documents to answer.
- Format in Markdown.
- Be concise and contextual.
`;

    const geminiRaw = await getGeminiResponse(prompt);
    const formatted = formatGeminiText(geminiRaw);

    chatSession.messages.push({ sender: 'user', text: message });
    chatSession.messages.push({ sender: 'bot', text: formatted });
    await chatSession.save();

    res.json({ sessionId: chatSession._id.toString(), response: formatted });
  } catch (err) {
    console.error('❌ Failed to respond to message:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sessions = await ChatSession.find({ userId })
      .sort({ createdAt: -1 })
      .select('_id title createdAt');

    res.json({
      sessions: sessions.map(session => ({
        _id: session._id.toString(),
        title: session.title,
        createdAt: session.createdAt,
      }))
    });
  } catch (err) {
    console.error('❌ Failed to fetch chat history:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user?.uid;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ error: 'Invalid session ID.' });

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    res.status(200).json({ messages: session.messages });
  } catch (err) {
    console.error('❌ Failed to fetch session:', err);
    res.status(500).json({ error: 'Failed to fetch session messages' });
  }
};

// export const deleteChatSession = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user?.uid;

//     await qdrantClient.delete('RAG_FILES', {
//       filter: {
//         must: [
//           { key: 'userId', match: { value: userId } },
//           { key: 'sessionId', match: { value: id } },
//         ],
//       },
//     });

//     const result = await ChatSession.deleteOne({ _id: id, userId });
//     if (result.deletedCount === 0) return res.status(404).json({ error: 'Chat not found' });

//     res.status(200).json({ message: 'Chat deleted' });
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to delete chat' });
//   }
// };

export const deleteChatSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    // Delete Qdrant vectors
    await qdrantClient.delete('RAG_FILES', {
      filter: {
        must: [
          { key: 'userId', match: { value: userId } },
          { key: 'sessionId', match: { value: id } },
        ]
      }
    });

    // Delete uploaded file records from MongoDB
    await UploadedFile.deleteMany({ userId, sessionId: id });

    // Delete chat session
    const result = await ChatSession.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    res.status(200).json({ message: 'Chat and related files deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};