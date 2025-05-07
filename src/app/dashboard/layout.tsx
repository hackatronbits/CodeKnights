
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
  // Get loading state and isClient from context
  const { firebaseUser, loading, currentUser, isClient } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only run checks on the client side after initial mount and when auth is not loading
    if (isClient && !loading) {
      if (!firebaseUser) {
        // Not logged in
        console.log("DashboardLayout Guard: No firebaseUser, redirecting to /login");
        router.push("/login");
      } else if (firebaseUser && (!currentUser || !currentUser.isProfileComplete)) {
        // Logged in, but profile incomplete
         console.log("DashboardLayout Guard: User logged in but profile incomplete/null, redirecting to /profile/setup");
         router.push("/profile/setup");
      }
      // If firebaseUser exists AND currentUser exists AND currentUser.isProfileComplete is true, allow access.
    }
    // Add isClient to dependency array to re-run check after client mounts
  }, [firebaseUser, loading, router, currentUser, isClient]);

  // --- Loading State ---
  // Show loading indicator if:
  // 1. We are not on the client yet (initial render or hydration phase)
  // 2. We are on the client, but the auth context is still loading its state
  // 3. We are on the client, not loading auth, but user/profile data isn't ready for dashboard access
  //    (This condition prevents flashing content while redirecting for incomplete profile)
  if (!isClient || loading || (isClient && firebaseUser && (!currentUser || !currentUser.isProfileComplete))) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <Loader2 className="h-12 w-12 animate-spin text-primary" />
       </div>
     );
  }

   // --- Error State (Optional but recommended) ---
   // You might want to check `useAuth().error` here and display an error UI if needed.
   // const { error } = useAuth();
   // if (error) {
   //   return <div className="text-destructive text-center p-8">Error loading dashboard: {error}</div>;
   // }

  // If all checks pass (isClient, !loading, firebaseUser exists, profile complete), render the dashboard layout
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

