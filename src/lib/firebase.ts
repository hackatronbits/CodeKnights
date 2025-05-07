
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions"; // Added Functions import
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage"; // Added Storage import


// --- Environment Variable Logging ---
// Log the values being read from environment variables *before* creating the config object.
// This helps verify if the .env.local file is being loaded correctly by Next.js.
console.log("--- Firebase Config Check (firebase.ts) ---");
console.log(`NEXT_PUBLIC_FIREBASE_API_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "'****** (Set)'" : "'MISSING or UNDEFINED!'"}`);
console.log(`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "'MISSING or UNDEFINED!'"}`);
console.log(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "'MISSING or UNDEFINED!'"}`);
console.log(`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "'Optional - Not Set'"}`);
console.log(`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "'Optional - Not Set'"}`);
console.log(`NEXT_PUBLIC_FIREBASE_APP_ID: ${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "'Optional - Not Set'"}`);
console.log("--- End Firebase Config Check ---");
// IMPORTANT: If the essential variables (API_KEY, AUTH_DOMAIN, PROJECT_ID) log as MISSING/UNDEFINED,
// ensure they are correctly defined in your `.env.local` file at the root of your project
// and that you have **restarted** your Next.js development server (npm run dev / yarn dev).


// --- Firebase Configuration ---
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Firebase Service Initialization ---
let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined; // Added Functions variable
let storage: FirebaseStorage | undefined; // Added Storage variable
let firebaseInitializationError: string | null = null;

// --- Initialization Logic (Client-Side Only) ---
if (typeof window !== 'undefined') { // Ensure this runs only on the client

  // 1. Validate Essential Config Values
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    const errorMsg = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId).";
    console.error(errorMsg);
    console.error("➡️ Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly defined in your .env.local file.");
    console.error("➡️ IMPORTANT: You MUST restart your Next.js development server after modifying the .env.local file.");
    firebaseInitializationError = errorMsg + " Check .env.local and restart server.";
  } else {
    // 2. Initialize Firebase App
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      console.log("Firebase App Initialized Successfully.");

      // 3. Initialize Firebase Authentication
      try {
        auth = getAuth(app);
        console.log("Firebase Auth Initialized.");
        // Optional: Connect to Auth Emulator
        // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        //   try {
        //     connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
        //     console.log("Auth Emulator Connected (http://127.0.0.1:9099)");
        //   } catch (e) { console.warn("Auth Emulator connection failed:", e)}
        // }

      } catch (e: any) {
        const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}`;
        console.error(authErrorMessage, e);
        console.error("--- Double-check NEXT_PUBLIC_FIREBASE_API_KEY (is it valid?), NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and ensure Authentication is ENABLED with appropriate sign-in methods in the Firebase Console. ---");
        firebaseInitializationError = `Auth setup failed: ${e.message}. Check API Key/Auth settings in Firebase Console & .env.local.`;
        auth = undefined; // Ensure auth is undefined if init fails
      }

      // 4. Initialize Other Firebase Services (Firestore, Functions, Storage)
      // Only attempt if Auth init didn't cause a critical error (though they might work independently depending on rules)
      if (!firebaseInitializationError || auth) { // Proceed if no critical error OR if auth succeeded (common dependency)
         // Firestore
         try {
           db = getFirestore(app);
           console.log("Firestore Initialized.");
           // Optional: Connect to Firestore Emulator
          //  if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
          //    try {
          //      connectFirestoreEmulator(db, '127.0.0.1', 8080);
          //      console.log("Firestore Emulator Connected (http://127.0.0.1:8080)");
          //    } catch (e) { console.warn("Firestore Emulator connection failed:", e)}
          //  }
         } catch (e: any) {
           const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
           console.error(dbErrorMessage, e);
           console.error("--- Ensure Firestore is ENABLED (Native Mode recommended) in your Firebase Console (Build > Firestore Database). ---");
            if (!firebaseInitializationError) { // Don't overwrite a more critical auth error
              firebaseInitializationError = `Firestore setup failed: ${e.message}. Check Firestore settings.`;
            }
           db = undefined;
         }

         // Cloud Functions
          try {
            functions = getFunctions(app);
             console.log("Cloud Functions Initialized.");
            // Optional: Connect to Functions Emulator
            // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
            //    try {
            //      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
            //      console.log("Functions Emulator Connected (http://127.0.0.1:5001)");
            //    } catch (e) { console.warn("Functions Emulator connection failed:", e)}
            // }
          } catch (e: any) {
            const functionsErrMsg = `❌ Cloud Functions Initialization Error: ${e.message}`;
            console.error(functionsErrMsg, e);
             if (!firebaseInitializationError) {
               firebaseInitializationError = `Functions setup failed: ${e.message}.`;
             }
            functions = undefined;
          }

          // Cloud Storage
           try {
             storage = getStorage(app);
             console.log("Cloud Storage Initialized.");
             // Optional: Connect to Storage Emulator
            //  if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
            //    try {
            //      connectStorageEmulator(storage, "127.0.0.1", 9199);
            //      console.log("Storage Emulator Connected (http://127.0.0.1:9199)");
            //    } catch (e) { console.warn("Storage Emulator connection failed:", e)}
            //  }
           } catch (e: any) {
              const storageErrMsg = `❌ Cloud Storage Initialization Error: ${e.message}`;
              console.error(storageErrMsg, e);
              if (!firebaseInitializationError) {
                firebaseInitializationError = `Storage setup failed: ${e.message}.`;
              }
              storage = undefined;
           }

      } else {
          console.warn("Skipping Firestore/Functions/Storage initialization due to prior Firebase App/Auth error.");
          db = undefined;
          functions = undefined;
          storage = undefined;
      }

    } catch (e: any) {
      // Catch errors during initializeApp itself
      const appErrorMessage = `❌ FATAL: Firebase App Initialization Error: ${e.message}`;
      console.error(appErrorMessage, e);
      console.error("--- Review the full Firebase config object: ---", {
        ...firebaseConfig,
        apiKey: firebaseConfig.apiKey ? '****** (Set)' : 'MISSING!',
      });
      console.error("--- Ensure all required NEXT_PUBLIC_FIREBASE_... variables are present and correct in .env.local and the server was restarted. ---");
      firebaseInitializationError = appErrorMessage;
      app = undefined;
      auth = undefined;
      db = undefined;
      functions = undefined;
      storage = undefined;
    }
  }
} else {
  // Server-side rendering context
  console.log("Firebase initialization skipped on server-side (firebase.ts).");
  // Check essential config on server too, as it might be needed for server actions/components later
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
     firebaseInitializationError = "Missing essential Firebase configuration on server-side check. Ensure environment variables are available during build/server runtime.";
     console.error(firebaseInitializationError);
     console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID in build/server environment.");
  }
}

