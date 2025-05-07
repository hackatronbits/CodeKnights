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
  const { firebaseUser, loading, currentUser, checkProfileCompletion } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!firebaseUser) {
        router.push("/login");
      } else if (firebaseUser && (!currentUser || !currentUser.isProfileComplete)) {
         // Check if profile is complete from Firestore as currentUser might be stale initially
        checkProfileCompletion(firebaseUser).then(isComplete => {
          if (!isComplete) {
            router.push("/profile/setup");
          }
        });
      }
    }
  }, [firebaseUser, loading, router, currentUser, checkProfileCompletion]);

  if (loading || !firebaseUser || !currentUser?.isProfileComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
