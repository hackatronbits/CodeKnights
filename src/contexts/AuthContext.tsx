
"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, type User as FirebaseUserType, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase"; 
import type { User, UserType, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Assuming useToast is correctly set up

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
    // Show loader after a small delay to avoid flicker on fast auth checks
    const timer = setTimeout(() => {
      // Only show if still in client-side context and loading is expected
      // This check might need to be tied to the AuthContext's loading state
      if (isClientSide) { // Simplified: just ensure client-side
        setShow(true);
      }
    }, 300); // 300ms delay
    return () => clearTimeout(timer);
  }, [isClientSide]);

  if (!isClientSide || !show) {
    return null; // Don't render server-side or before delay/client check
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
      <ul className="list-disc list-inside text-left max-w-xl mx-auto mt-1 text-sm">
        <li>Verify essential variables (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>) are correct in your <code>.env.local</code> file for the <strong>&quot;mentorconnect&quot;</strong> project.</li>
        <li>**Restart your Next.js development server** after any changes to <code>.env.local</code>.</li>
        <li>Check the Browser Console (Developer Tools) and Server Logs for more detailed Firebase errors (e.g., network issues, permission errors).</li>
        <li>Ensure Firebase Authentication (with Email/Password sign-in) is enabled in your Firebase project console for &quot;mentorconnect&quot;.</li>
        <li>Confirm your API key for &quot;mentorconnect&quot; hasn&apos;t been restricted (e.g., by domain) in the Google Cloud Console / Firebase settings, preventing local development access.</li>
      </ul>
    </div>
  </div>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null); // For non-init errors
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();


  useEffect(() => {
    // This effect runs once on mount to check Firebase initialization
    // and set client-side flag.
    const { error: initErr } = getFirebaseServices();
    if (initErr) {
      console.error("AuthProvider: Detected Firebase Initialization Error on mount:", initErr);
      setInitializationError(initErr);
      setLoading(false); // Stop loading if Firebase can't even init
    }
    setIsClient(true); // Indicate that we are on the client side
  }, []);


  const fetchUserProfile = useCallback(async (fbUser: FirebaseUserType): Promise<User | null> => {
    const { db: currentDb, error: dbInitErr } = getFirebaseServices();
    if (dbInitErr) {
      console.error("AuthContext: fetchUserProfile: Cannot fetch profile due to Firebase init error:", dbInitErr);
      // Use a more specific error message for profile fetching failure due to DB init
      setRuntimeError("Database service unavailable. Profile fetch failed.");
      return null;
    }
    if (!currentDb) {
      const dbErrorMsg = "Database service is not available. Cannot fetch user profile.";
      console.error("AuthContext: fetchUserProfile:", dbErrorMsg);
      setRuntimeError(dbErrorMsg);
      return null;
    }

    const userDocRef = doc(currentDb, "users", fbUser.uid);
    try {
      console.log(`AuthContext: Fetching Firestore profile for UID: ${fbUser.uid}`);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Ensure timestamps are converted to numbers
        const createdAt = userData.createdAt instanceof Timestamp ? userData.createdAt.toMillis() : userData.createdAt;
        const updatedAt = userData.updatedAt instanceof Timestamp ? userData.updatedAt.toMillis() : userData.updatedAt;

        // Construct a clean user object based on the User type
        const finalUserData: User = {
          uid: userDoc.id,
          email: fbUser.email || userData.email || "", // Prioritize Firebase Auth email
          fullName: userData.fullName || fbUser.displayName || "User", // Prioritize Firestore fullName
          userType: userData.userType, // This is crucial, must exist in Firestore
          profileImageUrl: userData.profileImageUrl || fbUser.photoURL,
          contactNo: userData.contactNo,
          address: userData.address,
          isProfileComplete: userData.isProfileComplete, // Crucial for flow
          createdAt: createdAt || Date.now(), // Fallback for createdAt
          updatedAt: updatedAt || Date.now(), // Fallback for updatedAt
          // Spread student-specific fields if userType is student
          ...(userData.userType === "student" && {
            pursuingCourse: userData.pursuingCourse,
            university: userData.university,
            fieldOfInterest: userData.fieldOfInterest,
            myMentors: userData.myMentors || [],
          }),
          // Spread alumni-specific fields if userType is alumni
          ...(userData.userType === "alumni" && {
            passOutUniversity: userData.passOutUniversity,
            bio: userData.bio,
            workingField: userData.workingField,
            myMentees: userData.myMentees || [],
          }),
        } as User; // Cast to User to satisfy the type

        if (!finalUserData.userType || typeof finalUserData.isProfileComplete === 'undefined') {
            console.warn(`AuthContext: Fetched profile for ${fbUser.uid} is missing critical fields (userType or isProfileComplete). Data:`, finalUserData);
            // Potentially set an error or handle as incomplete profile
        } else {
            console.log(`AuthContext: Profile found for UID: ${fbUser.uid}`, { fullName: finalUserData.fullName, userType: finalUserData.userType, isProfileComplete: finalUserData.isProfileComplete });
        }
        return finalUserData;
      } else {
        console.log("AuthContext: No user profile found in Firestore for UID:", fbUser.uid);
        return null; // Profile doesn't exist yet
      }
    } catch (e: any) {
      console.error(`❌ AuthContext: Error fetching user profile for ${fbUser.uid}:`, e);
      let profileFetchError = `Failed to fetch user profile: ${e.message}`;
      if (e.code === 'permission-denied') {
        profileFetchError = "Permission denied fetching profile. Check Firestore rules.";
        console.error("Firestore Permission Denied: Ensure your Firestore security rules allow reading the user's own document in the 'users' collection.");
      }
      setRuntimeError(profileFetchError);
      return null;
    }
  }, []); // No dependencies, relies on fbUser passed as argument

  useEffect(() => {
    if (!isClient || initializationError) {
      if(initializationError) setLoading(false); // Stop loading if there's an init error
      return; // Don't proceed if not on client or if Firebase init failed
    }

    const { auth: currentAuth } = getFirebaseServices();
    if (!currentAuth) {
      // This case should ideally be caught by the initial init check, but as a safeguard:
      const authUnavailableMsg = "Authentication service is critically unavailable. Cannot monitor auth state.";
      console.error("AuthContext Listener Setup: " + authUnavailableMsg);
      setInitializationError(prev => prev || authUnavailableMsg); // Set as initialization error
      setLoading(false);
      return;
    }

    console.log("AuthContext: Setting up onAuthStateChanged listener...");
    let isMounted = true; // Flag to prevent state updates on unmounted component

    const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
      if (!isMounted) return; // Avoid state updates if component unmounted
      console.log("AuthContext: onAuthStateChanged triggered. Firebase Auth User UID:", user?.uid || "null");
      setRuntimeError(null); // Clear previous runtime errors on new auth state

      if (user) {
        setFirebaseUser(user); // Set Firebase Auth user object
        const userProfile = await fetchUserProfile(user); // Fetch corresponding Firestore profile
        if (!isMounted) return;

        setCurrentUser(userProfile); // Set the detailed user profile (or null if not found/error)

        const isAuthPage = pathname === "/login" || pathname === "/";
        const isProfileSetupPage = pathname === "/profile/setup";

        if (userProfile) { // Firestore profile exists
          if (userProfile.isProfileComplete) {
            console.log(`AuthContext: User ${user.uid} profile complete. Current path: ${pathname}`);
            if (isAuthPage || isProfileSetupPage) {
              console.log(`AuthContext: Redirecting ${user.uid} to /dashboard/home`);
              router.push("/dashboard/home");
            }
          } else { // Firestore profile exists but is incomplete
            console.log(`AuthContext: User ${user.uid} profile incomplete. Current path: ${pathname}`);
            if (!isProfileSetupPage) {
              console.log(`AuthContext: Redirecting ${user.uid} to /profile/setup`);
              router.push("/profile/setup");
            }
          }
        } else { // No Firestore profile found (user exists in Auth, not in DB or fetch error)
          console.warn(`AuthContext: No Firestore profile for Auth user ${user.uid}. Current path: ${pathname}`);
          if (!isProfileSetupPage) {
             if (runtimeError) { // If fetchUserProfile set an error
                console.error(`AuthContext: Not redirecting to setup due to profile fetch error: ${runtimeError}`);
             } else {
                console.log(`AuthContext: Redirecting new/unprofiled user ${user.uid} to /profile/setup`);
                router.push("/profile/setup");
             }
          }
        }
      } else { // No Firebase Auth user (logged out or not logged in)
        console.log("AuthContext: No user authenticated.");
        setCurrentUser(null);
        setFirebaseUser(null);
        // Redirect away from protected routes
        const isDashboardPage = pathname.startsWith('/dashboard');
        if (isDashboardPage || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated. Redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        }
      }
      setLoading(false); // Auth check complete
    }, (listenerError) => { // Error callback for onAuthStateChanged itself
      if (!isMounted) return;
      console.error("❌ AuthContext: Error in onAuthStateChanged listener:", listenerError);
      setRuntimeError(`Authentication check failed: ${listenerError.message}`);
      setCurrentUser(null);
      setFirebaseUser(null);
      setLoading(false);
    });

    // Cleanup function
    return () => {
      isMounted = false;
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  // Explicitly list dependencies. Router and pathname are for redirection logic.
  }, [isClient, initializationError, fetchUserProfile, pathname, router]);


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUserType | null> => {
    const { auth: firebaseAuthService, db: firestoreService, error: initError } = getFirebaseServices();
    setRuntimeError(null); // Clear previous runtime errors

    if (initError || !firebaseAuthService || !firestoreService) {
      const errorMessage = initError || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: signUp: Cannot proceed due to Firebase initialization error or missing service:", errorMessage);
      // Set as initializationError as this is a fundamental setup issue
      setInitializationError(prev => prev || errorMessage);
      toast({
          title: "Setup Error",
          description: "Sign-up cannot proceed due to a configuration issue. Please contact support or try again later.",
          variant: "destructive",
      });
      return null;
    }

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthService, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      // Create the basic user document in Firestore
      const userDocRef = doc(firestoreService, "users", user.uid);
      // Explicitly define the structure for the new user document
      const initialUserData: Omit<BaseUser, 'userType' | 'updatedAt'> & { createdAt: any } = { // userType and other fields are set in completeProfile
        uid: user.uid,
        email: user.email || "", // Ensure email is not null
        fullName,
        profileImageUrl: user.photoURL || "", // Use photoURL from Firebase Auth if available
        isProfileComplete: false, // Profile is not complete at this stage
        // Timestamps
        createdAt: serverTimestamp(), // Use serverTimestamp for creation
      };
      await setDoc(userDocRef, initialUserData);
      console.log("AuthContext: Firestore base user document created for:", user.uid);
      // The onAuthStateChanged listener will handle setting currentUser and redirection to /profile/setup
      return user;
    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = `Signup failed. Code: ${e.code || 'UNKNOWN'}`;
      // Provide more user-friendly messages for common errors
      if (e.code === 'auth/email-already-in-use') {
        userFriendlyError = 'This email address is already registered. Please try logging in or use a different email.';
      } else if (e.code === 'auth/weak-password') {
        userFriendlyError = 'Password is too weak. It must be at least 6 characters long.';
      } else if (e.code === 'auth/invalid-email') {
        userFriendlyError = 'The email address provided is not valid.';
      } else if (e.code === 'auth/operation-not-allowed') {
         userFriendlyError = 'Email/Password sign-up is not enabled. Please contact support.';
      } else if (e.code === 'auth/api-key-not-valid') {
         userFriendlyError = 'API Key is not valid. Please check your Firebase project configuration.';
      } else {
        userFriendlyError = e.message || "An unexpected error occurred during sign-up.";
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
    setRuntimeError(null); // Clear previous runtime errors at the start of the login attempt

    if (initError || !firebaseAuthService || !firestoreService) {
      const message = initError || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: logIn: Cannot proceed due to Firebase initialization error:", message);
      setInitializationError(prev => prev || message); // This is a setup issue
      toast({
          title: "Configuration Error",
          description: "Login cannot proceed due to a setup issue. Please try again later.",
          variant: "destructive",
      });
      return null;
    }

    setLoading(true);
    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(firebaseAuthService, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // At this point, Firebase Auth login succeeded.
      // Now fetch Firestore profile. runtimeError should be null unless fetchUserProfile sets it.
      setRuntimeError(null); // Explicitly clear runtimeError before fetching profile
      const userProfile = await fetchUserProfile(user);

      if (!userProfile) {
        // This case means fetchUserProfile returned null.
        // Check if fetchUserProfile itself set a runtimeError (e.g., permission issue).
        if (runtimeError) { // Error was set by fetchUserProfile
          console.error(`AuthContext: Firebase Auth for ${user.uid} succeeded, but fetching Firestore profile failed. Error: ${runtimeError}. Logging out.`);
          await signOut(firebaseAuthService); // Log out the Firebase Auth user
          // onAuthStateChanged will handle state updates (currentUser to null)
        } else {
          // No profile found in Firestore, and fetchUserProfile did not encounter an error (e.g. permission denied).
          // This implies the user exists in Auth but not in Firestore user collection or profile is malformed.
          console.warn(`AuthContext: Login successful for Firebase Auth user ${user.uid}, but no valid Firestore profile found or profile is incomplete. Redirecting to profile setup.`);
          // The onAuthStateChanged listener will see firebaseUser is set, but currentUser (from Firestore) is null/incomplete.
          // It will then redirect to /profile/setup.
        }
        setLoading(false);
        // Return null if profile fetch had an error, or Firebase user if profile just needs setup.
        // The onAuthStateChanged listener is the primary driver for redirection based on currentUser state.
        return runtimeError ? null : user;
      }

      // Profile fetched successfully, now check userType
      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, but attempting to log in as a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setRuntimeError(typeErrorMsg);
        toast({ title: "Login Role Mismatch", description: typeErrorMsg, variant: "destructive" });
        await signOut(firebaseAuthService); // Log out
        // onAuthStateChanged will clear currentUser & firebaseUser
        setLoading(false);
        return null;
      }

      // setCurrentUser(userProfile); // This will be handled by onAuthStateChanged
      // setFirebaseUser(user); // This will be handled by onAuthStateChanged
      // Redirection to dashboard or setup will be handled by onAuthStateChanged based on userProfile.isProfileComplete

      console.log(`AuthContext: Login for ${user.uid} successful. Profile complete: ${userProfile.isProfileComplete}. Redirecting via onAuthStateChanged effect.`);
      // Toast for successful login can be placed here or in onAuthStateChanged when redirecting to dashboard
      toast({ title: "Login Successful!", description: "Welcome back!"});

      setLoading(false);
      return user; // Return Firebase user, onAuthStateChanged will manage final state and redirect

    } catch (e: any) { // This catch block is primarily for signInWithEmailAndPassword errors
      console.error("❌ AuthContext: Login Failed (Firebase Auth Error):", e);
      let userFriendlyError = `Login failed. Code: ${e.code || 'UNKNOWN'}`;
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') {
        userFriendlyError = 'Invalid email or password provided. Please try again.';
      } else if (e.code === 'auth/too-many-requests') {
        userFriendlyError = 'Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.';
      } else if (e.code === 'auth/user-disabled') {
        userFriendlyError = 'This user account has been disabled. Please contact support.';
      } else if (e.code === 'auth/api-key-not-valid') {
         userFriendlyError = 'API Key is not valid. Please check your Firebase project configuration.';
      } else {
        userFriendlyError = e.message || "An unexpected error occurred during login.";
      }
      setRuntimeError(userFriendlyError);
      // No need to setCurrentUser(null) or setFirebaseUser(null) here, as onAuthStateChanged should eventually reflect this if sign-out occurs or if auth state is invalid
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
         userFriendlyError = 'API Key is not valid. Please check your Firebase project configuration.';
      } else userFriendlyError = e.message;
      setRuntimeError(userFriendlyError);
      toast({ title: "Password Reset Failed", description: userFriendlyError, variant: "destructive" });
    }
  };


  const logOut = async () => {
    const { auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null); // Clear runtime errors on logout attempt
    if (initErr || !firebaseAuthService) {
      const message = initErr || "Firebase Auth service unavailable. Cannot log out.";
      setInitializationError(prev => prev || message); // This is a setup issue
      console.error("AuthContext: logOut:", message);
      toast({ title: "Logout Failed", description: "Service unavailable.", variant: "destructive"});
      return;
    }
    try {
      await signOut(firebaseAuthService);
      // onAuthStateChanged will handle setting currentUser and firebaseUser to null and redirection
      toast({ title: "Logged Out", description: "You have been successfully logged out."});
    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      const logoutErrorMsg = e.message || "Failed to log out due to an unexpected error.";
      setRuntimeError(logoutErrorMsg);
      toast({ title: "Logout Failed", description: logoutErrorMsg, variant: "destructive"});
    }
  };


  const updateUserProfile = async (userId: string, data: Partial<User>) => {
    const { db: firestoreService, auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null);
    if (initErr || !firebaseAuthService || !firestoreService) {
      const message = initErr || (!firebaseAuthService ? "Auth service unavailable." : "DB service unavailable.");
      console.error("AuthContext: updateUserProfile: Cannot proceed:", message);
      setInitializationError(prev => prev || message);
      throw new Error(message); // Throw to indicate failure to the caller
    }

    // Ensure the currently authenticated Firebase user matches the userId being updated
    const currentFbUser = firebaseAuthService.currentUser;
    if (!currentFbUser || currentFbUser.uid !== userId) {
      const authErrorMsg = "Authorization error: You can only update your own profile.";
      console.error("AuthContext: updateUserProfile:", authErrorMsg);
      setRuntimeError(authErrorMsg);
      throw new Error(authErrorMsg);
    }

    try {
      const userDocRef = doc(firestoreService, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() }; // Ensure updatedAt is always set
      await updateDoc(userDocRef, updateData);

      // Optimistically update local currentUser state or refetch
      // For simplicity, refetching after update ensures data consistency
      const updatedProfile = await fetchUserProfile(currentFbUser);
      if (updatedProfile) {
        setCurrentUser(updatedProfile);
      } else {
        // This case is unlikely if updateDoc succeeded but profile fetch failed after.
        // Could indicate a transient issue or rules problem post-update.
        console.error("AuthContext: Profile updated in Firestore, but re-fetch failed. Local state might be stale.");
        // Consider logging out or showing a specific error if this state is critical
      }
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e: any) {
      const updateErrorMsg = `Could not update profile: ${e.message || e.code || 'Unknown error'}.`;
      console.error("❌ AuthContext: updateUserProfile Firestore Error:", e);
      setRuntimeError(updateErrorMsg);
      toast({ title: "Update Failed", description: updateErrorMsg, variant: "destructive"});
      throw new Error(updateErrorMsg); // Re-throw to inform the caller
    }
  };

  const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
    const { db: firestoreService, auth: firebaseAuthService, error: initErr } = getFirebaseServices();
    setRuntimeError(null);
    if (initErr || !firebaseAuthService || !firestoreService) {
        const message = initErr || "Firebase service unavailable. Cannot complete profile.";
        console.error("AuthContext: completeProfile error:", message);
        setInitializationError(prev => prev || message);
        throw new Error(message);
    }

    const currentFirebaseUser = firebaseAuthService.currentUser;
    // Check if the logged-in Firebase user matches the userId for whom the profile is being completed
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
        const authErrorMsg = "Authorization error: Incorrect user trying to complete profile or not logged in.";
        console.error("AuthContext: completeProfile Auth Error:", authErrorMsg, { currentUid: currentFirebaseUser?.uid, targetUid: userId });
        setRuntimeError(authErrorMsg);
        throw new Error(authErrorMsg);
    }

    try {
        const userDocRef = doc(firestoreService, "users", userId);
        // It's good practice to ensure the base user document exists from signUp
        const existingDocSnap = await getDoc(userDocRef);
        if (!existingDocSnap.exists()) {
            console.error(`AuthContext: Base user document for UID ${userId} not found during profile completion. This should not happen if signUp was successful.`);
            // This situation might require re-creating the base doc or handling as a severe error.
            // For now, we'll throw an error.
            throw new Error("User base record not found. Profile completion cannot proceed.");
        }

        const completeProfileData: Partial<User> & { userType: UserType; isProfileComplete: boolean; updatedAt: any } = {
            ...profileData, // Contains specific fields like pursuingCourse or bio
            userType: userType,
            isProfileComplete: true,
            updatedAt: serverTimestamp(),
        };
        // Use updateDoc as the base document should already exist
        await updateDoc(userDocRef, completeProfileData);
        console.log(`AuthContext: Profile completed and updated for user ${userId}.`);

        // Fetch the fully updated profile to refresh local state
        const updatedProfile = await fetchUserProfile(currentFirebaseUser);
        if (updatedProfile) {
            setCurrentUser(updatedProfile);
            // Redirection to dashboard is handled by the onAuthStateChanged effect
            // when it sees currentUser is set and isProfileComplete is true.
            toast({ title: "Profile Complete!", description: "Welcome to MentorConnect!"});
        } else {
            // This is a more critical error if profile can't be fetched after successful update
            console.error(`AuthContext: Profile for ${userId} was updated, but failed to re-fetch. Logging out for safety.`);
            await logOut(); // Log out to prevent inconsistent state
            throw new Error("Failed to retrieve updated profile after completion. Please try logging in again.");
        }
    } catch (e: any) {
        const completeErrorMsg = `Could not complete profile: ${e.message || e.code || 'Unknown error'}.`;
        console.error("❌ AuthContext: completeProfile Firestore/Processing Error:", e);
        setRuntimeError(completeErrorMsg);
        toast({ title: "Profile Setup Failed", description: completeErrorMsg, variant: "destructive"});
        throw new Error(completeErrorMsg); // Re-throw
    }
};


  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error: runtimeError || initializationError, // Combine errors, prioritizing runtime
    isClient,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
    sendPasswordReset,
  };


  // Render logic:
  if (!isClient) {
    // On the server, or before client-side hydration, render nothing or a minimal placeholder.
    // This helps prevent hydration mismatches if GlobalLoadingIndicator relies on client-side state immediately.
    return null;
  }

  if (initializationError && !pathname.startsWith('/_next/')) {
    // If Firebase initialization itself failed, show a dedicated error screen.
    return <FirebaseConfigErrorScreen errorMsg={initializationError} />;
  }

  if (loading && !initializationError && !pathname.startsWith('/_next/')) {
    // If Firebase is initializing and there's no init error yet, show global loader.
    // Avoid for Next.js internal paths.
    return <GlobalLoadingIndicator />;
  }

  // Once client-side, and no init error, and not loading auth state, render children.
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
