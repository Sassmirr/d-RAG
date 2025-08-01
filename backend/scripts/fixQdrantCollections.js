// scripts/fixQdrantCollections.js
import { qdrantClient } from '../services/vectorStore.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixCollections() {
  try {
    const response = await qdrantClient.getCollections();
    const collections = response.collections;

    for (const collection of collections) {
      const name = collection.name;

      // Only handle user collections
      if (!name.startsWith('user_') || !name.endsWith('_files')) continue;

      console.log(`🔍 Checking collection: ${name}`);

      const info = await qdrantClient.getCollection(name);
      const schema = info.payload_schema || {};

      const hasFileName = schema.fileName?.type === 'keyword';
      const hasUserId = schema.userId?.type === 'keyword';

      if (hasFileName && hasUserId) {
        console.log(`✅ ${name} already has correct indexes`);
        continue;
      }

      console.warn(`⚠️  ${name} missing proper indexes. Recreating...`);

      // Backup not implemented here, but can be added if needed

      // Step 1: Delete the old collection
      await qdrantClient.deleteCollection(name);
      console.log(`🗑️ Deleted ${name}`);

      // Step 2: Recreate the collection with proper index schema
      await qdrantClient.createCollection(name, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
        payload_schema: {
          fileName: { type: 'keyword' },
          userId: { type: 'keyword' },
        },
      });

      console.log(`🎯 Recreated ${name} with indexed schema`);
    }

    console.log('\n✅ All collections processed.');
  } catch (err) {
    console.error('❌ Error while fixing collections:', err.message || err);
  }
}

fixCollections();
