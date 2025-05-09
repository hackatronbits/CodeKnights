// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";

// Hardcoded Firebase Configuration (as confirmed from .env.local content)
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyA71iZhL91C2VR76Nwr_G8KvXFagk5J81A",
  authDomain: "mymentor-fe595.firebaseapp.com",
  projectId: "mymentor-fe595",
  storageBucket: "mymentor-fe595.appspot.com", // Corrected from previous firebasestorage.app if that was a typo
  messagingSenderId: "294282430523",
  appId: "1:294282430523:web:b91782281437e70567341e",
  measurementId: "G-QPSXEC3DC5" // Optional
};

let app: ReturnType<typeof initializeApp> | undefined;
let firebaseAuth: Auth | undefined;
let firestoreDb: Firestore | undefined;
let cloudFunctions: Functions | undefined;
let firebaseStorage: FirebaseStorage | undefined;
let firebaseAnalytics: Analytics | undefined;

let firebaseInitializationError: string | null = null;

// Log the API key being used (masked for security)
const apiKeyForDisplay = firebaseConfig.apiKey 
  ? `${firebaseConfig.apiKey.substring(0, 4)}...${firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)}` 
  : "MISSING/UNDEFINED!";
console.log(`Firebase Config Initializing with API Key: ${apiKeyForDisplay} for projectId: ${firebaseConfig.projectId}`);


if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  const errorMsg = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId) in the hardcoded firebaseConfig object in src/lib/firebase.ts. Please verify these values.";
  console.error(errorMsg);
  console.error("Current hardcoded config in firebase.ts:", {
    apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!',
    authDomain: firebaseConfig.authDomain || 'MISSING!',
    projectId: firebaseConfig.projectId || 'MISSING!',
    storageBucket: firebaseConfig.storageBucket || 'NOT SET (but needed for Storage)',
  });
  firebaseInitializationError = errorMsg;
}


if (typeof window !== 'undefined' && !firebaseInitializationError) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase App Initialized/Retrieved Successfully.");

    try {
      firebaseAuth = getAuth(app);
      console.log("Firebase Auth Initialized.");
    } catch (e: any) {
      const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}. This often indicates an issue with the API Key or Auth Domain for projectId "${firebaseConfig.projectId}". Please double-check these values in firebase.ts and ensure Email/Password sign-in is ENABLED in your Firebase project console.`;
      console.error(authErrorMessage, e);
      if (!firebaseInitializationError) firebaseInitializationError = authErrorMessage;
      firebaseAuth = undefined;
    }

    if (app) {
       try {
         firestoreDb = getFirestore(app);
         console.log("Firestore Initialized.");
       } catch (e: any) {
         const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
         console.error(dbErrorMessage, e);
         if (!firebaseInitializationError) firebaseInitializationError = `Firestore setup failed: ${dbErrorMessage}.`;
         firestoreDb = undefined;
       }

       try {
         firebaseStorage = getStorage(app);
         console.log("Cloud Storage Initialized.");
       } catch (e: any) {
         const storageErrMsg = `❌ Cloud Storage Initialization Error: ${e.message}`;
         console.error(storageErrMsg, e);
         if (!firebaseInitializationError) firebaseInitializationError = `Storage setup failed: ${storageErrMsg}.`;
         firebaseStorage = undefined;
       }
       
       if (firebaseConfig.measurementId) {
         try {
           firebaseAnalytics = getAnalytics(app);
           console.log("Firebase Analytics Initialized.");
         } catch (e: any) {
           console.warn(`Firebase Analytics initialization warning: ${e.message}`);
           firebaseAnalytics = undefined;
         }
       }

       try {
         cloudFunctions = getFunctions(app);
         console.log("Cloud Functions Initialized.");
       } catch (e: any) {
         console.warn(`Cloud Functions initialization warning: ${e.message}`);
         cloudFunctions = undefined;
       }
    } else {
        const appInitFailureMsg = "Skipping Firestore/Functions/Storage/Analytics initialization because Firebase App object is undefined.";
        console.warn(appInitFailureMsg);
        if (!firebaseInitializationError) firebaseInitializationError = appInitFailureMsg;
    }

  } catch (e: any) {
    const appErrorMessage = `❌ FATAL: Firebase App Main Initialization Error: ${e.message}. This often means the core Firebase config (projectId, apiKey, authDomain) in firebase.ts is incorrect or the Firebase project hasn't been set up correctly.`;
    console.error(appErrorMessage, e);
    if (!firebaseInitializationError) firebaseInitializationError = appErrorMessage;
    app = undefined; firebaseAuth = undefined; firestoreDb = undefined; cloudFunctions = undefined; firebaseStorage = undefined; firebaseAnalytics = undefined;
  }
} else if (typeof window === 'undefined') {
    console.log("Firebase client-side initialization skipped on server-side (firebase.ts).");
} else if (firebaseInitializationError) {
    // This case means essential config values were missing from the hardcoded object
    console.error("Firebase initialization blocked on client due to missing essential config in firebase.ts:", firebaseInitializationError);
}

export function getFirebaseServices() {
  return {
    app,
    auth: firebaseAuth,
    db: firestoreDb,
    functions: cloudFunctions,
    storage: firebaseStorage,
    analytics: firebaseAnalytics,
    error: firebaseInitializationError, // This will now reflect any of the init errors
  };
}

// Exporting individual services can be useful but ensure they are checked for undefined where used if init can fail.
export {
    firebaseAuth as auth, // Exporting as 'auth' for convenience if used directly
    firestoreDb as db,    // Exporting as 'db'
    firebaseStorage as storage,
    cloudFunctions as functions,
    firebaseAnalytics as analytics,
    firebaseInitializationError, // Export the error state
    firebaseConfig // Exporting config can be useful for debugging or if other parts of app need it
};
