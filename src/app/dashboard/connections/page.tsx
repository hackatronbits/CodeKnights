
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { collection, query, where, getDocs, documentId, doc, updateDoc, arrayRemove, getDoc } from "firebase/firestore"; // Added getDoc
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
  // AlertDialogTrigger, // Trigger is implicit via button click
} from "@/components/ui/alert-dialog"


export default function ConnectionsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<User[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const { toast } = useToast();
  const [userToRemove, setUserToRemove] = useState<User | null>(null); // State for confirmation dialog
  const [connectionUIDs, setConnectionUIDs] = useState<string[]>([]); // Store UIDs locally


  const fetchConnections = useCallback(async (uidsToFetch: string[]) => {
      if (uidsToFetch.length === 0) {
        setConnections([]);
        setLoadingConnections(false);
        return;
      }
      setLoadingConnections(true);
      try {
        const usersCollectionRef = collection(db, "users");
        const MAX_IN_QUERY = 30;
        let fetchedConnections: User[] = [];
        for (let i = 0; i < uidsToFetch.length; i += MAX_IN_QUERY) {
            const chunk = uidsToFetch.slice(i, i + MAX_IN_QUERY);
            if(chunk.length === 0) continue;
            const q = query(usersCollectionRef, where(documentId(), "in", chunk));
            const querySnapshot = await getDocs(q);
            const chunkConnections = querySnapshot.docs.map(docSnap => ({ ...docSnap.data(), uid: docSnap.id } as User));
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
    }, [toast]); // Removed currentUser from dependencies here, pass UIDs directly

  // Effect to fetch UIDs from currentUser and trigger connection fetch
  useEffect(() => {
    if (currentUser) {
      const uids = currentUser.userType === "student" ? currentUser.myMentors : currentUser.myMentees;
      const validUIDs = uids || [];
      setConnectionUIDs(validUIDs); // Update local UIDs state
      fetchConnections(validUIDs); // Fetch based on these UIDs
    } else {
      // User logged out
      setConnections([]);
      setConnectionUIDs([]);
      setLoadingConnections(false);
    }
  }, [currentUser, fetchConnections]); // Depend on currentUser to refetch UIDs

  const handleRemoveConnection = async (userIdToRemove: string) => {
    if (!currentUser || !userIdToRemove) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const fieldToUpdate = currentUser.userType === "student" ? "myMentors" : "myMentees";
    const connectionType = currentUser.userType === "student" ? "mentor" : "mentee";

    // Optimistic UI update
    const previousConnections = connections;
    const previousUIDs = connectionUIDs;
    setConnections(prev => prev.filter(user => user.uid !== userIdToRemove));
    setConnectionUIDs(prev => prev.filter(uid => uid !== userIdToRemove));
    setUserToRemove(null); // Close dialog immediately

    try {
      console.log(`Removing ${connectionType} ${userIdToRemove} for user ${currentUser.uid}`);
      await updateDoc(userDocRef, {
        [fieldToUpdate]: arrayRemove(userIdToRemove)
      });

      // Also update the other user's document to remove the connection reciprocally (optional but recommended for consistency)
      const otherUserDocRef = doc(db, "users", userIdToRemove);
      const reciprocalField = currentUser.userType === "student" ? "myMentees" : "myMentors";
      await updateDoc(otherUserDocRef, {
          [reciprocalField]: arrayRemove(currentUser.uid)
      }).catch(err => console.warn(`Could not update reciprocal connection for ${userIdToRemove}:`, err)); // Log warning if reciprocal update fails


      toast({ title: "Connection Removed", description: `Successfully removed ${connectionType}.` });

    } catch (error) {
      console.error(`Error removing ${connectionType}: `, error);
      toast({ title: "Error", description: `Could not remove ${connectionType}. Please try again.`, variant: "destructive" });
      // Rollback UI on error
      setConnections(previousConnections);
      setConnectionUIDs(previousUIDs);
    }
  };

  // Prepare user data for the confirmation dialog
  const openRemoveConfirmation = (user: User) => {
    setUserToRemove(user);
  };

  if (authLoading || (!currentUser && loadingConnections)) { // Show loader if auth is loading OR if no user and still loading connections
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
      <Card className="shadow-md group transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <Users className="mr-3 h-7 w-7 text-primary" /> {pageTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConnections && connections.length === 0 && ( // Show loader inside card if loading initial connections
               <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}
          {!loadingConnections && connections.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{noConnectionsMessage}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map(user => (
                <UserCard
                  key={user.uid}
                  user={user}
                  viewerType={currentUser.userType} // Pass viewer type
                  onRemove={() => openRemoveConfirmation(user)} // Pass the function to open confirmation
                  // No need for isAdded/isConnected here, as these are already established connections
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

     {/* Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
        {/* <AlertDialogTrigger asChild> */}
          {/* The trigger is handled by the button click in UserCard */}
        {/* </AlertDialogTrigger> */}
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

    