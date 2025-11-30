import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Config from Firebase Console -> Project settings -> General
const firebaseConfig = {
  apiKey: "AIzaSyDI_-8WMyMbnqq3OLnpNL2Q-FVNIOhR340",
  authDomain: "signton-48251.firebaseapp.com",
  projectId: "signton-48251",
  storageBucket: "signton-48251.firebasestorage.app",
  messagingSenderId: "603939486398",
  appId: "1:603939486398:web:a7af20c8e5beadb1e67cef",
  measurementId: "G-RY1PFM2919"
};

// Initialize Firebase
let app;
try {
  // Use existing app if available to prevent errors during re-renders/hot-reloads
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  console.log("Firebase initialized successfully:", app.name);
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// Export Firestore database reference
export const db = getFirestore(app);
