// server/controllers/uploadController.js

import fs from 'fs';
import pdfParse from 'pdf-parse';
import { qdrantClient } from '../services/vectorStore.js';
import UploadedFile from '../models/UploadedFile.js';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ensureQdrantIndexes } from '../services/qdrantUtils.js';
//
import { v4 as uuidv4 } from 'uuid';
// Configuration
const COLLECTION_NAME = 'RAG_FILES';

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'embedding-001',
  apiKey: process.env.GEMINI_API_KEY,
});

// Ensure collection and indexes are set up
await ensureQdrantIndexes();

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  client: qdrantClient,
  collectionName: COLLECTION_NAME,
});

// ✅ Upload Controller
export async function handleFileUpload(req, res) {
  const file = req.file;
  const userId = req.user?.uid || 'anonymous';
  const { sessionId } = req.body;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    let text = '';

    // Extract text
    if (file.mimetype === 'text/plain') {
      text = fs.readFileSync(file.path, 'utf8');
    } else if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!text.trim()) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Empty or unreadable file' });
    }

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const documents = await splitter.createDocuments([text]);

    if (!documents.length) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'No chunks generated from file' });
    }

    // Embed with metadata
    const metadatas = documents.map(() => ({
      // userId,
      // sessionId,
        userId: String(userId),
  sessionId: String(sessionId),
      fileName: file.originalname,
      uploadedAt: new Date().toISOString(),
    }));

    

// Generate vectors with metadata
const points = await Promise.all(
  documents.map(async (doc, i) => {
    const vector = await embeddings.embedQuery(doc.pageContent);

    return {
      id: uuidv4(),
      vector,
      payload: {
        userId: String(userId),
        sessionId: String(sessionId),
        fileName: file.originalname,
        uploadedAt: new Date().toISOString(),
           text: doc.pageContent, // ✅ include actual text chunk here
      },
    };
  })
);
await qdrantClient.upsert(COLLECTION_NAME, {
  wait: true,
  points,
});
    // Log in MongoDB
    await UploadedFile.create({
      userId,
      sessionId,
      fileName: file.originalname,
    });

    // Cleanup
    fs.unlinkSync(file.path);

    res.status(200).json({
      message: `✅ File uploaded and ${documents.length} chunks embedded and stored.`,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ error: 'Failed to process and embed file' });
  }
}

// ✅ Get uploaded files per session
export const getUploadedFiles = async (req, res) => {
  const userId = req.user?.uid;
  const sessionId = req.query.sessionId;

  if (!userId || !sessionId) {
    return res.status(400).json({ error: 'Missing userId or sessionId' });
  }

  try {
    const files = await UploadedFile.find({ userId, sessionId });
    res.status(200).json({ files });
  } catch (error) {
    console.error('❌ Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch uploaded files' });
  }
};
