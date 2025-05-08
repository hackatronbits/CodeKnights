
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import UserCard from "@/components/UserCard";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"; // Added CardFooter
import { SKILLS_AND_FIELDS, UNIVERSITIES_SAMPLE } from "@/lib/constants";
import type { UserType, Student, Alumni } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type FilterType = "fieldOfInterest" | "university" | "both" | "none";

export default function FindPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const targetUserType: UserType | undefined = currentUser?.userType === "student" ? "alumni" : "student";
  
  const [filterType, setFilterType] = useState<FilterType>("none");
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedUniversity, setSelectedUniversity] = useState<string>("");
  const [activeFilters, setActiveFilters] = useState<any>({});
  
  const [myConnectionUIDs, setMyConnectionUIDs] = useState<string[]>([]);


  const { users, loading: usersLoading, error: usersError, hasMore, loadMoreUsers, refreshUsers } = useUsers({
    userType: targetUserType,
    pageSize: 9,
    filters: activeFilters,
    initialLoad: false, // Don't load initially, wait for filter application
  });
  
  useEffect(() => {
    if (currentUser) {
      if (currentUser.userType === "student" && currentUser.myMentors) {
        setMyConnectionUIDs(currentUser.myMentors);
      } else if (currentUser.userType === "alumni" && currentUser.myMentees) {
        setMyConnectionUIDs(currentUser.myMentees);
      }
      // Pre-fill filters if user has preferences
      if(currentUser.userType === "student" && currentUser.fieldOfInterest){
        setSelectedField(currentUser.fieldOfInterest);
      }
      if(currentUser.userType === "student" && currentUser.university){
        setSelectedUniversity(currentUser.university);
      }
       if(currentUser.userType === "alumni" && currentUser.workingField){
        setSelectedField(currentUser.workingField);
      }
      if(currentUser.userType === "alumni" && currentUser.passOutUniversity){
        setSelectedUniversity(currentUser.passOutUniversity);
      }
    }
  }, [currentUser]);


  const handleApplyFilters = useCallback(() => {
    const newFilters: any = {};
    if (filterType === "fieldOfInterest" || filterType === "both") {
      if(selectedField) newFilters.fieldOfInterest = selectedField;
    }
    if (filterType === "university" || filterType === "both") {
      if(selectedUniversity) newFilters.university = selectedUniversity;
    }
    setActiveFilters(newFilters);
    // refreshUsers will be called by useUsers hook effect when filters change
  }, [filterType, selectedField, selectedUniversity]);

  // Auto-apply filters when selections change and a filter type is active
  useEffect(() => {
    if (filterType !== 'none') {
      handleApplyFilters();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, selectedField, selectedUniversity]); // Removed handleApplyFilters from dep array


  const handleAddConnection = async (targetUserId: string) => {
    if (!currentUser) return;

    const userDocRef = doc(db, "users", currentUser.uid);
    const fieldToUpdate = currentUser.userType === "student" ? "myMentors" : "myMentees";
    const successMessage = currentUser.userType === "student" ? "Mentor Added" : "Student Connected";
    const alreadyMessage = currentUser.userType === "student" ? "Already a Mentor" : "Already Connected";

    try {
      const currentUserDoc = await getDoc(userDocRef);
      const currentUserData = currentUserDoc.data() as typeof currentUser;
      
      const currentConnections = currentUser.userType === "student" ? currentUserData.myMentors : currentUserData.myMentees;

      if (currentConnections?.includes(targetUserId)) {
        toast({ title: alreadyMessage, description: `This ${targetUserType} is already in your list.`, variant: "default" });
        return;
      }

      await updateDoc(userDocRef, {
        [fieldToUpdate]: arrayUnion(targetUserId)
      });
      setMyConnectionUIDs(prev => [...prev, targetUserId]);
      toast({ title: successMessage, description: `Successfully added to your ${fieldToUpdate.substring(2).toLowerCase()} list.` });
    } catch (error) {
      console.error(`Error adding ${targetUserType}: `, error);
      toast({ title: "Error", description: `Could not add ${targetUserType}. Please try again.`, variant: "destructive" });
    }
  };


  if (authLoading || !currentUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  const pageTitle = currentUser.userType === "student" ? "Find Mentors" : "Find Students";
  const fieldLabel = currentUser.userType === "student" ? "Filter by Mentor's Working Field" : "Filter by Student's Field of Interest";
  const universityLabel = currentUser.userType === "student" ? "Filter by Mentor's University" : "Filter by Student's University";


  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">{pageTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base font-semibold mb-2 block">Filter Options:</Label>
            <RadioGroup
              value={filterType}
              onValueChange={(value: string) => setFilterType(value as FilterType)}
              className="flex flex-col sm:flex-row gap-4 mb-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="filter-none" />
                <Label htmlFor="filter-none">Show All</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fieldOfInterest" id="filter-field" />
                <Label htmlFor="filter-field">Field of Interest</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="university" id="filter-uni" />
                <Label htmlFor="filter-uni">University</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="filter-both" />
                <Label htmlFor="filter-both">Both</Label>
              </div>
            </RadioGroup>
          </div>

          {(filterType === "fieldOfInterest" || filterType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="select-field">{fieldLabel}</Label>
              <Select value={selectedField} onValueChange={setSelectedField}>
                <SelectTrigger id="select-field">
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  {SKILLS_AND_FIELDS.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(filterType === "university" || filterType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="select-university">{universityLabel}</Label>
              <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                <SelectTrigger id="select-university">
                  <SelectValue placeholder="Select a university" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITIES_SAMPLE.map(uni => (
                    <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {filterType === 'none' && !usersLoading && !usersError && users.length === 0 && (
             <div className="text-center py-6">
                <Button onClick={refreshUsers} size="lg">
                    <Search className="mr-2 h-5 w-5" /> Load All {targetUserType === 'alumni' ? 'Mentors' : 'Students'}
                </Button>
             </div>
          )}
        </CardContent>
      </Card>

      {usersLoading && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
             <Card key={i} className="animate-pulse">
                <CardHeader className="items-center p-6"><div className="w-24 h-24 mb-3 rounded-full bg-muted"></div><div className="h-6 w-3/4 mb-1 rounded bg-muted"></div><div className="h-4 w-1/2 rounded bg-muted"></div></CardHeader>
                <CardContent className="p-6 space-y-2"><div className="h-4 w-full rounded bg-muted"></div><div className="h-4 w-5/6 rounded bg-muted"></div></CardContent>
                <CardFooter className="p-6 border-t"><div className="h-10 w-full rounded bg-muted"></div></CardFooter>
             </Card>
            ))}
        </div>
      )}
      
      {!usersLoading && usersError && (
        <p className="text-destructive text-center">Error: {usersError}</p>
      )}

      {!usersLoading && !usersError && users.length === 0 && filterType !== 'none' && (
        <p className="text-muted-foreground text-center py-8">
          No {targetUserType}s found matching your criteria. Try broadening your search.
        </p>
      )}

      {users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map(user => (
            <UserCard
              key={user.uid}
              user={user}
              onAdd={currentUser.userType === "student" ? handleAddConnection : undefined}
              onConnect={currentUser.userType === "alumni" ? handleAddConnection : undefined}
              isAdded={currentUser.userType === "student" && myConnectionUIDs.includes(user.uid)}
              isConnected={currentUser.userType === "alumni" && myConnectionUIDs.includes(user.uid)}
              viewerType={currentUser.userType}
            />
          ))}
        </div>
      )}

      {hasMore && !usersLoading && (
        <div className="text-center mt-8">
          <Button onClick={loadMoreUsers} disabled={usersLoading}>
            {usersLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}

