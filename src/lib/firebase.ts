import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App singleton with the user's configuration
const app =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        measurementId: firebaseConfig.measurementId,
      });

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the default or specified database
export const db =
  "firestoreDatabaseId" in firebaseConfig &&
  Boolean(firebaseConfig.firestoreDatabaseId) &&
  firebaseConfig.firestoreDatabaseId !== "(default)"
    ? getFirestore(app, (firebaseConfig as { firestoreDatabaseId: string }).firestoreDatabaseId)
    : getFirestore(app);

// Firebase Storage is used for product images because Cloudflare/server filesystems are not durable.
export const storage = getStorage(app);
storage.maxUploadRetryTime = 8000;
storage.maxOperationRetryTime = 8000;

// Safe diagnostic logging as required (never log API keys or secrets)
console.log("[Firebase] projectId:", app.options.projectId);
console.log("[Firebase] storageBucket:", app.options.storageBucket);

export { ref, ref as storageRef, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

// Safely initialize Analytics if supported in browser environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { app };
export default app;
