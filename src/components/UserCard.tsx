
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Student, Alumni } from "@/types";
import { Building, Briefcase, UserPlus, Check, MessageCircle, Trash2, Mail, UserCheck } from "lucide-react"; // Added UserCheck
import { cn } from "@/lib/utils"; // Import cn
import Link from 'next/link'; // Import Link for messaging

interface UserCardProps {
  user: Student | Alumni;
  onAddOrConnect?: (userId: string) => void; // Combined prop
  onRemove?: (userId: string) => void; // For removing connections
  isAddedOrConnected?: boolean; // Combined prop
  viewerType: "student" | "alumni";
}

export default function UserCard({ user, onAddOrConnect, onRemove, isAddedOrConnected, viewerType }: UserCardProps) {
  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getConversationLink = (otherUserId: string): string => {
     // Links to the general conversations page
     return `/dashboard/conversations`;
  };

  const addButtonText = viewerType === 'student' ? 'Add Mentor' : 'Connect';
  const addedButtonText = viewerType === 'student' ? 'Mentor Added' : 'Connected';
  const AddIcon = viewerType === 'student' ? UserPlus : UserCheck; // Use UserCheck for alumni connecting

  return (
    <Card className={cn(
        "w-full max-w-sm shadow-lg flex flex-col",
        "group transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl"
     )}>
      <CardHeader className="items-center text-center p-4 md:p-6">
        <Avatar className="w-24 h-24 mb-3 border-2 border-primary group-hover:border-primary/70 transition-colors duration-300">
          <AvatarImage src={user.profileImageUrl || `https://picsum.photos/seed/${user.uid}/200/200`} alt={user.fullName} data-ai-hint="profile person" />
          <AvatarFallback className="text-3xl">{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-xl font-semibold">{user.fullName}</CardTitle>
        {user.userType === "alumni" && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Briefcase className="w-4 h-4" /> {user.workingField || "Field not specified"}
          </p>
        )}
        {user.userType === "student" && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Briefcase className="w-4 h-4" /> Interested in: {user.fieldOfInterest || "Field not specified"}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-4 md:pb-6 flex-grow">
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <Building className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
            <span>
              {user.userType === "alumni" ? user.passOutUniversity : user.university || "University not specified"}
            </span>
          </div>
          {user.userType === "alumni" && user.bio && (
            <p className="line-clamp-3 text-xs">
              {user.bio}
            </p>
          )}
           {user.userType === "student" && user.pursuingCourse && (
            <p className="text-xs">
              Course: {user.pursuingCourse}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 md:p-6 border-t flex flex-col sm:flex-row gap-2">
        {/* --- Add/Connect Button (Only shown if onRemove is NOT provided) --- */}
        {!onRemove && onAddOrConnect && (
          <Button
            className="w-full"
            onClick={() => onAddOrConnect(user.uid)}
            disabled={isAddedOrConnected}
            variant={isAddedOrConnected ? "secondary" : "default"}
          >
            {isAddedOrConnected ? <Check className="mr-2 h-4 w-4" /> : <AddIcon className="mr-2 h-4 w-4" />}
            {isAddedOrConnected ? addedButtonText : addButtonText}
          </Button>
        )}

        {/* --- Remove/Message Buttons (Only shown if onRemove IS provided) --- */}
        {onRemove && (
           <div className="flex w-full gap-2">
             <Button
                variant="outline"
                className="flex-1"
                asChild
             >
                 <Link href={getConversationLink(user.uid)}>
                   <Mail className="mr-2 h-4 w-4"/> Message
                 </Link>
             </Button>
            <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onRemove(user.uid)}
             >
                 <Trash2 className="mr-2 h-4 w-4" /> Remove
             </Button>
           </div>
        )}
      </CardFooter>
    </Card>
  );
}

    