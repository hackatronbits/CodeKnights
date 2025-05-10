// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAnalytics, type Analytics } from "firebase/analytics";

// --- IMPORTANT ---
// Please verify ALL of these configuration values against your "mentorconnect" Firebase project settings.
// The API Key (apiKey) and other IDs (messagingSenderId, appId, measurementId) must match
// the "mentorconnect" project. If they are from a different project (e.g., "mymentor-fe595"),
// authentication and other Firebase services will fail.
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCoJPvq29G5VAORlCAy_Yip6Nhs_N9G45Q", // Replace with actual or ensure .env.local is correct
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mentorconnect-odq1r.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mentorconnect-odq1r",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mentorconnect-odq1r.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "4254965563", // Replace or ensure .env.local
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:4254965563:web:ad393d28ad85cce4d6a11e", // Replace or ensure .env.local
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-4Q4MS2XE6X" // Optional, replace or ensure .env.local
};

let app: ReturnType<typeof initializeApp> | undefined;
let firebaseAuth: Auth | undefined;
let firestoreDb: Firestore | undefined;
let cloudFunctions: Functions | undefined;
let firebaseStorage: FirebaseStorage | undefined;
let firebaseAnalytics: Analytics | undefined;

let firebaseInitializationError: string | null = null;

function initializeFirebaseServices() {
  if (app) return; // Already initialized

  const apiKeyForDisplay = firebaseConfig.apiKey
    ? `${firebaseConfig.apiKey.substring(0, 4)}...${firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)}`
    : "MISSING/UNDEFINED!";
  console.log(`Firebase Config Initializing with API Key: ${apiKeyForDisplay} for projectId: ${firebaseConfig.projectId}`);

  // Check if essential config values are present
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    const errorMsg = "❌ FATAL: Missing essential Firebase configuration values (apiKey, authDomain, projectId).";
    console.error(errorMsg);
    console.error(`Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are correctly set for the "${firebaseConfig.projectId || 'UNKNOWN'}" project in your .env.local file or directly in firebase.ts if not using .env.local.`);
    console.error("Current firebaseConfig object in firebase.ts (relevant parts):", {
      apiKey: firebaseConfig.apiKey ? '****** (set)' : 'MISSING OR UNDEFINED!',
      authDomain: firebaseConfig.authDomain || 'MISSING OR UNDEFINED!',
      projectId: firebaseConfig.projectId || 'MISSING OR UNDEFINED!',
      storageBucket: firebaseConfig.storageBucket || 'NOT SET (but often needed for Storage)',
    });
    firebaseInitializationError = errorMsg + ` Please check configuration for project "${firebaseConfig.projectId || 'EXPECTED mentorconnect'}".`;
    // Do not throw here, let getFirebaseServices return the error
    return;
  }

  if (typeof window !== 'undefined') { // Ensure this runs only on the client-side
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      console.log(`Firebase App Initialized/Retrieved Successfully for project "${firebaseConfig.projectId}".`);

      try {
        firebaseAuth = getAuth(app);
        console.log("Firebase Auth Initialized.");
      } catch (e: any) {
        const authErrorMessage = `❌ Firebase Authentication initialization error: ${e.message}. This often indicates an issue with the API Key or Auth Domain for projectId "${firebaseConfig.projectId}". Please double-check these values and ensure Email/Password sign-in is ENABLED in your Firebase project console for "mentorconnect".`;
        console.error(authErrorMessage, e);
        if (!firebaseInitializationError) firebaseInitializationError = authErrorMessage;
        firebaseAuth = undefined;
      }

      if (app) {
         try {
           firestoreDb = getFirestore(app);
           console.log("Firestore Initialized.");
         } catch (e: any) {
           const dbErrorMessage = `❌ Firestore Initialization Error: ${e.message}`;
           console.error(dbErrorMessage, e);
           if (!firebaseInitializationError) firebaseInitializationError = `Firestore setup failed: ${dbErrorMessage}.`;
           firestoreDb = undefined;
         }

         try {
           firebaseStorage = getStorage(app);
           console.log("Cloud Storage Initialized.");
         } catch (e: any) {
           const storageErrMsg = `❌ Cloud Storage Initialization Error: ${e.message}`;
           console.error(storageErrMsg, e);
           if (!firebaseInitializationError) firebaseInitializationError = `Storage setup failed: ${storageErrMsg}.`;
           firebaseStorage = undefined;
         }

         if (firebaseConfig.measurementId) {
           try {
             firebaseAnalytics = getAnalytics(app);
             console.log("Firebase Analytics Initialized.");
           } catch (e: any) {
             console.warn(`Firebase Analytics initialization warning: ${e.message}`);
             firebaseAnalytics = undefined;
           }
         } else {
            console.log("Firebase Analytics not initialized (no measurementId in config).");
         }

         try {
           cloudFunctions = getFunctions(app);
           console.log("Cloud Functions Initialized.");
         } catch (e: any) {
           console.warn(`Cloud Functions initialization warning: ${e.message}`);
           cloudFunctions = undefined;
         }
      } else {
          const appInitFailureMsg = "Skipping Firestore/Functions/Storage/Analytics initialization because Firebase App object is undefined after attempting initialization.";
          console.warn(appInitFailureMsg);
          if (!firebaseInitializationError) firebaseInitializationError = appInitFailureMsg;
      }

    } catch (e: any) {
      const appErrorMessage = `❌ FATAL: Firebase App Main Initialization Error: ${e.message}. This often means the core Firebase config (projectId, apiKey, authDomain) for project "${firebaseConfig.projectId}" is incorrect or the Firebase project hasn't been set up correctly, or there's an issue with the API key validity/restrictions.`;
      console.error(appErrorMessage, e);
      if (!firebaseInitializationError) firebaseInitializationError = appErrorMessage;
      app = undefined; firebaseAuth = undefined; firestoreDb = undefined; cloudFunctions = undefined; firebaseStorage = undefined; firebaseAnalytics = undefined;
    }
  } else if (typeof window === 'undefined') {
      console.log("Firebase client-side initialization skipped on server-side (firebase.ts).");
  } else if (firebaseInitializationError) {
      // This case means essential config values were missing from the hardcoded object before window check
      console.error("Firebase initialization blocked on client due to missing essential config values in firebase.ts:", firebaseInitializationError);
  }
}


