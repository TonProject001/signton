import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

console.log("Starting Firebase Service...");

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
    if (getApps().length > 0) {
      app = getApp();
      console.log("Firebase App: Reused existing instance");
    } else {
      app = initializeApp(firebaseConfig);
      console.log("Firebase App: Initialized new instance");
    }
} catch (e) {
    console.error("Critical: Firebase Init Failed", e);
    throw e;
}

// Export Firestore database reference
export const db = getFirestore(app);
console.log("Firestore Service Ready");
