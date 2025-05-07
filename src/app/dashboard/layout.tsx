
"use client";

import type React from "react";
// Removed useEffect, useRouter, useAuth, Loader2 as they are handled by AuthProvider now
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- No Loading or Auth Checks Needed Here Anymore ---
  // The AuthProvider higher up the tree now handles:
  // 1. Showing a loading indicator until auth state is resolved.
  // 2. Showing an error screen if Firebase initialization fails.
  // 3. Redirecting to /login if the user is not authenticated.
  // 4. Redirecting to /profile/setup if the user is authenticated but profile is incomplete.
  //
  // If the code reaches this point, it means the user is authenticated,
  // the profile is complete, and the client is ready.

  return (
     <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
      <Toaster /> {/* Keep toaster for dashboard-specific notifications */}
    </div>
  );
}