// --- Exports ---
// Export potentially uninitialized services and the error status.
// Consumers (e.g., AuthContext) MUST handle cases where these might be undefined or if initialization failed.
export {
    app,
    auth,
    db,
    functions,
    storage,
    firebaseInitializationError
};
// DO NOT export firebaseConfig directly if sensitive info might leak or if it's only needed here.
// Variables are accessed via process.env.

// --- Helper Function (optional but recommended) ---
export function getFirebaseServices() {
  if (firebaseInitializationError) {
    console.error("Attempted to get Firebase services after initialization error:", firebaseInitializationError);
    // Optionally throw an error here or return nulls/undefined
     // throw new Error(`Firebase Initialization Failed: ${firebaseInitializationError}`);
     return { app: undefined, auth: undefined, db: undefined, functions: undefined, storage: undefined, error: firebaseInitializationError };
  }
  if (typeof window === 'undefined'){
     // Handle server-side scenario if services might be needed there (less common for client-heavy apps)
     // For now, assume client-side initialization is primary
     // console.warn("getFirebaseServices called on server-side where initialization might not have run.");
     // Depending on SSR/Server Component needs, might need separate server-side init logic (e.g., using Admin SDK)
  }

  // Add checks to ensure services were actually initialized
  if (!app || !auth || !db || !functions || !storage) {
     console.warn("Firebase services requested but not all seem to be initialized successfully. This might indicate a partial initialization or an error during setup. Check earlier logs.");
     // Depending on requirements, could throw error or return what's available
  }

  return { app, auth, db, functions, storage, error: null };
}
