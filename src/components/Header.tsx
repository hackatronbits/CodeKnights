"use client";

import Link from "next/link";
import { Briefcase, LogIn, UserPlus, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Header() {
  const { currentUser, firebaseUser, logOut, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">MentorConnect</span>
        </Link>
        <div className="flex items-center space-x-2 md:space-x-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted"></div>
          ) : firebaseUser ? (
            <>
              {currentUser?.isProfileComplete && (
                 <Button variant="ghost" onClick={() => router.push("/dashboard/home")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                 </Button>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" legacyBehavior passHref>
                <Button variant="ghost">
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              </Link>
              <Link href="/" legacyBehavior passHref>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" /> Signup
                </Button>
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
