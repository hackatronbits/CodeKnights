
"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Ensure auth and db are correctly initialized and exported
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
  </div>
);

const FirebaseConfigErrorScreen = () => (
   <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
     <div>
       <h1 className="text-2xl font-bold mb-4">Firebase Configuration Error</h1>
       <p>There's an issue with the Firebase setup.</p>
       <p>Please check the console logs and ensure your <code>.env.local</code> file has the correct Firebase environment variables (<code>NEXT_PUBLIC_FIREBASE_...</code>).</p>
     </div>
   </div>
 );

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until auth state is resolved
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // Track client-side mount
  const router = useRouter();
  const pathname = usePathname();

  const isFirebaseConfigValid = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  // Set isClient to true only on the client-side after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchUserProfile = useCallback(async (firebaseUserInstance: FirebaseUser): Promise<User | null> => {
     if (!db) {
        console.error("Firestore (db) not initialized, cannot fetch profile.");
        setError("Database service is unavailable.");
        return null;
      }
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        return userData;
      } else {
        console.log("No user profile found in Firestore for UID:", firebaseUserInstance.uid);
        return null;
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
      setError("Failed to fetch user profile.");
      return null;
    }
  }, []); // No dependencies needed if db init is stable

  const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser) => {
    if (!db) {
      console.error("Firestore (db) not initialized, cannot check profile completion.");
      return false;
    }
    const userDocRef = doc(db, "users", userInstance.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      return !!userDoc.exists() && !!userDoc.data()?.isProfileComplete;
    } catch (e) {
      console.error("Error checking profile completion:", e);
      return false;
    }
  }, []); // No dependencies needed if db init is stable

  // Auth state listener and profile handling
  useEffect(() => {
    if (!isFirebaseConfigValid) {
        console.warn("AuthContext: Invalid Firebase config. Auth listener will not be set up.");
        setLoading(false); // Stop loading if config is invalid
        return;
    }
    if (!auth) {
      console.warn("AuthContext: Firebase Auth not initialized. Skipping AuthStateChanged listener setup.");
      setError("Authentication service is unavailable.");
      setLoading(false); // Stop loading if auth is not available
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setError(null);

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
            if (pathname === "/profile/setup" || pathname === "/login" || pathname === "/") {
              console.log("AuthContext: Redirecting from setup/login/landing to /dashboard/home");
              router.push("/dashboard/home");
            }
          }
        } else {
           // User authenticated but no Firestore profile (needs setup)
           console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile found. Current path: ${pathname}`);
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
        const publicPaths = ["/", "/login"]; // Define public paths
        // Redirect from protected areas if not logged in
        if (pathname.startsWith('/dashboard') || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated, redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      // Set loading to false *after* all checks and potential redirects are initiated
      setLoading(false);
    }, (authError) => {
      if (!isMounted) return;
      console.error("AuthContext: Error in onAuthStateChanged listener:", authError);
      setError("Authentication check failed. Please refresh.");
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false); // Set loading false on error too
    });

    return () => {
       console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
       isMounted = false;
       unsubscribe();
    }
    // Dependencies: Ensure necessary functions and router are included.
  }, [router, fetchUserProfile, checkProfileCompletion, isFirebaseConfigValid, pathname]);


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    if (!isFirebaseConfigValid || !auth || !db) {
      const message = "Firebase services not available. Cannot sign up.";
      setError(message);
      console.error("AuthContext: " + message);
      setLoading(false);
      return null;
    }
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
        createdAt: Date.now(), // Use client timestamp for immediate context update
      };
      // Use serverTimestamp() when writing to Firestore
      await setDoc(userDocRef, { ...initialUserData, createdAt: serverTimestamp() }, { merge: true });
      console.log("AuthContext: Firestore basic user document created:", user.uid);

      setFirebaseUser(user);
      // Update local state immediately, listener will eventually confirm
      setCurrentUser({
          ...initialUserData,
          userType: undefined, // Not known yet
          isProfileComplete: false,
          createdAt: initialUserData.createdAt!,
      } as any);

      console.log("AuthContext: Signup successful, listener should handle redirection to /profile/setup.");
      // setLoading will be handled by the listener
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      if (e.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(e.message || 'An unexpected error occurred during signup.');
      }
       setLoading(false); // Stop loading on error
      return null;
    }
  };

  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
     if (!isFirebaseConfigValid || !auth || !db) {
      const message = "Firebase services not available. Cannot log in.";
      setError(message);
      console.error("AuthContext: " + message);
      setLoading(false);
      return null;
    }
    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Verify user type immediately after auth success
      const userProfile = await fetchUserProfile(user);

      if (userProfile && userProfile.userType !== userTypeAttempt) {
        const errorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}.`;
        console.error("AuthContext: " + errorMsg);
        setError(errorMsg);
        await signOut(auth); // Sign out incorrect login attempt
         setLoading(false); // Stop loading
        return null;
      }

      console.log("AuthContext: Login credentials valid. Listener will handle state update and redirection.");
      // Let listener handle setLoading(false) after its checks complete
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
         setError('Invalid email or password. Please try again.');
       } else {
         setError(e.message || 'An unexpected error occurred during login.');
       }
       setLoading(false); // Stop loading on error
      return null;
    }
  };

  const logOut = async () => {
    // setLoading(true); // Let listener handle loading state changes
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
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    }
    // Listener handles setting loading to false after state update
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setError(null);
    if (!db) {
      const message = "Firestore service not available. Cannot update profile.";
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

      // Re-fetch profile to update context state immediately
      if(firebaseUser && firebaseUser.uid === userId) {
        const updatedProfile = await fetchUserProfile(firebaseUser);
        setCurrentUser(updatedProfile);
      }
    } catch (e: any) {
       console.error("❌ AuthContext: Profile Update Failed:", e);
      setError(e.message || "Could not update profile.");
      throw e; // Re-throw error
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    // setLoading(true); // Keep loading=true via listener state
    setError(null);
     if (!db) {
       const message = "Firestore service not available. Cannot complete profile.";
      setError(message);
       console.error("AuthContext: " + message);
      // setLoading(false);
      throw new Error(message);
    }
    try {
      console.log("AuthContext: Completing profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      const finalProfileData = {
        ...profileData,
        userType,
        isProfileComplete: true,
        // updatedAt will be set by serverTimestamp
      };
      await updateDoc(userDocRef, { ...finalProfileData, updatedAt: serverTimestamp() });
      console.log("AuthContext: Profile completed successfully in Firestore for user:", userId);

      // Fetch the updated profile to update context state which triggers listener/redirect
      if(firebaseUser && firebaseUser.uid === userId) {
        const updatedProfile = await fetchUserProfile(firebaseUser);
        setCurrentUser(updatedProfile);
        console.log("AuthContext: currentUser state updated after profile completion. Listener will redirect.");
      } else {
         console.warn("AuthContext: firebaseUser mismatch or missing during profile completion.");
      }
    } catch (e: any) {
       console.error("❌ AuthContext: Profile Completion Failed:", e);
       setError(e.message || "An unexpected error occurred while completing profile.");
       // Let listener handle setLoading(false)
       throw e;
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

  // 1. Handle Invalid Config Immediately (can be checked on server/client)
  if (!isFirebaseConfigValid) {
    // Render error screen directly, no need for context provider here
    return <FirebaseConfigErrorScreen />;
  }

  // 2. Provide Context and Render Children
  // The consuming components (like RootLayout or DashboardLayout) MUST now
  // use the `loading` and `isClient` state from the context to decide
  // whether to show a loading indicator or the actual content.
  // This prevents AuthProvider itself from causing hydration mismatches due to
  // conditional rendering based on auth state before the client is ready.
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
