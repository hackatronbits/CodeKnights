
"use client"; // This needs to be a client component

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db, firebaseInitializationError } from "@/lib/firebase"; // Ensure auth and db are correctly initialized and exported
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

 const FirebaseConfigErrorScreen = ({ errorMsg }: { errorMsg: string }) => (
   <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
     <div>
       <h1 className="text-2xl font-bold mb-4">Firebase Initialization Error</h1>
       <p>{errorMsg || "An unknown Firebase initialization error occurred."}</p>
       <p className="mt-2">Please check the browser console and server logs for more details.</p>
       <p className="font-semibold mt-2">Common causes:</p>
       <ul className="list-disc list-inside text-left max-w-md mx-auto mt-1">
         <li>Missing or incorrect Firebase config variables (<code>NEXT_PUBLIC_FIREBASE_...</code>) in <code>.env.local</code>.</li>
         <li>Firebase services (Auth, Firestore) not enabled in the Firebase project console.</li>
         <li>Network issues preventing connection to Firebase.</li>
         <li>Incorrect API key or other configuration details.</li>
       </ul>
     </div>
   </div>
 );


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until auth state is resolved
  const [error, setError] = useState<string | null>(firebaseInitializationError); // Initialize with potential init error
  const [isClient, setIsClient] = useState(false); // Track client-side mount
  const router = useRouter();
  const pathname = usePathname();

  // Set isClient to true only on the client-side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchUserProfile = useCallback(async (firebaseUserInstance: FirebaseUser): Promise<User | null> => {
     // Check if db service is available EARLY
     if (!db) {
        const dbErrorMsg = "Database service is unavailable. Cannot fetch profile. Check Firebase config and Firestore setup.";
        console.error("AuthContext: fetchUserProfile:", dbErrorMsg);
        setError(dbErrorMsg); // Set context error
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
           // Depending on strictness, you might return null or the partial data
           // For now, return the data but log a warning. Might need redirection logic adjustment.
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
      setError(`Failed to fetch user profile: ${e.message}`);
      return null;
    }
  }, []); // No dependencies needed as db/setError are stable or handled by context


 const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser): Promise<boolean> => {
   if (!db) {
     const dbErrorMsg = "Database service unavailable. Cannot check profile completion.";
     console.error("AuthContext: checkProfileCompletion:", dbErrorMsg);
     setError(dbErrorMsg);
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
     setError(`Failed to check profile completion: ${e.message}`);
     return false; // Assume not complete on error
   }
 }, []); // No dependencies needed


  // Auth state listener and profile handling
  useEffect(() => {
    // 1. If there was a critical initialization error, stop here.
    if (firebaseInitializationError) {
        console.warn("AuthContext: Skipping onAuthStateChanged listener due to Firebase initialization error:", firebaseInitializationError);
        setError(firebaseInitializationError); // Ensure the error state reflects the init error
        setLoading(false); // Stop loading as we can't proceed
        return;
    }
    // 2. Ensure auth service is actually available before setting up listener.
    if (!auth) {
      const authErrorMsg = "Authentication service is unavailable. Cannot monitor auth state. Check Firebase config and Auth setup.";
      console.error("AuthContext: " + authErrorMsg);
      setError(authErrorMsg);
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setError(null); // Clear previous non-init errors on successful state change check

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
          // User is authenticated AND has a profile document in Firestore
          if (!userProfile.isProfileComplete) {
            // Profile exists but isn't marked complete
            if (!isProfileSetupPage) {
              console.log(`AuthContext: User profile incomplete, redirecting from ${pathname} to /profile/setup`);
              router.push("/profile/setup");
            } else {
              console.log("AuthContext: User profile incomplete, already on setup page.");
            }
          } else {
            // Profile exists AND is complete
            if (isAuthRelatedPage) {
               console.log(`AuthContext: User profile complete. Redirecting from auth page ${pathname} to /dashboard/home`);
               router.push("/dashboard/home");
            } else {
               console.log(`AuthContext: User profile complete. Staying on current page: ${pathname}`);
               // No redirect needed if already on a dashboard or other allowed page
            }
          }
        } else {
          // User is authenticated (Firebase Auth knows them) BUT no Firestore profile found (or fetch failed)
          // This means they need to go through the profile setup.
          if (!isProfileSetupPage) {
             console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile. Redirecting from ${pathname} to /profile/setup.`);
             router.push("/profile/setup");
          } else {
              console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile. Already on setup page.`);
          }
        }
        // --- END REDIRECTION LOGIC ---

      } else {
         // No user logged in (or signed out)
         console.log("AuthContext: No user authenticated.");
        setCurrentUser(null);
        setFirebaseUser(null);
        // Redirect away from protected areas if not logged in
        if (pathname.startsWith('/dashboard') || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated, redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      // Set loading to false *after* all checks and potential redirects are initiated
      console.log("AuthContext: Auth state processed. Setting loading to false.");
      setLoading(false);

    }, (authError) => {
      // Handle errors within the listener itself (e.g., network issues during check)
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", authError);
      setError(`Authentication check failed: ${authError.message}`);
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
  }, [router, fetchUserProfile, checkProfileCompletion, pathname]);


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    setError(null); // Clear previous errors

    // Check if services are available *before* attempting the operation
    if (!auth) {
      const message = "Firebase Auth service is not initialized. Cannot sign up.";
      setError(message);
      console.error("AuthContext: signUp:", message);
      return null;
    }
    if (!db) {
      const message = "Firebase Firestore service is not initialized. Cannot create profile document.";
      setError(message);
      console.error("AuthContext: signUp:", message);
      return null;
    }

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      // Prepare initial data for Firestore
      const userDocRef = doc(db, "users", user.uid);
      const initialUserData: Partial<BaseUser> = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        isProfileComplete: false,
        // Timestamps will be added by Firestore server
      };

      // Write initial user data to Firestore
      await setDoc(userDocRef, {
          ...initialUserData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
         }, { merge: true }); // Use merge: true just in case (though unlikely needed for new doc)
      console.log("AuthContext: Firestore basic user document created for:", user.uid);

      // IMPORTANT: Do NOT manually set state here.
      // The onAuthStateChanged listener is the source of truth and will pick up the new user automatically.
      // Manually setting state here can lead to race conditions and inconsistent UI.
      console.log("AuthContext: Signup successful. Auth listener will handle state update and redirection.");
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = `Signup failed: ${e.message}`; // Default to Firebase message

      // Provide more specific user-friendly messages for common errors
      if (e.code === 'auth/email-already-in-use') {
        userFriendlyError = 'This email address is already registered. Please try logging in or use a different email.';
      } else if (e.code === 'auth/weak-password') {
        userFriendlyError = 'Password is too weak. It must be at least 6 characters long.';
      } else if (e.code === 'auth/invalid-email') {
        userFriendlyError = 'The email address provided is not valid.';
      } else if (e.code === 'auth/operation-not-allowed') {
         userFriendlyError = 'Email/Password sign-up is not enabled for this project. Please contact support.';
         console.error("Check Firebase console -> Authentication -> Sign-in method -> Email/Password provider is enabled.");
      } else if (e.code === 'auth/invalid-api-key') {
          userFriendlyError = 'Authentication failed: Invalid API Key. Please contact support.';
          console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
      }
       else {
         // Log less common codes for debugging
         console.error(`Firebase Auth Error Code: ${e.code}`);
       }

      setError(userFriendlyError);
      return null;
    }
  };


  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
    setError(null);
    // Check services
    if (!auth) {
      const message = "Firebase Auth service unavailable. Cannot log in.";
      setError(message);
      console.error("AuthContext: logIn:", message);
      return null;
    }
     if (!db) { // Check db too, as we need it immediately after auth
      const message = "Firebase Firestore service unavailable. Cannot verify profile.";
      setError(message);
      console.error("AuthContext: logIn:", message);
      return null;
    }

    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Immediately fetch profile to verify type and completion status
      const userProfile = await fetchUserProfile(user); // Checks db inside

      // Case 1: Profile fetch failed (error already set by fetchUserProfile)
      if (error && !userProfile) {
         console.error(`AuthContext: Login aborted for ${user.uid} because profile fetch failed.`);
         await signOut(auth); // Sign out the user as we can't confirm their status
         return null;
      }

      // Case 2: Auth successful, but no profile exists in Firestore
      if (!userProfile) {
          console.warn(`AuthContext: Login successful for ${user.uid}, but no profile found. Needs setup.`);
          // Allow login. The onAuthStateChanged listener will see the user
          // and the null profile, triggering the redirect to /profile/setup.
          return user;
      }

      // Case 3: Profile exists, check user type match
      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setError(typeErrorMsg);
        await signOut(auth); // Sign out the user due to incorrect role attempt
        return null;
      }

      // Case 4: Profile exists and type matches, check completion
      if (!userProfile.isProfileComplete) {
         console.warn(`AuthContext: Login successful for ${user.uid} (Role: ${userTypeAttempt}), but profile is incomplete.`);
         // Allow login. The onAuthStateChanged listener will see the user
         // and the incomplete profile, triggering redirect to /profile/setup.
         return user;
       }

      // Case 5: Login successful, profile exists, type matches, profile complete.
      console.log(`AuthContext: Login successful and profile verified for ${user.uid} (Role: ${userTypeAttempt}). Listener will handle state/redirect.`);
      // Let the listener handle setting context state and potential redirects (e.g., from /login to /dashboard)
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
      let userFriendlyError = `Login failed: ${e.message}`; // Default

       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
         userFriendlyError = 'Invalid email or password provided. Please try again.';
       } else if (e.code === 'auth/too-many-requests') {
          userFriendlyError = 'Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.';
       } else if (e.code === 'auth/user-disabled') {
            userFriendlyError = 'This user account has been disabled. Please contact support.';
       } else if (e.code === 'auth/invalid-api-key') {
           userFriendlyError = 'Authentication failed: Invalid API Key. Please contact support.';
           console.error("Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
       }
       else {
         console.error(`Firebase Auth Error Code: ${e.code}`);
       }
       setError(userFriendlyError);
      return null;
    }
  };


  const logOut = async () => {
    setError(null);
     if (!auth) {
       const message = "Firebase Auth service unavailable. Cannot log out.";
       setError(message);
       console.error("AuthContext: logOut:", message);
      return;
    }
    try {
      await signOut(auth);
      console.log("AuthContext: User logged out successfully. Listener will handle state updates and redirect.");
      // State updates (currentUser=null, firebaseUser=null) and redirects are handled by the listener
      // Explicitly clear local state as well, though listener should overwrite
       setCurrentUser(null);
       setFirebaseUser(null);
       // Force redirect to login after logout
       router.push('/login');
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    }
  };


 const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setError(null);
    if (!db) {
      const message = "Firestore service unavailable. Cannot update profile.";
      setError(message);
      console.error("AuthContext: updateUserProfile:", message);
      throw new Error(message);
    }
    // Ensure the user trying to update is the currently logged-in user
    if (!firebaseUser || firebaseUser.uid !== userId) {
        const message = "Authorization error: Cannot update profile for another user or not logged in.";
        setError(message);
        console.error("AuthContext: updateUserProfile:", message);
        throw new Error(message);
    }

    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(userDocRef, updateData);
      console.log("AuthContext: Profile updated successfully in Firestore for user:", userId);

      // Optimistically update local state for immediate UI feedback
      // Ensure `updatedAt` is handled appropriately if needed locally (e.g., set to Date.now())
      // Note: serverTimestamp() only works on write, it won't be immediately available in `updateData`
      setCurrentUser(prev => prev ? { ...prev, ...data, updatedAt: Date.now() } as User : null);

    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Update Failed for ${userId}:`, e);
       const updateErrorMsg = `Could not update profile: ${e.message}`;
       setError(updateErrorMsg);
       throw new Error(updateErrorMsg); // Re-throw error for the calling component to handle
    }
  };


 const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    setError(null);
    if (!db) {
      const message = "Firestore service unavailable. Cannot complete profile.";
      setError(message);
      console.error("AuthContext: completeProfile:", message);
      throw new Error(message);
    }
    if (!firebaseUser || firebaseUser.uid !== userId) {
       const message = "Authorization error: Incorrect user trying to complete profile.";
       setError(message);
       console.error("AuthContext: completeProfile:", message);
       throw new Error(message);
    }

    try {
      console.log("AuthContext: Completing profile for user:", userId, "as", userType);
      const userDocRef = doc(db, "users", userId);

      // Fetch existing base data first (like fullName, email) to merge with new profile details
      const existingDocSnap = await getDoc(userDocRef);
      if (!existingDocSnap.exists()) {
           // This shouldn't happen if signup created the base doc, but handle defensively
           throw new Error("User base record not found during profile completion. Signup might have failed partially.");
      }
      const existingData = existingDocSnap.data();

      // Prepare the complete profile data, merging existing and new info
      const finalProfileData = {
        ...existingData,       // Keep uid, email, fullName, createdAt from initial signup
        ...profileData,        // Add the new fields (course/university or bio/field)
        userType: userType,    // Set the chosen userType
        isProfileComplete: true, // Mark as complete
        updatedAt: serverTimestamp(), // Update the timestamp
      };

      // Use setDoc with merge: false (or just setDoc) to ensure the document matches finalProfileData exactly
      // Using setDoc without merge overwrites the entire document.
      await setDoc(userDocRef, finalProfileData);
      console.log("AuthContext: Profile completed and saved to Firestore for user:", userId);

      // Update local state immediately *after* successful Firestore write
      // Use the data we *just* wrote (convert serverTimestamp placeholder if needed for local display)
      setCurrentUser({ ...finalProfileData, createdAt: existingData.createdAt?.toMillis() || Date.now(), updatedAt: Date.now() } as User);
      console.log("AuthContext: currentUser state updated. Auth listener useEffect should handle redirect from /profile/setup.");
      // No explicit redirect here - the listener useEffect will detect the change in currentUser.isProfileComplete
      // when the component re-renders and handle the redirect to the dashboard.

    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Completion Failed for ${userId}:`, e);
       const completeErrorMsg = `Could not complete profile: ${e.message}`;
       setError(completeErrorMsg);
       throw new Error(completeErrorMsg); // Re-throw for the form to handle
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

  // 1. Handle Firebase Initialization Error Immediately (Client-side only rendering for error screen)
  if (isClient && firebaseInitializationError) {
    return <FirebaseConfigErrorScreen errorMsg={firebaseInitializationError} />;
  }

  // 2. Show Loading Indicator while auth state is resolving OR client is mounting
  // OR if there's an initialization error but we're still on the server (prevent flashing error)
   if (loading || !isClient || (!isClient && firebaseInitializationError)) {
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
