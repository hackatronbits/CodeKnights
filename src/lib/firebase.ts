import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth"; // Import Auth type
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore"; // Import Firestore type
// import dotenv from 'dotenv'; // Removed dotenv, Next.js handles .env.local automatically

// Ensure dotenv config runs to load environment variables
// dotenv.config(); // Removed

// Firebase configuration - Reads from environment variables
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | undefined;
let auth: Auth | undefined; // Use Auth type, allow undefined
let db: Firestore | undefined; // Use Firestore type, allow undefined
let firebaseInitializationError: string | null = null;

// Check if essential config values are present *before* initializing
const essentialKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = essentialKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
   const errorMessage = `❌ FATAL: Missing Firebase configuration values for keys: ${missingKeys.join(', ')}. Check your .env.local file.`;
   console.error(errorMessage);
   console.error("Firebase config read (check against .env.local):", {
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
       authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
       projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
       // Add other optional keys if needed for debugging
   });
   firebaseInitializationError = errorMessage; // Store the error
   // Do not throw here to allow the app to potentially start and display an error message
} else {
  try {
    // Initialize Firebase App only if config is valid
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase App Initialized Successfully.");

    try {
      // Initialize Firebase Authentication only if app initialized successfully
      auth = getAuth(app);
      console.log("Firebase Auth Initialized Successfully.");
      // Optional: Connect to Auth Emulator
      // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
      //    connectAuthEmulator(auth, "http://localhost:9099");
      //    console.log("Auth connected to emulator");
      // }
    } catch (e: any) {
      const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}`;
      console.error(authErrorMessage, e);
      console.error("--- CHECK API KEY, AUTH DOMAIN, AND ENSURE AUTHENTICATION IS ENABLED IN FIREBASE CONSOLE ---");
      firebaseInitializationError = authErrorMessage; // Store the error
      auth = undefined; // Ensure auth is undefined on error
    }

    try {
      // Initialize Cloud Firestore only if app initialized successfully
      db = getFirestore(app);
      console.log("Firestore Initialized Successfully.");
       // Optional: Connect to Firestore Emulator
      // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
      //    connectFirestoreEmulator(db, 'localhost', 8080);
      //    console.log("Firestore connected to emulator");
      // }
    } catch (e: any) {
      const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
      console.error(dbErrorMessage, e);
      console.error("--- ENSURE FIRESTORE IS ENABLED IN YOUR FIREBASE CONSOLE (Build > Firestore Database) ---");
      // Store the error if no previous error occurred
      if (!firebaseInitializationError) {
         firebaseInitializationError = dbErrorMessage;
      }
      db = undefined; // Ensure db is undefined on error
    }

  } catch (e: any) {
     const appErrorMessage = `❌ Firebase App Initialization Error: ${e.message}`;
    console.error(appErrorMessage, e);
    console.error("Firebase config used (check against your Firebase console):", {
        ...firebaseConfig,
        apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!', // Mask sensitive keys
    });
    firebaseInitializationError = appErrorMessage; // Store the error
    app = undefined; // Ensure app is undefined on error
    auth = undefined;
    db = undefined;
  }
}


// Export potentially uninitialized services and the error status.
// The application needs to handle cases where these might be undefined.
export { app, auth, db, firebaseInitializationError };
