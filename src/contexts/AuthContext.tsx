
"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase"; // Correctly import the helper
import type { User, UserType, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { SKILLS_AND_FIELDS, COURSES, UNIVERSITIES_SAMPLE } from '@/lib/constants';
import { Loader2 } from "lucide-react"; // Import Loader2

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null; // Raw Firebase user object
  loading: boolean;
  error: string | null;
  isClient: boolean; // Expose isClient state
  signUp: (email: string, pass: string, fullName: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass: string, userType: UserType) => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  completeProfile: (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => Promise<void>;
  // checkProfileCompletion removed as it's handled internally by fetchUserProfile
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
  const [initializationError, setInitializationError] = useState<string | null>(null); // Separate state for init errors
  const [runtimeError, setRuntimeError] = useState<string | null>(null); // State for runtime errors
  const [isClient, setIsClient] = useState(false); // Track client-side mount
  const router = useRouter();
  const pathname = usePathname();

  // Check for initialization error on mount
  useEffect(() => {
      const { error: initErr } = getFirebaseServices();
      if (initErr) {
          console.error("AuthProvider: Detected Firebase Initialization Error on mount:", initErr);
          setInitializationError(initErr);
          setLoading(false); // Stop loading if init failed
      }
      setIsClient(true); // Mark as client-mounted
  }, []);

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUser): Promise<User | null> => {
     const { db: currentDb, error: initErr } = getFirebaseServices(); // Check services again
     if (initErr) {
         console.error("AuthContext: fetchUserProfile: Cannot fetch profile due to init error:", initErr);
         // Don't overwrite the initial error, but maybe log a runtime one if needed?
         setRuntimeError(prev => prev || "Database service unavailable due to initialization issues.");
         return null;
     }
     if (!currentDb) {
        const dbErrorMsg = "Database service is unavailable. Cannot fetch profile.";
        console.error("AuthContext: fetchUserProfile:", dbErrorMsg);
        setRuntimeError(prev => prev || dbErrorMsg);
        return null;
      }

    const userDocRef = doc(currentDb, "users", fbUser.uid);
    try {
      console.log(`AuthContext: Fetching profile for UID: ${fbUser.uid}`);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as any; // Use any temporarily

        // Convert Timestamps to numbers for local state consistency
        const createdAt = userData.createdAt instanceof Timestamp ? userData.createdAt.toMillis() : userData.createdAt;
        const updatedAt = userData.updatedAt instanceof Timestamp ? userData.updatedAt.toMillis() : userData.updatedAt;

        const finalUserData: User = {
            ...userData,
            createdAt: createdAt || Date.now(), // Fallback if missing
            updatedAt: updatedAt || Date.now(), // Fallback if missing
        } as User;


        // Basic validation
        if (!finalUserData.userType || !finalUserData.hasOwnProperty('isProfileComplete')) {
           console.warn(`AuthContext: Fetched profile for ${fbUser.uid} seems incomplete or malformed.`, finalUserData);
           // If profile seems incomplete but user exists, return it anyway; let logic handle redirection
        } else {
           console.log(`AuthContext: Profile found for UID: ${fbUser.uid}`, { fullName: finalUserData.fullName, userType: finalUserData.userType, isProfileComplete: finalUserData.isProfileComplete });
        }
        return finalUserData;
      } else {
        console.log("AuthContext: No user profile found in Firestore for UID:", fbUser.uid);
        // Return null but don't set an error, this means profile setup is needed
        return null;
      }
    } catch (e: any) {
      console.error(`❌ AuthContext: Error fetching user profile for ${fbUser.uid}:`, e);
      setRuntimeError(prev => prev || `Failed to fetch user profile: ${e.message}`);
      return null;
    }
  }, []); // Dependencies: None, relies on getFirebaseServices inside


  // Auth state listener and profile handling
  useEffect(() => {
    // 1. If there was a critical initialization error, stop here.
    if (initializationError) {
        console.error("AuthContext: Halting onAuthStateChanged setup due to initialization error:", initializationError);
        return; // Do nothing further if Firebase didn't initialize
    }

    const { auth: currentAuth } = getFirebaseServices(); // Get potentially initialized auth service

    // 2. Ensure auth service is available before setting up listener.
    if (!currentAuth) {
      const authUnavailableMsg = "Authentication service is unavailable. Cannot monitor auth state.";
      console.error("AuthContext Listener Setup: " + authUnavailableMsg);
      // Set as initialization error because it prevents core functionality
      setInitializationError(prev => prev || authUnavailableMsg);
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setRuntimeError(null); // Clear previous runtime errors on state change check

      if (user) {
        setFirebaseUser(user); // Set raw Firebase user object
        const userProfile = await fetchUserProfile(user); // Fetch detailed profile (or null)
        if (!isMounted) return;

        setCurrentUser(userProfile); // Set the detailed user profile state

        // --- REDIRECTION LOGIC ---
        const isProfileSetupPage = pathname === "/profile/setup";
        const isAuthPage = pathname === "/login" || pathname === "/"; // Landing/Signup is "/"
        const isDashboardPage = pathname.startsWith('/dashboard');

        if (userProfile) { // Profile exists in Firestore
          if (userProfile.isProfileComplete) {
            // Profile complete: redirect away from auth/setup pages to dashboard
            if (isAuthPage || isProfileSetupPage) {
               console.log(`AuthContext: Profile complete. Redirecting from ${pathname} to /dashboard/home`);
               router.push("/dashboard/home");
            } else {
               console.log(`AuthContext: Profile complete. Staying on ${pathname}.`);
            }
          } else {
            // Profile exists but incomplete: redirect to setup unless already there
            if (!isProfileSetupPage) {
              console.log(`AuthContext: Profile incomplete. Redirecting from ${pathname} to /profile/setup`);
              router.push("/profile/setup");
            } else {
                 console.log("AuthContext: Profile incomplete. Already on setup page.");
            }
          }
        } else {
          // No profile found in Firestore (or fetch failed): needs setup
          if (!isProfileSetupPage) {
             console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile. Redirecting from ${pathname} to /profile/setup.`);
             router.push("/profile/setup");
          } else {
               console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile. Already on setup page.`);
          }
        }

      } else {
         // No user logged in (or signed out)
         console.log("AuthContext: No user authenticated.");
        setCurrentUser(null);
        setFirebaseUser(null);
        // Redirect away from protected routes
        if (isDashboardPage || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated. Redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      console.log("AuthContext: Auth state processed. Setting loading to false.");
      setLoading(false);

    }, (listenerError) => {
      // Handle errors within the listener itself
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", listenerError);
      setRuntimeError(prev => prev || `Authentication check failed: ${listenerError.message}`);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
    });

    // Cleanup function
    return () => {
       console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
       isMounted = false;
       unsubscribe();
    }
  }, [initializationError, router, fetchUserProfile, pathname]); // Depend on initError to prevent setup if failed


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
     const { auth: currentAuth, db: currentDb, error: initErr } = getFirebaseServices();
     setRuntimeError(null); // Clear previous runtime errors
     if (initErr) { // Prioritize checking init error
        console.error("AuthContext: signUp: Cannot proceed due to Firebase initialization error:", initErr);
        setInitializationError(initErr); // Ensure init error state reflects this
        return null;
     }
     if (!currentAuth || !currentDb) {
       const message = !currentAuth ? "Auth service unavailable." : "DB service unavailable.";
       console.error("AuthContext: signUp:", message);
       setRuntimeError(message);
       return null;
     }

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(currentAuth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      const userDocRef = doc(currentDb, "users", user.uid);
      // Create the *initial* base user document
      const initialUserData: BaseUser = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        userType: "student", // Default or prompt later? Assuming default for now
        isProfileComplete: false, // Profile is NOT complete yet
        createdAt: Date.now(), // Use client timestamp for initial state consistency
        // Other fields like profileImageUrl, contactNo, address, etc., will be added during profile completion
      };

      await setDoc(userDocRef, {
          ...initialUserData,
          createdAt: serverTimestamp(), // Use server timestamp for Firestore record
          updatedAt: serverTimestamp()
         }); // Don't merge initially, set the base doc
      console.log("AuthContext: Firestore base user document created for:", user.uid);

      // Update local state slightly ahead of listener for snappier feel (optional)
      // setFirebaseUser(user);
      // setCurrentUser({ ...initialUserData }); // Set incomplete profile locally

      console.log("AuthContext: Signup successful. Listener will handle state update and redirection to profile setup.");
      return user; // Let listener handle the main state update and redirect

    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = `Signup failed. Code: ${e.code || 'UNKNOWN'}`;

       if (e.code === 'auth/email-already-in-use') {
         userFriendlyError = 'This email address is already registered. Please try logging in or use a different email.';
       } else if (e.code === 'auth/weak-password') {
         userFriendlyError = 'Password is too weak. It must be at least 6 characters long.';
       } else if (e.code === 'auth/invalid-email') {
         userFriendlyError = 'The email address provided is not valid.';
       } else if (e.code === 'auth/operation-not-allowed') {
          userFriendlyError = 'Email/Password sign-up is not enabled for this project. Please contact support.';
          console.error("Check Firebase console -> Authentication -> Sign-in method -> Email/Password provider is enabled.");
       } else if (e.code?.includes('invalid-api-key')) { // Broader check for API key issues
           userFriendlyError = 'Authentication failed due to an invalid API Key. Please double-check your Firebase configuration in .env.local and restart the server.';
           console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY and other config in .env.local");
       }
       else {
         console.error(`Firebase Auth Error Code: ${e.code}, Message: ${e.message}`);
         userFriendlyError = e.message; // Default to Firebase message if code not recognized
       }

      setRuntimeError(userFriendlyError);
      return null;
    }
  };


  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
     const { auth: currentAuth, db: currentDb, error: initErr } = getFirebaseServices();
     setRuntimeError(null); // Clear previous runtime errors
     if (initErr) {
       console.error("AuthContext: logIn: Cannot proceed due to Firebase initialization error:", initErr);
       setInitializationError(initErr);
       return null;
     }
     if (!currentAuth || !currentDb) {
        const message = !currentAuth ? "Auth service unavailable." : "DB service unavailable.";
        console.error("AuthContext: logIn:", message);
        setRuntimeError(message);
        return null;
     }

    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(currentAuth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Fetch profile *after* successful auth. fetchUserProfile handles db check inside.
      const userProfile = await fetchUserProfile(user);

      // Check if fetchUserProfile encountered an error *after* successful login
       if (runtimeError && !userProfile) {
          console.error(`AuthContext: Login succeeded for ${user.uid} but profile fetch failed. Logging out. Error: ${runtimeError}`);
          await signOut(currentAuth); // Log out user if profile fetch fails critically
          // Error state already set by fetchUserProfile
          return null;
       }


      if (!userProfile) {
          console.warn(`AuthContext: Login successful for ${user.uid}, but no Firestore profile exists. Needs setup.`);
          // Don't set error here. Listener will see authenticated user + null profile and redirect to setup.
          // Update local state immediately (optional, listener will catch up)
          setFirebaseUser(user);
          setCurrentUser(null);
          return user;
      }

      // Profile exists, now verify userType and completion
      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setRuntimeError(typeErrorMsg);
        await signOut(currentAuth); // Log out due to role mismatch
        setCurrentUser(null);       // Clear local state
        setFirebaseUser(null);
        return null;
      }

      // Login successful, role matches. Listener will handle state & redirection based on completion.
      console.log(`AuthContext: Login successful and role verified for ${user.uid} (Role: ${userTypeAttempt}). Profile complete: ${userProfile.isProfileComplete}. Listener will handle state/redirect.`);
      // Update local state (optional, listener will catch up)
      // setFirebaseUser(user);
      // setCurrentUser(userProfile);
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
      let userFriendlyError = `Login failed. Code: ${e.code || 'UNKNOWN'}`;

       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
         userFriendlyError = 'Invalid email or password provided. Please try again.';
       } else if (e.code === 'auth/too-many-requests') {
          userFriendlyError = 'Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.';
       } else if (e.code === 'auth/user-disabled') {
            userFriendlyError = 'This user account has been disabled. Please contact support.';
       } else if (e.code?.includes('invalid-api-key')) {
           userFriendlyError = 'Authentication failed due to an invalid API Key. Check Firebase configuration.';
           console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY and other config in .env.local");
       } else {
         console.error(`Firebase Auth Error Code: ${e.code}, Message: ${e.message}`);
         userFriendlyError = e.message;
       }
       setRuntimeError(userFriendlyError);
       setCurrentUser(null); // Clear local state on login failure
       setFirebaseUser(null);
      return null;
    }
  };


  const logOut = async () => {
    const { auth: currentAuth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr || !currentAuth) {
       const message = initErr || "Firebase Auth service unavailable. Cannot log out.";
       setInitializationError(prev => prev || message); // Use init error state
       console.error("AuthContext: logOut:", message);
      return;
    }

    try {
      await signOut(currentAuth);
      console.log("AuthContext: User logged out successfully.");
       // Clear state immediately, listener will confirm shortly
       setCurrentUser(null);
       setFirebaseUser(null);
       router.push('/login'); // Force redirect client-side
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setRuntimeError(e.message || "Failed to log out.");
    }
  };


 const updateUserProfile = async (userId: string, data: Partial<User>) => {
     const { db: currentDb, auth: currentAuth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr) {
        console.error("AuthContext: updateUserProfile: Cannot proceed due to init error:", initErr);
        setInitializationError(initErr);
        throw new Error(initErr);
     }
    if (!currentDb || !currentAuth) {
      const message = !currentDb ? "DB service unavailable." : "Auth service unavailable.";
      console.error("AuthContext: updateUserProfile:", message);
      setRuntimeError(message);
      throw new Error(message);
    }
    const currentFirebaseUser = currentAuth.currentUser;
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
        const message = "Authorization error: Cannot update profile for another user or not logged in.";
        console.error("AuthContext: updateUserProfile:", message, { functionUserId: userId, authUserId: currentFirebaseUser?.uid });
        setRuntimeError(message);
        throw new Error(message);
    }

    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(currentDb, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(userDocRef, updateData);
      console.log("AuthContext: Profile updated successfully in Firestore for user:", userId);

      // Optimistically update local state
       const localTimestamp = Date.now();
       const updatedFields = { ...data, updatedAt: localTimestamp }; // Use client time for immediate update
       setCurrentUser(prev => prev ? { ...prev, ...updatedFields } as User : null);


    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Update Failed for ${userId}:`, e);
       const updateErrorMsg = `Could not update profile: ${e.message}`;
       setRuntimeError(updateErrorMsg);
       throw new Error(updateErrorMsg);
    }
  };


 const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
     const { db: currentDb, auth: currentAuth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr) {
        console.error("AuthContext: completeProfile: Cannot proceed due to init error:", initErr);
        setInitializationError(initErr);
        throw new Error(initErr);
     }
    if (!currentDb || !currentAuth) {
      const message = !currentDb ? "DB service unavailable." : "Auth service unavailable.";
      console.error("AuthContext: completeProfile:", message);
      setRuntimeError(message);
      throw new Error(message);
    }

    const currentFirebaseUser = currentAuth.currentUser; // Get current user *now*

    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
       const message = "Authorization error: Incorrect user trying to complete profile.";
       console.error("AuthContext: completeProfile:", message, { functionUserId: userId, authUserId: currentFirebaseUser?.uid });
       setRuntimeError(message);
       throw new Error(message); // Throw error to be caught by caller
    }

    try {
      console.log("AuthContext: Completing profile for user:", userId, "as", userType);
      const userDocRef = doc(currentDb, "users", userId);

      const existingDocSnap = await getDoc(userDocRef);
      if (!existingDocSnap.exists()) {
           console.error(`AuthContext: completeProfile: Base user document not found for UID: ${userId}. Signup might have failed partially.`);
           throw new Error("User base record not found during profile completion.");
      }
      const existingData = existingDocSnap.data();

      // Construct the final profile data object carefully
       const finalProfileData: User = {
         ...(existingData as BaseUser), // Start with existing base data (email, fullName, createdAt)
         ...profileData,                // Add/overwrite with new specific profile data
         uid: userId,                  // Ensure UID is present
         userType: userType,
         isProfileComplete: true,
         updatedAt: serverTimestamp() as any, // Use server timestamp for the update
         // Ensure required BaseUser fields are present, using existing or fallback if needed
         email: existingData.email || currentFirebaseUser.email || '',
         fullName: existingData.fullName || currentFirebaseUser.displayName || '',
         createdAt: existingData.createdAt || serverTimestamp() as any, // Keep original createdAt
       };


      // Overwrite the document with the complete profile
      await setDoc(userDocRef, finalProfileData);
      console.log("AuthContext: Profile completed and saved to Firestore for user:", userId);

      // Update local state immediately
      const localTimestamp = Date.now();
      const localProfileDataForState = {
          ...finalProfileData,
          // Convert server timestamps to numbers for local state
          createdAt: (finalProfileData.createdAt as Timestamp)?.toMillis?.() || (existingData.createdAt as Timestamp)?.toMillis?.() || localTimestamp,
          updatedAt: localTimestamp
      } as User;

      setCurrentUser(localProfileDataForState);
      console.log("AuthContext: currentUser state updated after profile completion.");
      // Let the listener/useEffect handle redirection from /profile/setup page

    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Completion Failed for ${userId}:`, e);
       const completeErrorMsg = `Could not complete profile: ${e.message}`;
       setRuntimeError(completeErrorMsg);
       throw new Error(completeErrorMsg); // Re-throw to be caught by caller UI
    }
  };


  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error: runtimeError || initializationError, // Combine errors, prioritizing init error
    isClient,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
  };

  // --- Rendering Logic ---

   // 1. Handle Firebase Initialization Error Immediately
   if (initializationError) {
     if (isClient) {
       return <FirebaseConfigErrorScreen errorMsg={initializationError} />;
     } else {
       // Avoid rendering error screen on server to prevent potential hydration issues
       // Render minimal loading or null during SSR if init fails
       return <GlobalLoadingIndicator />; // Or return null;
     }
   }

  // 2. Show Loading Indicator while auth state is resolving OR client is mounting
  // Ensure loading remains true until *after* the initial auth state check completes
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

    