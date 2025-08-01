// tools/deleteRAGCollection.js
import { qdrantClient } from '../services/vectorStore.js';

async function run() {
  try {
    const result = await qdrantClient.deleteCollection('RAG_FILES');
    console.log('✅ Deleted RAG_FILES collection:', result);
  } catch (err) {
    console.error('❌ Failed to delete collection:', err.message || err);
  }
}

run();
