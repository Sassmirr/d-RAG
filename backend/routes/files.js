// import express from 'express';
// import { removeVectorsByFileName } from '../services/qdrantUtils.js';
// import { verifyFirebaseToken } from '../middleware/auth.js';
// import UploadedFile from '../models/UploadedFile.js'; // ✅ ADD THIS

// const router = express.Router();

// // POST /api/files/remove
// router.post('/remove', verifyFirebaseToken, async (req, res) => {
//   const { fileName } = req.body;
//   const userId = req.user?.uid;

//   if (!fileName || !userId) {
//     console.error('Missing values:', { fileName, userId });
//     return res.status(400).json({ error: 'Missing fileName or userId' });
//   }

//   try {
//     const deleteCount = await removeVectorsByFileName(fileName, userId);

//     await UploadedFile.deleteOne({ fileName, userId });

//     if (deleteCount === 0) {
//       return res.status(404).json({ error: 'No vectors found for this file.' });
//     }

//     res.json({ message: `✅ Removed ${deleteCount} vectors and metadata for "${fileName}".` });
//   } catch (err) {
//     console.error('Vector deletion error:', err);
//     res.status(500).json({ error: 'Failed to remove file from Qdrant' });
//   }
// });

// export default router;
import express from 'express';
import { removeVectorsByFileName } from '../services/qdrantUtils.js';
import UploadedFile from '../models/UploadedFile.js'; // if storing metadata
import { verifyFirebaseToken } from '../middleware/auth.js';
import { getUploadedFiles } from '../controllers/uploadController.js'; // ✅ import from uploadController.js

const router = express.Router();

router.get('/', verifyFirebaseToken, getUploadedFiles); // ✅ fetch files for current session
// 
router.post('/remove', verifyFirebaseToken, async (req, res) => {
  const { fileName,sessionId } = req.body;
  const userId = req.user?.uid;

  if (!fileName || !userId || !sessionId) {
    console.error('❌ Missing values:', { fileName, userId, sessionId });
    return res.status(400).json({ error: 'Missing fileName or userId' });
  }

  let qdrantDeleted = false;
  let mongoDeleted = false;

  try {
    console.log('🔍 Removing from Qdrant:', { fileName, userId, sessionId });
    const deleteCount = await removeVectorsByFileName(fileName, userId, sessionId);
    qdrantDeleted = deleteCount > 0;
    console.log('✅ Qdrant delete count:', deleteCount);
  } catch (qdrantErr) {
    console.error('❌ Qdrant deletion error:', qdrantErr?.message || qdrantErr);
  }

  try {
    console.log('🔍 Removing metadata from MongoDB...');
    const mongoResult = await UploadedFile.deleteOne({ fileName, userId, sessionId });
    mongoDeleted = mongoResult.deletedCount > 0;
    console.log('✅ MongoDB delete result:', mongoResult);
  } catch (mongoErr) {
    console.error('❌ MongoDB deletion error:', mongoErr?.message || mongoErr);
  }

  if (!qdrantDeleted && !mongoDeleted) {
    return res.status(500).json({
      error: 'Failed to remove file from both Qdrant and MongoDB',
    });
  }

  res.status(200).json({
    message: `✅ Removed file "${fileName}"`,
    qdrantDeleted,
    mongoDeleted,
  });
});



export default router;