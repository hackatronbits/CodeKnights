"use client";

import Link from "next/link";
import type React from "react"; // Import React for type definitions
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, MessageSquare, Users, UserCircle, LogOut, Briefcase, Settings, LifeBuoy } from "lucide-react"; // Added Settings, LifeBuoy
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset, // Import SidebarInset
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Import Avatar components

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  student?: boolean;
  alumni?: boolean;
  dropdown?: Array<NavItem>;
}

const navItems: NavItem[] = [
  { href: "/dashboard/home", label: "Home", icon: Home, student: true, alumni: true },
  { href: "/dashboard/find", label: "Find Mentors", icon: Search, student: true },
  { href: "/dashboard/find", label: "Find Students", icon: Search, alumni: true },
  { href: "/dashboard/connections", label: "My Connections", icon: Users, student: true, alumni: true },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare, student: true, alumni: true },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen, student: true, alumni: true },
  { href: "/dashboard/profile", label: "My Profile", icon: UserCircle, student: true, alumni: true },
  {
    href: "/dashboard/community", label: "Community", icon: Users, student: true, alumni: true, dropdown: [
      { href: "/dashboard/community/open-discussion", label: "Open Discussion", icon: MessageSquare, student: true, alumni: true },
      { href: "/dashboard/community/notice", label: "Notice", icon: BookOpen, student: false, alumni: true }
    ]
  },
];

// Helper function for initials
const getInitials = (name?: string | null): string => {
  if (!name) return "?";
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Update component props to accept children
export default function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, logOut } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!currentUser) return false;
    // Adjust label based on user type for connections
    if (item.href === "/dashboard/connections") {
        item.label = currentUser.userType === "student" ? "My Mentors" : "My Mentees";
    }
    if (currentUser.userType === "student" && item.student) return true;
    if (currentUser.userType === "alumni" && item.alumni) return true;
    return false;
  });

  return (
    // Wrap everything in SidebarProvider
    <SidebarProvider defaultOpen>
       <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 justify-between items-center flex flex-col gap-4 group-data-[collapsible=icon]:gap-2">
          {/* Logo Section */}
          <div className="flex items-center justify-between w-full">
             <Link href="/dashboard/home" className="flex items-center gap-2 font-semibold text-lg group-data-[collapsible=icon]:hidden">
               <Briefcase className="h-6 w-6 text-primary" />
               <span>MentorConnect</span>
             </Link>
             <SidebarTrigger className="md:hidden" />
           </div>

           {/* User Profile Section (Visible when expanded) */}
           <div className="flex flex-col items-center gap-2 group-data-[collapsible=icon]:hidden w-full border-t pt-4 mt-2">
              <Avatar className="h-16 w-16 border-2 border-primary mb-2">
                 <AvatarImage src={currentUser?.profileImageUrl || `https://picsum.photos/seed/${currentUser?.uid}/100/100`} alt={currentUser?.fullName || 'User'} data-ai-hint="profile person" />
                 <AvatarFallback>{getInitials(currentUser?.fullName)}</AvatarFallback>
               </Avatar>
              <p className="font-semibold text-sm truncate w-full text-center">{currentUser?.fullName}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentUser?.userType}</p>
            </div>
        </SidebarHeader>
        <Separator className="group-data-[collapsible=icon]:hidden"/>
        <SidebarContent className="p-2 flex-1 overflow-y-auto"> {/* Allow content to scroll */}
          <SidebarMenu>
            {filteredNavItems.map((item) => {
              if (item.dropdown) {
                // Only show dropdown if at least one child is visible to the user
                const visibleDropdown = item.dropdown.filter(sub => (currentUser && ((currentUser.userType === 'alumni' && sub.alumni) || (currentUser.userType === 'student' && sub.student))));
                if (visibleDropdown.length === 0) return null;
                return (
                  <SidebarMenuItem key={item.label + '-dropdown'}>
                    <div className="relative group">
                      <SidebarMenuButton className="w-full justify-start flex items-center">
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                        <svg className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </SidebarMenuButton>
                      <div className="absolute left-0 mt-2 w-48 bg-background border rounded shadow-lg z-10 hidden group-hover:block group-focus-within:block">
                        {visibleDropdown.map((sub) => (
                          <Link key={sub.href} href={sub.href} legacyBehavior passHref>
                            <SidebarMenuButton className="w-full justify-start flex items-center px-4 py-2 hover:bg-muted">
                              <sub.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span>{sub.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </SidebarMenuItem>
                );
              } else {
                return (
                  <SidebarMenuItem key={item.href + item.label}>
                    <Link href={item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        isActive={pathname === item.href || (item.href === "/dashboard/find" && pathname.startsWith("/dashboard/find"))}
                        tooltip={item.label}
                        className="w-full justify-start"
                      >
                        <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                );
              }
            })}
          </SidebarMenu>
        </SidebarContent>
        <Separator className="group-data-[collapsible=icon]:hidden"/>
        <SidebarFooter className="p-4 space-y-2">
           <div className="group-data-[collapsible=icon]:hidden">
             <ThemeToggle /> {/* Keep theme toggle */}
           </div>
           {/* Consider adding Settings or Help links here */}
           {/* <SidebarMenu>
              <SidebarMenuItem>
                 <Link href="/dashboard/settings" legacyBehavior passHref>
                     <SidebarMenuButton tooltip="Settings" className="w-full justify-start">
                       <Settings className="mr-3 h-5 w-5 flex-shrink-0"/>
                       <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                     </SidebarMenuButton>
                   </Link>
               </SidebarMenuItem>
                <SidebarMenuItem>
                   <Link href="/help" legacyBehavior passHref> // Or link to a help page
                      <SidebarMenuButton tooltip="Help" className="w-full justify-start">
                        <LifeBuoy className="mr-3 h-5 w-5 flex-shrink-0"/>
                        <span className="group-data-[collapsible=icon]:hidden">Help</span>
                      </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
            <Separator className="group-data-[collapsible=icon]:hidden my-2"/> */}

          <Button variant="outline" onClick={logOut} className="w-full justify-start group-data-[collapsible=icon]:justify-center">
            <LogOut className="mr-3 h-5 w-5 group-data-[collapsible=icon]:mr-0 flex-shrink-0" />
           <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      {/* Render SidebarInset here and place children inside it */}
       <SidebarInset className="flex-1 p-4 md:p-8 overflow-y-auto bg-background"> {/* Ensure inset takes remaining space */}
         {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
