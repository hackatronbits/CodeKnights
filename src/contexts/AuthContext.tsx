"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
    const userDocRef = doc(db, "users", firebaseUserInstance.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as User;
      setCurrentUser(userData);
      return userData;
    }
    return null;
  }, []);
  
  const checkProfileCompletion = useCallback(async (userInstance: FirebaseUser) => {
    const userProfile = await fetchUserProfile(userInstance);
    if (userProfile && userProfile.isProfileComplete) {
      return true;
    }
    return false;
  }, [fetchUserProfile]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError(null);
      if (user) {
        setFirebaseUser(user);
        const userProfile = await fetchUserProfile(user);
        if (userProfile) {
          if (!userProfile.isProfileComplete && pathname !== "/profile/setup") {
             router.push("/profile/setup");
          } else if (userProfile.isProfileComplete && (pathname === "/" || pathname === "/login" || pathname === "/profile/setup")) {
            router.push("/dashboard/home");
          }
        } else {
          // New user, profile not yet created in Firestore, might be part of signup flow
          if (pathname !== "/" && pathname !== "/profile/setup") { // Allow signup and profile setup
            // router.push("/"); // Or some other appropriate page
          }
        }
      } else {
        setCurrentUser(null);
        setFirebaseUser(null);
        // Allow access to landing and login pages if not authenticated
        if (pathname !== "/" && pathname !== "/login") {
           // Redirect to landing page if not authenticated and trying to access protected routes
          // router.push("/"); // Temporarily disabled to allow development of other pages
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, fetchUserProfile, pathname, checkProfileCompletion]);

  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
      const user = userCredential.user;
      
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
      
      setFirebaseUser(user);
      // Don't set currentUser yet, profile is incomplete. Redirect to profile setup.
      router.push("/profile/setup");
      return user;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, pass);
      const user = userCredential.user;
      setFirebaseUser(user);
      const userProfile = await fetchUserProfile(user);

      if (userProfile) {
        if (userProfile.userType !== userTypeAttempt) {
          setError(`Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}.`);
          await auth.signOut(); // Sign out the user
          setCurrentUser(null);
          setFirebaseUser(null);
          return null;
        }
        if (!userProfile.isProfileComplete) {
          router.push("/profile/setup");
        } else {
          router.push("/dashboard/home");
        }
      } else {
         // This case should ideally not happen if signup creates a basic doc.
         // If it does, treat as profile incomplete.
        router.push("/profile/setup");
      }
      return user;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.signOut();
      setCurrentUser(null);
      setFirebaseUser(null);
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  
  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, data);
      // Re-fetch profile after update
      if(firebaseUser) await fetchUserProfile(firebaseUser);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    setLoading(true);
    setError(null);
    try {
      const userDocRef = doc(db, "users", userId);
      const finalProfileData = {
        ...profileData,
        userType,
        isProfileComplete: true,
      };
      await updateDoc(userDocRef, finalProfileData);
      
      // Re-fetch user profile to update context
       if(firebaseUser) await fetchUserProfile(firebaseUser);
      router.push("/dashboard/home");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, error, signUp, logIn, logOut, updateUserProfile, completeProfile, checkProfileCompletion }}>
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
