
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth"; 
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Firebase configuration - Reads from environment variables prefixed with NEXT_PUBLIC_
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined; 
let firebaseInitializationError: string | null = null;

// Basic check for essential config values
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
   const errorMessage = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId). Check your .env.local file and ensure variables start with NEXT_PUBLIC_.";
   console.error(errorMessage);
   console.error("Current Config (Check against .env.local):", {
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
       authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
       projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
   });
   firebaseInitializationError = errorMessage; 
} else {
  try {
    // Initialize Firebase App only if config seems valid
    if (typeof window !== 'undefined') { // Ensure this runs only on the client
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        console.log("Firebase App Initialized Successfully.");

        try {
          // Initialize Firebase Authentication
          auth = getAuth(app);
          console.log("Firebase Auth Initialized Successfully.");
           // Optional: Connect to Auth Emulator (Update host/port if needed)
           // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
           //    try {
           //      connectAuthEmulator(auth, "http://127.0.0.1:9099");
           //      console.log("Auth connected to emulator");
           //    } catch (e) { console.warn("Auth Emulator connection failed (might be already connected or unavailable):", e)}
           // }
        } catch (e: any) {
          const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}`;
          console.error(authErrorMessage, e);
          console.error("--- Double-check NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and ensure Authentication is ENABLED with appropriate sign-in methods in the Firebase Console. ---");
          firebaseInitializationError = authErrorMessage;
          auth = undefined;
        }

        try {
          // Initialize Cloud Firestore
          db = getFirestore(app);
          console.log("Firestore Initialized Successfully.");
           // Optional: Connect to Firestore Emulator (Update host/port if needed)
           // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
           //    try {
           //      connectFirestoreEmulator(db, '127.0.0.1', 8080);
           //      console.log("Firestore connected to emulator");
           //    } catch (e) { console.warn("Firestore Emulator connection failed (might be already connected or unavailable):", e)}
           // }
        } catch (e: any) {
          const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
          console.error(dbErrorMessage, e);
          console.error("--- Ensure Firestore is ENABLED (Native Mode recommended) in your Firebase Console (Build > Firestore Database). ---");
          if (!firebaseInitializationError) { 
             firebaseInitializationError = dbErrorMessage;
          }
          db = undefined;
        }
    } else {
        console.log("Firebase initialization skipped on server-side render.");
    }

  } catch (e: any) {
     const appErrorMessage = `❌ Firebase App Initialization Error: ${e.message}`;
    console.error(appErrorMessage, e);
     console.error("Firebase config used (Check for typos and ensure all NEXT_PUBLIC_ variables are set):", {
         ...firebaseConfig,
         apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!', 
     });
    firebaseInitializationError = appErrorMessage;
    app = undefined; 
    auth = undefined;
    db = undefined;
  }
}


// Export potentially uninitialized services and the error status.
// The application (e.g., AuthContext) MUST handle cases where these might be undefined.
export { app, auth, db, firebaseInitializationError };
// DO NOT EXPORT firebaseConfig directly if it contains sensitive info not meant for client bundle.
// Individual config values are read via process.env directly.
