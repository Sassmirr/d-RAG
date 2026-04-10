import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load .env from the project root (one level up from /backend)
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('📡 Environment variables loaded from project root');
