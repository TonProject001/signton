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

let app;
try {
    // Initialize Firebase
    // If apps are already initialized (e.g. during hot reload), use the existing one
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(firebaseConfig);
    }
    console.log("Firebase initialized successfully");
} catch (e) {
    console.error("Firebase Initialization Error:", e);
    // Re-throw so the global error handler in index.html catches it and shows it on screen
    throw new Error("Failed to initialize Firebase: " + (e instanceof Error ? e.message : String(e)));
}

// Export Firestore database reference
export const db = getFirestore(app);
