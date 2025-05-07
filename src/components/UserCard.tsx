import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Student, Alumni } from "@/types";
import { Building, Briefcase, UserPlus, Check, MessageCircle } from "lucide-react";

interface UserCardProps {
  user: Student | Alumni;
  onAdd?: (userId: string) => void;
  onConnect?: (userId: string) => void; // For alumni to connect with students
  isAdded?: boolean; // For students to see if mentor is already added
  isConnected?: boolean; // For alumni to see if student is already connected
  viewerType: "student" | "alumni";
}

export default function UserCard({ user, onAdd, onConnect, isAdded, isConnected, viewerType }: UserCardProps) {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card className="w-full max-w-sm shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader className="items-center text-center p-4 md:p-6">
        <Avatar className="w-24 h-24 mb-3 border-2 border-primary">
          <AvatarImage src={user.profileImageUrl || `https://picsum.photos/seed/${user.uid}/200/200`} alt={user.fullName} data-ai-hint="profile person" />
          <AvatarFallback className="text-3xl">{getInitials(user.fullName)}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-xl font-semibold">{user.fullName}</CardTitle>
        {user.userType === "alumni" && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Briefcase className="w-4 h-4" /> {user.workingField || "Field not specified"}
          </p>
        )}
        {user.userType === "student" && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
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
      <CardFooter className="p-4 md:p-6 border-t">
        {viewerType === "student" && user.userType === "alumni" && onAdd && (
          <Button 
            className="w-full" 
            onClick={() => onAdd(user.uid)} 
            disabled={isAdded}
            variant={isAdded ? "secondary" : "default"}
          >
            {isAdded ? <Check className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isAdded ? "Added" : "Add Mentor"}
          </Button>
        )}
        {viewerType === "alumni" && user.userType === "student" && onConnect && (
           <Button 
            className="w-full" 
            onClick={() => onConnect(user.uid)} 
            disabled={isConnected}
            variant={isConnected ? "secondary" : "default"}
          >
            {isConnected ? <Check className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            {isConnected ? "Connected" : "Connect"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
