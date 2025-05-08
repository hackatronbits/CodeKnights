import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage"; // Import Storage
import { getAnalytics, type Analytics } from "firebase/analytics";

// --- Firebase Configuration ---
// Directly using the provided configuration values
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA71iZhL91C2VR76Nwr_G8KvXFagk5J81A", // Use env var or default
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mymentor-fe595.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mymentor-fe595",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mymentor-fe595.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "294282430523",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:294282430523:web:b91782281437e70567341e",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QPSXEC3DC5" // Optional
};


// --- Firebase Service Initialization ---
let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;
let storage: FirebaseStorage | undefined; // Add storage variable
let analytics: Analytics | undefined;
let firebaseInitializationError: string | null = null;

// --- Check for Missing Essential Config ---
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
   const errorMsg = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId).";
   console.error(errorMsg);
   console.error("Ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env.local file or provided as defaults in firebase.ts.");
    console.error("Firebase config read:", {
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
       authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
       projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
       storageBucket: firebaseConfig.storageBucket || 'MISSING/UNDEFINED (optional but needed for Storage)',
   });
   firebaseInitializationError = errorMsg + " Check .env.local or defaults in firebase.ts.";
}

// --- Initialization Logic (Client-Side Only) ---
if (typeof window !== 'undefined' && !firebaseInitializationError) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase App Initialized Successfully.");

    // Initialize Analytics (Optional)
    try {
        if (firebaseConfig.measurementId) {
            analytics = getAnalytics(app);
            console.log("Firebase Analytics Initialized.");
        } else {
             console.log("Firebase Analytics skipped (no measurementId).");
             analytics = undefined;
        }
    } catch (e: any) {
        console.warn(`Firebase Analytics initialization warning: ${e.message}`);
        analytics = undefined;
    }

    // Initialize Auth
    try {
      auth = getAuth(app);
      console.log("Firebase Auth Initialized.");
    } catch (e: any) {
      const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}`;
      console.error(authErrorMessage, e);
      console.error("--- Double-check your Firebase project settings and ensure Authentication (with Email/Password sign-in) is ENABLED. Verify API Key and Auth Domain. ---");
      if (!firebaseInitializationError) {
         let detailedAuthError = `Auth setup failed. Check Firebase Console & config. Make sure API key is valid for client-side usage.`;
         if (e.code === 'auth/invalid-api-key' || e.message.includes('invalid-api-key')) {
             detailedAuthError += ` Detected 'invalid-api-key'.`;
         }
         detailedAuthError += ` Original error: ${e.message}`;
         firebaseInitializationError = detailedAuthError;
       }
       auth = undefined;
    }

    // Initialize Other Services only if Auth succeeded (or if Auth is not strictly required for them)
    if (auth) { // Example: Proceed only if auth is needed and successful
       // Firestore
       try {
         db = getFirestore(app);
         console.log("Firestore Initialized.");
       } catch (e: any) {
         const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
         console.error(dbErrorMessage, e);
         if (!firebaseInitializationError) firebaseInitializationError = `Firestore setup failed: ${e.message}. Check Firestore settings.`;
         db = undefined;
       }

       // Cloud Functions (Optional)
        try {
          functions = getFunctions(app);
           console.log("Cloud Functions Initialized.");
        } catch (e: any) {
          console.warn(`Cloud Functions Initialization warning: ${e.message}`);
          functions = undefined;
        }

        // Cloud Storage (Initialize specifically)
         try {
           storage = getStorage(app); // Initialize storage here
           console.log("Cloud Storage Initialized.");
         } catch (e: any) {
            const storageErrMsg = `❌ Cloud Storage Initialization Error: ${e.message}`;
            console.error(storageErrMsg, e);
            if (!firebaseInitializationError) {
              firebaseInitializationError = `Storage setup failed: ${e.message}. Check Storage rules/settings.`;
            }
            storage = undefined;
         }

    } else {
        console.warn("Skipping Firestore/Functions/Storage initialization due to prior Firebase Auth initialization error or it being undefined.");
        db = undefined;
        functions = undefined;
        storage = undefined; // Ensure storage is undefined if Auth failed
    }

  } catch (e: any) {
    // Catch errors during initializeApp itself
    const appErrorMessage = `❌ FATAL: Firebase App Initialization Error: ${e.message}`;
    console.error(appErrorMessage, e);
    if (!firebaseInitializationError) firebaseInitializationError = appErrorMessage;
    app = undefined; auth = undefined; db = undefined; functions = undefined; storage = undefined; analytics = undefined;
  }
} else if (typeof window === 'undefined') {
    console.log("Firebase client-side initialization skipped on server-side (firebase.ts).");
} else if (firebaseInitializationError) {
    console.error("Firebase initialization blocked on client due to missing essential config detected earlier:", firebaseInitializationError);
}

// --- Exports ---
export {
    app,
    auth,
    db,
    functions,
    storage, // Export storage
    analytics,
    firebaseInitializationError
};

// --- Helper Function ---
export function getFirebaseServices() {
  // Return the current state of services and any initialization error.
  // Consumers must handle potential undefined values.
  return { app, auth, db, functions, storage, analytics, error: firebaseInitializationError };
}