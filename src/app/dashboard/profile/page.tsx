
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
import { useState, useEffect, useRef } from "react";
import { Loader2, UserCircle, Edit3, Upload } from "lucide-react";
import type { Student, Alumni, User } from "@/types";
import { COURSES, UNIVERSITIES_SAMPLE, SKILLS_AND_FIELDS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label"; // Import the standard Label for view mode
import { uploadProfilePicture } from "@/services/storageService"; // Import the upload service
import Image from "next/image"; // Import Next Image for preview

// Remove profileImageUrl from Zod schema validation, as it's handled by upload
const profileEditBaseSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters.").optional().or(z.literal("")), // Make optional during edit
  contactNo: z.string().min(10, "Contact number must be at least 10 digits.").optional().or(z.literal("")),
  address: z.string().min(5, "Address seems too short.").optional().or(z.literal("")),
});

const studentEditSchema = profileEditBaseSchema.extend({
  pursuingCourse: z.string().min(1, "Please select your current course.").optional().or(z.literal("")),
  university: z.string().min(1, "Please select your university.").optional().or(z.literal("")),
  fieldOfInterest: z.string().min(1, "Please select your field of interest.").optional().or(z.literal("")),
});

const alumniEditSchema = profileEditBaseSchema.extend({
  passOutUniversity: z.string().min(1, "Please select your pass out university.").optional().or(z.literal("")),
  bio: z.string().min(20, "Bio should be at least 20 characters.").max(500, "Bio cannot exceed 500 characters.").optional().or(z.literal("")),
  workingField: z.string().min(1, "Please select your working field.").optional().or(z.literal("")),
});


export default function MyProfilePage() {
  const { currentUser, updateUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Determine schema based on user type (profileImageUrl removed from schema)
  const currentProfileSchema = currentUser?.userType === 'student' ? studentEditSchema : alumniEditSchema;
  type CurrentProfileFormValues = z.infer<typeof currentProfileSchema>;

  const form = useForm<CurrentProfileFormValues>({
    resolver: zodResolver(currentProfileSchema),
    defaultValues: {}, // Will be populated by useEffect
  });

  // Effect to populate form and set initial preview
  useEffect(() => {
    if (currentUser) {
      form.reset({
        fullName: currentUser.fullName || "",
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
      // Set initial preview URL from current user data
      setPreviewUrl(currentUser.profileImageUrl || null);
      setSelectedFile(null); // Reset file selection when switching modes or user changes
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, form, isEditing]); // Re-populate form when currentUser changes or edit mode toggles

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Generate preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      // Cleanup function to revoke object URL on unmount or new file selection
      // We need to store the cleanup function associated with this specific URL
       return () => {
        console.log("Revoking preview URL:", objectUrl);
        URL.revokeObjectURL(objectUrl);
      };
    } else {
      // If file selection is cancelled, revert to original or clear preview
      setSelectedFile(null);
      setPreviewUrl(currentUser?.profileImageUrl || null);
    }
    return () => {}; // Return an empty cleanup function if no file selected
  };


  async function onSubmit(values: CurrentProfileFormValues) {
    if (!currentUser) return;
    setIsLoading(true);

    let profileImageUrl = currentUser.profileImageUrl; // Start with current URL

    try {
      // 1. Upload new profile picture if selected
      if (selectedFile) {
        console.log("Uploading new profile picture...");
        profileImageUrl = await uploadProfilePicture(currentUser.uid, selectedFile);
        console.log("Upload successful, URL:", profileImageUrl);
      } else {
        console.log("No new profile picture selected.");
      }

      // 2. Prepare data for Firestore update, removing undefined fields
      // Create a clean object based on form values
      const updateData: Partial<User> = {
         fullName: values.fullName || currentUser.fullName, // Use original if empty/undefined
         contactNo: values.contactNo || "",
         address: values.address || "",
      };

      // Add type-specific fields only if they are defined in the values
      if (currentUser.userType === "student") {
          if (values.pursuingCourse) (updateData as Partial<Student>).pursuingCourse = values.pursuingCourse;
          if (values.university) (updateData as Partial<Student>).university = values.university;
          if (values.fieldOfInterest) (updateData as Partial<Student>).fieldOfInterest = values.fieldOfInterest;
      } else if (currentUser.userType === "alumni") {
          if (values.passOutUniversity) (updateData as Partial<Alumni>).passOutUniversity = values.passOutUniversity;
          if (values.bio) (updateData as Partial<Alumni>).bio = values.bio;
          if (values.workingField) (updateData as Partial<Alumni>).workingField = values.workingField;
      }

      // Only include profileImageUrl if it's newly uploaded or already exists
      if (profileImageUrl) {
          updateData.profileImageUrl = profileImageUrl;
      } else {
          // If no image was ever set and none uploaded, don't include the field
          // If an image existed and was *not* changed, it remains from currentUser init
          // If an image existed and a *new* one uploaded, it's set above.
          // If the user wants to *remove* the image, this logic needs enhancement (e.g., a remove button)
          // For now, we assume absence of upload means keep the old or stay without one.
          if (!currentUser.profileImageUrl) {
             // Ensure the field is explicitly removed if no URL exists and none was uploaded
             // This prevents sending `profileImageUrl: undefined` if it wasn't there before.
             // However, updateDoc ignores undefined fields, so this might be redundant.
             // Let's just rely on not setting it if profileImageUrl is null/undefined.
          }
      }


       // Filter out any explicitly undefined properties just before sending
       const finalUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
           if (value !== undefined) {
               acc[key as keyof Partial<User>] = value;
           }
           return acc;
       }, {} as Partial<User>);


       console.log("Attempting to update profile with data:", finalUpdateData);

      // 3. Update Firestore profile
      await updateUserProfile(currentUser.uid, finalUpdateData);

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setIsEditing(false); // Exit edit mode
      setSelectedFile(null); // Clear selected file state

    } catch (e: any) {
      console.error("Profile Update Failed:", e);
      // Log more details if available
      console.error("Error Code:", e.code);
      console.error("Error Message:", e.message);
      console.error("Stack Trace:", e.stack);
      toast({
         title: "Update Failed",
         description: e.message || `Could not update profile. Code: ${e.code || 'UNKNOWN'}. Check console for details.`,
         variant: "destructive"
       });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !currentUser) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
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
                   {/* Use current user's image or fallback */}
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
                 {/* Profile Picture Upload */}
                 <FormItem>
                   <FormLabel>Profile Picture</FormLabel>
                   <div className="flex items-center gap-4">
                     <Avatar className="w-20 h-20 text-2xl border">
                       {/* Show preview or current image */}
                       <AvatarImage src={previewUrl || `https://picsum.photos/seed/${currentUser.uid}/100/100`} alt="Profile Preview" />
                       <AvatarFallback>{getInitials(currentUser.fullName)}</AvatarFallback>
                     </Avatar>
                     <FormControl>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                          <Upload className="mr-2 h-4 w-4" /> Upload Image
                        </Button>
                      </FormControl>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden" // Hide the default file input appearance
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                   </div>
                   <FormMessage /> {/* Add FormMessage if needed for file validation */}
                 </FormItem>


                <FormField control={form.control} name="fullName" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                {/* Removed profileImageUrl FormField */}
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
                    <Button type="submit" disabled={isLoading || form.formState.isSubmitting || !form.formState.isDirty}>
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
