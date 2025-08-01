import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

import { handleFileUpload, getUploadedFiles } from '../controllers/uploadController.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import UploadedFile from '../models/UploadedFile.js';
import { Document } from 'langchain/document';
import { getVectorStore } from '../services/vectorStore.js';

const router = express.Router();

// Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Multer config: store files temporarily in /uploads, limit size to 10MB
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ✅ POST /upload — Upload a file
router.post('/upload', verifyFirebaseToken, upload.single('file'), handleFileUpload);

// ✅ GET /files — List uploaded files for the current user (optionally filtered by sessionId)
router.get('/files', verifyFirebaseToken, getUploadedFiles);

// 🧪 Optional utility for manual upload (if you need it elsewhere)
export async function uploadToQdrant(chunks, metadata) {
  const vectorStore = await getVectorStore();
  const docs = chunks.map(
    (text) =>
      new Document({
        pageContent: text,
        metadata,
      })
  );
  await vectorStore.addDocuments(docs);
}

export default router;
