"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel, // Keep this for the Edit Form
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2, UserCircle, Edit3 } from "lucide-react";
import type { Student, Alumni, User } from "@/types";
import { COURSES, UNIVERSITIES_SAMPLE, SKILLS_AND_FIELDS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label"; // Import the standard Label for view mode


const profileEditBaseSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  profileImageUrl: z.string().url("Must be a valid URL.").optional().or(z.literal("")),
  contactNo: z.string().min(10, "Contact number must be at least 10 digits.").optional().or(z.literal("")),
  address: z.string().min(5, "Address seems too short.").optional().or(z.literal("")),
});

const studentEditSchema = profileEditBaseSchema.extend({
  pursuingCourse: z.string().min(1, "Please select your current course."),
  university: z.string().min(1, "Please select your university."),
  fieldOfInterest: z.string().min(1, "Please select your field of interest."),
});

const alumniEditSchema = profileEditBaseSchema.extend({
  passOutUniversity: z.string().min(1, "Please select your pass out university."),
  bio: z.string().min(20, "Bio should be at least 20 characters.").max(500, "Bio cannot exceed 500 characters."),
  workingField: z.string().min(1, "Please select your working field."),
});


export default function MyProfilePage() {
  const { currentUser, updateUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Determine schema based on user type
  const currentProfileSchema = currentUser?.userType === 'student' ? studentEditSchema : alumniEditSchema;
  type CurrentProfileFormValues = z.infer<typeof currentProfileSchema>;

  const form = useForm<CurrentProfileFormValues>({
    resolver: zodResolver(currentProfileSchema),
    defaultValues: {}, // Will be populated by useEffect
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({
        fullName: currentUser.fullName || "",
        profileImageUrl: currentUser.profileImageUrl || "",
        contactNo: currentUser.contactNo || "",
        address: currentUser.address || "",
        ...(currentUser.userType === "student" && {
          pursuingCourse: (currentUser as Student).pursuingCourse || "",
          university: (currentUser as Student).university || "",
          fieldOfInterest: (currentUser as Student).fieldOfInterest || "",
        }),
        ...(currentUser.userType === "alumni" && {
          passOutUniversity: (currentUser as Alumni).passOutUniversity || "",
          bio: (currentUser as Alumni).bio || "",
          workingField: (currentUser as Alumni).workingField || "",
        }),
      });
    }
  }, [currentUser, form, isEditing]); // Re-populate form when currentUser changes or edit mode toggles

  async function onSubmit(values: CurrentProfileFormValues) {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateUserProfile(currentUser.uid, values as Partial<User>);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setIsEditing(false); // Exit edit mode
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !currentUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <UserCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl md:text-3xl">My Profile</CardTitle>
          </div>
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} disabled={isLoading}>
            <Edit3 className="mr-2 h-4 w-4" /> {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            // View Mode
            <div className="space-y-6 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="w-32 h-32 text-4xl border-4 border-primary">
                   <AvatarImage src={currentUser.profileImageUrl || `https://picsum.photos/seed/${currentUser.uid}/200/200`} alt={currentUser.fullName} data-ai-hint="profile person" />
                   <AvatarFallback>{getInitials(currentUser.fullName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-2 text-center sm:text-left">
                  <h2 className="text-2xl font-semibold">{currentUser.fullName}</h2>
                  <p className="text-muted-foreground">{currentUser.email}</p>
                  <p className="text-sm text-muted-foreground">Role: <span className="font-medium text-foreground capitalize">{currentUser.userType}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t">
                 {/* Use standard Label here */}
                <div><Label className="font-semibold text-muted-foreground">Contact Number:</Label><p>{currentUser.contactNo || "Not set"}</p></div>
                <div><Label className="font-semibold text-muted-foreground">Address:</Label><p>{currentUser.address || "Not set"}</p></div>

                {currentUser.userType === "student" && (
                  <>
                    <div><Label className="font-semibold text-muted-foreground">Pursuing Course:</Label><p>{(currentUser as Student).pursuingCourse || "Not set"}</p></div>
                    <div><Label className="font-semibold text-muted-foreground">University:</Label><p>{(currentUser as Student).university || "Not set"}</p></div>
                    <div><Label className="font-semibold text-muted-foreground">Field of Interest:</Label><p>{(currentUser as Student).fieldOfInterest || "Not set"}</p></div>
                  </>
                )}
                {currentUser.userType === "alumni" && (
                  <>
                    <div><Label className="font-semibold text-muted-foreground">Passed Out University:</Label><p>{(currentUser as Alumni).passOutUniversity || "Not set"}</p></div>
                    <div><Label className="font-semibold text-muted-foreground">Working Field:</Label><p>{(currentUser as Alumni).workingField || "Not set"}</p></div>
                    <div className="md:col-span-2"><Label className="font-semibold text-muted-foreground">Bio:</Label><p className="whitespace-pre-wrap">{(currentUser as Alumni).bio || "Not set"}</p></div>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Edit Mode - Use FormLabel within FormField here
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-6">
                <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="profileImageUrl" render={({ field }) => ( <FormItem><FormLabel>Profile Image URL (Optional)</FormLabel><FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="contactNo" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />

                {currentUser.userType === "student" && (
                  <>
                    <FormField control={form.control} name="pursuingCourse" render={({ field }) => ( <FormItem><FormLabel>Current Pursuing Course</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl><SelectContent>{COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="university" render={({ field }) => ( <FormItem><FormLabel>Name of University</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger></FormControl><SelectContent>{UNIVERSITIES_SAMPLE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fieldOfInterest" render={({ field }) => ( <FormItem><FormLabel>Field of Interest</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select interest" /></SelectTrigger></FormControl><SelectContent>{SKILLS_AND_FIELDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                  </>
                )}
                {currentUser.userType === "alumni" && (
                  <>
                    <FormField control={form.control} name="passOutUniversity" render={({ field }) => ( <FormItem><FormLabel>Pass Out Undergraduate University</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger></FormControl><SelectContent>{UNIVERSITIES_SAMPLE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="bio" render={({ field }) => ( <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="workingField" render={({ field }) => ( <FormItem><FormLabel>Working Field</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select field" /></SelectTrigger></FormControl><SelectContent>{SKILLS_AND_FIELDS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
                  </>
                )}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
