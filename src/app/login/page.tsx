import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4 md:px-8 bg-gradient-to-br from-background to-secondary/30">
        <Card className="w-full max-w-md p-6 md:p-8 shadow-xl border-primary/50">
          <CardHeader className="p-0 mb-6 text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Welcome Back!</CardTitle>
            <CardDescription className="text-muted-foreground">
              Log in to continue your MentorConnect journey.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <LoginForm />
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
