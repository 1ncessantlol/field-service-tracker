import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByy-L7nyXUe0v2u-XfWUxb48AkZRPInFI",
  authDomain: "field-service-report-ff092.firebaseapp.com",
  projectId: "field-service-report-ff092",
  storageBucket: "field-service-report-ff092.firebasestorage.app",
  messagingSenderId: "268702275389",
  appId: "1:268702275389:web:ff67ebbc117a28cd5e5754"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore with explicit local cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export default app;
