
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import dotenv from 'dotenv';

// Ensure dotenv config runs to load environment variables
dotenv.config(); 

// Firebase configuration - Reads from environment variables
// IMPORTANT: Ensure these environment variables are set in your .env.local file
// The NEXT_PUBLIC_ prefix is crucial for client-side access in Next.js
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId is optional
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

// Check if essential config values are present *before* initializing
const essentialKeys = ['apiKey', 'authDomain', 'projectId'];
const missingKeys = essentialKeys.filter(key => !firebaseConfig[key as keyof FirebaseOptions]);

if (missingKeys.length > 0) {
   const errorMessage = `❌ FATAL: Missing Firebase configuration values for keys: ${missingKeys.join(', ')}.`;
   console.error(errorMessage);
   console.error("Ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env.local file.");
   console.error("Firebase config object used (check against .env.local):", {
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
       authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
       projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
       storageBucket: firebaseConfig.storageBucket || 'Optional/Not Set',
       messagingSenderId: firebaseConfig.messagingSenderId || 'Optional/Not Set',
       appId: firebaseConfig.appId || 'Optional/Not Set',
   });
   // Throw an error to prevent app initialization if critical keys are missing
   // Note: Throwing here might stop the build process or cause server errors.
   // Consider a less disruptive approach if this runs during build time.
   // For now, logging should suffice for debugging during development.
   // throw new Error("Missing critical Firebase configuration values. Check server logs and .env.local file.");

   // Fallback for client-side where throwing might be less ideal initially
   // You might want to handle this more gracefully in your UI later
   console.warn("Firebase initialization skipped due to missing configuration.");

} else {
  try {
    // Initialize Firebase App
    // Use getApps().length to check if an app is already initialized (important for HMR)
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    console.log("Firebase App Initialized Successfully.");

    try {
      // Initialize Firebase Authentication and get a reference to the service
      auth = getAuth(app);
      console.log("Firebase Auth Initialized Successfully.");
      // Optional: Connect to Auth Emulator if running locally
      // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
      //    connectAuthEmulator(auth, "http://localhost:9099");
      //    console.log("Auth connected to emulator");
      // }

    } catch (e: any) {
      console.error("❌ Firebase Authentication initialization error:", e);
      console.error("Firebase config used (relevant parts - check against your Firebase console):", {
         apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!',
         authDomain: firebaseConfig.authDomain || 'MISSING!',
         projectId: firebaseConfig.projectId || 'MISSING!',
     });
      console.error("--- THIS ERROR (e.g., auth/invalid-api-key) OFTEN MEANS YOUR API KEY OR OTHER CONFIG IS WRONG or Authentication is not enabled. ---");
      console.error("--- DOUBLE-CHECK your .env.local file AND ENSURE AUTHENTICATION IS ENABLED IN FIREBASE CONSOLE ---");
      // Don't re-throw here to allow the app to potentially load partially, but Auth will fail.
      // Consider specific UI feedback if auth is unavailable.
    }

    try {
      // Initialize Cloud Firestore and get a reference to the service
      db = getFirestore(app);
      console.log("Firestore Initialized Successfully.");
       // Optional: Connect to Firestore Emulator if running locally
      // if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
      //    connectFirestoreEmulator(db, 'localhost', 8080);
      //    console.log("Firestore connected to emulator");
      // }
    } catch (e: any) {
      console.error("❌ Firestore Initialization Error:", e);
      console.error("Firebase config used (relevant parts - check against your Firebase console):", {
         projectId: firebaseConfig.projectId || 'MISSING!',
     });
      console.error("--- ENSURE FIRESTORE IS ENABLED IN YOUR FIREBASE CONSOLE (Build > Firestore Database) ---");
      // Don't re-throw here.
    }

  } catch (e: any) {
    console.error("❌ Firebase App Initialization Error:", e);
    console.error("Firebase config used (check against your Firebase console):", {
        ...firebaseConfig,
        apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!', // Mask sensitive keys
    });
    // Don't re-throw here.
  }
}


// Export potentially uninitialized services. The application needs to handle cases where these might be undefined.
export { app, auth, db };
