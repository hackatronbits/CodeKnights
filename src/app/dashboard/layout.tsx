
"use client";

import type React from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { Toaster } from "@/components/ui/toaster";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthProvider handles loading/redirects. If we reach here, user is authenticated & profile complete.

  return (
     <div className="flex min-h-screen bg-background">
       {/* Pass children directly to the sidebar component */}
      <DashboardSidebar>{children}</DashboardSidebar>
      {/* Removed the separate <main> tag. SidebarInset within DashboardSidebar now handles the main content area */}
      <Toaster /> {/* Keep toaster for dashboard-specific notifications */}
    </div>
  );
}
