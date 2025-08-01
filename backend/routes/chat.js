// server/routes/chat.js
import express from 'express';

import {
  handleChat,
  createChatSession,
  getChatHistory,
  getSessionById,
  streamChatResponse,
  deleteChatSession,
} from '../controllers/chatController.js';
import { verifyFirebaseToken } from '../middleware/auth.js';


const router = express.Router();


router.post('/', verifyFirebaseToken, handleChat); // main chat route
router.post("/create-session", verifyFirebaseToken, createChatSession);
router.get('/history', verifyFirebaseToken, getChatHistory);
router.get('/session/:id', verifyFirebaseToken, getSessionById);
router.post('/stream', verifyFirebaseToken, streamChatResponse);
// chatRoutes.js
router.delete('/delete/:id', verifyFirebaseToken, deleteChatSession);


export default router;
