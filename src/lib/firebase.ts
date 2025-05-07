
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env.local


// Firebase configuration based on service account project ID and web app details
// Ensure these values match your Firebase project settings for the **Web App**
// associated with the 'mymentor-fe595' project.
// It's strongly recommended to use environment variables for these.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBVRPsTRl6WdTkqKh5Yd7hmtsclXuqWwSg", // Assuming this key is for the mymentor-fe595 project's web app
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mymentor-fe595.firebaseapp.com", // Corrected based on project ID
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mymentor-fe595", // Corrected based on service account
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mymentor-fe595.appspot.com", // Corrected based on project ID
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "386423440419", // Assuming correct for mymentor-fe595 web app
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:386423440419:web:ef8c7ae21dd8ad0cb9dd96", // Assuming correct for mymentor-fe595 web app
  // measurementId is optional
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

// Check if essential config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
   console.error("❌ FATAL: Missing critical Firebase configuration values.");
   console.error("Ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set in your .env.local file or directly in src/lib/firebase.ts.");
   console.error("Firebase config read:", {
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/UNDEFINED!',
       authDomain: firebaseConfig.authDomain || 'MISSING/UNDEFINED!',
       projectId: firebaseConfig.projectId || 'MISSING/UNDEFINED!',
       // Log other relevant values if needed, ensuring sensitivity
   });
   // Throw an error to prevent app initialization if critical keys are missing
   throw new Error("Missing Firebase configuration values. Check server logs and .env.local file.");
}


try {
   // Initialize Firebase App
   // Use getApps().length to check if an app is already initialized (important for HMR)
   app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e: any) {
   console.error("❌ Firebase App Initialization Error:", e);
   console.error("Firebase config used (check against your Firebase console):", {
       ...firebaseConfig,
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!', // Mask sensitive keys
   });
   throw new Error(`Failed to initialize Firebase app. Please check your configuration in src/lib/firebase.ts. Original error: ${e.message}`);
}

try {
  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);
} catch (e: any) {
  console.error("❌ Firebase Authentication initialization error:", e);
   console.error("Firebase config used (relevant parts - check against your Firebase console):", {
      apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!',
      authDomain: firebaseConfig.authDomain || 'MISSING!',
      projectId: firebaseConfig.projectId || 'MISSING!',
  });
   console.error("--- THIS ERROR (e.g., auth/invalid-api-key) OFTEN MEANS YOUR API KEY OR OTHER CONFIG IS WRONG or Authentication is not enabled. ---");
   console.error("--- DOUBLE-CHECK your .env.local file AND ENSURE AUTHENTICATION IS ENABLED IN FIREBASE CONSOLE ---");
  throw new Error(`Failed to initialize Firebase Authentication. Please double-check your API key, Auth Domain, Project ID in .env.local and ensure Authentication is enabled in your Firebase project console. Original error: ${e.message}`);
}

try {
  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app);
} catch (e: any) {
  console.error("❌ Firestore Initialization Error:", e);
   console.error("Firebase config used (relevant parts - check against your Firebase console):", {
      projectId: firebaseConfig.projectId || 'MISSING!',
  });
  console.error("--- ENSURE FIRESTORE IS ENABLED IN YOUR FIREBASE CONSOLE (Build > Firestore Database) ---");
  throw new Error(`Failed to initialize Firestore. Please check your Project ID in .env.local and ensure Firestore (Native mode or Datastore mode) is enabled in your Firebase project console. Original error: ${e.message}`);
}


export { app, auth, db };
