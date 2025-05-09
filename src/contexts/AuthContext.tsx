
"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUserType, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase"; 
import type { User, UserType, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; 

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUserType | null;
  loading: boolean;
  error: string | null;
  isClient: boolean;
  signUp: (email: string, pass: string, fullName: string) => Promise<FirebaseUserType | null>;
  logIn: (email: string, pass: string, userType: UserType) => Promise<FirebaseUserType | null>;
  logOut: () => Promise<void>;
  updateUserProfile: (userId: string, data: Partial<User>) => Promise<void>;
  completeProfile: (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GlobalLoadingIndicator: React.FC = () => {
  const [show, setShow] = useState(false);
  const [isClientSide, setIsClientSide] = useState(false);

  useEffect(() => {
    setIsClientSide(true);
    const timer = setTimeout(() => {
      if (isClientSide) {
        setShow(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isClientSide]);

  if (!isClientSide || !show) {
    return null;
  }

  return (
    <div className="flex items-center justify-center fixed inset-0 bg-background/80 backdrop-blur-sm z-[200]">
      <div className="flex flex-col items-center gap-2 p-4 bg-card rounded-lg shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Authenticating...</p>
      </div>
    </div>
  );
};

const FirebaseConfigErrorScreen: React.FC<{ errorMsg: string }> = ({ errorMsg }) => (
  <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
    <div>
      <h1 className="text-2xl font-bold mb-4">Firebase Initialization Error</h1>
      <p>{errorMsg || "An unknown Firebase initialization error occurred."}</p>
      <p className="mt-2 font-semibold">Troubleshooting:</p>
      <ul className="list-disc list-inside text-left max-w-lg mx-auto mt-1 text-sm">
        <li>Verify essential variables (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>) are correct in your <code>.env.local</code> file for the <strong>"mentorconnect"</strong> project.</li>
        <li>**Restart your Next.js development server** after any changes to <code>.env.local</code>.</li>
        <li>Check the Browser Console (Developer Tools) and Server Logs for more detailed Firebase errors (e.g., network issues, permission errors).</li>
        <li>Ensure Firebase Authentication (with Email/Password sign-in) is enabled in your Firebase project console for "mentorconnect".</li>
        <li>Confirm your API key for "mentorconnect" hasn't been restricted (e.g., by domain) in the Google Cloud Console / Firebase settings, preventing local development access.</li>
      </ul>
    </div>
  </div>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const { error: initErr } = getFirebaseServices();
    if (initErr) {
      console.error("AuthProvider: Detected Firebase Initialization Error on mount:", initErr);
      setInitializationError(initErr);
      setLoading(false);
    }
    setIsClient(true);
  }, []);

  const fetchUserProfile = useCallback(async (fbUser: FirebaseUserType): Promise<User | null> => {
    const { db: currentDb, error: dbInitErr } = getFirebaseServices();
    if (dbInitErr) {
      console.error("AuthContext: fetchUserProfile: Cannot fetch profile due to init error:", dbInitErr);
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
        const userData = userDoc.data();
        const createdAt = userData.createdAt instanceof Timestamp ? userData.createdAt.toMillis() : userData.createdAt;
        const updatedAt = userData.updatedAt instanceof Timestamp ? userData.updatedAt.toMillis() : userData.updatedAt;

        const finalUserData: User = {
          uid: userDoc.id,
          email: fbUser.email || userData.email || "",
          fullName: userData.fullName || fbUser.displayName || "User",
          userType: userData.userType,
          profileImageUrl: userData.profileImageUrl || fbUser.photoURL,
          contactNo: userData.contactNo,
          address: userData.address,
          isProfileComplete: userData.isProfileComplete,
          createdAt: createdAt || Date.now(),
          updatedAt: updatedAt || Date.now(),
          ...(userData.userType === "student" && {
            pursuingCourse: userData.pursuingCourse,
            university: userData.university,
            fieldOfInterest: userData.fieldOfInterest,
            myMentors: userData.myMentors || [],
          }),
          ...(userData.userType === "alumni" && {
            passOutUniversity: userData.passOutUniversity,
            bio: userData.bio,
            workingField: userData.workingField,
            myMentees: userData.myMentees || [],
          }),
        } as User;

        if (!finalUserData.userType || !finalUserData.hasOwnProperty('isProfileComplete')) {
          console.warn(`AuthContext: Fetched profile for ${fbUser.uid} seems incomplete or malformed.`, finalUserData);
        } else {
          console.log(`AuthContext: Profile found for UID: ${fbUser.uid}`, { fullName: finalUserData.fullName, userType: finalUserData.userType, isProfileComplete: finalUserData.isProfileComplete });
        }
        return finalUserData;
      } else {
        console.log("AuthContext: No user profile found in Firestore for UID:", fbUser.uid);
        return null;
      }
    } catch (e: any) {
      console.error(`❌ AuthContext: Error fetching user profile for ${fbUser.uid}:`, e);
      if (e.code === 'permission-denied') {
        console.error("Firestore Permission Denied: Check your Firestore security rules.");
        setRuntimeError(prev => prev || `Permission denied fetching profile. Check Firestore rules.`);
      } else {
        setRuntimeError(prev => prev || `Failed to fetch user profile: ${e.message}`);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isClient || initializationError) {
      if (initializationError) setLoading(false);
      return;
    }

    const { auth: currentAuth } = getFirebaseServices();
    if (!currentAuth) {
      const authUnavailableMsg = "Authentication service is unavailable. Cannot monitor auth state.";
      console.error("AuthContext Listener Setup: " + authUnavailableMsg);
      setInitializationError(prev => prev || authUnavailableMsg);
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      if (!isMounted) return;
      console.log("AuthContext: onAuthStateChanged triggered. User:", user?.uid || "null");
      setRuntimeError(null);

      if (user) {
        setFirebaseUser(user);
        const userProfile = await fetchUserProfile(user);
        if (!isMounted) return;
        setCurrentUser(userProfile);

        const isProfileSetupPage = pathname === "/profile/setup";
        const isAuthPage = pathname === "/login" || pathname === "/";
        const isDashboardPage = pathname.startsWith('/dashboard');

        if (userProfile) {
          if (userProfile.isProfileComplete) {
            if (isAuthPage || isProfileSetupPage) {
              router.push("/dashboard/home");
            }
          } else {
            if (!isProfileSetupPage) {
              router.push("/profile/setup");
            }
          }
        } else {
          if (!isProfileSetupPage) {
            router.push("/profile/setup");
          }
        }
      } else {
        setCurrentUser(null);
        setFirebaseUser(null);
        const isDashboardPage = pathname.startsWith('/dashboard'); // Re-check for this block
        if (isDashboardPage || pathname === '/profile/setup') {
          console.log(`AuthContext: User not authenticated, redirecting from protected path ${pathname} to /login`);
          router.push("/login");
        }
      }
      setLoading(false);
    }, (listenerError) => {
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", listenerError);
      setRuntimeError(prev => prev || `Authentication check failed: ${listenerError.message}`);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isClient, initializationError, fetchUserProfile, pathname, router]);


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUserType | null> => {
    const { auth: firebaseAuthService, db: firestoreService, error: initError } = getFirebaseServices();
    setRuntimeError(null);

    if (initError || !firebaseAuthService || !firestoreService) {
      const errorMessage = initError || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: signUp: Cannot proceed due to Firebase initialization error or missing service:", errorMessage);
      if (initError) {
          toast({
              title: "Firebase Initialization Error",
              description: "Sign-up cannot proceed. " + errorMessage + " Please check your Firebase setup and .env.local configuration for the 'mentorconnect' project.",
              variant: "destructive",
          });
      }
      setInitializationError(prev => prev || errorMessage);
      return null;
    }

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthService, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      const userDocRef = doc(firestoreService, "users", user.uid);
      const initialUserData: Omit<BaseUser, 'userType'> & { createdAt: any; updatedAt: any } = {
        uid: user.uid,
        email: user.email || "",
        fullName,
        profileImageUrl: user.photoURL || "",
        isProfileComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userDocRef, initialUserData);
      console.log("AuthContext: Firestore base user document created for:", user.uid);
      // Listener handles state update and redirection.
      return user;
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
      } else if (e.code === 'auth/api-key-not-valid') {
        userFriendlyError = 'Firebase API Key is not valid. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file is correct for the "mentorconnect" project and that the key is enabled in the Google Cloud Console / Firebase project settings.';
      } else {
        userFriendlyError = e.message;
      }
      setRuntimeError(userFriendlyError);
      toast({
        title: "Signup Failed",
        description: userFriendlyError,
        variant: "destructive",
      });
      return null;
    }
  };

  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUserType | null> => {
    const { auth: firebaseAuthService, db: firestoreService, error: initError } = getFirebaseServices();
    setRuntimeError(null);
    if (initError || !firebaseAuthService || !firestoreService) {
      const message = initError || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: logIn: Cannot proceed:", message);
      if (initError) {
         toast({
              title: "Firebase Initialization Error",
              description: "Login cannot proceed. " + message + " Please check your Firebase setup and .env.local configuration for the 'mentorconnect' project.",
              variant: "destructive",
          });
      }
      setInitializationError(prev => prev || message);
      return null;
    }

    setLoading(true);
    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(firebaseAuthService, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      const userProfile = await fetchUserProfile(user);
      if (runtimeError && !userProfile) {
        console.error(`AuthContext: Login succeeded for ${user.uid} but profile fetch failed. Logging out. Error: ${runtimeError}`);
        await signOut(firebaseAuthService);
        setLoading(false);
        return null;
      }
      if (!userProfile) {
        console.warn(`AuthContext: Login successful for ${user.uid}, but no Firestore profile exists. Needs setup.`);
        setFirebaseUser(user);
        setCurrentUser(null);
        setLoading(false);
        return user;
      }
      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setRuntimeError(typeErrorMsg);
        await signOut(firebaseAuthService);
        setCurrentUser(null);
        setFirebaseUser(null);
        setLoading(false);
        toast({ title: "Login Failed", description: typeErrorMsg, variant: "destructive" });
        return null;
      }
      setCurrentUser(userProfile);
      setFirebaseUser(user);
      setLoading(false);
      if (userProfile.isProfileComplete) {
        router.push('/dashboard/home');
      } else {
        router.push('/profile/setup');
      }
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
      } else if (e.code === 'auth/api-key-not-valid') {
         userFriendlyError = 'Firebase API Key is not valid. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file is correct for the "mentorconnect" project and that the key is enabled in the Google Cloud Console / Firebase project settings.';
      } else {
        userFriendlyError = e.message;
      }
      setRuntimeError(userFriendlyError);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
      toast({ title: "Login Failed", description: userFriendlyError, variant: "destructive" });
      return null;
    }
  };

  const sendPasswordReset = async (email: string) => {
    const { auth: firebaseAuthService, error: initError } = getFirebaseServices();
    setRuntimeError(null);
     if (initError || !firebaseAuthService) {
      const message = initError || "Auth service unavailable for password reset.";
      console.error("AuthContext: sendPasswordReset:", message);
       toast({ title: "Error", description: message + " Check .env.local for 'mentorconnect' project.", variant: "destructive" });
      setInitializationError(prev => prev || message);
      return;
    }
    try {
      await sendPasswordResetEmail(firebaseAuthService, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox (and spam folder) for a link to reset your password." });
    } catch (e: any) {
      console.error("❌ AuthContext: Password Reset Failed:", e);
      let userFriendlyError = `Password reset failed. Code: ${e.code || 'UNKNOWN'}`;
      if (e.code === 'auth/invalid-email') userFriendlyError = 'The email address is not valid.';
      else if (e.code === 'auth/user-not-found') userFriendlyError = 'No user found with this email address.';
      else if (e.code === 'auth/missing-email') userFriendlyError = 'Please enter your email address.';
      else if (e.code === 'auth/api-key-not-valid') {
         userFriendlyError = 'Firebase API Key is not valid. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file is correct for the "mentorconnect" project and that the key is enabled in the Google Cloud Console / Firebase project settings.';
      } else userFriendlyError = e.message;
      setRuntimeError(userFriendlyError);
      toast({ title: "Password Reset Failed", description: userFriendlyError, variant: "destructive" });
    }
  };

  const logOut = async () => {
    const { auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null);
    if (initErr || !firebaseAuthService) {
      const message = initErr || "Firebase Auth service unavailable. Cannot log out.";
      setInitializationError(prev => prev || message);
      console.error("AuthContext: logOut:", message);
      return;
    }
    try {
      await signOut(firebaseAuthService);
      setCurrentUser(null);
      setFirebaseUser(null);
      router.push('/login');
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setRuntimeError(e.message || "Failed to log out.");
      toast({ title: "Logout Failed", description: e.message || "An unexpected error occurred.", variant: "destructive"});
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    const { db: firestoreService, auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null);
    if (initErr || !firebaseAuthService || !firestoreService) {
      const message = initErr || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: updateUserProfile: Cannot proceed:", message);
      setInitializationError(prev => prev || message);
      throw new Error(message);
    }
    const currentFirebaseUser = firebaseAuthService.currentUser;
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
      const message = "Authorization error: Cannot update profile for another user or not logged in.";
      setRuntimeError(message);
      throw new Error(message);
    }
    try {
      const userDocRef = doc(firestoreService, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(userDocRef, updateData);
      setCurrentUser(prev => prev ? { ...prev, ...data, updatedAt: Date.now() } as User : null);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e: any) {
      const updateErrorMsg = `Could not update profile: ${e.message || e.code || 'Unknown error'}.`;
      setRuntimeError(updateErrorMsg);
      toast({ title: "Update Failed", description: updateErrorMsg, variant: "destructive"});
      throw new Error(updateErrorMsg);
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    const { db: firestoreService, auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null);
    if (initErr || !firebaseAuthService || !firestoreService) {
      const message = initErr || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: completeProfile: Cannot proceed:", message);
      setInitializationError(prev => prev || message);
      throw new Error(message);
    }
    const currentFirebaseUser = firebaseAuthService.currentUser;
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
      const message = "Authorization error: Incorrect user trying to complete profile.";
      setRuntimeError(message);
      throw new Error(message);
    }
    try {
      const userDocRef = doc(firestoreService, "users", userId);
      const existingDocSnap = await getDoc(userDocRef);
      if (!existingDocSnap.exists()) {
        throw new Error("User base record not found during profile completion.");
      }
      const completeProfileData: Partial<User> & { userType: UserType; isProfileComplete: boolean; updatedAt: any } = {
        ...profileData,
        userType: userType,
        isProfileComplete: true,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(userDocRef, completeProfileData);
      const updatedProfile = await fetchUserProfile(currentFirebaseUser);
      if (updatedProfile) {
        setCurrentUser(updatedProfile);
        router.push('/dashboard/home');
      } else {
        await logOut();
        throw new Error("Failed to retrieve updated profile after completion.");
      }
    } catch (e: any) {
      const completeErrorMsg = `Could not complete profile: ${e.message || e.code || 'Unknown error'}.`;
      setRuntimeError(completeErrorMsg);
      toast({ title: "Profile Setup Failed", description: completeErrorMsg, variant: "destructive"});
      throw new Error(completeErrorMsg);
    }
  };

  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error: runtimeError || initializationError,
    isClient,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
    sendPasswordReset,
  };

  if (!isClient) return null;
  if (initializationError && !pathname.startsWith('/_next/')) { // Avoid showing error screen for Next.js internal requests
    return <FirebaseConfigErrorScreen errorMsg={initializationError} />;
  }
  if (loading && !initializationError  && !pathname.startsWith('/_next/')) {
    return <GlobalLoadingIndicator />;
  }

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

    