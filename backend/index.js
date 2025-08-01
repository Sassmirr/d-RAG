import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

import uploadRoutes from './routes/upload.js';
//import embedRoutes from './routes/embed.js';
import chatRoutes from './routes/chat.js';
import { qdrantClient } from './services/vectorStore.js';
import { ensureQdrantIndexes } from './services/qdrantUtils.js';
import fileRoutes from './routes/files.js';

const app = express();
const PORT = process.env.PORT || 5000;

ensureQdrantIndexes('RAG_FILES');
// 🧪 Qdrant Health Check (NEW)
async function checkQdrantConnection() {
  try {
    const response = await qdrantClient.getCollections();
    console.log('✅ Qdrant connected. Collections:', response.collections.map(c => c.name));
  } catch (error) {
    console.error('❌ Qdrant connection failed:', error.message || error);
  }
}
// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // or your deployed frontend URL
  credentials: true, // if using cookies or Firebase Auth
}));
app.use(bodyParser.json());
app.use(express.json());
// Routes
app.use('/api/chat', chatRoutes);
//app.use('/api', embedRoutes);
app.use('/api', uploadRoutes);
app.use('/api/files', fileRoutes);

// 404 Handler
app.use((req, res) => {
  console.warn(`⚠️  No route matched: ${req.method} ${req.url}`);
  res.status(404).send(`No route matched: ${req.method} ${req.url}`);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
