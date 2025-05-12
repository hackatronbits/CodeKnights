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
import { getFirebaseServices } from "@/lib/firebase";
import PendingMentorRequests from "./PendingMentorRequests";
import { generateMockAlumni } from "@/lib/mockData";

// Generate real alumni data (e.g., from backend or mock)
const realAlumni: Alumni[] = generateMockAlumni(20);

// Add more dummy alumni profiles
const dummyAlumni: Alumni[] = [
  {
    uid: "dummy1",
    email: "dummy1@example.com",
    fullName: "Dummy One",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/men/1.jpg",
    contactNo: "+1-555-0000001",
    address: "123 Dummy St, Faketown, FS",
    passOutUniversity: "Dummy University",
    bio: "Mentor in Dummy Science, passionate about helping students.",
    workingField: "Dummy Science",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 10000000,
  },
  {
    uid: "dummy2",
    email: "dummy2@example.com",
    fullName: "Dummy Two",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/women/2.jpg",
    contactNo: "+1-555-0000002",
    address: "456 Dummy Ave, Faketown, FS",
    passOutUniversity: "Fake Institute",
    bio: "Expert in Fake Engineering, loves teaching.",
    workingField: "Fake Engineering",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 20000000,
  },
  {
    uid: "dummy3",
    email: "dummy3@example.com",
    fullName: "Dummy Three",
    userType: "alumni",
    profileImageUrl: "https://randomuser.me/api/portraits/men/3.jpg",
    contactNo: "+1-555-0000003",
    address: "789 Dummy Blvd, Faketown, FS",
    passOutUniversity: "Imaginary College",
    bio: "Imaginary mentor, always available for advice.",
    workingField: "Imaginary Studies",
    myMentees: [],
    isProfileComplete: true,
    createdAt: Date.now() - 30000000,
  },
  // Add more dummy alumni as needed
];

// Combine real and dummy alumni
const ALL_ALUMNI: Alumni[] = [...realAlumni, ...dummyAlumni];

