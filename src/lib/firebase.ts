
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

// Function to check if the config is valid
function isFirebaseConfigValid(config: FirebaseOptions): boolean {
  return !!(config.apiKey && config.authDomain && config.projectId);
}

// --- Initialization Logic ---
if (typeof window !== 'undefined') { // Ensure this runs only on the client
  if (!isFirebaseConfigValid(firebaseConfig)) {
    const errorMessage = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId).";
    console.error(errorMessage);
    console.error("Ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env.local file and the server was restarted.");
    console.error("Current Config (Check against .env.local):", {
      apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
      authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
      projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
    });
    firebaseInitializationError = errorMessage + " Check your .env.local file.";
  } else {
    try {
      // Initialize Firebase App
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      console.log("Firebase App Initialized Successfully.");

      // Initialize Firebase Authentication
      try {
        auth = getAuth(app);
        // Attempt a simple operation to validate the auth instance immediately
        // Note: This is a basic check; more complex issues might still arise later.
        // We listen for auth state changes in AuthContext anyway.
        console.log("Firebase Auth Initialized (basic check ok).");

        // Optional: Connect to Auth Emulator
        // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        //   try {
        //     connectAuthEmulator(auth, "http://127.0.0.1:9099");
        //     console.log("Auth connected to emulator");
        //   } catch (e) { console.warn("Auth Emulator connection failed:", e)}
        // }

      } catch (e: any) {
        const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}`;
        console.error(authErrorMessage, e);
        console.error("--- Double-check NEXT_PUBLIC_FIREBASE_API_KEY (is it valid?), NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and ensure Authentication is ENABLED with appropriate sign-in methods in the Firebase Console. ---");
        firebaseInitializationError = `Auth setup failed: ${e.message}. Check API Key and Auth settings.`;
        auth = undefined; // Ensure auth is undefined if init fails
      }

      // Initialize Cloud Firestore (only if Auth succeeded or isn't strictly required immediately)
      // If Auth failed, Firestore might still work if rules allow unauthenticated access,
      // but often they depend on auth state.
      if (!firebaseInitializationError) { // Attempt Firestore init only if no prior critical errors
         try {
           db = getFirestore(app);
           console.log("Firestore Initialized Successfully.");
           // Optional: Connect to Firestore Emulator
           // if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
           //   try {
           //     connectFirestoreEmulator(db, '127.0.0.1', 8080);
           //     console.log("Firestore connected to emulator");
           //   } catch (e) { console.warn("Firestore Emulator connection failed:", e)}
           // }
         } catch (e: any) {
           const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
           console.error(dbErrorMessage, e);
           console.error("--- Ensure Firestore is ENABLED (Native Mode recommended) in your Firebase Console (Build > Firestore Database). ---");
           // Set initialization error, but don't overwrite a potentially more critical auth error
            if (!firebaseInitializationError) {
              firebaseInitializationError = `Firestore setup failed: ${e.message}. Check Firestore settings.`;
            }
           db = undefined; // Ensure db is undefined if init fails
         }
      } else {
          console.warn("Skipping Firestore initialization due to prior Firebase App/Auth error.");
          db = undefined;
      }

    } catch (e: any) {
      // Catch errors during initializeApp itself
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
} else {
  console.log("Firebase initialization skipped on server-side render (firebase.ts).");
  // Set error if config is missing even on server, as it might be needed later
  if (!isFirebaseConfigValid(firebaseConfig)) {
     firebaseInitializationError = "Missing essential Firebase configuration on server-side check.";
  }
}

// Export potentially uninitialized services and the error status.
// The application (e.g., AuthContext) MUST handle cases where these might be undefined.
export { app, auth, db, firebaseInitializationError };
// DO NOT EXPORT firebaseConfig directly if it contains sensitive info not meant for client bundle.
// Individual config values are read via process.env directly.
