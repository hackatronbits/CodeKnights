
"use client";

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

  const fetchUserProfile = useCallback(async (firebaseUserInstance: FirebaseUser) => {
     if (!db) {
        console.error("Firestore (db) not initialized, cannot fetch profile.");
        return null;
      }
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        setCurrentUser(userData);
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
  }, []);

  const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser) => {
    const userProfile = await fetchUserProfile(userInstance);
    return !!userProfile?.isProfileComplete; // Return true if profile exists and is complete, false otherwise
  }, [fetchUserProfile]);


  useEffect(() => {
    // Ensure Firebase Auth is initialized before setting up the listener
    if (!auth) {
      console.warn("Firebase Auth not initialized. Skipping AuthStateChanged listener setup.");
      setLoading(false); // Stop loading indicator if auth is unavailable
      // Optionally set an error state or show a message to the user
      setError("Authentication service is unavailable. Please check configuration.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null); // Clear previous errors on auth state change
      if (user) {
        setFirebaseUser(user);
        const userProfile = await fetchUserProfile(user);
        if (userProfile) {
          if (!userProfile.isProfileComplete && pathname !== "/profile/setup") {
             console.log("User profile incomplete, redirecting to setup.");
             router.push("/profile/setup");
          } else if (userProfile.isProfileComplete && (pathname === "/" || pathname === "/login" || pathname === "/profile/setup")) {
            console.log("User profile complete, redirecting to dashboard.");
            router.push("/dashboard/home");
          }
           // If profile is complete and already on a dashboard page, do nothing.
        } else {
          // New user, profile not yet created in Firestore, might be part of signup flow
          // If user exists in Auth but not Firestore, likely needs profile setup
          if (pathname !== "/profile/setup") {
            console.log("User authenticated but no Firestore profile found, redirecting to setup.");
            router.push("/profile/setup");
          }
        }
      } else {
        // No user logged in
        setCurrentUser(null);
        setFirebaseUser(null);
        // Allow access to public pages
        const publicPaths = ["/", "/login"]; // Add any other public paths
        if (!publicPaths.includes(pathname) && pathname !== "/profile/setup") { // Allow setup page during signup flow
           // console.log("User not authenticated, redirecting to landing page.");
          // router.push("/"); // Redirect non-public pages to landing if not logged in
          // Temporarily disabling redirect to allow development of other pages without login
        }
      }
      setLoading(false);
    }, (authError) => {
      // Handle errors from onAuthStateChanged listener itself
      console.error("Error in onAuthStateChanged listener:", authError);
      setError("Authentication check failed. Please refresh.");
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, fetchUserProfile, pathname, checkProfileCompletion]); // Removed 'auth' from deps as it should be stable

  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    if (!auth || !db) {
      setError("Firebase services not available. Cannot sign up.");
      console.error("Attempted signup when Auth or Firestore is not initialized.");
      setLoading(false);
      return null;
    }
    try {
      console.log("Attempting to sign up user:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("Firebase Auth user created successfully:", user.uid);

      // Create a basic user document in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const initialUserData: Partial<BaseUser> = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        isProfileComplete: false,
        // userType will be set during profile completion
        createdAt: Date.now(),
      };
      await setDoc(userDocRef, initialUserData, { merge: true });
      console.log("Firestore basic user document created for:", user.uid);

      setFirebaseUser(user); // Set Firebase user immediately
      // Don't set currentUser yet, profile is incomplete.
      // Redirect is handled by useEffect now.
      // router.push("/profile/setup"); // Redirect is now handled by useEffect
      console.log("Signup successful, user should be redirected to profile setup by useEffect.");
      return user;
    } catch (e: any) {
      console.error("❌ Signup Failed:", e);
      // Provide more specific error feedback
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
     if (!auth) {
      setError("Firebase Auth service not available. Cannot log in.");
      console.error("Attempted login when Auth is not initialized.");
      setLoading(false);
      return null;
    }
    try {
      console.log("Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      setFirebaseUser(user); // Set Firebase user immediately
      console.log("Firebase Auth successful for:", user.uid);

      // Fetch profile immediately after login to check type and completion
      const userProfile = await fetchUserProfile(user);

      if (userProfile) {
        console.log("User profile fetched:", userProfile);
        if (userProfile.userType !== userTypeAttempt) {
           const errorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}.`;
           console.error(errorMsg);
           setError(errorMsg);
          await signOut(auth); // Sign out the user
          setCurrentUser(null);
          setFirebaseUser(null);
          return null;
        }
        // Redirect logic is now handled by useEffect based on profile status
         if (!userProfile.isProfileComplete) {
             console.log("Login successful, profile incomplete.");
             // Redirect handled by useEffect
         } else {
            console.log("Login successful, profile complete.");
            // Redirect handled by useEffect
         }
      } else {
         // This case means user exists in Auth but not Firestore (shouldn't happen with current signup flow)
         console.warn("User authenticated but no Firestore profile found. Treating as incomplete profile.");
         setError("Profile data missing. Please complete your profile.");
          // Redirect handled by useEffect
      }
      return user;
    } catch (e: any) {
      console.error("❌ Login Failed:", e);
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
      setError("Firebase Auth service not available. Cannot log out.");
       console.error("Attempted logout when Auth is not initialized.");
      setLoading(false);
      return;
    }
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      router.push("/"); // Redirect to landing page after logout
      console.log("User logged out successfully.");
    } catch (e: any) {
      console.error("❌ Logout Failed:", e);
      setError(e.message || "Failed to log out.");
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setLoading(true);
    setError(null);
    if (!db) {
      setError("Firestore service not available. Cannot update profile.");
      console.error("Attempted profile update when Firestore is not initialized.");
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, data);
      console.log("Profile updated successfully for user:", userId);
      // Re-fetch profile after update
      if(firebaseUser && firebaseUser.uid === userId) await fetchUserProfile(firebaseUser);
    } catch (e: any) {
       console.error("❌ Profile Update Failed:", e);
      setError(e.message || "Could not update profile.");
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    setLoading(true);
    setError(null);
     if (!db) {
      setError("Firestore service not available. Cannot complete profile.");
       console.error("Attempted profile completion when Firestore is not initialized.");
      setLoading(false);
      return;
    }
    try {
      const userDocRef = doc(db, "users", userId);
      const finalProfileData = {
        ...profileData,
        userType,
        isProfileComplete: true,
        updatedAt: Date.now(), // Add an updated timestamp
      };
      await updateDoc(userDocRef, finalProfileData);
      console.log("Profile completed successfully for user:", userId);

      // Re-fetch user profile to update context immediately
       if(firebaseUser && firebaseUser.uid === userId) {
          await fetchUserProfile(firebaseUser);
       }
      // Redirect is handled by useEffect now.
      // router.push("/dashboard/home");
    } catch (e: any) {
       console.error("❌ Profile Completion Failed:", e);
      setError(e.message || "An unexpected error occurred while completing profile.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, error, signUp, logIn, logOut, updateUserProfile, completeProfile, checkProfileCompletion }}>
      {!loading && children}
      {/* Optionally show a global loading indicator while auth state resolves */}
      {/* {loading && <GlobalLoadingIndicator />} */}
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
