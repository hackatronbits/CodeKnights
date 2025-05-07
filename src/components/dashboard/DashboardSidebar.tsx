"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, MessageSquare, Users, UserCircle, LogOut, Briefcase } from "lucide-react";
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
  SidebarInset,
} from "@/components/ui/sidebar";


interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  student?: boolean;
  alumni?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard/home", label: "Home", icon: Home, student: true, alumni: true },
  { href: "/dashboard/find", label: "Find Mentors", icon: Search, student: true },
  { href: "/dashboard/find", label: "Find Students", icon: Search, alumni: true },
  { href: "/dashboard/connections", label: "My Mentors", icon: Users, student: true },
  { href: "/dashboard/connections", label: "My Mentees", icon: Users, alumni: true },
  { href: "/dashboard/resources", label: "Resources", icon: BookOpen, student: true, alumni: true },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare, student: true, alumni: true },
  { href: "/dashboard/profile", label: "My Profile", icon: UserCircle, student: true, alumni: true },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { currentUser, logOut } = useAuth();

  const filteredNavItems = navItems.filter(item => {
    if (!currentUser) return false;
    if (currentUser.userType === "student" && item.student) return true;
    if (currentUser.userType === "alumni" && item.alumni) return true;
    return false;
  });

  return (
    <SidebarProvider defaultOpen>
       <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 justify-between items-center flex">
          <Link href="/dashboard/home" className="flex items-center gap-2 font-semibold text-lg group-data-[collapsible=icon]:hidden">
            <Briefcase className="h-6 w-6 text-primary" />
            <span>MentorConnect</span>
          </Link>
          <SidebarTrigger className="md:hidden" />
        </SidebarHeader>
        <Separator className="group-data-[collapsible=icon]:hidden"/>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <Separator className="group-data-[collapsible=icon]:hidden"/>
        <SidebarFooter className="p-4 space-y-2">
          <div className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </div>
          <Button variant="outline" onClick={logOut} className="w-full justify-start group-data-[collapsible=icon]:justify-center">
            <LogOut className="mr-3 h-5 w-5 group-data-[collapsible=icon]:mr-0" />
           <span className="group-data-[collapsible=icon]:hidden">Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset /> {/* This is required for the content to be pushed correctly */}
    </SidebarProvider>
  );
}
