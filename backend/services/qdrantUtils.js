// server/utils/qdrantUtils.js
import { qdrantClient } from '../services/vectorStore.js';

const COLLECTION_NAME = 'RAG_FILES';
const VECTOR_SIZE = 3072; // for Gemini embeddings

// ✅ Ensure Qdrant Collection and Indexes
export async function ensureQdrantIndexes() {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(c => c.name === COLLECTION_NAME);

    if (!exists) {
      console.log(`📁 Creating Qdrant collection: ${COLLECTION_NAME}`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        payload_schema: {
          userId: { type: 'keyword' },
    sessionId: { type: 'keyword' },
    fileName: { type: 'keyword' },
    uploadedAt: { type: 'keyword' },
        },
      });
    }

    // 🔍 Check for missing payload indexes
    const info = await qdrantClient.getCollection(COLLECTION_NAME);
    const existing = info.result?.payload_schema || {};
    const required = {
      fileName: 'keyword',
      userId: 'keyword',
      sessionId: 'keyword',
    };

    for (const [field, type] of Object.entries(required)) {
      if (!existing[field]) {
        console.log(`📌 Creating missing index '${field}' in ${COLLECTION_NAME}`);
        await qdrantClient.createPayloadIndex(COLLECTION_NAME, {
          field_name: field,
          field_schema: type,
        });
      }
    }

    console.log(`✅ Qdrant setup complete for '${COLLECTION_NAME}'`);
  } catch (err) {
    console.error('❌ Failed to ensure Qdrant indexes:', err?.message || err);
    throw err;
  }
}

// 🧹 Remove Vectors by FileName (Scoped to userId + fileName)
export async function removeVectorsByFileName(fileName, userId) {
  try {
    const response = await qdrantClient.delete(COLLECTION_NAME, {
      filter: {
        must: [
          { key: 'fileName', match: { value: fileName } },
          { key: 'userId', match: { value: userId } },
        ],
      },
    });

    console.log('🧹 Qdrant delete response:', response);
    return response.result?.operation_id ? 1 : 0;
  } catch (err) {
    console.error('❌ Qdrant deletion error:', err?.response || err);
    throw err;
  }
}
