
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useUsers, type UseUsersOptions } from "@/hooks/useUsers"; // Import UseUsersOptions type
import UserCard from "@/components/UserCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useEffect, useState, useCallback } from "react"; // Added useCallback
import type { Alumni, Student, User } from "@/types"; // Student type might be needed
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function DashboardHomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- State for Student View ---
  const [myMentorUIDs, setMyMentorUIDs] = useState<string[]>([]);
  const {
    users: alumniProfiles,
    loading: alumniLoading,
    error: alumniError,
    hasMore: hasMoreAlumni,
    loadMoreUsers: loadMoreAlumni,
    setFilters: setAlumniFilters,
  } = useUsers({
    userType: "alumni",
    pageSize: 3,
    initialLoad: currentUser?.userType === "student",
    filters: {},
  });

   // --- State for Alumni View ---
   const [myMenteeUIDs, setMyMenteeUIDs] = useState<string[]>([]);
   const {
     users: studentProfiles,
     loading: studentsLoading,
     error: studentsError,
     hasMore: hasMoreStudents,
     loadMoreUsers: loadMoreStudents,
     refreshUsers: refreshStudents, // Use refresh for button action
   } = useUsers({
     userType: "student",
     pageSize: 3,
     initialLoad: currentUser?.userType === "alumni", // Load initially if alumni
     filters: {}, // Start with no filters for random suggestions initially
   });

  // Populate connection lists on mount
  useEffect(() => {
    if (currentUser) {
        if (currentUser.userType === "student" && currentUser.myMentors) {
            setMyMentorUIDs(currentUser.myMentors);
        } else if (currentUser.userType === "alumni" && currentUser.myMentees) {
            setMyMenteeUIDs(currentUser.myMentees);
        }
    }
  }, [currentUser]);


  // --- Student Actions ---
  const handleAddMentor = async (alumniUid: string) => {
    if (!currentUser || currentUser.userType !== "student") return;

    const studentDocRef = doc(db, "users", currentUser.uid);
    try {
      const currentStudentDoc = await getDoc(studentDocRef);
      const currentStudentData = currentStudentDoc.data() as typeof currentUser;
      if (currentStudentData.myMentors?.includes(alumniUid)) {
        toast({ title: "Already a Mentor", description: "This alumni is already in your mentors list.", variant: "default" });
        return;
      }

      await updateDoc(studentDocRef, {
        myMentors: arrayUnion(alumniUid)
      });
      setMyMentorUIDs(prev => [...prev, alumniUid]); // Update local state
      toast({ title: "Mentor Added", description: "Successfully added to your mentors list." });
    } catch (error) {
      console.error("Error adding mentor: ", error);
      toast({ title: "Error", description: "Could not add mentor. Please try again.", variant: "destructive" });
    }
  };

   // Callback for refreshing suggestions based on student's profile
   const handleRefreshMentorSuggestions = useCallback(() => {
     if (!currentUser || currentUser.userType !== 'student') return;

     const suggestionFilters: UseUsersOptions['filters'] = {};
     if ((currentUser as Student).fieldOfInterest) {
       suggestionFilters.fieldOfInterest = (currentUser as Student).fieldOfInterest;
     }
     if ((currentUser as Student).university) {
       suggestionFilters.university = (currentUser as Student).university;
     }

     if (Object.keys(suggestionFilters).length > 0) {
       console.log("Refreshing mentor suggestions with filters:", suggestionFilters);
       setAlumniFilters(suggestionFilters);
     } else {
         console.log("Refreshing mentor suggestions with no specific filters (random).");
         setAlumniFilters({});
          toast({ title: "Showing General Mentor Suggestions", description: "No specific field of interest or university set in your profile for tailored suggestions." });
     }
   }, [currentUser, setAlumniFilters, toast]);


  // --- Alumni Actions ---
  const handleConnectStudent = async (studentUid: string) => {
    if (!currentUser || currentUser.userType !== "alumni") return;

    const alumniDocRef = doc(db, "users", currentUser.uid);
    try {
        // Check if already connected
        const currentAlumniDoc = await getDoc(alumniDocRef);
        const currentAlumniData = currentAlumniDoc.data() as typeof currentUser;
        if (currentAlumniData.myMentees?.includes(studentUid)) {
            toast({ title: "Already Connected", description: "This student is already in your mentees list.", variant: "default" });
            return;
        }

        await updateDoc(alumniDocRef, {
            myMentees: arrayUnion(studentUid)
        });
        setMyMenteeUIDs(prev => [...prev, studentUid]); // Update local state
        toast({ title: "Student Connected", description: "Successfully added to your mentees list." });
    } catch (error) {
      console.error("Error connecting student: ", error);
      toast({ title: "Error", description: "Could not connect with student. Please try again.", variant: "destructive" });
    }
  };


  // --- Loading & Base States ---
  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
    return <p className="text-center text-muted-foreground">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card (Common) */}
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

      {/* --- Student View --- */}
      {currentUser.userType === "student" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Discover Potential Mentors</h2>
            <Button variant="outline" onClick={handleRefreshMentorSuggestions} disabled={alumniLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${alumniLoading ? 'animate-spin' : ''}`} />
              Refresh Suggestions
            </Button>
          </div>

          {alumniLoading && alumniProfiles.length === 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => ( <UserCardSkeleton key={`skel-alumni-${i}`} /> ))}
             </div>
          )}

          {!alumniLoading && alumniError && (
            <p className="text-destructive text-center">Error loading mentors: {alumniError}</p>
          )}

          {!alumniLoading && !alumniError && alumniProfiles.length === 0 && (
             <p className="text-muted-foreground text-center py-8">
                No alumni suggestions found. Try refreshing or exploring all mentors in the 'Find Mentors' section.
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

          {hasMoreAlumni && !alumniLoading && (
            <div className="text-center mt-8">
              <Button onClick={loadMoreAlumni} disabled={alumniLoading}>
                {alumniLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More Mentors
              </Button>
            </div>
          )}
        </div>
      )}

      {/* --- Alumni View --- */}
      {currentUser.userType === "alumni" && (
        <div className="space-y-6">
           <div className="flex justify-between items-center">
             <h2 className="text-2xl font-semibold">Discover Potential Mentees</h2>
             <Button variant="outline" onClick={refreshStudents} disabled={studentsLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${studentsLoading ? 'animate-spin' : ''}`} />
                Refresh Students
             </Button>
           </div>

          {studentsLoading && studentProfiles.length === 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[...Array(3)].map((_, i) => ( <UserCardSkeleton key={`skel-student-${i}`} /> ))}
             </div>
           )}

          {!studentsLoading && studentsError && (
            <p className="text-destructive text-center">Error loading students: {studentsError}</p>
          )}

          {!studentsLoading && !studentsError && studentProfiles.length === 0 && (
             <p className="text-muted-foreground text-center py-8">
                No students found currently. Students can find you via the 'Find Mentors' section. You can also browse students in 'Find Students'.
             </p>
          )}

          {studentProfiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentProfiles.map(profile => (
                <UserCard
                  key={profile.uid}
                  user={profile as Student}
                  onConnect={handleConnectStudent} // Pass connect handler
                  isConnected={myMenteeUIDs.includes(profile.uid)} // Check if already connected
                  viewerType="alumni"
                />
              ))}
            </div>
          )}

          {hasMoreStudents && !studentsLoading && (
            <div className="text-center mt-8">
              <Button onClick={loadMoreStudents} disabled={studentsLoading}>
                {studentsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More Students
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// Skeleton Component for User Card
const UserCardSkeleton = () => (
  <Card className="animate-pulse">
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
);


    