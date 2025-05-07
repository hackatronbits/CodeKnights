
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// This configuration is taken from the image provided.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBVRPsTRl6WdTkqKh5Yd7hmtsclXuqWwSg",
  authDomain: "mymentconnect.firebaseapp.com",
  projectId: "mymentconnect",
  storageBucket: "mymentconnect.appspot.com", // Updated based on typical pattern, image had firebasestorage.app
  messagingSenderId: "386423440419",
  appId: "1:386423440419:web:ef8c7ae21dd8ad0cb9dd96",
  // measurementId: "G-JQ2QKXNCPK" // Measurement ID is optional and often not needed for core SDKs
};


let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;

// Check if essential config values are present
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
   console.error("❌ FATAL: Missing critical Firebase configuration values (apiKey, authDomain, projectId).");
   console.error("Ensure these values are correctly set in src/lib/firebase.ts");
   // Throw an error or prevent app initialization if critical keys are missing
   throw new Error("Critical Firebase configuration values are missing in src/lib/firebase.ts. The application cannot start.");
}


try {
   // Initialize Firebase App
   app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e: any) {
   console.error("❌ Firebase App Initialization Error:", e);
   console.error("Firebase config used (check against your Firebase console):", {
       ...firebaseConfig,
       apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!',
   });
   throw new Error(`Failed to initialize Firebase app. Please check your configuration in src/lib/firebase.ts. Original error: ${e.message}`);
}

try {
  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);
} catch (e: any) {
  console.error("❌ Firebase Authentication initialization error:", e);
  console.error("Firebase config used (relevant parts - check against your Firebase console):", {
      apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING!', // Don't log the actual key
      authDomain: firebaseConfig.authDomain || 'MISSING!',
      projectId: firebaseConfig.projectId || 'MISSING!',
  });
   console.error("--- THIS ERROR (e.g., auth/invalid-api-key) OFTEN MEANS YOUR API KEY OR OTHER CONFIG IN src/lib/firebase.ts IS WRONG or Authentication is not enabled. ---");
   console.error("--- DOUBLE-CHECK src/lib/firebase.ts AND ENSURE AUTHENTICATION IS ENABLED IN FIREBASE CONSOLE ---");
  throw new Error(`Failed to initialize Firebase Authentication. Please double-check your API key, Auth Domain, Project ID in src/lib/firebase.ts and ensure Authentication is enabled in your Firebase project console. Original error: ${e.message}`);
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
  throw new Error(`Failed to initialize Firestore. Please check your Project ID in src/lib/firebase.ts and ensure Firestore (Native mode or Datastore mode) is enabled in your Firebase project console. Original error: ${e.message}`);
}


export { app, auth, db };
