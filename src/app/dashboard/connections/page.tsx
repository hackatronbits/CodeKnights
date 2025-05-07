"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, documentId } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User, Student, Alumni } from "@/types";
import UserCard from "@/components/UserCard";
import { Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // For potential actions like "Remove"
import { useToast } from "@/hooks/use-toast";
// Placeholder for remove functionality if needed later
// import { doc, updateDoc, arrayRemove } from "firebase/firestore";


export default function ConnectionsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [connections, setConnections] = useState<User[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchConnections = async () => {
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
        // Firestore 'in' query limit is 30. If more, chunk the requests.
        // For simplicity, this example assumes <30 connections.
        // For >30, you'd need to batch `getDocs` calls.
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef, where(documentId(), "in", connectionUIDs));
        
        const querySnapshot = await getDocs(q);
        const fetchedConnections = querySnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
        setConnections(fetchedConnections);
      } catch (error) {
        console.error("Error fetching connections: ", error);
        toast({ title: "Error", description: "Could not load your connections.", variant: "destructive" });
      } finally {
        setLoadingConnections(false);
      }
    };

    if (currentUser) {
      fetchConnections();
    }
  }, [currentUser, toast]);

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
                  // Optional: Add onRemove functionality here if needed
                  // onRemove={handleRemoveConnection} 
                  // isAdded / isConnected can be true by default as they are connections
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
