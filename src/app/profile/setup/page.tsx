
"use client"; // Mark this component as a Client Component

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProfileSetupForm } from "@/components/profile/ProfileSetupForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
// Removed Loader2 and useAuth import as loading is handled by AuthProvider/Layout

export default function ProfileSetupPage() {
  // No need for loading check here anymore, AuthProvider handles it before rendering this page

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 md:px-8 bg-gradient-to-br from-background to-secondary/30">
        <Card className="w-full max-w-2xl p-6 md:p-8 shadow-xl border-primary/50">
          <CardHeader className="p-0 mb-6 text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Complete Your Profile</CardTitle>
            <CardDescription className="text-muted-foreground">
              Tell us a bit more about yourself to get started with MentorConnect.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ProfileSetupForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
