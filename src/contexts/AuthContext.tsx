
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
import { useToast } from "@/hooks/use-toast"; // Import useToast

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper component for loading state
const GlobalLoadingIndicator = () => {
  const [show, setShow] = useState(false);

  // Only show loading indicator after a short delay to avoid flashing on fast connections
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300); // Delay of 300ms
    return () => clearTimeout(timer);
  }, []);

  if (!show) {
    return null; // Render nothing initially
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


 // Helper component for Firebase initialization error
 const FirebaseConfigErrorScreen = ({ errorMsg }: { errorMsg: string }) => (
   <div className="flex items-center justify-center min-h-screen bg-background text-destructive p-4 text-center">
     <div>
       <h1 className="text-2xl font-bold mb-4">Firebase Initialization Error</h1>
       <p>{errorMsg || "An unknown Firebase initialization error occurred."}</p>
       <p className="mt-2 font-semibold">Troubleshooting:</p>
       <ul className="list-disc list-inside text-left max-w-lg mx-auto mt-1 text-sm">
          <li>Verify essential variables (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>) are correct in your <code>.env.local</code> file.</li>
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
  const { toast } = useToast(); // Get toast function

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

         // Convert Timestamps to numbers for local state consistency
        const createdAt = userData.createdAt instanceof Timestamp ? userData.createdAt.toMillis() : userData.createdAt;
        const updatedAt = userData.updatedAt instanceof Timestamp ? userData.updatedAt.toMillis() : userData.updatedAt;

        const finalUserData: User = {
            uid: userDoc.id,
            email: fbUser.email || userData.email || "", // Prioritize fbUser email
            fullName: userData.fullName || fbUser.displayName || "User", // Use profile data or fbUser display name
            userType: userData.userType,
            profileImageUrl: userData.profileImageUrl || fbUser.photoURL,
            contactNo: userData.contactNo,
            address: userData.address,
            isProfileComplete: userData.isProfileComplete,
            createdAt: createdAt || Date.now(), // Fallback if missing
            updatedAt: updatedAt || Date.now(), // Fallback if missing
            // Conditionally add student/alumni fields
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
        } as User; // Assert the type after constructing

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
       // Check specifically for permission errors which might indicate Firestore rules issues
       if (e.code === 'permission-denied') {
         console.error("Firestore Permission Denied: Check your Firestore security rules to ensure the authenticated user has read access to their own document in the 'users' collection.");
         setRuntimeError(prev => prev || `Permission denied fetching profile. Check Firestore rules.`);
       } else {
         setRuntimeError(prev => prev || `Failed to fetch user profile: ${e.message}`);
       }
      return null;
    }
  }, []); // Dependencies: None


  // Auth state listener and profile handling
  useEffect(() => {
    if (!isClient || initializationError) {
        console.log("AuthContext Listener: Skipping setup (not client or init error).", { isClient, initializationError });
        if (initializationError) setLoading(false); // Ensure loading stops if init failed before client mount
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
            console.log(`AuthContext: User profile exists for ${user.uid}. isComplete: ${userProfile.isProfileComplete}`);
          if (userProfile.isProfileComplete) {
            // Profile complete: redirect away from auth/setup pages to dashboard/home
            if ((isAuthPage || isProfileSetupPage)) {
               console.log(`AuthContext: Profile complete. Redirecting from ${pathname} to /dashboard/home`);
               router.push("/dashboard/home");
            } else {
               console.log(`AuthContext: Profile complete. User already on allowed page: ${pathname}.`);
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
        // Define isDashboardPage again here to avoid ReferenceError
        const isDashboardPage = pathname.startsWith('/dashboard');
        // Redirect away from protected routes
        if (isDashboardPage || pathname === '/profile/setup') {
            console.log(`AuthContext: User not authenticated. Redirecting from protected path ${pathname} to /login`);
            router.push("/login");
        } else {
            console.log(`AuthContext: User not authenticated. Staying on public path: ${pathname}`);
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
  // Only depend on things that change AFTER mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, initializationError, fetchUserProfile, pathname]); // Removed router from deps, added pathname


  const signUp = async (email: string, pass: string, fullName: string): Promise<FirebaseUser | null> => {
     const { auth, db, error: initErr } = getFirebaseServices();
     setRuntimeError(null); // Clear previous runtime errors
     if (initErr || !auth || !db) {
        const errorMessage = initErr || (!auth ? "Auth service unavailable." : "DB service unavailable.");
        console.error("AuthContext: signUp: Cannot proceed due to Firebase initialization error or missing service:", errorMessage);
        setInitializationError(prev => prev || errorMessage); // Ensure init error state reflects this
        return null;
     }

    try {
      console.log("AuthContext: Attempting signup for:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth user created:", user.uid);

      const userDocRef = doc(db, "users", user.uid);
      // Create BaseUser structure
       const initialUserData: Omit<BaseUser, 'userType'> & { createdAt: any; updatedAt: any } = {
         uid: user.uid,
         email: user.email || "",
         fullName,
         profileImageUrl: user.photoURL || "", // Use Firebase Auth photoURL if available
         isProfileComplete: false, // Initially incomplete
         createdAt: serverTimestamp(),
         updatedAt: serverTimestamp(),
         // userType will be added during profile completion
       };


      await setDoc(userDocRef, initialUserData);
      console.log("AuthContext: Firestore base user document created for:", user.uid);

      // No need to set local state here, the listener will pick it up and redirect to setup.
      console.log("AuthContext: Signup successful. Listener will handle state update and redirection to profile setup.");
      return user;

    } catch (e: any) {
      console.error("❌ AuthContext: Signup Failed:", e);
      let userFriendlyError = `Signup failed. Code: ${e.code || 'UNKNOWN'}`;
       if (e.code === 'auth/email-already-in-use') userFriendlyError = 'This email address is already registered. Please try logging in or use a different email.';
       else if (e.code === 'auth/weak-password') userFriendlyError = 'Password is too weak. It must be at least 6 characters long.';
       else if (e.code === 'auth/invalid-email') userFriendlyError = 'The email address provided is not valid.';
       else if (e.code === 'auth/operation-not-allowed') userFriendlyError = 'Email/Password sign-up is not enabled for this project. Please contact support.';
       else if (e.code?.includes('invalid-api-key') || e.code?.includes('api-key-not-valid')) userFriendlyError = 'Authentication failed due to an invalid API Key. Check Firebase configuration.';
       else userFriendlyError = e.message; // Default to Firebase message if code not recognized
      setRuntimeError(userFriendlyError);
      return null;
    }
  };


  const logIn = async (email: string, pass: string, userTypeAttempt: UserType): Promise<FirebaseUser | null> => {
     const { auth, db, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr || !auth || !db) {
       const message = initErr || (!auth ? "Auth service unavailable." : "DB service unavailable.");
       console.error("AuthContext: logIn: Cannot proceed:", message);
       setInitializationError(prev => prev || message);
       return null;
     }

    setLoading(true); // Set loading true specifically for login attempt

    try {
      console.log("AuthContext: Attempting login for:", email, "as", userTypeAttempt);
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      console.log("AuthContext: Firebase Auth successful for:", user.uid);

      // Fetch profile immediately after successful Firebase Auth
      const userProfile = await fetchUserProfile(user);

       if (runtimeError && !userProfile) { // Check if fetchUserProfile set a runtimeError
          console.error(`AuthContext: Login succeeded for ${user.uid} but profile fetch failed. Logging out. Error: ${runtimeError}`);
          await signOut(auth);
          setLoading(false);
          return null;
       }

      if (!userProfile) {
          console.warn(`AuthContext: Login successful for ${user.uid}, but no Firestore profile exists. Needs setup.`);
          // Set Firebase user but keep local profile null, listener will redirect to setup
          setFirebaseUser(user);
          setCurrentUser(null);
          setLoading(false); // Stop loading, redirection handled by listener
          return user;
      }

      // Verify user type against attempt
      if (userProfile.userType !== userTypeAttempt) {
        const typeErrorMsg = `Login failed: You are registered as a ${userProfile.userType}, not a ${userTypeAttempt}. Please use the correct role.`;
        console.error("AuthContext: " + typeErrorMsg);
        setRuntimeError(typeErrorMsg);
        await signOut(auth); // Sign out the user
        setCurrentUser(null);
        setFirebaseUser(null);
        setLoading(false);
        return null;
      }

      // User type matches, update state
      console.log(`AuthContext: Login successful and role verified for ${user.uid} (Role: ${userTypeAttempt}). Profile complete: ${userProfile.isProfileComplete}.`);
      setCurrentUser(userProfile);
      setFirebaseUser(user);
      setLoading(false); // Login process complete

       // Explicit redirection check AFTER setting state
        if (userProfile.isProfileComplete) {
            console.log("AuthContext logIn: Profile complete, redirecting to dashboard.");
            router.push('/dashboard/home'); // Redirect to dashboard home
        } else {
             console.log("AuthContext logIn: Profile incomplete, redirecting to setup.");
             router.push('/profile/setup'); // Redirect to profile setup
        }


      return user; // Return the authenticated Firebase user

    } catch (e: any) {
      console.error("❌ AuthContext: Login Failed:", e);
      let userFriendlyError = `Login failed. Code: ${e.code || 'UNKNOWN'}`;
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-email') userFriendlyError = 'Invalid email or password provided. Please try again.';
       else if (e.code === 'auth/too-many-requests') userFriendlyError = 'Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.';
       else if (e.code === 'auth/user-disabled') userFriendlyError = 'This user account has been disabled. Please contact support.';
       else if (e.code?.includes('invalid-api-key') || e.code?.includes('api-key-not-valid')) userFriendlyError = 'Authentication failed due to an invalid API Key. Check Firebase configuration.';
       else userFriendlyError = e.message;
       setRuntimeError(userFriendlyError);
       setCurrentUser(null);
       setFirebaseUser(null);
       setLoading(false); // Ensure loading stops on error
      return null;
    }
  };


  const logOut = async () => {
    const { auth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr || !auth) {
       const message = initErr || "Firebase Auth service unavailable. Cannot log out.";
       setInitializationError(prev => prev || message);
       console.error("AuthContext: logOut:", message);
      return;
    }

    try {
      await signOut(auth);
      console.log("AuthContext: User logged out successfully.");
       // State clearing and redirection are now primarily handled by the onAuthStateChanged listener
       // But we can clear local state immediately for faster UI feedback
        setCurrentUser(null);
        setFirebaseUser(null);
        // The listener will detect the null user and redirect from protected pages if necessary.
        // Force redirect to login page regardless of current location for clarity.
        console.log("AuthContext logOut: Redirecting to /login");
        router.push('/login');

    } catch (e: any) {
      console.error("❌ AuthContext: Logout Failed:", e);
      setRuntimeError(e.message || "Failed to log out.");
    }
  };


 const updateUserProfile = async (userId: string, data: Partial<User>) => {
     const { db, auth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr || !auth || !db) {
        const message = initErr || (!auth ? "Auth service unavailable." : "DB service unavailable.");
        console.error("AuthContext: updateUserProfile: Cannot proceed:", message);
        setInitializationError(prev => prev || message);
        throw new Error(message);
     }

    const currentFirebaseUser = auth.currentUser;
    // Allow update only if the current logged-in user matches the userId being updated
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
        const message = "Authorization error: Cannot update profile for another user or not logged in.";
        console.error("AuthContext: updateUserProfile:", message, { functionUserId: userId, authUserId: currentFirebaseUser?.uid });
        setRuntimeError(message);
        throw new Error(message);
    }

    try {
      console.log("AuthContext: Updating profile for user:", userId);
      const userDocRef = doc(db, "users", userId);
      const updateData = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(userDocRef, updateData);
      console.log("AuthContext: Profile updated successfully in Firestore for user:", userId);

      // Update local state immediately for better UX
      const localTimestamp = Date.now();
      // Ensure we merge correctly, preserving existing fields
       setCurrentUser(prev => {
         if (!prev || prev.uid !== userId) return prev; // Safety check
         // Ensure all required fields from BaseUser are present after merge
         const updatedUser: User = {
           ...prev,
           ...data, // Apply updates
           updatedAt: localTimestamp,
         };
         return updatedUser;
       });
       toast({ title: "Profile Updated", description: "Your changes have been saved." });


    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Update Failed for ${userId}:`, e);
       const updateErrorMsg = `Could not update profile: ${e.message}`;
       setRuntimeError(updateErrorMsg);
       throw new Error(updateErrorMsg);
    }
  };


 const completeProfile = async (userId: string, userType: UserType, profileData: StudentProfile | AlumniProfile) => {
     const { db, auth, error: initErr } = getFirebaseServices();
     setRuntimeError(null);
     if (initErr || !auth || !db) {
       const message = initErr || (!auth ? "Auth service unavailable." : "DB service unavailable.");
       console.error("AuthContext: completeProfile: Cannot proceed:", message);
       setInitializationError(prev => prev || message);
       throw new Error(message);
     }

    const currentFirebaseUser = auth.currentUser;

    // Crucial Check: Ensure the function is called for the currently authenticated user
    if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
       const message = "Authorization error: Incorrect user trying to complete profile.";
       console.error("AuthContext: completeProfile:", message, { functionUserId: userId, authUserId: currentFirebaseUser?.uid });
       setRuntimeError(message);
       throw new Error(message);
    }

    try {
      console.log("AuthContext: Completing profile for user:", userId, "as", userType);
      const userDocRef = doc(db, "users", userId);

      const existingDocSnap = await getDoc(userDocRef);
      if (!existingDocSnap.exists()) {
           console.error(`AuthContext: completeProfile: Base user document not found for UID: ${userId}. Signup might have failed partially.`);
           throw new Error("User base record not found during profile completion.");
      }
      const existingData = existingDocSnap.data() as BaseUser; // Assume BaseUser structure exists

       // Construct the full profile data, ensuring all BaseUser fields are present
       const completeProfileData: Partial<User> & { userType: UserType; isProfileComplete: boolean; updatedAt: any } = {
         ...profileData,                // Add new specific profile data
         userType: userType,           // Set the correct user type
         isProfileComplete: true,      // Mark as complete
         updatedAt: serverTimestamp(), // Use server timestamp for the update
       };


      // Merge the new profile data with the existing base data
      await updateDoc(userDocRef, completeProfileData);
      console.log("AuthContext: Profile completed and saved/merged to Firestore for user:", userId);

       // Fetch the complete profile again to update local state accurately
       const updatedProfile = await fetchUserProfile(currentFirebaseUser);
       if (updatedProfile) {
          setCurrentUser(updatedProfile);
          console.log("AuthContext: currentUser state updated after profile completion with fresh data.");
          // The listener/useEffect will handle redirection from /profile/setup page
           // Explicit redirect after successful completion if needed (listener might handle it too)
           console.log("AuthContext completeProfile: Redirecting to dashboard/home.");
           router.push('/dashboard/home');
       } else {
            console.error("AuthContext completeProfile: Failed to fetch updated profile after completion for UID:", userId);
            // Handle error - maybe sign out or show error message
            await logOut(); // Sign out if profile fetch fails after update
            throw new Error("Failed to retrieve updated profile after completion.");
       }


    } catch (e: any) {
       console.error(`❌ AuthContext: Profile Completion Failed for ${userId}:`, e);
       const completeErrorMsg = `Could not complete profile: ${e.message}`;
       setRuntimeError(completeErrorMsg);
       throw new Error(completeErrorMsg);
    }
  };


  const authContextValue: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error: runtimeError || initializationError, // Combine errors
    isClient,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
    completeProfile,
  };

  // --- Rendering Logic ---

   if (!isClient) {
     // Render nothing or a basic placeholder on the server to avoid hydration issues
     // especially if loading/error state might differ on client mount.
     return null;
   }

   if (initializationError) {
     return <FirebaseConfigErrorScreen errorMsg={initializationError} />;
   }

  // Show loading indicator ONLY if the auth state is still resolving
  // Don't show it just because `isClient` becomes true
  if (loading && !initializationError) {
     return <GlobalLoadingIndicator />;
  }

  // Render children once loading is false and there's no init error
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

