"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, documentId, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types";
import UserCard from "@/components/UserCard";
import { Loader2, Users, Trash2 } from "lucide-react"; // Added Trash2
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; 
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function ConnectionsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<User[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const { toast } = useToast();
  const [userToRemove, setUserToRemove] = useState<User | null>(null); // State for confirmation dialog


  const fetchConnections = useCallback(async () => {
      if (!currentUser || (!currentUser.myMentors && !currentUser.myMentees)) {
        setLoadingConnections(false);
        return;
      }

      setLoadingConnections(true);
      const connectionUIDs = currentUser.userType === "student" 
        ? currentUser.myMentors 
        : currentUser.myMentees;

      if (!connectionUIDs || connectionUIDs.length === 0) {
        setConnections([]);
        setLoadingConnections(false);
        return;
      }

      try {
        const usersCollectionRef = collection(db, "users");
        // Chunking logic for > 30 UIDs
        const MAX_IN_QUERY = 30;
        let fetchedConnections: User[] = [];
        for (let i = 0; i < connectionUIDs.length; i += MAX_IN_QUERY) {
            const chunk = connectionUIDs.slice(i, i + MAX_IN_QUERY);
            if(chunk.length === 0) continue; // Skip empty chunks if any
            const q = query(usersCollectionRef, where(documentId(), "in", chunk));
            const querySnapshot = await getDocs(q);
            const chunkConnections = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
            fetchedConnections = [...fetchedConnections, ...chunkConnections];
        }
        setConnections(fetchedConnections);
      } catch (error) {
        console.error("Error fetching connections: ", error);
        toast({ title: "Error", description: "Could not load your connections.", variant: "destructive" });
      } finally {
        setLoadingConnections(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.uid, currentUser?.userType, JSON.stringify(currentUser?.myMentors), JSON.stringify(currentUser?.myMentees), toast]); // Use JSON.stringify for array dependency

  useEffect(() => {
    if (currentUser) {
      fetchConnections();
    } else {
      // If user logs out while on the page
      setConnections([]);
      setLoadingConnections(false);
    }
  }, [currentUser, fetchConnections]);

  const handleRemoveConnection = async (userIdToRemove: string) => {
    if (!currentUser || !userIdToRemove) return;
    
    const userDocRef = doc(db, "users", currentUser.uid);
    const fieldToUpdate = currentUser.userType === "student" ? "myMentors" : "myMentees";
    const connectionType = currentUser.userType === "student" ? "mentor" : "mentee";

    try {
      console.log(`Removing ${connectionType} ${userIdToRemove} for user ${currentUser.uid}`);
      await updateDoc(userDocRef, {
        [fieldToUpdate]: arrayRemove(userIdToRemove)
      });

      // Update local state
      setConnections(prev => prev.filter(user => user.uid !== userIdToRemove));
      
      toast({ title: "Connection Removed", description: `Successfully removed ${connectionType}.` });
       setUserToRemove(null); // Close dialog on success

    } catch (error) {
      console.error(`Error removing ${connectionType}: `, error);
      toast({ title: "Error", description: `Could not remove ${connectionType}. Please try again.`, variant: "destructive" });
       setUserToRemove(null); // Close dialog on error too
    }
  };

  // Prepare user data for the confirmation dialog
  const openRemoveConfirmation = (user: User) => {
    setUserToRemove(user);
  };

  if (authLoading || loadingConnections) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
    return <p className="text-center text-muted-foreground">Please log in.</p>;
  }

  const pageTitle = currentUser.userType === "student" ? "My Mentors" : "My Mentees";
  const noConnectionsMessage = currentUser.userType === "student" 
    ? "You haven't added any mentors yet. Go to 'Find Mentors' to connect!"
    : "You don't have any mentees yet. Students can find and connect with you!";

  return (
     <>
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <Users className="mr-3 h-7 w-7 text-primary" /> {pageTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{noConnectionsMessage}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map(user => (
                <UserCard 
                  key={user.uid} 
                  user={user}
                  viewerType={currentUser.userType}
                  onRemove={() => openRemoveConfirmation(user)} // Pass the user object to confirmation handler
                  // isAdded / isConnected are implicitly true as these are established connections
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

     {/* Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
            <AlertDialogDescription>
               Are you sure you want to remove <span className="font-semibold">{userToRemove?.fullName}</span> from your {currentUser.userType === 'student' ? 'mentors' : 'mentees'} list?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRemoveConnection(userToRemove!.uid)} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"> {/* Destructive variant style */}
                Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
