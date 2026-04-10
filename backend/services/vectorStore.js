import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import '../loadEnv.js';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const embeddings = new HuggingFaceInferenceEmbeddings({
  model: 'sentence-transformers/all-mpnet-base-v2',
  apiKey: process.env.HUGGINGFACEHUB_API_KEY,
});

export async function getVectorStore(collectionName = 'RAG_FILES') {
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    collectionName,
    client: qdrantClient,
  });
}

export { qdrantClient };
