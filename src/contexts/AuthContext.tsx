
"use client"; // This needs to be a client component

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
// Import the initialized services and the error status directly
import { auth, db, firebaseInitializationError, getFirebaseServices } from "@/lib/firebase";
import type { User, UserType, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { SKILLS_AND_FIELDS, COURSES, UNIVERSITIES_SAMPLE } from '@/lib/constants';
import { Loader2 } from "lucide-react"; // Import Loader2

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  isClient: boolean; // Expose isClient state
  signUp: (email: string, pass: string, fullName: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass: string, userType: UserType) => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  completeProfile: (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => Promise<void>;
  checkProfileCompletion: (user: FirebaseUser) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper component for loading state
const GlobalLoadingIndicator = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
     <p className="ml-4 text-muted-foreground">Loading Authentication...</p>
  </div>
);

 // Helper component for Firebase initialization error
 const FirebaseConfigErrorScreen = ({ errorMsg }: { errorMsg: string }) => (
   <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
     <div>
       <h1 className="text-2xl font-bold mb-4">Firebase Initialization Error</h1>
       <p>{errorMsg || "An unknown Firebase initialization error occurred."}</p>
       <p className="mt-2 font-semibold">Troubleshooting:</p>
       <ul className="list-disc list-inside text-left max-w-lg mx-auto mt-1 text-sm">
         <li>Verify essential variables (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>..._AUTH_DOMAIN</code>, <code>..._PROJECT_ID</code>) are correct in your <code>.env.local</code> file.</li>
         <li>**Restart your Next.js development server** after any changes to <code>.env.local</code>.</li>
         <li>Check the Browser Console (Developer Tools) and Server Logs for more detailed Firebase errors (e.g., network issues, permission errors).</li>
         <li>Ensure Firebase Authentication (with Email/Password sign-in) and Firestore are enabled in your Firebase project console.</li>
         <li>Confirm your API key hasn't been restricted (e.g., by domain) in the Google Cloud Console / Firebase settings, preventing local development access.</li>
       </ul>
     </div>
   </div>
 );


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until auth state is resolved
  // Initialize error state directly with the potential initialization error from firebase.ts
  const [error, setError] = useState<string | null>(firebaseInitializationError);
  const [isClient, setIsClient] = useState(false); // Track client-side mount
  const router = useRouter();
  const pathname = usePathname();

  // Set isClient to true only on the client-side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchUserProfile = useCallback(async (firebaseUserInstance: FirebaseUser): Promise<User | null> => {
     // Use the imported `db` which should be initialized or undefined
     if (!db) {
        const dbErrorMsg = "Database service is unavailable. Cannot fetch profile. Check Firebase config and Firestore setup.";
        console.error("AuthContext: fetchUserProfile:", dbErrorMsg);
        setError(prev => prev || dbErrorMsg); // Set context error if not already set by init
        return null;
      }
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    try {
      console.log(`AuthContext: Fetching profile for UID: ${firebaseUserInstance.uid}`);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        // Basic validation: Check for essential fields expected after setup
        if (!userData.userType || !userData.hasOwnProperty('isProfileComplete')) {
           console.warn(`AuthContext: Fetched profile for ${firebaseUserInstance.uid} seems incomplete or malformed.`, userData);
        } else {
           console.log(`AuthContext: Profile found for UID: ${firebaseUserInstance.uid}`, { fullName: userData.fullName, userType: userData.userType, isProfileComplete: userData.isProfileComplete });
        }
        return userData;
      } else {
        console.log("AuthContext: No user profile found in Firestore for UID:", firebaseUserInstance.uid);
        return null; // Profile doesn't exist yet (needs setup)
      }
    } catch (e: any) {
      console.error(`❌ AuthContext: Error fetching user profile for ${firebaseUserInstance.uid}:`, e);
      setError(prev => prev || `Failed to fetch user profile: ${e.message}`);
      return null;
    }
  }, []); // No dependencies needed as db/setError are stable or handled by context


 const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser): Promise<boolean> => {
   if (!db) {
     const dbErrorMsg = "Database service unavailable. Cannot check profile completion.";
     console.error("AuthContext: checkProfileCompletion:", dbErrorMsg);
     setError(prev => prev || dbErrorMsg);
     return false;
   }
   const userDocRef = doc(db, "users", userInstance.uid);
   try {
     const userDoc = await getDoc(userDocRef);
     const isComplete = !!userDoc.exists() && !!userDoc.data()?.isProfileComplete;
     console.log(`AuthContext: Profile completion check for ${userInstance.uid}: ${isComplete}`);
     return isComplete;
   } catch (e: any) {
     console.error(`❌ AuthContext: Error checking profile completion for ${userInstance.uid}:`, e);
     setError(prev => prev || `Failed to check profile completion: ${e.message}`);
     return false; // Assume not complete on error
   }
 }, []); // No dependencies needed


  // Auth state listener and profile handling
  useEffect(() => {
    // 1. If there was a critical initialization error detected in firebase.ts, stop here.
    // The error state is already set. We just ensure loading stops.
    if (firebaseInitializationError) {
        console.error("AuthContext: Halting setup due to Firebase initialization error:", firebaseInitializationError);
        setLoading(false); // Stop loading as we can't proceed
        // Error state is already set from initial state
        return;
    }
    // 2. Ensure auth service (imported from firebase.ts) is actually available before setting up listener.
    if (!auth) {
      const authUnavailableMsg = "Authentication service is unavailable. Cannot monitor auth state. Check Firebase config/init logs.";
      console.error("AuthContext: " + authUnavailableMsg);
      setError(authUnavailableMsg); // Set error state
      setLoading(false);
      return;
    }

    // If we reach here, basic config seems okay and auth service is potentially available
    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      // Clear previous *runtime* errors on successful state change check, but keep *initialization* errors.
      if (!firebaseInitializationError) {
        setError(null);
      }

      if (user) {
        setFirebaseUser(user); // Set Firebase user immediately
        const userProfile = await fetchUserProfile(user); // Fetch profile (checks for db inside)
        if (!isMounted) return; // Check mount status again after async operation

        setCurrentUser(userProfile); // Set the detailed user profile (or null if fetch failed/no profile)

        // --- REDIRECTION LOGIC ---
        const isProfileSetupPage = pathname === "/profile/setup";
        const isLoginPage = pathname === "/login";
        const isLandingPage = pathname === "/";
        const isAuthRelatedPage = isProfileSetupPage || isLoginPage || isLandingPage;
        const isDashboardPage = pathname.startsWith('/dashboard');

        if (userProfile) {
          if (!userProfile.isProfileComplete) {
            if (!isProfileSetupPage) {
              console.log(`AuthContext: User profile incomplete, redirecting from ${pathname} to /profile/setup`);
              router.push("/profile/setup");
            } else {
              console.log("AuthContext: User profile incomplete, already on setup page.");
            }
          } else {
            if (isAuthRelatedPage) {
               console.log(`AuthContext: User profile complete. Redirecting from auth page ${pathname} to /dashboard/home`);
               router.push("/dashboard/home");
            } else {
               console.log(`AuthContext: User profile complete. Staying on current page: ${pathname}`);
            }
          }
        } else {
          if (!isProfileSetupPage) {
             console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile/fetch failed. Redirecting from ${pathname} to /profile/setup.`);
             router.push("/profile/setup");
          } else {
              console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile/fetch failed. Already on setup page.`);
          }
        }

      } else {
         // No user logged in (or signed out)
         console.log("AuthContext: No user authenticated.");
        setCurrentUser(null);
        setFirebaseUser(null);
        if (pathname.startsWith('/dashboard') || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated, redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      console.log("AuthContext: Auth state processed. Setting loading to false.");
      setLoading(false);

    }, (authListenerError) => {
      // Handle errors within the listener itself (e.g., network issues during check)
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", authListenerError);
      // Don't overwrite a potential initialization error with a listener error unless it's more specific
      setError(prev => prev || `Authentication check failed: ${authListenerError.message}`);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false); // Stop loading on listener error too
    });

    // Cleanup function
    return () => {
       console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
       isMounted = false;
       unsubscribe();
    }
    // Dependencies: Ensure router, fetchUserProfile, checkProfileCompletion, and pathname are included.
    // `auth` and `db` from firebase.ts are stable references after initial load.
  }, [router, fetchUserProfile, checkProfileCompletion, pathname]);


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    // Use the services obtained from firebase.ts
     const { auth: currentAuth, db: currentDb, error: initError } = getFirebaseServices();
     setError(initError); // Set potential init error first

     if (initError) {
        console.error("AuthContext: signUp: Cannot proceed due to Firebase initialization error:", initError);
        return null;
     }
    if (!currentAuth) {
      const message = "Firebase Auth service is not available. Cannot sign up.";
      setError(message);
      console.error("AuthContext: signUp:", message);
      return null;
    }
    if (!currentDb) {
      const message = "Firebase Firestore service is not available. Cannot create profile document.";
      setError(message);
      console.error("AuthContext: signUp:", message);
      return null;
    }
    // Clear previous runtime errors before attempting operation
    if (!initError) setError(null);


    try {
      console.log("AuthContext: Attempting signup for:", email);
      // Use the validated auth instance
      const userCredential = await createUserWithEmailAndPassword(currentAuth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      // Prepare initial data for Firestore
      const userDocRef = doc(currentDb, "users", user.uid);
      const initialUserData: Partial<BaseUser> = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        isProfileComplete: false,
      };

      await setDoc(userDocRef, {
          ...initialUserData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
         }, { merge: true });
      console.log("AuthContext: Firestore basic user document created for:", user.uid);

      console.log("AuthContext: Signup successful. Auth listener will handle state update and redirection.");
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = `Signup failed: ${e.message}`;

      if (e.code === 'auth/email-already-in-use') {
        userFriendlyError = 'This email address is already registered. Please try logging in or use a different email.';
      } else if (e.code === 'auth/weak-password') {
        userFriendlyError = 'Password is too weak. It must be at least 6 characters long.';
      } else if (e.code === 'auth/invalid-email') {
        userFriendlyError = 'The email address provided is not valid.';
      } else if (e.code === 'auth/operation-not-allowed') {
         userFriendlyError = 'Email/Password sign-up is not enabled for this project. Please contact support.';
         console.error("Check Firebase console -> Authentication -> Sign-in method -> Email/Password provider is enabled.");
      } else if (e.code === 'auth/invalid-api-key' || e.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
          userFriendlyError = 'Authentication failed due to an invalid API Key. Please double-check the NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file and restart the server.';
          console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
      }
       else {
         console.error(`Firebase Auth Error Code: ${e.code}`);
       }

      setError(userFriendlyError);
      return null;
    }
  };


  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
     const { auth: currentAuth, db: currentDb, error: initError } = getFirebaseServices();
     setError(initError);

     if (initError) {
       console.error("AuthContext: logIn: Cannot proceed due to Firebase initialization error:", initError);
       return null;
     }
    if (!currentAuth) {
      const message = "Firebase Auth service unavailable. Cannot log in.";
      setError(message);
      console.error("AuthContext: logIn:", message);
      return null;
    }
     if (!currentDb) {
      const message = "Firebase Firestore service unavailable. Cannot verify profile.";
      setError(message);
      console.error("AuthContext: logIn:", message);
      return null;
    }
    if (!initError) setError(null);

    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(currentAuth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      const userProfile = await fetchUserProfile(user); // Checks db inside

      if (error && !userProfile && !initError) { // If fetchUserProfile set an error (and it wasn't an init error)
         console.error(`AuthContext: Login aborted for ${user.uid} because profile fetch failed.`);
         await signOut(currentAuth);
         return null;
      }

      if (!userProfile) {
          console.warn(`AuthContext: Login successful for ${user.uid}, but no profile found. Needs setup.`);
          return user; // Let listener handle redirect
      }

      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setError(typeErrorMsg);
        await signOut(currentAuth);
        return null;
      }

      if (!userProfile.isProfileComplete) {
         console.warn(`AuthContext: Login successful for ${user.uid} (Role: ${userTypeAttempt}), but profile is incomplete.`);
         return user; // Let listener handle redirect
       }

      console.log(`AuthContext: Login successful and profile verified for ${user.uid} (Role: ${userTypeAttempt}). Listener will handle state/redirect.`);
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
      let userFriendlyError = `Login failed: ${e.message}`;

       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
         userFriendlyError = 'Invalid email or password provided. Please try again.';
       } else if (e.code === 'auth/too-many-requests') {
          userFriendlyError = 'Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.';
       } else if (e.code === 'auth/user-disabled') {
            userFriendlyError = 'This user account has been disabled. Please contact support.';
       } else if (e.code === 'auth/invalid-api-key' || e.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
           userFriendlyError = 'Authentication failed due to an invalid API Key. Check console logs and .env.local.';
           console.error("Ensure NEXT_PUBLIC_FIREBASE_API_KEY in .env.local is correct and server restarted.");
       }
       else {
         console.error(`Firebase Auth Error Code: ${e.code}`);
       }
       setError(userFriendlyError);
      return null;
    }
  };


  const logOut = async () => {
    const { auth: currentAuth, error: initError } = getFirebaseServices();
    setError(initError);
     if (initError || !currentAuth) {
       const message = initError || "Firebase Auth service unavailable. Cannot log out.";
       setError(message);
       console.error("AuthContext: logOut:", message);
      return;
    }
     if (!initError) setError(null);

    try {
      await signOut(currentAuth);
      console.log("AuthContext: User logged out successfully. Listener will handle state updates and redirect.");
       setCurrentUser(null);
       setFirebaseUser(null);
       router.push('/login');
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    }
  };


 const updateUserProfile = async (userId: string, data: Partial<User>) => {
     const { db: currentDb, firebaseUser: currentFirebaseUser, error: initError } = getFirebaseServices();
     setError(initError);

     if (initError) {
        console.error("AuthContext: updateUserProfile: Cannot proceed due to Firebase initialization error:", initError);
        throw new Error(initError);
     }
    if (!currentDb) {
      const message = "Firestore service unavailable. Cannot update profile.";
      setError(message);
      console.error("AuthContext: updateUserProfile:", message);
      throw new Error(message);
    }
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
        const message = "Authorization error: Cannot update profile for another user or not logged in.";
        setError(message);
        console.error("AuthContext: updateUserProfile:", message);
        throw new Error(message);
    }
     if (!initError) setError(null);

    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(currentDb, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(userDocRef, updateData);
      console.log("AuthContext: Profile updated successfully in Firestore for user:", userId);

      setCurrentUser(prev => prev ? { ...prev, ...data, updatedAt: Date.now() } as User : null);

    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Update Failed for ${userId}:`, e);
       const updateErrorMsg = `Could not update profile: ${e.message}`;
       setError(updateErrorMsg);
       throw new Error(updateErrorMsg);
    }
  };


 const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
     const { db: currentDb, firebaseUser: currentFirebaseUser, error: initError } = getFirebaseServices();
     setError(initError);

     if (initError) {
        console.error("AuthContext: completeProfile: Cannot proceed due to Firebase initialization error:", initError);
        throw new Error(initError);
     }
    if (!currentDb) {
      const message = "Firestore service unavailable. Cannot complete profile.";
      setError(message);
      console.error("AuthContext: completeProfile:", message);
      throw new Error(message);
    }
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
       const message = "Authorization error: Incorrect user trying to complete profile.";
       setError(message);
       console.error("AuthContext: completeProfile:", message);
       throw new Error(message);
    }
     if (!initError) setError(null);

    try {
      console.log("AuthContext: Completing profile for user:", userId, "as", userType);
      const userDocRef = doc(currentDb, "users", userId);

      const existingDocSnap = await getDoc(userDocRef);
      if (!existingDocSnap.exists()) {
           throw new Error("User base record not found during profile completion. Signup might have failed partially.");
      }
      const existingData = existingDocSnap.data();

      const finalProfileData = {
        ...existingData,
        ...profileData,
        userType: userType,
        isProfileComplete: true,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, finalProfileData);
      console.log("AuthContext: Profile completed and saved to Firestore for user:", userId);

      setCurrentUser({ ...finalProfileData, createdAt: existingData.createdAt?.toMillis() || Date.now(), updatedAt: Date.now() } as User);
      console.log("AuthContext: currentUser state updated. Auth listener useEffect should handle redirect from /profile/setup.");

    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Completion Failed for ${userId}:`, e);
       const completeErrorMsg = `Could not complete profile: ${e.message}`;
       setError(completeErrorMsg);
       throw new Error(completeErrorMsg);
    }
  };


  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error,
    isClient,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
    checkProfileCompletion,
  };

  // --- Rendering Logic ---

   // 1. Handle Firebase Initialization Error Immediately
   // Render error screen on client, return null on server to avoid hydration mismatch if error occurs server-side
   if (error && error.includes("FATAL")) { // Check for the fatal initialization error
     if (isClient) {
       return <FirebaseConfigErrorScreen errorMsg={error} />;
     } else {
       // Avoid rendering the error screen on the server during initial load/build
       // to prevent potential hydration issues if client initializes correctly later.
       // A loading indicator might be safer here during SSR if an init error occurs.
       // For now, returning null on server if init fails.
       return null;
     }
   }

  // 2. Show Loading Indicator while auth state is resolving OR client is mounting
  if (loading || !isClient) {
    return <GlobalLoadingIndicator />;
  }


  // 3. Render children only when not loading, client is mounted, and no init error
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
