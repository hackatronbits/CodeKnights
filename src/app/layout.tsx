
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter font
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" }); // Configure Inter font

export const metadata: Metadata = {
  title: "MentorConnect",
  description: "Connecting students with alumni for mentorship and guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "antialiased font-sans flex flex-col min-h-screen", // Ensure body itself is flex-col
          inter.variable // Apply Inter font variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* AuthProvider wraps the main content and toaster */}
          <AuthProvider>
            {/* The direct children of AuthProvider will now be the page content */}
            {/* Ensure children can grow to fill available space */}
            <div className="flex flex-col flex-grow">
                 {children}
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