export default function DashboardHomePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // --- State for Student View ---
  const [myMentorUIDs, setMyMentorUIDs] = useState<string[]>([]);
  const {
    loading: alumniLoading,
    error: alumniError,
    hasMore: hasMoreAlumni,
    loadMoreUsers: loadMoreAlumni,
    setFilters: setAlumniFilters, // Renamed refreshAlumni to setAlumniFilters for clarity
    refreshUsers: refreshAlumni, // Keep refresh for button action if needed
  } = useUsers({
    userType: "alumni",
    pageSize: 3,
    initialLoad: currentUser?.userType === "student", // Load initially if student
    filters: {}, // Start with no filters for random suggestions initially
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
    setFilters: setStudentFilters, // Add setFilters for students if needed later
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

    const { db } = getFirebaseServices();
    if (!db) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }

    // Instead of adding directly to myMentors, send a request to alumni
    const alumniDocRef = doc(db, "users", alumniUid);
    try {
      // Check if already requested
      const alumniDoc = await getDoc(alumniDocRef);
      const alumniData = alumniDoc.data() as Alumni;
      // Fix: If alumniData is undefined (e.g., for dummy alumni), treat as no pending requests
      const pendingRequests = alumniData?.pendingMenteeRequests || [];
      if (pendingRequests.includes(currentUser.uid)) {
        toast({ title: "Already Requested", description: "You have already sent a request to this alumni.", variant: "default" });
        return;
      }
      await updateDoc(alumniDocRef, {
        pendingMenteeRequests: arrayUnion(currentUser.uid),
      });
      toast({ title: "Request Sent", description: "Mentor request sent to alumni." });
    } catch (error) {
      console.error("Error sending mentor request: ", error);
      toast({ title: "Error", description: "Could not send mentor request. Please try again.", variant: "destructive" });
    }
  };

  // Callback for refreshing suggestions based on student's profile
  const handleRefreshMentorSuggestions = useCallback(() => {
    if (!currentUser || currentUser.userType !== "student") return;

    const suggestionFilters: UseUsersOptions["filters"] = {};
    if ((currentUser as Student).fieldOfInterest) {
      suggestionFilters.fieldOfInterest = (currentUser as Student).fieldOfInterest;
    }
    if ((currentUser as Student).university) {
      suggestionFilters.university = (currentUser as Student).university;
    }

    console.log("Refreshing mentor suggestions with filters:", suggestionFilters);
    setAlumniFilters(suggestionFilters); // Trigger refetch via the hook's useEffect

    if (Object.keys(suggestionFilters).length === 0) {
      toast({
        title: "Showing General Mentor Suggestions",
        description: "Update your profile with field of interest or university for tailored suggestions.",
      });
    }
  }, [currentUser, setAlumniFilters, toast]);

  // --- Alumni Actions ---
  const handleConnectStudent = async (studentUid: string) => {
    if (!currentUser || currentUser.userType !== "alumni") return;

    const { db } = getFirebaseServices();
    if (!db) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }

    const alumniDocRef = doc(db, "users", currentUser.uid);
    try {
      // Check if already connected
      const currentAlumniDoc = await getDoc(alumniDocRef);
      const currentAlumniData = currentAlumniDoc.data() as typeof currentUser;
      if (currentAlumniData.myMentees?.includes(studentUid)) {
        toast({
          title: "Already Connected",
          description: "This student is already in your mentees list.",
          variant: "default",
        });
        return;
      }

      await updateDoc(alumniDocRef, {
        myMentees: arrayUnion(studentUid),
      });
      setMyMenteeUIDs((prev) => [...prev, studentUid]); // Update local state
      toast({ title: "Student Connected", description: "Successfully added to your mentees list." });
    } catch (error) {
      console.error("Error connecting student: ", error);
      toast({ title: "Error", description: "Could not connect with student. Please try again.", variant: "destructive" });
    }
  };

  // --- Callback for refreshing student suggestions (Alumni View) ---
  // Similar logic to mentor suggestions, but could use alumni's field/uni
  const handleRefreshStudentSuggestions = useCallback(() => {
    if (!currentUser || currentUser.userType !== "alumni") return;

    const suggestionFilters: UseUsersOptions["filters"] = {};
    // Example: Filter students interested in the alumni's working field
    if ((currentUser as Alumni).workingField) {
      suggestionFilters.fieldOfInterest = (currentUser as Alumni).workingField;
    }
    // Example: Filter students from the alumni's pass out university
    if ((currentUser as Alumni).passOutUniversity) {
      suggestionFilters.university = (currentUser as Alumni).passOutUniversity;
    }

    console.log("Refreshing student suggestions with filters:", suggestionFilters);
    setStudentFilters(suggestionFilters); // Trigger refetch via the hook's useEffect

    if (Object.keys(suggestionFilters).length === 0) {
      toast({
        title: "Showing General Student Suggestions",
        description: "Update your profile with working field or university for tailored suggestions.",
      });
    }
  }, [currentUser, setStudentFilters, toast]);

  // --- Loading & Base States ---
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return <p className="text-center text-muted-foreground">Please log in to view your dashboard.</p>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Card (Common) */}
      <Card className="shadow-md group transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">Welcome, {currentUser.fullName}!</CardTitle>
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
              <RefreshCw className={`mr-2 h-4 w-4 ${alumniLoading ? "animate-spin" : ""}`} />
              Refresh Suggestions
            </Button>
          </div>

          {alumniLoading && ALL_ALUMNI.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <UserCardSkeleton key={`skel-alumni-${i}`} />
              ))}
            </div>
          )}

          {!alumniLoading && ALL_ALUMNI.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No alumni suggestions found based on your profile. Try refreshing for general suggestions or exploring all
              mentors in the 'Find Mentors' section.
            </p>
          )}

          {ALL_ALUMNI.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ALL_ALUMNI.map((profile) => (
                <UserCard
                  key={profile.uid}
                  user={profile as Alumni}
                  onAddOrConnect={handleAddMentor}
                  isAddedOrConnected={myMentorUIDs.includes(profile.uid)}
                  viewerType="student"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Alumni View --- */}
      {currentUser.userType === "alumni" && (
        <div className="space-y-6">
          <PendingMentorRequests />
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Discover Potential Mentees</h2>
            {/* Use handleRefreshStudentSuggestions for the button */}
            <Button variant="outline" onClick={handleRefreshStudentSuggestions} disabled={studentsLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${studentsLoading ? "animate-spin" : ""}`} />
              Refresh Suggestions
            </Button>
          </div>

          {studentsLoading && studentProfiles.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <UserCardSkeleton key={`skel-student-${i}`} />
              ))}
            </div>
          )}

          {!studentsLoading && studentsError && (
            <p className="text-destructive text-center">Error loading students: {studentsError}</p>
          )}

          {!studentsLoading && !studentsError && studentProfiles.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No student suggestions found based on your profile. Try refreshing for general suggestions or browsing
              students in 'Find Students'.
            </p>
          )}

          {studentProfiles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studentProfiles.map((profile) => (
                <UserCard
                  key={profile.uid}
                  user={profile as Student}
                  onAddOrConnect={handleConnectStudent} // Use correct prop for plus button
                  isAddedOrConnected={myMenteeUIDs.includes(profile.uid)} // Use correct prop for button state
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
  <Card className="animate-pulse group transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-xl">
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

