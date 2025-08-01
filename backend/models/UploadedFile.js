import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema({
  userId: { type: String, required: true },
   sessionId: { type: String, required: true }, // ✅ Add this
  fileName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('UploadedFile', uploadedFileSchema);
