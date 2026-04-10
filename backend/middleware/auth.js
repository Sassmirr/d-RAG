// server/middleware/auth.js
import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import '../loadEnv.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Dynamic Firebase Configuration
let serviceAccount;

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:', err.message);
  }
}

// Fallback to file if environment variables are not set or incomplete
if (!serviceAccount) {
  const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } else {
    console.error('❌ Firebase service account configuration missing (env vars or JSON file).');
  }
}

// ✅ Initialize Firebase Admin
if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized');
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
