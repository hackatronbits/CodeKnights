"use client";

import React from "react";
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
import type { Student, Alumni, User, StudentProfile, AlumniProfile, BaseUser } from "@/types";
import { COURSES, UNIVERSITIES_SAMPLE, SKILLS_AND_FIELDS } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label"; // Import the standard Label for view mode
import { uploadProfilePicture } from "@/services/storageService"; // Import the upload service
import Image from "next/image"; // Import Next Image for preview

// Types for the form values
type StudentFormValues = {
  fullName: string;
  contactNo: string;
  address: string;
  moreDetail: string;
  pursuingCourse: string;
  university: string;
  fieldOfInterest: string;
};

type AlumniFormValues = {
  fullName: string;
  contactNo: string;
  address: string;
  moreDetail: string;
  passOutUniversity: string;
  bio: string;
  workingField: string;
};

type CurrentProfileFormValues = StudentFormValues | AlumniFormValues;

const baseSchema = z.object({
  fullName: z.string().optional(),
  contactNo: z.string().optional(),
  address: z.string().optional(),
  moreDetail: z.string().optional(),
});

const studentSchema = baseSchema.extend({
  pursuingCourse: z.string().optional(),
  university: z.string().optional(),
  fieldOfInterest: z.string().optional(),
});

const alumniSchema = baseSchema.extend({
  passOutUniversity: z.string().optional(),
  bio: z.string().optional(),
  workingField: z.string().optional(),
});

const currentProfileFormSchema = studentSchema.or(alumniSchema);
type FormSchema = z.infer<typeof currentProfileFormSchema>;

export default function MyProfilePage() {
  const { currentUser, updateUserProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  const form = useForm<FormSchema>({
    resolver: zodResolver(currentProfileFormSchema),
    defaultValues: {}, // Will be populated by useEffect
  });

  // Effect to populate form and set initial preview
  useEffect(() => {
    if (currentUser) {
      form.reset({
        fullName: currentUser.fullName || "",
        contactNo: currentUser.contactNo || "",
        address: currentUser.address || "",
        moreDetail: (currentUser as any).moreDetail || "",
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

  async function onSubmit(values: FormSchema) {
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
      let updateData: any = {
        fullName: values.fullName || currentUser.fullName,
        contactNo: values.contactNo || "",
        address: values.address || "",
        moreDetail: values.moreDetail || "",
      };
      if (currentUser.userType === "student") {
        if ("pursuingCourse" in values) {
          updateData["pursuingCourse"] = values.pursuingCourse || (currentUser as Student).pursuingCourse || "";
        }
        if ("university" in values) {
          updateData["university"] = values.university || (currentUser as Student).university || "";
        }
        if ("fieldOfInterest" in values) {
          updateData["fieldOfInterest"] = values.fieldOfInterest || (currentUser as Student).fieldOfInterest || "";
        }
      }
      if (currentUser.userType === "alumni") {
        if ("passOutUniversity" in values) {
          updateData["passOutUniversity"] = values.passOutUniversity || (currentUser as Alumni).passOutUniversity || "";
        }
        if ("bio" in values) {
          updateData["bio"] = values.bio || (currentUser as Alumni).bio || "";
        }
        if ("workingField" in values) {
          updateData["workingField"] = values.workingField || (currentUser as Alumni).workingField || "";
        }
      }
      if (profileImageUrl) {
        updateData["profileImageUrl"] = profileImageUrl;
      }

      // Filter out any undefined values
      const finalUpdateData = Object.entries(updateData).reduce((acc: any, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      console.log("Attempting to update profile with data:", finalUpdateData);

      // Update Firestore profile
      await updateUserProfile(currentUser.uid, finalUpdateData);

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setIsEditing(false); // Exit edit mode
      setSelectedFile(null); // Clear selected file state

    } catch (e: any) {
      console.error("Profile Update Failed:", e);
      toast({ 
        title: "Update Failed", 
        description: e.message || "Could not update profile. Please try again.",
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
                    <div className="md:col-span-2"><Label className="font-semibold text-muted-foreground">More Detail:</Label><p className="whitespace-pre-wrap">{(currentUser as any).moreDetail || "Not set"}</p></div>
                  </>
                )}
                {currentUser.userType === "alumni" && (
                  <>
                    <div><Label className="font-semibold text-muted-foreground">Passed Out University:</Label><p>{(currentUser as Alumni).passOutUniversity || "Not set"}</p></div>
                    <div><Label className="font-semibold text-muted-foreground">Working Field:</Label><p>{(currentUser as Alumni).workingField || "Not set"}</p></div>
                    <div className="md:col-span-2"><Label className="font-semibold text-muted-foreground">Bio:</Label><p className="whitespace-pre-wrap">{(currentUser as Alumni).bio || "Not set"}</p></div>
                    <div className="md:col-span-2"><Label className="font-semibold text-muted-foreground">More Detail:</Label><p className="whitespace-pre-wrap">{(currentUser as any).moreDetail || "Not set"}</p></div>
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


                <FormField control={form.control} name="fullName" render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={currentUser.userType === "student"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem> 
                )} />
                {/* Removed profileImageUrl FormField */}
                <FormField control={form.control} name="contactNo" render={({ field }) => ( <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="moreDetail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>More Detail</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[80px]" placeholder="Add more about yourself..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {currentUser.userType === "student" && (
                  <>
                    <FormField control={form.control} name="pursuingCourse" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Pursuing Course</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={true}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>{COURSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
                    <FormField control={form.control} name="university" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name of University</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={true}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select university" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>{UNIVERSITIES_SAMPLE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}/>
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
