import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'embedding-001',
  apiKey: process.env.GEMINI_API_KEY,
});

export async function getVectorStore(collectionName = 'rag_files') {
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    collectionName,
    client: qdrantClient,
  });
}

export { qdrantClient };
