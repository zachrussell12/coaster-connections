import { initializeApp, type FirebaseApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { Firestore, getFirestore } from 'firebase/firestore';
import * as firebaseStorage from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
const database: Firestore = getFirestore(app);
const firestorage: firebaseStorage.FirebaseStorage = firebaseStorage.getStorage(app)
//const analytics = getAnalytics(app);

export {database, firestorage};