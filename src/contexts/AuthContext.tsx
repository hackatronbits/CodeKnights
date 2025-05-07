
"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db, firebaseInitializationError } from "@/lib/firebase"; // Import error status too
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

// Moved outside the component for clarity and reuse
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
       <p>{errorMsg}</p>
       <p className="mt-2">Please check the browser console and server logs for more details.</p>
       <p>Ensure your <code>.env.local</code> file has the correct Firebase environment variables (<code>NEXT_PUBLIC_FIREBASE_...</code>) and that the services (Auth, Firestore) are enabled in your Firebase project.</p>
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
     // Check if db service is available
     if (!db) {
        console.error("AuthContext: Firestore (db) not available, cannot fetch profile.");
        setError("Database service is unavailable. Check Firebase configuration.");
        return null;
      }
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    try {
      console.log(`AuthContext: Fetching profile for UID: ${firebaseUserInstance.uid}`);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        console.log(`AuthContext: Profile found for UID: ${firebaseUserInstance.uid}`, userData);
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
  }, []); // Include setError in dependencies if used directly inside

  const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser) => {
     if (!db) {
      console.error("AuthContext: Firestore (db) not available, cannot check profile completion.");
      setError("Database service is unavailable. Check Firebase configuration.");
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
      return false;
    }
  }, []); // Include setError in dependencies if used directly inside

  // Auth state listener and profile handling
  useEffect(() => {
    // If there was an initialization error, don't set up the listener
    if (firebaseInitializationError) {
        console.warn("AuthContext: Skipping onAuthStateChanged listener due to Firebase initialization error.");
        setLoading(false);
        return;
    }
    // Ensure auth service is available
    if (!auth) {
      console.warn("AuthContext: Firebase Auth service not available. Skipping AuthStateChanged listener setup.");
      setError("Authentication service is unavailable. Check Firebase configuration.");
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setError(null); // Clear previous errors on successful state change check

      if (user) {
        setFirebaseUser(user);
        const userProfile = await fetchUserProfile(user);
        if (!isMounted) return;
        
        setCurrentUser(userProfile);

        // Redirect logic based on profile status
        if (userProfile) {
           console.log("AuthContext: User profile fetched:", userProfile);
          if (!userProfile.isProfileComplete) {
            if (pathname !== "/profile/setup") {
              console.log(`AuthContext: User profile incomplete, redirecting from ${pathname} to /profile/setup`);
              router.push("/profile/setup");
            }
          } else {
             // Profile is complete, redirect from non-dashboard pages if necessary
             const nonDashboardPaths = ["/", "/login", "/profile/setup"];
             if (nonDashboardPaths.includes(pathname)) {
                console.log(`AuthContext: User profile complete. Redirecting from ${pathname} to /dashboard/home`);
                router.push("/dashboard/home");
             } else {
                console.log(`AuthContext: User profile complete. Staying on current dashboard path: ${pathname}`);
             }
          }
        } else {
           // User authenticated but NO Firestore profile (or fetch failed)
           console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile found or fetch failed. Current path: ${pathname}`);
           // Only redirect if not already on the setup page
           if (pathname !== "/profile/setup") {
             console.log("AuthContext: Redirecting to /profile/setup");
             router.push("/profile/setup");
           }
        }
      } else {
         // No user logged in
         console.log("AuthContext: No user logged in.");
        setCurrentUser(null);
        setFirebaseUser(null);
        // Redirect from protected areas if not logged in
        if (pathname.startsWith('/dashboard') || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated, redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      // Set loading to false *after* all checks and potential redirects are initiated
      // This is the crucial point where initial auth state is resolved.
      console.log("AuthContext: Initial auth state resolved. Setting loading to false.");
      setLoading(false);
    }, (authError) => {
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", authError);
      setError(`Authentication check failed: ${authError.message}`);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false); // Set loading false on error too
    });

    return () => {
       console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
       isMounted = false;
       unsubscribe();
    }
    // Dependencies: Ensure necessary functions and router are included. Add firebaseInitializationError.
  }, [router, fetchUserProfile, checkProfileCompletion, pathname, firebaseInitializationError]); // Added pathname


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    setError(null); // Clear previous errors
    // Check if services are available
    if (!auth || !db) {
      const message = "Firebase services not available. Cannot sign up.";
      setError(message);
      console.error("AuthContext: " + message);
      return null;
    }

    // Don't set loading here, let the listener handle it after creation/profile check
    // setIsLoading(true); // Example if using a local loading state for the signup button

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      const userDocRef = doc(db, "users", user.uid);
      const initialUserData: Partial<BaseUser> = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        isProfileComplete: false,
        // Use serverTimestamp() for Firestore write, but Date.now() for immediate local state
      };

      // Write to Firestore using serverTimestamp
      await setDoc(userDocRef, {
          ...initialUserData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp() // Also set updatedAt on creation
         }, { merge: true });
      console.log("AuthContext: Firestore basic user document created:", user.uid);

      // No need to manually setFirebaseUser/setCurrentUser here,
      // the onAuthStateChanged listener will pick up the new user.
      console.log("AuthContext: Signup successful. Listener will handle state update and redirection.");

      // setIsLoading(false); // Example if using local loading state
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = 'An unexpected error occurred during signup.';
      if (e.code === 'auth/email-already-in-use') {
        userFriendlyError = 'This email address is already in use.';
      } else if (e.code === 'auth/weak-password') {
        userFriendlyError = 'Password is too weak. Please choose a stronger password (at least 6 characters).';
      } else if (e.message) {
          userFriendlyError = e.message;
      }
      setError(userFriendlyError);
      // setIsLoading(false); // Example if using local loading state
      return null;
    }
  };

  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
    setError(null);
    // Check if services are available
     if (!auth || !db) {
      const message = "Firebase services not available. Cannot log in.";
      setError(message);
      console.error("AuthContext: " + message);
      return null;
    }
    // Don't set loading here, listener handles it
    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Verify user type immediately after auth success
      const userProfile = await fetchUserProfile(user); // fetchUserProfile already checks for db

      // Handle case where profile fetch itself failed
      if (!userProfile && error) { // If fetch failed and set an error
         console.error("AuthContext: Login aborted because profile fetch failed.");
         await signOut(auth); // Sign out because we couldn't verify the profile
         return null;
      }

      // Handle profile doesn't exist (user needs setup)
      if (!userProfile) {
          console.warn(`AuthContext: Login successful for ${user.uid}, but no profile found. Needs setup.`);
          // Allow login, listener will redirect to /profile/setup
          return user;
      }

      // Handle incorrect user type
      if (userProfile.userType !== userTypeAttempt) {
        const errorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please log in using the correct role.`;
        console.error("AuthContext: " + errorMsg);
        setError(errorMsg);
        await signOut(auth); // Sign out incorrect login attempt
        return null;
      }

      // Handle incomplete profile
       if (!userProfile.isProfileComplete) {
         console.warn(`AuthContext: Login successful for ${user.uid}, but profile is incomplete.`);
         // Allow login, listener will redirect to /profile/setup
         return user;
       }

      console.log("AuthContext: Login credentials and profile type valid. Listener will handle state update and redirection.");
      // Listener handles setting context state and loading=false
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
      let userFriendlyError = 'An unexpected error occurred during login.';
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
         userFriendlyError = 'Invalid email or password. Please try again.';
       } else if (e.message) {
         userFriendlyError = e.message;
       }
       setError(userFriendlyError);
      return null;
    }
  };

  const logOut = async () => {
    setError(null);
     if (!auth) {
      const message = "Firebase Auth service not available. Cannot log out.";
      setError(message);
       console.error("AuthContext: " + message);
      return;
    }
    try {
      await signOut(auth);
      console.log("AuthContext: User logged out successfully. Listener will handle state updates and redirect.");
      // State updates and redirects are handled by the listener
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setError(null);
    if (!db) {
      const message = "Firestore service not available. Cannot update profile.";
      setError(message);
      console.error("AuthContext: " + message);
      throw new Error(message); // Throw for immediate feedback in UI
    }
    if (!currentUser || currentUser.uid !== userId) {
        const message = "Authorization error: Cannot update profile for another user.";
        setError(message);
        console.error("AuthContext: " + message);
        throw new Error(message);
    }

    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      // Use serverTimestamp() for updates
      await updateDoc(userDocRef, { ...data, updatedAt: serverTimestamp() });
      console.log("AuthContext: Profile updated successfully for user:", userId);

      // Optimistically update local state *or* re-fetch
      // Optimistic update:
      setCurrentUser(prev => prev ? { ...prev, ...data } as User : null);
      // Or re-fetch for consistency (might cause brief flicker):
      // const updatedProfile = await fetchUserProfile(currentUser); // Use currentUser which should be firebaseUser
      // setCurrentUser(updatedProfile);

    } catch (e: any) {
       console.error("❌ AuthContext: Profile Update Failed:", e);
       const updateErrorMsg = `Could not update profile: ${e.message}`;
       setError(updateErrorMsg);
       throw new Error(updateErrorMsg); // Re-throw error
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    setError(null);
     if (!db) {
       const message = "Firestore service not available. Cannot complete profile.";
      setError(message);
       console.error("AuthContext: " + message);
      throw new Error(message);
    }
     if (!firebaseUser || firebaseUser.uid !== userId) {
        const message = "Authorization error: Cannot complete profile for incorrect user.";
        setError(message);
        console.error("AuthContext: " + message);
        throw new Error(message);
    }

    try {
      console.log("AuthContext: Completing profile for user:", userId, "as", userType);
      const userDocRef = doc(db, "users", userId);
      // Fetch existing data first to merge, preserving createdAt etc.
      const existingDoc = await getDoc(userDocRef);
      if (!existingDoc.exists()) {
           throw new Error("User base record not found. Cannot complete profile.");
      }
      const existingData = existingDoc.data();

      const finalProfileData = {
        ...existingData, // Keep existing fields like fullName, email, createdAt
        ...profileData, // Add new profile-specific fields
        userType,
        isProfileComplete: true,
        updatedAt: serverTimestamp(), // Set/update timestamp
      };
      await setDoc(userDocRef, finalProfileData); // Use setDoc to overwrite/add fields
      console.log("AuthContext: Profile completed successfully in Firestore for user:", userId);

      // Update local state immediately to trigger listener/redirect logic
      setCurrentUser(finalProfileData as User); // Assume finalProfileData matches User structure after write
      console.log("AuthContext: currentUser state updated after profile completion. Listener will handle redirect.");

    } catch (e: any) {
       console.error("❌ AuthContext: Profile Completion Failed:", e);
       const completeErrorMsg = `An unexpected error occurred while completing profile: ${e.message}`;
       setError(completeErrorMsg);
       throw new Error(completeErrorMsg);
    }
  };


  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error,
    isClient, // Pass isClient
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
    checkProfileCompletion,
  };

  // --- Rendering Logic ---

  // 1. Handle Firebase Initialization Error Immediately
  if (firebaseInitializationError) {
    return <FirebaseConfigErrorScreen errorMsg={firebaseInitializationError} />;
  }

  // 2. Show Loading Indicator while auth state is resolving (and client is mounting)
  // This covers the initial load AND potential delays if auth takes time.
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

