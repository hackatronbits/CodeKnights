"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Menu, X } from "lucide-react"; // Removed MoreVertical
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose, // Import SheetClose
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

// Updated navItems to reflect the actual top-level pages
const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" }, // Re-added Services
  { href: "/contact", label: "Contact" },   // Re-added Contact
];


export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-4">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl hidden sm:inline-block">
            MentorConnect
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              {item.label}
            </Link>
          ))}
           {/* Direct Login Link */}
           <Link
              href="/login"
              className={cn(
                "transition-colors hover:text-foreground/80",
                 pathname === "/login" ? "text-foreground" : "text-foreground/60"
               )}
            >
              Login
            </Link>
        </nav>

        {/* Spacer to push right items */}
        <div className="flex-1 md:hidden"></div>

        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Mobile Menu Button */}
          <div className="md:hidden">
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="icon">
                   <Menu className="h-6 w-6" />
                   <span className="sr-only">Toggle Menu</span>
                 </Button>
               </SheetTrigger>
               <SheetContent side="right" className="w-[280px] sm:w-[340px] p-0 flex flex-col">
                 <SheetHeader className="p-4 border-b">
                   <SheetTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      MentorConnect
                   </SheetTitle>
                 </SheetHeader>
                 <nav className="flex flex-col p-4 space-y-2 flex-1">
                   {navItems.map((item) => (
                     <SheetClose key={item.href} asChild>
                       <Link
                         href={item.href}
                         className={cn(
                           "block px-3 py-2 rounded-md text-base font-medium transition-colors",
                           pathname === item.href
                             ? "bg-primary/10 text-primary"
                             : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                         )}
                         onClick={() => setIsMobileMenuOpen(false)} // Close on click
                       >
                         {item.label}
                       </Link>
                     </SheetClose>
                   ))}
                    {/* Mobile Login Link */}
                    <SheetClose asChild>
                       <Link
                          href="/login"
                          className={cn(
                           "block px-3 py-2 rounded-md text-base font-medium transition-colors",
                           pathname === "/login"
                             ? "bg-primary/10 text-primary"
                             : "text-foreground/80 hover:bg-accent hover:text/accent-foreground"
                           )}
                          onClick={() => setIsMobileMenuOpen(false)} // Close on click
                        >
                          Login
                        </Link>
                     </SheetClose>

                 </nav>
                 {/* Footer section in sheet for Theme Toggle */}
                 <div className="p-4 border-t mt-auto">
                    {/* Consider adding other actions here if needed */}
                 </div>
               </SheetContent>
             </Sheet>
           </div>
        </div>
      </div>
    </header>
  );
}
