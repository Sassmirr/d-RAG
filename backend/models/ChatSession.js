// models/ChatSession.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Firebase UID
      required: true,
    },
    title: {
      type: String,
      default: 'Untitled',
    },
    messages: [messageSchema],
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

export default mongoose.model('ChatSession', chatSessionSchema);
