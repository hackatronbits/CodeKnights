
"use client";

import type React from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, loading, currentUser } = useAuth(); // Removed checkProfileCompletion from here
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        // Not logged in, redirect to login
        console.log("DashboardLayout Guard: No firebaseUser, redirecting to /login");
        router.push("/login");
      } else if (firebaseUser && (!currentUser || !currentUser.isProfileComplete)) {
        // Logged in, but profile is not complete (or not loaded yet)
        // AuthContext useEffect should handle redirecting *to* /profile/setup
        // This guard just prevents access *to* dashboard pages if incomplete.
        // We can double-check here, but rely on AuthContext's `currentUser` state primarily.
         console.log("DashboardLayout Guard: User logged in but profile incomplete/null, redirecting to /profile/setup");
         router.push("/profile/setup");
        // Previous check using checkProfileCompletion:
        // checkProfileCompletion(firebaseUser).then(isComplete => {
        //   if (!isComplete) {
        //     router.push("/profile/setup");
        //   }
        // });
      }
      // If firebaseUser exists AND currentUser exists AND currentUser.isProfileComplete is true, allow access.
    }
  }, [firebaseUser, loading, router, currentUser]); // Dependency on currentUser ensures re-check when profile completes

  // Show loading indicator while auth state is resolving or user data is loading
  // Also show loading if redirecting due to incomplete profile (prevents flashing content)
  if (loading || !firebaseUser || !currentUser?.isProfileComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is false, user exists, and profile is complete, render the layout
  return (
     <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
