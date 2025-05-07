'use client';

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase"; // Ensure auth and db are correctly initialized and exported
import type { User, UserType, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { SKILLS_AND_FIELDS, COURSES, UNIVERSITIES_SAMPLE } from '@/lib/constants';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, pass: string, fullName: string) => Promise<FirebaseUser | null>;
  logIn: (email: string, pass: string, userType: UserType) => Promise<FirebaseUser | null>;
  logOut: () => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  completeProfile: (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => Promise<void>;
  checkProfileCompletion: (user: FirebaseUser) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check if Firebase config is valid before doing anything else
  const isFirebaseConfigValid = !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  const fetchUserProfile = useCallback(async (firebaseUserInstance: FirebaseUser) => {
     if (!db) {
        console.error("Firestore (db) not initialized, cannot fetch profile.");
        setError("Database service is unavailable.");
        return null;
      }
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User; // Ensure UID is included
        // Don't set state here, return the data
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
  }, []); // Removed db dependency as it should be stable after init

  const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser) => {
    // Directly fetch to check completion status without updating main state here
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
  }, []); // Removed db dependency


  useEffect(() => {
    // Only proceed if Firebase config is valid and services are potentially available
    if (!isFirebaseConfigValid) {
        console.error("AuthContext: Invalid Firebase config detected. Auth listener will not be set up.");
        setError("Firebase configuration is missing or invalid. Please check environment variables.");
        setLoading(false);
        return;
    }
    if (!auth) {
      console.warn("AuthContext: Firebase Auth not initialized. Skipping AuthStateChanged listener setup.");
      setError("Authentication service is unavailable.");
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setLoading(true);
      setError(null); // Clear previous errors on auth state change

      if (user) {
        setFirebaseUser(user);
        const userProfile = await fetchUserProfile(user);
        setCurrentUser(userProfile); // Update currentUser state

        if (userProfile) {
           console.log("AuthContext: User profile fetched:", userProfile);
          if (!userProfile.isProfileComplete) {
            // Profile is incomplete
            if (pathname !== "/profile/setup") {
              console.log(`AuthContext: User profile incomplete, redirecting from ${pathname} to /profile/setup`);
              router.push("/profile/setup");
            } else {
              console.log("AuthContext: User profile incomplete, already on /profile/setup.");
            }
          } else {
            // Profile IS complete
             console.log(`AuthContext: User profile complete. Current path: ${pathname}`);
            if (pathname === "/profile/setup" || pathname === "/login" || pathname === "/") {
              console.log("AuthContext: Redirecting from setup/login/landing to /dashboard/home");
              router.push("/dashboard/home");
            }
            // else: on another dashboard page or public page, do nothing special here.
          }
        } else {
          // No Firestore profile exists for the authenticated user (e.g., during signup flow before profile setup)
           console.log(`AuthContext: User authenticated (${user.uid}) but no Firestore profile found. Current path: ${pathname}`);
          if (pathname !== "/profile/setup") {
             console.log("AuthContext: Redirecting to /profile/setup");
            router.push("/profile/setup");
          } else {
             console.log("AuthContext: No Firestore profile, already on /profile/setup.");
          }
        }
      } else {
        // No user logged in
         console.log("AuthContext: No user logged in.");
        setCurrentUser(null);
        setFirebaseUser(null);
        const publicPaths = ["/", "/login"]; // Add any other public paths
        if (!publicPaths.includes(pathname) && pathname !== "/profile/setup") {
           console.log(`AuthContext: User not authenticated, redirecting from ${pathname} to /login`);
           router.push("/login");
        }
      }
      setLoading(false);
    }, (authError) => {
      console.error("AuthContext: Error in onAuthStateChanged listener:", authError);
      setError("Authentication check failed. Please refresh.");
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
    });

    return () => {
       console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
       unsubscribe();
    }
    // Add currentUser to dependencies: when it changes (e.g., after profile completion), re-evaluate redirection logic.
  }, [router, fetchUserProfile, pathname, checkProfileCompletion, isFirebaseConfigValid, currentUser]);


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
        createdAt: Date.now(),
      };
      await setDoc(userDocRef, initialUserData, { merge: true });
      console.log("AuthContext: Firestore basic user document created:", user.uid);

      // Set Firebase user, but current user will be null until profile fetched by listener
      setFirebaseUser(user);
      setCurrentUser(null); // Explicitly set to null as profile is not complete

      // Redirect is handled by useEffect based on profile status after auth state changes
      console.log("AuthContext: Signup successful, useEffect should handle redirection to /profile/setup.");
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
      return null;
    } finally {
      setLoading(false);
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
      // Don't set state here, let onAuthStateChanged handle it
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Fetch profile immediately to verify type *before* letting listener proceed
      const userProfile = await fetchUserProfile(user);

      if (userProfile && userProfile.userType !== userTypeAttempt) {
        const errorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}.`;
        console.error("AuthContext: " + errorMsg);
        setError(errorMsg);
        await signOut(auth); // Sign out the user
        return null; // Prevent listener from setting user state
      }

      // If type matches or profile doesn't exist yet, let the listener handle state updates and redirects
      console.log("AuthContext: Login credentials valid. Listener will handle profile check and redirection.");
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
         setError('Invalid email or password. Please try again.');
       } else {
         setError(e.message || 'An unexpected error occurred during login.');
       }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    setError(null);
     if (!auth) {
      const message = "Firebase Auth service not available. Cannot log out.";
      setError(message);
       console.error("AuthContext: " + message);
      setLoading(false);
      return;
    }
    try {
      await signOut(auth);
      // State updates (currentUser, firebaseUser to null) handled by onAuthStateChanged listener
      // Redirect handled by listener as well
      console.log("AuthContext: User logged out successfully. Listener will redirect.");
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    // setLoading(true); // Maybe handle loading state specific to this operation if needed
    setError(null);
    if (!db) {
      const message = "Firestore service not available. Cannot update profile.";
      setError(message);
      console.error("AuthContext: " + message);
      // setLoading(false);
      return;
    }
    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { ...data, updatedAt: Date.now() });
      console.log("AuthContext: Profile updated successfully for user:", userId);

      // Re-fetch profile after update to refresh context state
      if(firebaseUser && firebaseUser.uid === userId) {
        const updatedProfile = await fetchUserProfile(firebaseUser);
        setCurrentUser(updatedProfile); // Directly update state here
      }
    } catch (e: any) {
       console.error("❌ AuthContext: Profile Update Failed:", e);
      setError(e.message || "Could not update profile.");
      throw e; // Re-throw error so calling component knows it failed
    } finally {
      // setLoading(false);
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    setLoading(true); // Use main loading indicator during profile completion
    setError(null);
     if (!db) {
       const message = "Firestore service not available. Cannot complete profile.";
      setError(message);
       console.error("AuthContext: " + message);
      setLoading(false);
      return;
    }
    try {
      console.log("AuthContext: Completing profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      const finalProfileData = {
        ...profileData,
        userType,
        isProfileComplete: true,
        updatedAt: Date.now(),
      };
      await updateDoc(userDocRef, finalProfileData);
      console.log("AuthContext: Profile completed successfully in Firestore for user:", userId);

      // Fetch the updated profile to trigger state change and useEffect redirection
      if(firebaseUser && firebaseUser.uid === userId) {
        const updatedProfile = await fetchUserProfile(firebaseUser);
        setCurrentUser(updatedProfile); // Update state to trigger useEffect
        console.log("AuthContext: currentUser state updated. useEffect should now redirect.");
      } else {
         console.warn("AuthContext: firebaseUser mismatch or missing during profile completion.");
      }
      // Redirect is handled by useEffect reacting to currentUser change
    } catch (e: any) {
       console.error("❌ AuthContext: Profile Completion Failed:", e);
       setError(e.message || "An unexpected error occurred while completing profile.");
       throw e; // Re-throw error
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, error, signUp, logIn, logOut, updateUserProfile, completeProfile, checkProfileCompletion }}>
      {/* Only render children when Firebase config is valid, otherwise show an error or loading state */}
      {isFirebaseConfigValid ? (
         !loading ? children : <GlobalLoadingIndicator /> // Show children when not loading, or indicator
      ) : (
        <FirebaseConfigErrorScreen /> // Show error screen if config is invalid
      )}
      {/* {loading && <GlobalLoadingIndicator />} // Moved loading inside conditional */}
    </AuthContext.Provider>
  );
};

// Helper component for loading state
const GlobalLoadingIndicator = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <p>Loading Authentication...</p> {/* Replace with a spinner if desired */}
  </div>
);

// Helper component for Firebase config error state
const FirebaseConfigErrorScreen = () => (
   <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
     <div>
       <h1 className="text-2xl font-bold mb-4">Firebase Configuration Error</h1>
       <p>There's an issue with the Firebase setup.</p>
       <p>Please check the console logs and ensure your <code>.env.local</code> file has the correct Firebase environment variables (<code>NEXT_PUBLIC_FIREBASE_...</code>).</p>
     </div>
   </div>
 );


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
