// server/middleware/auth.js
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Correctly parse the service account JSON
//const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// ✅ Initialize Firebase Admin with parsed serviceAccount
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('No Firebase token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = { uid: decodedToken.uid }; // ✅ Sets req.user.uid
    next();
  } catch (err) {
    console.error('Firebase token verification failed:', err.message);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
}
