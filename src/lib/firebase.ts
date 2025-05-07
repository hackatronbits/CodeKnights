
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- VERY IMPORTANT: ADD YOUR FIREBASE CONFIGURATION BELOW ---
// Replace the placeholder strings (e.g., "YOUR_API_KEY") with your actual
// Firebase project configuration values.
//
// How to find your Firebase config:
// 1. Go to your Firebase project console: https://console.firebase.google.com/
// 2. In the left sidebar, click the Gear icon (Project settings).
// 3. In the "General" tab, scroll down to "Your apps".
// 4. Select your web app (or create one if you haven't).
// 5. Under "SDK setup and configuration", choose "Config".
// 6. Copy the values for `apiKey`, `authDomain`, `projectId`, etc.
// 7. Paste them into the corresponding fields below, replacing the placeholders.
//
// --- DO NOT SKIP THIS STEP ---
// The application WILL NOT WORK correctly without valid Firebase credentials.
// Keep this file secure and DO NOT commit your actual API keys to public repositories.
// Consider using environment variables for production deployments (see Next.js documentation).
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY", // Replace with your Firebase API Key
  authDomain: "YOUR_AUTH_DOMAIN", // Replace with your Firebase Auth Domain (e.g., your-project-id.firebaseapp.com)
  projectId: "YOUR_PROJECT_ID", // Replace with your Firebase Project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // Replace with your Firebase Storage Bucket (e.g., your-project-id.appspot.com)
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Replace with your Firebase Messaging Sender ID
  appId: "YOUR_APP_ID", // Replace with your Firebase App ID (e.g., 1:1234567890:web:abcdef1234567890)
};


let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

// Check if placeholder values are still present
if (
  firebaseConfig.apiKey === "YOUR_API_KEY" ||
  firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN" ||
  firebaseConfig.projectId === "YOUR_PROJECT_ID"
) {
   console.warn("⚠️ WARNING: Firebase configuration is incomplete. Using placeholder values.");
   console.warn("Please update src/lib/firebase.ts with your actual Firebase project credentials.");
   console.warn("The application may not function correctly until this is done.");
}


try {
   // Initialize Firebase App
   app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e: any) {
   console.error("❌ Firebase App Initialization Error:", e);
   console.error("Firebase config used (check against your Firebase console):", {
       ...firebaseConfig,
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/PLACEHOLDER!',
   });
   console.error("--- Ensure you have replaced the placeholder values in src/lib/firebase.ts ---");
   throw new Error(`Failed to initialize Firebase app. Please check your configuration in src/lib/firebase.ts. Original error: ${e.message}`);
}

try {
  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);
} catch (e: any) {
  console.error("❌ Firebase Authentication initialization error:", e);
  console.error("Firebase config used (relevant parts - check against your Firebase console):", {
      apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING/PLACEHOLDER!', // Don't log the actual key
      authDomain: firebaseConfig.authDomain || 'MISSING/PLACEHOLDER!',
      projectId: firebaseConfig.projectId || 'MISSING/PLACEHOLDER!',
  });
   console.error("--- THIS ERROR (auth/invalid-api-key or similar) OFTEN MEANS YOUR API KEY OR OTHER CONFIG IN src/lib/firebase.ts IS WRONG OR A PLACEHOLDER. ---");
   console.error("--- DOUBLE-CHECK src/lib/firebase.ts AND ENSURE AUTHENTICATION IS ENABLED IN FIREBASE CONSOLE ---");
  throw new Error(`Failed to initialize Firebase Authentication. Please double-check your API key, Auth Domain, Project ID in src/lib/firebase.ts and ensure Authentication is enabled in your Firebase project console. Original error: ${e.message}`);
}

try {
  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app);
} catch (e: any) {
  console.error("❌ Firestore Initialization Error:", e);
   console.error("Firebase config used (relevant parts - check against your Firebase console):", {
      projectId: firebaseConfig.projectId || 'MISSING/PLACEHOLDER!',
  });
  console.error("--- ENSURE FIRESTORE IS ENABLED IN YOUR FIREBASE CONSOLE (Build > Firestore Database) ---");
  throw new Error(`Failed to initialize Firestore. Please check your Project ID in src/lib/firebase.ts and ensure Firestore (Native mode or Datastore mode) is enabled in your Firebase project console. Original error: ${e.message}`);
}


export { app, auth, db };