// Call initialization early, but it's guarded by `if (app) return;`
// and `typeof window !== 'undefined'`
if (typeof window !== 'undefined') {
    initializeFirebaseServices();
}


export function getFirebaseServices() {
  // Ensure initialization is attempted if not already done (e.g., for SSR or if called before client mount)
  // However, core services like auth, db need 'window' for full client-side SDKs.
  // The main initialization now happens above. This function just returns the state.
  if (typeof window !== 'undefined' && !app && !firebaseInitializationError) {
    // This might be redundant if initializeFirebaseServices is guaranteed to run on client before this is called.
    // Consider if this re-attempt is needed or if relying on the top-level call is sufficient.
    console.warn("getFirebaseServices: Attempting late initialization. This might indicate an issue with initial load timing.");
    initializeFirebaseServices();
  }
  return {
    app,
    auth: firebaseAuth,
    db: firestoreDb,
    functions: cloudFunctions,
    storage: firebaseStorage,
    analytics: firebaseAnalytics,
    error: firebaseInitializationError,
  };
}

// For direct imports, ensure they are used cautiously, checking for undefined if init can fail.
export {
    firebaseAuth as auth,
    firestoreDb as db,
    firebaseStorage as storage,
    cloudFunctions as functions,
    firebaseAnalytics as analytics,
    firebaseInitializationError,
    firebaseConfig // Exporting config for debugging or if other parts of app need it
};

export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
  const { storage: currentStorage, error: initErr } = getFirebaseServices();
  if (initErr || !currentStorage) {
    const message = initErr || "Firebase Storage service is unavailable for profile image upload.";
    console.error("uploadProfileImage Error:", message);
    throw new Error(message);
  }

  if (!userId || !file) {
    throw new Error("User ID and file are required for upload.");
  }

  const { v4: uuidv4 } = await import('uuid');
  const fileExtension = file.name.split('.').pop();
  const uniqueFilename = `${uuidv4()}.${fileExtension}`;
  const storagePath = `profilePictures/${userId}/${uniqueFilename}`;
  const storageRef = ref(currentStorage, storagePath);

  console.log(`Uploading profile picture to: ${storagePath}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Uploaded a blob or file!', snapshot);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File available at', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error("Upload failed:", error);
    throw new Error(`Failed to upload profile picture: ${error.message}`);
  }
};
