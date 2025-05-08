"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUsers, type UseUsersOptions } from "@/hooks/useUsers"; // Import UseUsersOptions type
import UserCard from "@/components/UserCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react"; // Added useCallback
import type { Alumni, Student } from "@/types"; // Student type might be needed
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function DashboardHomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State for student's mentors to disable "Add" button
  const [myMentorUIDs, setMyMentorUIDs] = useState<string[]>([]);

  // Fetch initial set of alumni for students (random)
  const {
    users: alumniProfiles,
    loading: usersLoading,
    error: usersError,
    hasMore,
    loadMoreUsers,
    // refreshUsers, // We'll use setFilters instead for the button
    setFilters, // Get the setFilters function
  } = useUsers({
    userType: "alumni",
    pageSize: 3, // Show 3 initially
    initialLoad: currentUser?.userType === "student", // Only load if user is student
    filters: {}, // Start with no filters for random suggestions initially
  });

  useEffect(() => {
    if (currentUser && currentUser.userType === "student" && currentUser.myMentors) {
      setMyMentorUIDs(currentUser.myMentors);
    }
  }, [currentUser]);

  const handleAddMentor = async (alumniUid: string) => {
    if (!currentUser || currentUser.userType !== "student") return;

    const studentDocRef = doc(db, "users", currentUser.uid);
    try {
      // Check if already a mentor to prevent duplicates (though UI should handle this)
      const currentStudentDoc = await getDoc(studentDocRef);
      const currentStudentData = currentStudentDoc.data() as typeof currentUser;
      if (currentStudentData.myMentors?.includes(alumniUid)) {
        toast({ title: "Already a Mentor", description: "This alumni is already in your mentors list.", variant: "default" });
        return;
      }

      await updateDoc(studentDocRef, {
        myMentors: arrayUnion(alumniUid)
      });
      setMyMentorUIDs(prev => [...prev, alumniUid]);
      toast({ title: "Mentor Added", description: "Successfully added to your mentors list." });
    } catch (error) {
      console.error("Error adding mentor: ", error);
      toast({ title: "Error", description: "Could not add mentor. Please try again.", variant: "destructive" });
    }
  };

  // Callback for refreshing suggestions based on student's profile
  const handleRefreshSuggestions = useCallback(() => {
    if (!currentUser || currentUser.userType !== 'student') return;

    const suggestionFilters: UseUsersOptions['filters'] = {};
    if ((currentUser as Student).fieldOfInterest) {
      suggestionFilters.fieldOfInterest = (currentUser as Student).fieldOfInterest;
    }
    if ((currentUser as Student).university) {
      suggestionFilters.university = (currentUser as Student).university;
    }

    // Check if any filters were actually added
    if (Object.keys(suggestionFilters).length > 0) {
      console.log("Refreshing suggestions with filters:", suggestionFilters);
      setFilters(suggestionFilters); // Set filters, useUsers hook will refetch
    } else {
        console.log("Refreshing suggestions with no specific filters (random).");
        setFilters({}); // Set empty filters to get random again (or keep previous random if preferred)
         toast({ title: "Showing General Suggestions", description: "No specific field of interest or university set in your profile for tailored suggestions." });
    }
  }, [currentUser, setFilters, toast]);


  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
    // This should be handled by layout, but as a fallback
    return <p className="text-center text-muted-foreground">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            Welcome, {currentUser.fullName}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You are logged in as a {currentUser.userType}. Explore the platform and make meaningful connections.
          </p>
        </CardContent>
      </Card>

      {currentUser.userType === "student" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Discover Potential Mentors</h2>
            <Button variant="outline" onClick={handleRefreshSuggestions} disabled={usersLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 animate-spin ${usersLoading ? 'animate-spin' : ''}`} />
              Refresh Suggestions
            </Button>
          </div>

          {usersLoading && alumniProfiles.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="items-center p-6">
                    <div className="w-24 h-24 mb-3 rounded-full bg-muted"></div>
                    <div className="h-6 w-3/4 mb-1 rounded bg-muted"></div>
                    <div className="h-4 w-1/2 rounded bg-muted"></div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-2">
                    <div className="h-4 w-full rounded bg-muted"></div>
                    <div className="h-4 w-5/6 rounded bg-muted"></div>
                  </CardContent>
                  <CardFooter className="p-6 border-t">
                     <div className="h-10 w-full rounded bg-muted"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {!usersLoading && usersError && (
            <p className="text-destructive text-center">Error loading mentors: {usersError}</p>
          )}

          {!usersLoading && !usersError && alumniProfiles.length === 0 && (
             <p className="text-muted-foreground text-center py-8">
                No alumni suggestions found based on your profile or criteria. Try refreshing or exploring all mentors in the 'Find Mentors' section.
             </p>
          )}

          {alumniProfiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alumniProfiles.map(profile => (
                <UserCard
                  key={profile.uid}
                  user={profile as Alumni}
                  onAdd={handleAddMentor}
                  isAdded={myMentorUIDs.includes(profile.uid)}
                  viewerType="student"
                />
              ))}
            </div>
          )}

          {hasMore && !usersLoading && (
            <div className="text-center mt-8">
              <Button onClick={loadMoreUsers} disabled={usersLoading}>
                {usersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More Mentors
              </Button>
            </div>
          )}
        </div>
      )}

      {currentUser.userType === "alumni" && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Your Alumni Dashboard</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">
                Thank you for being a part of MentorConnect! Students can find you through the "Find Mentors" section.
                You can also browse students looking for mentorship in the "Find Students" section.
              </p>
              {/* Add more alumni-specific content here, e.g., stats on mentees, quick links */}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
