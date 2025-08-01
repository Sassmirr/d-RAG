// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
//import { getAuth } from 'firebase/auth'; 
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD-HGsCiNtSiAJ-UgskGG6MbgMyXYTULfU",
  authDomain: "ragbot-b990d.firebaseapp.com",
  projectId: "ragbot-b990d",
  storageBucket: "ragbot-b990d.firebasestorage.app",
  messagingSenderId: "652678709785",
  appId: "1:652678709785:web:c96952dc58b188d72c2088",
  measurementId: "G-9HD76027NG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Google Login
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider(); // ✅ define provider

setPersistence(auth, browserLocalPersistence).catch(console.error);

export { auth, googleProvider }; // ✅ export both
// ✅ Export auth object

//export { auth };