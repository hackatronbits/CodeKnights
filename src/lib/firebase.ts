
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics"; // Import Analytics

// --- Environment Variable Check (Replaced with Direct Config for now) ---
// console.log("--- Firebase Config Check (firebase.ts) ---");
// console.log(`Using hardcoded Firebase config values.`);
// console.log("--- End Firebase Config Check ---");


// --- Firebase Configuration ---
// Directly using the provided configuration values
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyA71iZhL91C2VR76Nwr_G8KvXFagk5J81A",
  authDomain: "mymentor-fe595.firebaseapp.com",
  projectId: "mymentor-fe595",
  storageBucket: "mymentor-fe595.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "294282430523",
  appId: "1:294282430523:web:b91782281437e70567341e",
  measurementId: "G-QPSXEC3DC5" // Optional but included
};

// --- Firebase Service Initialization ---
let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | undefined; // Add analytics variable
let firebaseInitializationError: string | null = null;

// --- Check for Missing Essential Config ---
// Perform this check immediately after defining firebaseConfig
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
   const errorMsg = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId).";
   console.error(errorMsg);
   console.error("➡️ Check the hardcoded firebaseConfig object in src/lib/firebase.ts.");
   firebaseInitializationError = errorMsg + " Check the hardcoded config.";
 }


// --- Initialization Logic (Client-Side Only) ---
if (typeof window !== 'undefined' && !firebaseInitializationError) { // Proceed only if essential config is present

  // 2. Initialize Firebase App
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase App Initialized Successfully.");

    // Initialize Analytics right after App initialization (Client-side only)
    try {
        analytics = getAnalytics(app);
        console.log("Firebase Analytics Initialized.");
    } catch (e: any) {
        const analyticsErrorMessage = `❌ Firebase Analytics initialization error: ${e.message}`;
        console.error(analyticsErrorMessage, e);
        // Don't set firebaseInitializationError here as Analytics is often optional
        analytics = undefined; // Ensure analytics is undefined if init fails
    }


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
      console.error("Firebase config used (relevant parts - check against your Firebase console):", {
        apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
        authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
        projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
      });
      console.error("--- Double-check your Firebase project settings and ensure Authentication (with Email/Password sign-in) is ENABLED. Verify API Key and Auth Domain. ---");
      // Set the error state ONLY if no critical config error was detected before
      if (!firebaseInitializationError) {
         // Construct a more informative error message
        let detailedAuthError = `Auth setup failed. Check Firebase Console & config. Make sure API key is valid for client-side usage.`;
        if (e.code === 'auth/invalid-api-key' || e.message.includes('invalid-api-key')) {
            detailedAuthError += ` Detected 'invalid-api-key'.`;
        }
        detailedAuthError += ` Original error: ${e.message}`;
        firebaseInitializationError = detailedAuthError;

      }
      auth = undefined; // Ensure auth is undefined if init fails
    }

    // 4. Initialize Other Firebase Services (Firestore, Functions, Storage)
    // Only attempt if Auth init didn't cause a critical error
    if (auth) { // Proceed only if auth initialized successfully
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
          if (!firebaseInitializationError) { // Don't overwrite a more critical error
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
        console.warn("Skipping Firestore/Functions/Storage initialization due to prior Firebase Auth initialization error.");
        db = undefined;
        functions = undefined;
        storage = undefined;
    }

  } catch (e: any) {
    // Catch errors during initializeApp itself
    const appErrorMessage = `❌ FATAL: Firebase App Initialization Error: ${e.message}`;
    console.error(appErrorMessage, e);
    console.error("--- Review the Firebase config object being used: ---", {
      ...firebaseConfig,
      apiKey: firebaseConfig.apiKey ? '****** (Set)' : 'MISSING!', // Mask API key in log
    });
    console.error("--- Ensure the provided config values are correct and the Firebase project exists and is accessible. ---");
    if (!firebaseInitializationError) { // Prioritize existing critical config error
       firebaseInitializationError = appErrorMessage;
    }
    app = undefined;
    auth = undefined;
    db = undefined;
    functions = undefined;
    storage = undefined;
    analytics = undefined; // Ensure analytics is undefined on app init error
  }
} else if (typeof window !== 'undefined' && firebaseInitializationError) {
    // Log that initialization is blocked due to missing essential config on the client
    console.error("Firebase initialization blocked on client due to missing essential config detected earlier:", firebaseInitializationError);
} else {
  // Server-side rendering context
  console.log("Firebase client-side initialization skipped on server-side (firebase.ts).");
  // The server-side check for essential config is implicitly handled by the top-level check
  // and the `firebaseInitializationError` variable state.
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
    analytics, // Export analytics
    firebaseInitializationError
};

// --- Helper Function ---
// Provides a consistent way to access services and check for errors *after* initial load.
export function getFirebaseServices() {
  // If there was an error during the initial setup phase, report it.
  if (firebaseInitializationError) {
    console.error("Firebase Initialization Failed:", firebaseInitializationError);
    return { app: undefined, auth: undefined, db: undefined, functions: undefined, storage: undefined, analytics: undefined, error: firebaseInitializationError };
  }

  // Basic check if services are available (they might be undefined if client-side init hasn't completed or failed silently)
  if (typeof window !== 'undefined' && (!app || !auth || !db /* || !analytics - analytics is optional */ )) {
     // Warning only if essential services are missing
     if (!app || !auth || !db) {
         console.warn("Firebase services requested but some essential services (app, auth, db) seem unavailable. Initialization might be pending or have failed. Check logs.");
     }
     // Return current state, which might include undefined services
      return { app, auth, db, functions, storage, analytics, error: "Firebase services might not be fully initialized yet." };
  }

  // If no initialization error and services seem available (on client), return them.
  return { app, auth, db, functions, storage, analytics, error: null };
}
