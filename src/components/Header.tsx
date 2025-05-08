"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Menu, Home, Info, Handshake, Mail } from "lucide-react"; // Use specific icons
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType; // Added icon property
}

// Updated navItems to reflect the actual top-level pages (excluding Login)
const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/services", label: "Services", icon: Handshake },
  { href: "/contact", label: "Contact", icon: Mail },
];


export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 mr-4 flex-shrink-0">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl hidden sm:inline-block">
            MentorConnect
          </span>
        </Link>

        {/* Desktop Navigation (Items Only) */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-1", // Added flex layout
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              <item.icon className="h-4 w-4" /> {/* Render icon */}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Spacer to push right items */}
        <div className="flex-grow"></div>

        {/* Right-aligned items (Desktop + Mobile Trigger) */}
        <div className="flex items-center space-x-2 md:space-x-4">
           {/* Desktop Login Link */}
           <Link
              href="/login"
              className={cn(
                "hidden md:inline-flex transition-colors hover:text-foreground/80 text-sm font-medium", // Use similar styling as nav items
                 pathname === "/login" ? "text-foreground" : "text-foreground/60"
               )}
            >
              Login
            </Link>

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
                   {/* Mobile Nav Items */}
                   {navItems.map((item) => (
                     <SheetClose key={item.href} asChild>
                       <Link
                         href={item.href}
                         className={cn(
                           "flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors", // Added flex layout
                           pathname === item.href
                             ? "bg-primary/10 text-primary"
                             : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                         )}
                         onClick={() => setIsMobileMenuOpen(false)} // Close on click
                       >
                         <item.icon className="h-5 w-5" /> {/* Mobile icon */}
                         {item.label}
                       </Link>
                     </SheetClose>
                   ))}
                    {/* Mobile Login Link */}
                    <SheetClose asChild>
                       <Link
                          href="/login"
                          className={cn(
                           "flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors", // Added flex layout
                           pathname === "/login"
                             ? "bg-primary/10 text-primary"
                             : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                           )}
                          onClick={() => setIsMobileMenuOpen(false)} // Close on click
                        >
                          {/* Optional: Add Login icon */}
                          {/* <LogIn className="h-5 w-5" /> */}
                          Login
                        </Link>
                     </SheetClose>

                 </nav>
                 {/* Footer section in sheet can be removed or used for other elements */}
                 {/* <div className="p-4 border-t mt-auto"> */}
                    {/* Theme toggle could be moved here for mobile if desired */}
                 {/* </div> */}
               </SheetContent>
             </Sheet>
           </div>
        </div>
      </div>
    </header>
  );
}
